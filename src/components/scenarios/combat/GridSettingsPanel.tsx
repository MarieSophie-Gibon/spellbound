import { useState } from "react";
import { Minus, Plus, Scan, Trash2, X } from "lucide-react";
import {
  DEFAULT_GRID,
  GRID_CELL_MAX,
  GRID_CELL_MIN,
  normalizeGrid,
  resetGrid,
  type BattleMapGrid,
  type DiagonalRule,
} from "./types";

interface GridSettingsPanelProps {
  grid: BattleMapGrid;
  onChange: (grid: BattleMapGrid) => void;
  onStartCalibration: () => void;
  onClose: () => void;
}

const FINE_STEP = 0.05;

const DIAGONAL_OPTIONS: Array<{ rule: DiagonalRule; label: string; title: string }> = [
  { rule: "one", label: "1 case", title: "Une diagonale compte 1 case" },
  { rule: "alternate", label: "1-2-1", title: "Une diagonale sur deux compte double" },
  { rule: "euclidean", label: "Réelle", title: "Distance réelle (≈ 1,4 case par diagonale)" },
];

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/40">
        <span>{label}</span>
        <span className="font-mono normal-case tracking-normal text-white/60">{display}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10"
          title="Diminuer"
        >
          <Minus className="w-3 h-3" />
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-amber-300 cursor-pointer"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10"
          title="Augmenter"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

/** Réglages du quadrillage (taille, décalage, apparence, visibilité joueurs). */
export function GridSettingsPanel({ grid, onChange, onStartCalibration, onClose }: GridSettingsPanelProps) {
  const update = (patch: Partial<BattleMapGrid>) => onChange(normalizeGrid({ ...grid, ...patch }));
  const cellsAcross = 100 / grid.cellSize;
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  // Rien à supprimer : grille désactivée et jamais réglée.
  const isPristine =
    !grid.enabled &&
    grid.cellSize === DEFAULT_GRID.cellSize &&
    grid.offsetX === DEFAULT_GRID.offsetX &&
    grid.offsetY === DEFAULT_GRID.offsetY;

  return (
    <div
      className="w-64 max-h-[70vh] overflow-y-auto rounded-xl bg-[#1b1738]/95 backdrop-blur border border-white/15 shadow-2xl p-3 space-y-3"
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-widest text-white/60 font-semibold">Quadrillage</span>
        <button onClick={onClose} className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10" title="Fermer">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <label className="flex items-center justify-between gap-2 cursor-pointer">
        <span className="text-[12px] text-white/80">Afficher le quadrillage</span>
        <input
          type="checkbox"
          checked={grid.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          className="accent-amber-300 w-4 h-4"
        />
      </label>

      <button
        type="button"
        onClick={onStartCalibration}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-400/10 border border-amber-300/30 text-amber-100 text-[12px] hover:bg-amber-400/20 transition-colors"
        title="Tracer une ou plusieurs cases de la grille dessinée sur la carte"
      >
        <Scan className="w-3.5 h-3.5" /> Caler sur la carte
      </button>

      <Slider
        label="Taille de case"
        value={grid.cellSize}
        min={GRID_CELL_MIN}
        max={GRID_CELL_MAX}
        step={FINE_STEP}
        display={`≈ ${cellsAcross.toFixed(1)} cases en largeur`}
        onChange={(cellSize) => update({ cellSize })}
      />
      <Slider
        label="Décalage horizontal"
        value={grid.offsetX}
        min={0}
        max={grid.cellSize}
        step={0.01}
        display={`${Math.round((grid.offsetX / grid.cellSize) * 100)} %`}
        onChange={(offsetX) => update({ offsetX })}
      />
      <Slider
        label="Décalage vertical"
        value={grid.offsetY}
        min={0}
        max={grid.cellSize}
        step={0.01}
        display={`${Math.round((grid.offsetY / grid.cellSize) * 100)} %`}
        onChange={(offsetY) => update({ offsetY })}
      />
      <Slider
        label="Opacité"
        value={grid.opacity}
        min={0.05}
        max={1}
        step={0.05}
        display={`${Math.round(grid.opacity * 100)} %`}
        onChange={(opacity) => update({ opacity })}
      />

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-widest text-white/40">Couleur</span>
        <div className="flex p-0.5 rounded-lg bg-black/40 border border-white/10">
          {(["light", "dark"] as const).map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => update({ color })}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${
                grid.color === color ? "bg-white/15 text-white" : "text-white/45 hover:text-white/80"
              }`}
            >
              {color === "light" ? "Claire" : "Sombre"}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center justify-between gap-2 cursor-pointer">
        <span className="text-[12px] text-white/80">Visible par les joueurs</span>
        <input
          type="checkbox"
          checked={grid.showToPlayers}
          onChange={(e) => update({ showToPlayers: e.target.checked })}
          className="accent-amber-300 w-4 h-4"
        />
      </label>

      <div className="pt-2 border-t border-white/10 space-y-3">
        <span className="block text-[10px] uppercase tracking-widest text-white/40">Déplacements</span>
        <label className="flex items-center justify-between gap-2 cursor-pointer">
          <span className="text-[12px] text-white/80">Jetons au centre des cases</span>
          <input
            type="checkbox"
            checked={grid.snapTokens}
            onChange={(e) => update({ snapTokens: e.target.checked })}
            className="accent-amber-300 w-4 h-4"
          />
        </label>
        <label className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-white/80">Mètres par case</span>
          <input
            type="number"
            min={0.1}
            max={100}
            step={0.5}
            value={grid.metersPerCell}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (Number.isFinite(value) && value > 0) update({ metersPerCell: value });
            }}
            className="w-16 px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-center text-[12px] text-white outline-none"
          />
        </label>
        <div className="space-y-1.5">
          <span className="text-[12px] text-white/80">Diagonales</span>
          <div className="grid grid-cols-3 p-0.5 rounded-lg bg-black/40 border border-white/10">
            {DIAGONAL_OPTIONS.map(({ rule, label, title }) => (
              <button
                key={rule}
                type="button"
                onClick={() => update({ diagonalRule: rule })}
                title={title}
                className={`px-1.5 py-1 rounded-md text-[11px] transition-colors ${
                  grid.diagonalRule === rule ? "bg-white/15 text-white" : "text-white/45 hover:text-white/80"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-white/10">
        {isConfirmingDelete ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-white/60">Supprimer le quadrillage ?</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-2 py-1 rounded-md text-[11px] text-white/60 hover:text-white hover:bg-white/10"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(resetGrid(grid));
                  setIsConfirmingDelete(false);
                }}
                className="px-2 py-1 rounded-md text-[11px] font-semibold bg-red-500/15 text-red-300 border border-red-400/30 hover:bg-red-500/25"
              >
                Supprimer
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            disabled={isPristine}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-red-300/80 hover:text-red-200 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
            title="Désactive la grille et remet sa taille et son décalage à zéro"
          >
            <Trash2 className="w-3.5 h-3.5" /> Supprimer le quadrillage
          </button>
        )}
      </div>
    </div>
  );
}
