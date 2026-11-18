import { useState } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff, Loader2, Skull, Sparkles, User, X } from "lucide-react";
import { isCharacterReveal, type StreamReveal, type StreamRevealCard } from "@/lib/streamReveal";
import type { useStreamReveal } from "@/hooks/scenarios/useStreamReveal";

type StreamRevealApi = ReturnType<typeof useStreamReveal>;

function revealLabel(reveal: StreamReveal) {
  if (reveal.cards.length > 1) return `Rencontre (${reveal.cards.reduce((n, c) => n + (c.count ?? 1), 0)})`;
  return reveal.cards[0]?.name || (reveal.kind === "location" ? "Lieu" : "Image");
}

/** Bouton « Montrer aux joueurs » ; actif (et retire la révélation) quand sa source est affichée. */
export function StreamRevealButton({
  active,
  onClick,
  onClear,
  disabled = false,
  className = "",
  title = "Montrer aux joueurs",
}: {
  active: boolean;
  onClick: () => void;
  onClear: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={active ? onClear : onClick}
      disabled={disabled}
      title={active ? "Retirer de l'écran des joueurs" : title}
      className={`p-1 md:p-1.5 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? "text-amber-300 bg-amber-400/15 hover:bg-amber-400/25"
          : "text-white/40 hover:text-amber-300 hover:bg-amber-400/10"
      } ${className}`}
    >
      <Sparkles className="w-4 h-4" />
    </button>
  );
}

export interface StreamRevealCandidate {
  /** Identifiant stable (bloc, entité du combat). */
  key: string;
  card: StreamRevealCard;
}

/**
 * Choix des PNJ / monstres à montrer : cases à cocher, option « masquer les noms ».
 * Les candidats cochés au départ sont ceux de `initialSelected`.
 */
export function StreamRevealPicker({
  candidates,
  initialSelected,
  onConfirm,
  onClose,
}: {
  candidates: StreamRevealCandidate[];
  initialSelected: string[];
  onConfirm: (selected: StreamRevealCandidate[], nameHidden: boolean) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected));
  const [nameHidden, setNameHidden] = useState(false);
  const allSelected = selected.size === candidates.length;
  const chosen = candidates.filter((c) => selected.has(c.key));
  const chosenCount = chosen.reduce((n, c) => n + (c.card.count ?? 1), 0);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return createPortal(
    <div
      className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm max-h-[80vh] flex flex-col rounded-2xl bg-[#1E1941] border border-amber-300/20 shadow-2xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <h3 className="flex-1 font-serif text-white">Montrer aux joueurs</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
          <span className="text-[10px] uppercase tracking-widest text-white/35">
            {selected.size} / {candidates.length} sélectionné{selected.size > 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setSelected(allSelected ? new Set() : new Set(candidates.map((c) => c.key)))}
            className="text-[11px] text-amber-200/70 hover:text-amber-200 transition-colors"
          >
            {allSelected ? "Tout décocher" : "Tout cocher"}
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 space-y-1">
          {candidates.map(({ key, card }) => {
            const checked = selected.has(key);
            const Placeholder = card.kind === "npc" ? User : Skull;
            return (
              <label
                key={key}
                className={`flex items-center gap-3 px-2 py-2 rounded-xl cursor-pointer border transition-colors ${
                  checked ? "bg-amber-400/10 border-amber-300/25" : "border-transparent hover:bg-white/5"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(key)}
                  className="accent-amber-400 w-4 h-4 shrink-0"
                />
                {card.imageUrl ? (
                  <img src={card.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover border border-white/10 shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Placeholder className="w-4 h-4 text-white/25" />
                  </div>
                )}
                <span className="flex-1 min-w-0 text-[13px] text-white/85 truncate">{card.name}</span>
                {card.count && card.count > 1 && (
                  <span className="text-[11px] font-mono text-amber-200/70 shrink-0">×{card.count}</span>
                )}
                <span className="text-[9px] uppercase tracking-widest text-white/30 shrink-0">
                  {card.kind === "npc" ? "PNJ" : "Monstre"}
                </span>
              </label>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-white/5 space-y-3 shrink-0">
          <label className="flex items-center gap-2 cursor-pointer w-max">
            <input
              type="checkbox"
              checked={nameHidden}
              onChange={(e) => setNameHidden(e.target.checked)}
              className="accent-amber-400 w-4 h-4"
            />
            <span className="text-[12px] text-white/70">Masquer les noms (« ??? »)</span>
          </label>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-[12px] text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => onConfirm(chosen, nameHidden)}
              disabled={chosen.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold bg-amber-400/15 text-amber-200 border border-amber-300/30 hover:bg-amber-400/25 transition-colors disabled:opacity-40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Révéler{chosenCount > 0 ? ` (${chosenCount})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Pastille « En direct » : ce que voient les joueurs, avec nom à dévoiler et retrait. */
export function StreamRevealControl({ api }: { api: StreamRevealApi }) {
  const { current, isOpeningScreen, clear, setNameHidden } = api;
  if (!current && !isOpeningScreen) return null;

  return createPortal(
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-200 max-w-[calc(100vw-2rem)]">
      <div className="flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-full bg-[#1b1738]/95 border border-amber-300/30 shadow-2xl shadow-black/50 backdrop-blur">
        {isOpeningScreen && !current ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-amber-300 shrink-0 ml-1" />
            <span className="text-[12px] text-white/70 pr-2">Ouverture de l'écran des joueurs…</span>
            <button
              onClick={clear}
              className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              title="Annuler"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : current ? (
          <>
            <span className="relative flex w-2 h-2 shrink-0 ml-1">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-red-500" />
            </span>
            {current.cards[0]?.imageUrl && (
              <img src={current.cards[0].imageUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-white/15 shrink-0" />
            )}
            <span className="text-[12px] text-white/85 truncate max-w-48">
              <span className="text-white/40">Joueurs : </span>
              {revealLabel(current)}
            </span>
            {isCharacterReveal(current.kind) && (
              <button
                onClick={() => setNameHidden(!current.nameHidden)}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] transition-colors ${
                  current.nameHidden
                    ? "bg-amber-400/15 text-amber-200 hover:bg-amber-400/25"
                    : "text-white/50 hover:text-white hover:bg-white/10"
                }`}
                title={current.nameHidden ? "Dévoiler les noms aux joueurs" : "Masquer les noms (???)"}
              >
                {current.nameHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {current.nameHidden ? "Dévoiler" : "Masquer"} {current.cards.length > 1 ? "les noms" : "le nom"}
              </button>
            )}
            <button
              onClick={clear}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/8 text-white/80 hover:bg-red-500/20 hover:text-red-200 transition-colors"
              title="Retirer de l'écran des joueurs"
            >
              <X className="w-3.5 h-3.5" /> Retirer
            </button>
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
