/* eslint-disable @typescript-eslint/no-explicit-any */
import { theme } from "@/lib/theme";
import { BookMarked, Telescope } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";

interface SideNavProps {
  activeTab: string;
  onTabChange: (tab: 'grimoire' | 'compendium' | 'none') => void;
}

const NavItem = ({ label, icon: Icon, active, onClick }: any) => {
  return (
    <div
      onClick={onClick}
      className={`relative flex items-center h-10 w-44 cursor-pointer transition-all duration-300 ${active ? "opacity-100" : "opacity-60 hover:opacity-100"}`}
      style={{
        clipPath:
          "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)",
        background: "rgba(227, 204, 205, 0.4)",
      }}
    >
      {/* Le fond intérieur de l'onglet, décalé de 1px pour laisser apparaître la "bordure" */}
      <div
        className="absolute inset-px left-0 flex items-center px-4"
        style={{
          clipPath:
            "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)",
          background: active
            ? theme.gradientTab.background
            : theme.gradientTab.inactive,
        }}
      >
        <Icon className="w-4 h-4 text-white mr-3" />
        <span className="font-serif text-[13px] text-white tracking-widest">
          {label}
        </span>

        {/* Le petit losange décoratif près de la pointe */}
        <div className="absolute right-5 w-1.5 h-1.5 rotate-45 bg-white/70" />
      </div>
    </div>
  );
};

export function SideNav({ activeTab, onTabChange }: SideNavProps) {
  const { session } = useAuthStore();

  return (
    <aside
      className="relative z-20 w-24 h-[70vh] self-start flex flex-col items-center rounded-br-[5rem] shadow-[4px_0_24px_rgba(0,0,0,0.5)] shrink-0"
      style={theme.gradientNav}
    >
      <div className={theme.strokeRight} />
      <img
        src="/logo.svg"
        alt="Spellbound Logo"
        className="relative z-5 w-24 h-24 object-contain"
      />

      {session && (
        <div className="w-full flex flex-col gap-4 relative z-10 pl-0">
          <NavItem icon={BookMarked} label="Grimoire" active={activeTab === 'grimoire'} onClick={() => onTabChange('grimoire')} />
          <NavItem icon={Telescope} label="Compendium" active={activeTab === 'compendium'} onClick={() => onTabChange('compendium')} />
        </div>
      )}
    </aside>
  );
}
