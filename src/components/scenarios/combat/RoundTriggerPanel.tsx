import { Plus, Trash2, X } from "lucide-react";
import type { RoundTriggerEvent } from "./types";

interface RoundTriggerPanelProps {
  isOpen: boolean;
  newTriggerRounds: string;
  newTriggerText: string;
  roundTriggers: RoundTriggerEvent[];
  onClose: () => void;
  onAddTrigger: () => void;
  onChangeRounds: (value: string) => void;
  onChangeText: (value: string) => void;
  onRemoveTrigger: (id: string) => void;
}

export function RoundTriggerPanel({
  isOpen,
  newTriggerRounds,
  newTriggerText,
  roundTriggers,
  onClose,
  onAddTrigger,
  onChangeRounds,
  onChangeText,
  onRemoveTrigger,
}: RoundTriggerPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-11 right-4 z-50 w-[min(340px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/16 bg-[#1C1740]/70 p-3 backdrop-blur-2xl">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">Évènements de round</h3>
        <button
          onClick={onClose}
          className="text-white/45 transition-colors hover:text-white/80"
          aria-label="Fermer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-[64px_1fr_auto] sm:items-center">
        <input
          type="number"
          min={1}
          value={newTriggerRounds}
          onChange={(e) => onChangeRounds(e.target.value)}
          className="min-w-0 h-8 rounded-lg border border-white/15 bg-white/6 px-2 text-xs text-white/90 outline-none focus:border-white/25"
          placeholder="R"
        />
        <input
          type="text"
          value={newTriggerText}
          onChange={(e) => onChangeText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onAddTrigger(); }}
          className="min-w-0 h-8 rounded-lg border border-white/15 bg-white/6 px-3 text-sm text-white/90 outline-none placeholder:text-white/35 focus:border-white/25"
          placeholder="Texte de l'évènement"
        />
        <button
          onClick={onAddTrigger}
          className="inline-flex h-8 w-8 justify-self-end items-center justify-center rounded-lg border border-white/20 bg-white/8 text-white/85 transition-colors hover:bg-white/14"
          aria-label="Ajouter un évènement"
          title="Ajouter"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
        {roundTriggers.length === 0 && (
          <p className="py-2 text-center text-[11px] italic text-white/35">Aucun évènement planifié</p>
        )}
        {roundTriggers
          .slice()
          .sort((a, b) => a.roundsLeft - b.roundsLeft || a.createdAt - b.createdAt)
          .map((event) => (
            <div key={event.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-2">
              <span className={`inline-flex h-6 min-w-12 items-center justify-center rounded-md border px-1 text-[11px] ${event.hasFired ? "border-amber-400/35 bg-amber-400/10 text-amber-200" : "border-white/20 bg-white/8 text-white/80"}`}>
                {event.hasFired ? "OK" : `R-${event.roundsLeft}`}
              </span>
              <p className="flex-1 text-xs text-white/90 whitespace-pre-wrap wrap-break-word">{event.label}</p>
              <button
                onClick={() => onRemoveTrigger(event.id)}
                className="text-white/40 transition-colors hover:text-red-300"
                aria-label="Supprimer cet évènement"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
