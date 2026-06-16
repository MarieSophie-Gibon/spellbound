import { ChevronDown, ChevronUp, X } from "lucide-react";
import { CONDITION_OPTIONS, FANION_BG } from "./types";
import type { Combatant, ConditionKey } from "./types";

interface CombatantRowProps {
  combatant: Combatant;
  isActive: boolean;
  isSelected: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function CombatantRow({ combatant, isActive, isSelected, canMoveUp, canMoveDown, onSelect, onRemove, onMoveUp, onMoveDown }: CombatantRowProps) {
  const fanionBg = FANION_BG[combatant.type];

  return (
    <div
      className={`relative w-full h-15 shrink-0 flex items-center group cursor-pointer transition-all duration-200
        ${isActive ? "brightness-125" : ""}
        ${isSelected ? "brightness-110 translate-x-1.5" : "opacity-90 hover:opacity-100 hover:translate-x-1 hover:brightness-105"}`}
      onClick={onSelect}
    >
      {/* Cercle avatar — outer stroke blanc */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 w-15 h-15 rounded-full z-20"
        style={{ background: "rgba(255,255,255,0.55)" }}
      >
        <div className="absolute inset-px rounded-full overflow-hidden" style={{ background: fanionBg }}>
          <div className="absolute inset-0.75 rounded-full border border-white/20 pointer-events-none z-10" />
          <img
            src={combatant.imageUrl || "/default-avatar.png"}
            alt={combatant.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Conditions */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 z-30">
          {combatant.conditions.map((cond: ConditionKey) => {
            const opt = CONDITION_OPTIONS.find((o) => o.key === cond);
            return (
              <div
                key={cond}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border-[1.5px] border-white ${opt?.bg}`}
                title={opt?.label}
              >
                {opt?.icon}
              </div>
            );
          })}
        </div>
      </div>

      {/* Boutons order + retrait — overlay sur l'avatar au hover */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-15 h-15 rounded-full z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-0.5 bg-black/55">
        <button
          onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }}
          disabled={!canMoveUp}
          className="flex items-center justify-center text-white hover:text-indigo-200 disabled:opacity-20 disabled:cursor-default transition-colors"
          title="Remonter"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="flex items-center justify-center text-white/60 hover:text-red-300 transition-colors"
          title="Retirer du combat"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}
          disabled={!canMoveDown}
          className="flex items-center justify-center text-white hover:text-indigo-200 disabled:opacity-20 disabled:cursor-default transition-colors"
          title="Descendre"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Corps du fanion — rétracté si inactif */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 h-11 transition-all duration-300 ${
          isActive ? "left-7 right-4" : "left-7 right-[20%]"
        }`}
        style={{ clipPath: "polygon(0% 0%, 88% 0%, 100% 50%, 88% 100%, 0% 100%)", background: "rgba(255,255,255,0.55)" }}
      >
        <div
          className="absolute inset-px flex items-center pl-9 pr-5 overflow-hidden"
          style={{ clipPath: "polygon(0% 0%, 88% 0%, 100% 50%, 88% 100%, 0% 100%)", background: fanionBg }}
        >
          <div
            className="absolute inset-0.75 border border-white/20 pointer-events-none"
            style={{ clipPath: "polygon(0% 0%, 88% 0%, 100% 50%, 88% 100%, 0% 100%)" }}
          />
          <span className="relative z-10 text-white font-medium text-sm truncate">{combatant.name}</span>
          {isActive && <div className="absolute right-[14%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rotate-45 bg-white/70 shrink-0" />}
        </div>
      </div>

      {/* Ligne de connexion si sélectionné */}
      {isSelected && (
        <div className="absolute left-full top-1/2 w-62.5 h-px bg-white/40 border-t border-dashed border-white/60 -z-10" />
      )}
    </div>
  );
}
