import { useState, useRef } from "react";
import { theme } from "@/lib/theme";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfile } from "@/hooks/useProfile";
import { User, UserStar } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Footer() {
  const { session, signOut } = useAuthStore();
  const profile = useProfile();

  const isMJ = profile?.role === "mj";
  const displayName = session?.user?.email?.split("@")[0] || "Voyageur";

  // --- Gestion du Hover + Click ---
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    // On laisse 200ms à l'utilisateur pour déplacer sa souris vers le menu
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };
  // --------------------------------

  return (
    <footer
      className="relative h-15 border-t border-white/10 shrink-0 flex items-center justify-between px-6 shadow-[0_-4px_24px_rgba(0,0,0,0.2)]"
      style={theme.gradientFooter}
    >
      <div className={theme.strokeTop} />
      <img
        src="/spellbound.svg"
        alt="Spellbound Logo"
        className="relative z-5 w-24 h-24 object-contain"
      />
      {session && (
        <div
          className="absolute top-0 right-10 -translate-y-1/2 z-20"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* On lie l'état "open" et "onOpenChange" au composant */}
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.preventDefault()}
                className="relative flex items-center justify-center h-8 px-6 cursor-pointer group outline-none border-none opacity-90 hover:opacity-100 transition-opacity"
              >
                <div
                  className="absolute inset-0"
                  style={{
                    clipPath:
                      "polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%)",
                    background: theme.colors.blanc,
                  }}
                />

                <div
                  className="absolute inset-px"
                  style={{
                    clipPath:
                      "polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%)",
                    background: theme.gradientTab.background,
                  }}
                />

                <div className="relative z-10 flex items-center gap-2 whitespace-nowrap">
                  {isMJ ? (
                    <UserStar className="w-3 h-3 text-amber-200 shrink-0" />
                  ) : (
                    <User className="w-3 h-3 text-white/90 shrink-0" />
                  )}

                  <span className="text-[11px] font-serif text-white tracking-widest capitalize px-1">
                    {displayName}
                  </span>
                  <div className="w-1 h-1 rotate-45 bg-white/70 shrink-0" />
                </div>
              </button>
            </DropdownMenuTrigger>

            {/* On remet les événements souris sur le menu pour qu'il reste ouvert au survol */}
            <DropdownMenuContent
              align="end"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className="w-48 bg-[#1E1941]/95 backdrop-blur-xl border-[#E3CCCD]/20 text-slate-200 mb-2 rounded-xl"
            >
              <DropdownMenuItem className="cursor-pointer hover:bg-white/10 text-xs focus:bg-white/10">
                Éditer le profil
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={signOut}
                className="cursor-pointer text-amber-200/80 hover:bg-white/10 hover:text-amber-200 text-xs focus:bg-white/10 focus:text-amber-200"
              >
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </footer>
  );
}
