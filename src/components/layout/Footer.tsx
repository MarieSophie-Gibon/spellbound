import { theme } from "@/lib/theme";

export function Footer() {
  return (
    <footer
      className="relative h-15 border-t border-white/10 shrink-0 flex items-center justify-between px-6 shadow-[0_-4px_24px_rgba(0,0,0,0.2)]"
      style={theme.gradientFooter}
    >
      <div className={theme.strokeTop} />
      <span className="text-[10px] uppercase tracking-widest text-white/50 font-light">
        Spellbound
      </span>

      {/* Espace réservé pour les outils de la campagne (dés lancés, statut réseau, etc.) */}
      <div className="flex items-center gap-4 text-white/50"></div>
    </footer>
  );
}
