import type { ReactNode } from "react";

const HEX_CLIP = "polygon(8px 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 8px 100%, 0 50%)";
const INNER_BG = "linear-gradient(to right, rgba(18, 24, 62, 0.9), rgba(87, 105, 214, 0.9))";

interface CombatTabButtonProps {
  onClick: () => void;
  icon?: ReactNode;
  label: string;
  className?: string;
  "aria-label"?: string;
}

/**
 * Bouton hexagonal partagé par Menu MJ, Retour et Fin du Tour.
 */
export function CombatTabButton({ onClick, icon, label, className = "", "aria-label": ariaLabel }: CombatTabButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className={`relative flex items-center justify-center h-7 px-2.5 cursor-pointer group outline-none border-none opacity-90 hover:opacity-100 transition-opacity ${className}`}
      style={{ clipPath: HEX_CLIP, background: "#E3CCCD" }}
    >
      <div className="absolute inset-px" style={{ clipPath: HEX_CLIP, background: INNER_BG }} />
      <div className="relative z-10 flex items-center gap-1.5 whitespace-nowrap">
        <div className="w-0.5 h-0.5 rotate-45 bg-white/70 shrink-0" />
        {icon}
        <span className="text-[10px] font-serif tracking-wide text-[#E3CCCD]">{label}</span>
        <div className="w-0.5 h-0.5 rotate-45 bg-white/70 shrink-0" />
      </div>
    </button>
  );
}
