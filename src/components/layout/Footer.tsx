import { useState, useRef } from "react";
import { theme } from "@/lib/theme";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfile } from "@/hooks/useProfile";
import { User, UserStar, BookOpen, LogOut, Pencil, Trash2, ArrowLeft, RefreshCw } from "lucide-react";
import { useCampaigns } from "@/hooks/useCampaigns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface FooterProps {
  activeCampaign?: { id: string; nom: string } | null;
  onCampaignClick?: () => void;
  onEditCampaign?: () => void;
  onDeleteCampaign?: () => void;
}


export function Footer({ activeCampaign, onCampaignClick, onEditCampaign, onDeleteCampaign }: FooterProps) {
  const { session, signOut } = useAuthStore();
  const profile = useProfile();

  const isMJ = profile?.role === "mj";
  const displayName = session?.user?.email?.split("@")[0] || "Voyageur";

  // --- Gestion du Hover + Click pour profil ---
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleProfileMouseEnter = () => {
    if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current);
    setIsProfileOpen(true);
  };
  const handleProfileMouseLeave = () => {
    profileTimeoutRef.current = setTimeout(() => {
      setIsProfileOpen(false);
    }, 200);
  };

  // --- Gestion du Hover + Click pour campagne ---
  const [isCampaignOpen, setIsCampaignOpen] = useState(false);
  const campaignTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleCampaignMouseEnter = () => {
    if (campaignTimeoutRef.current) clearTimeout(campaignTimeoutRef.current);
    setIsCampaignOpen(true);
  };
  const handleCampaignMouseLeave = () => {
    campaignTimeoutRef.current = setTimeout(() => {
      setIsCampaignOpen(false);
    }, 200);
  };

  const { data: campaigns } = useCampaigns();

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

      {/* Onglet campagne placé à gauche du profil avec 1.5rem de gap */}
      {activeCampaign && (
        <div
          className="absolute top-0 right-70 -translate-y-1/2 z-20"
          onMouseEnter={handleCampaignMouseEnter}
          onMouseLeave={handleCampaignMouseLeave}
        >
          <DropdownMenu open={isCampaignOpen} onOpenChange={setIsCampaignOpen} modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                className="relative flex items-center justify-center h-8 px-6 cursor-pointer group outline-none border-none opacity-90 hover:opacity-100 transition-opacity"
                style={{
                  clipPath:
                    "polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%)",
                  background: theme.colors.blanc,
                }}
              >
                <div
                  className="absolute inset-px"
                  style={{
                    clipPath:
                      "polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%)",
                    background: theme.gradientTab.background,
                  }}
                />
                <div className="relative z-10 flex items-center gap-2 whitespace-nowrap">
                  <BookOpen className="w-3 h-3 text-indigo-200 shrink-0" />
                  <span className="text-[11px] font-serif text-white tracking-widest px-1">
                    {activeCampaign.nom}
                  </span>
                  <div className="w-1 h-1 rotate-45 bg-white/70 shrink-0" />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onMouseEnter={handleCampaignMouseEnter} onMouseLeave={handleCampaignMouseLeave} className="w-56 bg-[#1E1941]/95 backdrop-blur-xl border-[#E3CCCD]/20 text-slate-200 mb-2 rounded-xl">
              <DropdownMenuItem onClick={onCampaignClick} className="cursor-pointer hover:bg-white/10 text-xs focus:bg-white/10 flex items-center gap-2">
                <ArrowLeft className="w-3.5 h-3.5 text-white/50" />
                Revenir au lobby
              </DropdownMenuItem>
              {onEditCampaign && (
                <DropdownMenuItem onClick={onEditCampaign} className="cursor-pointer hover:bg-white/10 text-xs focus:bg-white/10 flex items-center gap-2">
                  <Pencil className="w-3.5 h-3.5 text-white/50" />
                  Modifier la campagne
                </DropdownMenuItem>
              )}
              {onDeleteCampaign && (
                <DropdownMenuItem onClick={onDeleteCampaign} className="cursor-pointer text-red-400/80 hover:bg-red-500/10 hover:text-red-400 text-xs focus:bg-red-500/10 focus:text-red-400 flex items-center gap-2">
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer la campagne
                </DropdownMenuItem>
              )}
              {campaigns && campaigns.length > 1 && (
                <>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuLabel className="text-xs text-white/60 flex items-center gap-2">
                    <RefreshCw className="w-3 h-3" />
                    Changer de campagne
                  </DropdownMenuLabel>
                  {campaigns.map((c) => (
                    <DropdownMenuItem
                      key={c.id}
                      onClick={() => {
                        if (c.id !== activeCampaign.id && typeof window !== 'undefined') {
                          window.location.reload();
                        }
                      }}
                      className={`cursor-pointer text-xs focus:bg-white/10 ${c.id === activeCampaign.id ? 'opacity-60 pointer-events-none' : ''}`}
                    >
                      {c.nom}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Onglet profil (toujours à droite) */}
      {session && (
        <div
          className="absolute top-0 right-10 -translate-y-1/2 z-20"
          onMouseEnter={handleProfileMouseEnter}
          onMouseLeave={handleProfileMouseLeave}
        >
          <DropdownMenu open={isProfileOpen} onOpenChange={setIsProfileOpen} modal={false}>
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
            <DropdownMenuContent
              align="end"
              onMouseEnter={handleProfileMouseEnter}
              onMouseLeave={handleProfileMouseLeave}
              className="w-48 bg-[#1E1941]/95 backdrop-blur-xl border-[#E3CCCD]/20 text-slate-200 mb-2 rounded-xl"
            >
              <DropdownMenuItem className="cursor-pointer hover:bg-white/10 text-xs focus:bg-white/10 flex items-center gap-2">
                <Pencil className="w-3.5 h-3.5 text-white/50" />
                Éditer le profil
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={signOut}
                className="cursor-pointer text-amber-200/80 hover:bg-white/10 hover:text-amber-200 text-xs focus:bg-white/10 focus:text-amber-200 flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </footer>
  );
}
