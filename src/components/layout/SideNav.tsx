/* eslint-disable @typescript-eslint/no-explicit-any */
import { theme } from "@/lib/theme";
import { BookMarked, Telescope, ScrollText, Users } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";

interface SideNavProps {
  activeTab: 'grimoire' | 'compendium' | 'scenarios' | 'personnages' | 'none';
  onTabChange: (tab: 'grimoire' | 'compendium' | 'scenarios' | 'personnages' | 'none') => void;
  tabs?: string[];
}

// On ajoute la prop isCollapsed
const NavItem = ({ label, icon: Icon, active, onClick, isCollapsed }: any) => {
  return (
    <div
      onClick={onClick}
      // On réduit la largeur (w-16 au lieu de w-44) si collapsed
      className={`relative flex items-center h-10 cursor-pointer transition-all duration-300 ${
        active ? "opacity-100" : "opacity-60 hover:opacity-100"
      } ${isCollapsed ? "w-16" : "w-44"}`}
      style={{
        clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)",
        background: "rgba(227, 204, 205, 0.4)",
      }}
    >
      <div
        // On centre l'icône si collapsed, sinon on garde le padding
        className={`absolute inset-px left-0 flex items-center ${isCollapsed ? 'justify-center pr-3' : 'px-4'}`}
        style={{
          clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)",
          background: active ? theme.gradientTab?.background : theme.gradientTab?.inactive,
        }}
      >
        <Icon className={`w-4 h-4 text-white ${isCollapsed ? '' : 'mr-3 shrink-0'}`} />
        
        {/* On masque le texte si collapsed */}
        {!isCollapsed && (
          <span className="font-serif text-[13px] text-white tracking-widest whitespace-nowrap">
            {label}
          </span>
        )}

        {/* Le petit losange décoratif s'ajuste */}
        <div className={`absolute w-1.5 h-1.5 rotate-45 bg-white/70 ${isCollapsed ? 'right-2.5' : 'right-5'}`} />
      </div>
    </div>
  );
};

export function SideNav({ activeTab, onTabChange, tabs = ["grimoire", "compendium", "scenarios", "personnages"] }: SideNavProps) {
  const { session } = useAuthStore();
  
  // LOGIQUE DE RÉTRACTION : Rétracté si un onglet est actif !
  const isCollapsed = activeTab !== 'none';

  return (
    <aside
      className="relative z-20 w-24 h-[70vh] self-start flex flex-col items-center rounded-br-[5rem] shadow-[4px_0_24px_rgba(0,0,0,0.5)] shrink-0 transition-all duration-300"
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
          {tabs.includes("grimoire") && (
            <NavItem
              icon={BookMarked}
              label="Grimoire"
              active={activeTab === 'grimoire'}
              onClick={() => onTabChange('grimoire')}
              isCollapsed={isCollapsed}
            />
          )}
          {tabs.includes("compendium") && (
            <NavItem
              icon={Telescope}
              label="Compendium"
              active={activeTab === 'compendium'}
              onClick={() => onTabChange('compendium')}
              isCollapsed={isCollapsed}
            />
          )}
          {tabs.includes("scenarios") && (
            <NavItem
              icon={ScrollText}
              label="Scénarios"
              active={activeTab === 'scenarios'}
              onClick={() => onTabChange('scenarios')}
              isCollapsed={isCollapsed}
            />
          )}
          {tabs.includes("personnages") && (
            <NavItem
              icon={Users}
              label="Personnages"
              active={activeTab === 'personnages'}
              onClick={() => onTabChange('personnages')}
              isCollapsed={isCollapsed}
            />
          )}
        </div>
      )}
    </aside>
  );
}