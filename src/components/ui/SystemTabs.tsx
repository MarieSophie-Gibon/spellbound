import type { RpgSystem } from "@/lib/types/rpgSystem";
import { RPG_SYSTEMS } from "@/lib/types/rpgSystem";

interface SystemTabsProps {
  value: RpgSystem;
  onChange: (system: RpgSystem) => void;
  className?: string;
}

export function SystemTabs({ value, onChange, className = "" }: SystemTabsProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {RPG_SYSTEMS.map(({ value: sys, label }, i) => (
        <div key={sys} className="flex items-center gap-3">
          {i > 0 && <span className="text-white/15 text-[10px] select-none">✦</span>}
          <button
            onClick={() => onChange(sys)}
            className={`relative pb-1 text-[10px] uppercase tracking-[0.18em] transition-all duration-300 ${
              value === sys ? "text-[#E3CCCD]" : "text-white/25 hover:text-white/50"
            }`}
          >
            {label}
            <span
              className="absolute bottom-0 left-0 right-0 h-px bg-[#E3CCCD]/60 transition-all duration-300 origin-left"
              style={{ transform: value === sys ? "scaleX(1)" : "scaleX(0)", opacity: value === sys ? 1 : 0 }}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
