/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCcw, Trash2, X } from "lucide-react";
import { TRASH_RETENTION_DAYS, useScenariosData, type TrashedChapitre } from "@/hooks/scenarios/useScenariosData";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysLeft(deletedAt: string) {
  const expiresAt = new Date(deletedAt).getTime() + TRASH_RETENTION_DAYS * DAY_MS;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / DAY_MS));
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

interface ChapitreTrashModalProps {
  scenarios: Array<{ id: string; title: string }>;
  onClose: () => void;
  onRestored: (chapitre: TrashedChapitre) => void;
}

export function ChapitreTrashModal({ scenarios, onClose, onRestored }: ChapitreTrashModalProps) {
  const scenariosData = useScenariosData();
  const [items, setItems] = useState<TrashedChapitre[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await scenariosData.fetchTrashedChapitres(scenarios.map((s) => s.id)));
    } catch (err: any) {
      setError(err?.message ?? "Impossible de charger la corbeille");
      setItems([]);
    }
  }, [scenarios, scenariosData]);

  useEffect(() => {
    void load();
  }, [load]);

  const restore = async (item: TrashedChapitre) => {
    setBusyId(item.id);
    setError(null);
    try {
      await scenariosData.restoreChapitre(item.id);
      setItems((prev) => prev?.filter((i) => i.id !== item.id) ?? null);
      onRestored(item);
    } catch (err: any) {
      setError(err?.message ?? "Erreur lors de la restauration");
    } finally {
      setBusyId(null);
    }
  };

  const deleteForever = async (item: TrashedChapitre) => {
    setBusyId(item.id);
    setError(null);
    try {
      await scenariosData.deleteChapitrePermanently(item.id);
      setItems((prev) => prev?.filter((i) => i.id !== item.id) ?? null);
      setConfirmDeleteId(null);
    } catch (err: any) {
      setError(err?.message ?? "Erreur lors de la suppression");
    } finally {
      setBusyId(null);
    }
  };

  const scenarioTitle = (id: string) => scenarios.find((s) => s.id === id)?.title ?? "";

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && !busyId && onClose()}
    >
      <div className="bg-[#1E1941] border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 shrink-0">
          <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4 text-white/60" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-serif text-white">Corbeille</h3>
            <p className="text-[11px] text-white/40">
              Les chapitres supprimés sont gardés {TRASH_RETENTION_DAYS} jours, puis effacés définitivement.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={!!busyId}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-3 px-3 py-2 rounded-lg text-[12px] text-red-300 bg-red-500/10 border border-red-500/20">
            {error}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
          {items === null ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-white/40" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-[13px] text-white/40 italic py-10">La corbeille est vide.</p>
          ) : (
            items.map((item) => {
              const left = daysLeft(item.deleted_at);
              const isBusy = busyId === item.id;
              const isConfirming = confirmDeleteId === item.id;
              return (
                <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/8 bg-white/3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-white/85 truncate">{item.title}</div>
                    <div className="text-[10px] text-white/35 truncate">
                      {scenarioTitle(item.scenario_id)} · supprimé le {dateFormatter.format(new Date(item.deleted_at))} ·{" "}
                      <span className={left <= 3 ? "text-amber-300/80" : ""}>
                        {left <= 1 ? "effacé demain" : `encore ${left} jours`}
                      </span>
                    </div>
                  </div>
                  {isConfirming ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={isBusy}
                        className="px-2 py-1.5 rounded-lg text-[11px] text-white/50 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => deleteForever(item)}
                        disabled={isBusy}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#ff6b6b]/15 text-[#ff6b6b] border border-[#ff6b6b]/30 hover:bg-[#ff6b6b]/25 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isBusy && <Loader2 className="w-3 h-3 animate-spin" />}
                        Effacer définitivement
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => restore(item)}
                        disabled={!!busyId}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[#E3CCCD]/10 text-[#E3CCCD] border border-[#E3CCCD]/25 hover:bg-[#E3CCCD]/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                        Restaurer
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(item.id)}
                        disabled={!!busyId}
                        className="p-1.5 rounded-lg text-white/30 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10 transition-colors disabled:opacity-50"
                        title="Effacer définitivement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
