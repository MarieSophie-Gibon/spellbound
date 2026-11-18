import { Eye, RotateCcw } from "lucide-react";
import { VISION_ANGLES, VISION_RANGE_MAX, type TokenVision } from "./types";

interface VisionPanelProps {
  name: string;
  vision: TokenVision;
  metersPerCell: number;
  /** Portée lue dans les traits du peuple (en cases), si elle existe. */
  peupleRange: number | null;
  onChange: (vision: TokenVision) => void;
}

const meters = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** Réglages du cône de vision du PJ sélectionné. */
export function VisionPanel({ name, vision, metersPerCell, peupleRange, onChange }: VisionPanelProps) {
  const update = (patch: Partial<TokenVision>) => onChange({ ...vision, ...patch });

  return (
    <div
      className="w-60 rounded-xl bg-[#1b1738]/95 backdrop-blur border border-white/15 shadow-2xl p-3 space-y-3"
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2">
        <Eye className="w-3.5 h-3.5 text-amber-300 shrink-0" />
        <span className="text-[11px] uppercase tracking-widest text-white/60 font-semibold truncate">Vision · {name}</span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/40">
          <span>Portée</span>
          <span className="font-mono normal-case tracking-normal text-white/60">
            {meters.format(vision.range)} cases · {meters.format(vision.range * metersPerCell)} m
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={VISION_RANGE_MAX}
          step={0.5}
          value={vision.range}
          onChange={(e) => update({ range: Number(e.target.value) })}
          className="w-full accent-amber-300 cursor-pointer"
        />
        {peupleRange !== null && Math.abs(peupleRange - vision.range) > 0.01 && (
          <button
            type="button"
            onClick={() => update({ range: Math.min(VISION_RANGE_MAX, Math.round(peupleRange * 2) / 2) })}
            className="flex items-center gap-1 text-[11px] text-amber-200/70 hover:text-amber-200"
          >
            <RotateCcw className="w-3 h-3" /> Portée du peuple ({meters.format(peupleRange * metersPerCell)} m)
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <span className="text-[10px] uppercase tracking-widest text-white/40">Ouverture</span>
        <div className="grid grid-cols-5 p-0.5 rounded-lg bg-black/40 border border-white/10">
          {VISION_ANGLES.map((angle) => (
            <button
              key={angle}
              type="button"
              onClick={() => update({ angle })}
              title={angle === 360 ? "Tout autour (source de lumière, vision dans le noir)" : `Cône de ${angle}°`}
              className={`px-1 py-1 rounded-md text-[11px] transition-colors ${
                vision.angle === angle ? "bg-white/15 text-white" : "text-white/45 hover:text-white/80"
              }`}
            >
              {angle === 360 ? "360°" : `${angle}°`}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/40">
          <span>Orientation</span>
          <span className="font-mono normal-case tracking-normal text-white/60">{Math.round(vision.direction)}°</span>
        </div>
        <input
          type="range"
          min={-180}
          max={180}
          step={5}
          value={vision.direction}
          onChange={(e) => update({ direction: Number(e.target.value) })}
          disabled={vision.angle >= 360}
          className="w-full accent-amber-300 cursor-pointer disabled:opacity-30"
        />
        <p className="text-[10px] text-white/35 leading-snug">
          Suit le déplacement du jeton ; ajustable aussi avec la poignée au bout du cône.
        </p>
      </div>
    </div>
  );
}
