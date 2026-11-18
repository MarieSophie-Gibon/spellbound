/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { History, Loader2, RotateCcw, X } from "lucide-react";
import { useChapitreEditorData, type ChapitreHistoryEntry } from "@/hooks/scenarios/useChapitreEditorData";

const BLOCK_LABELS: Record<string, string> = {
  text: "Texte",
  quote: "Citation",
  image: "Image",
  location: "Lieu",
  loot: "Butin",
  investigation: "Investigation",
  npc: "PNJ",
  enemy: "Ennemis",
  mj_note: "Note MJ",
  clue: "Indice",
  link: "Lien",
  table: "Tableau",
};

// Clés techniques sans intérêt pour reconnaître une version.
const IGNORED_KEYS = /(^id$|Id$|_id$|url$|Url$|color|position|width|height|^x$|^y$)/;

// Extrait le texte lisible d'un bloc, quel que soit son type.
function blockText(value: unknown, key = ""): string[] {
  if (IGNORED_KEYS.test(key)) return [];
  if (typeof value === "string") {
    const text = value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return text ? [text] : [];
  }
  if (Array.isArray(value)) return value.flatMap((v) => blockText(v));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => blockText(v, k));
  }
  return [];
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

interface ChapitreHistoryModalProps {
  chapitreId: string;
  onClose: () => void;
  onRestored: () => void;
}

export function ChapitreHistoryModal({ chapitreId, onClose, onRestored }: ChapitreHistoryModalProps) {
  const editorData = useChapitreEditorData();
  const [versions, setVersions] = useState<ChapitreHistoryEntry[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Aperçu de la dernière version chargée ; il est « en cours » tant qu'il ne
  // correspond pas à la version sélectionnée.
  const [loadedPreview, setLoadedPreview] = useState<{ id: string; content: any[] } | null>(null);
  const preview = loadedPreview && loadedPreview.id === selectedId ? loadedPreview.content : null;
  const isPreviewLoading = !!selectedId && !preview;
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    editorData
      .fetchChapitreHistory(chapitreId)
      .then((list) => {
        if (cancelled) return;
        setVersions(list);
        setSelectedId(list[0]?.id ?? null);
      })
      .catch((err) => !cancelled && setError(err?.message ?? "Impossible de charger l'historique"));
    return () => {
      cancelled = true;
    };
  }, [chapitreId, editorData]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    editorData
      .fetchChapitreHistoryContent(selectedId)
      .then((content) => !cancelled && setLoadedPreview({ id: selectedId, content }))
      .catch((err) => !cancelled && setError(err?.message ?? "Impossible de charger cette version"));
    return () => {
      cancelled = true;
    };
  }, [selectedId, editorData]);

  const handleRestore = async () => {
    if (!selectedId) return;
    setIsRestoring(true);
    setError(null);
    try {
      await editorData.restoreChapitreVersion(selectedId);
      onRestored();
    } catch (err: any) {
      setError(err?.message ?? "Erreur lors de la restauration");
      setIsRestoring(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && !isRestoring && onClose()}
    >
      <div className="bg-[#1E1941] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 shrink-0">
          <div className="w-9 h-9 rounded-full bg-[#E3CCCD]/10 flex items-center justify-center shrink-0">
            <History className="w-4 h-4 text-[#E3CCCD]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-serif text-white">Historique du chapitre</h3>
            <p className="text-[11px] text-white/40">
              Une version est gardée toutes les 5 minutes de modification, 30 au maximum.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isRestoring}
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

        {versions === null ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-white/40" />
          </div>
        ) : versions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-16 px-6 text-center">
            <p className="text-[13px] text-white/40 italic">
              Aucune version précédente pour l'instant. Elles apparaîtront au fil des modifications.
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col md:flex-row">
            {/* Liste des versions */}
            <div className="md:w-60 shrink-0 max-h-48 md:max-h-none overflow-y-auto border-b md:border-b-0 md:border-r border-white/5 p-2 space-y-1">
              {versions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedId(v.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[12px] transition-colors ${
                    v.id === selectedId
                      ? "bg-[#E3CCCD]/15 text-[#E3CCCD]"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className="first-letter:uppercase">{dateFormatter.format(new Date(v.saved_at))}</div>
                  <div className="text-[10px] text-white/30 truncate">{v.title}</div>
                </button>
              ))}
            </div>

            {/* Aperçu */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3">
                {isPreviewLoading || !preview ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-white/40" />
                  </div>
                ) : preview.length === 0 ? (
                  <p className="text-[13px] text-white/40 italic">Version vide.</p>
                ) : (
                  preview.map((block, i) => {
                    const text = blockText(block?.data).join(" · ");
                    return (
                      <div key={block?.id ?? i} className="space-y-1">
                        <span className="text-[9px] uppercase tracking-widest text-[#E3CCCD]/50">
                          {BLOCK_LABELS[block?.type] ?? block?.type}
                        </span>
                        <p className="text-[13px] text-white/70 leading-relaxed whitespace-pre-wrap wrap-break-word line-clamp-6">
                          {text || <span className="italic text-white/25">(sans texte)</span>}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between gap-3 shrink-0">
                <p className="text-[11px] text-white/40">
                  Le contenu actuel sera gardé dans l'historique : la restauration est annulable.
                </p>
                <button
                  onClick={handleRestore}
                  disabled={!selectedId || isRestoring || isPreviewLoading}
                  className="shrink-0 px-4 py-2 rounded-xl text-[12px] font-bold bg-[#E3CCCD]/15 text-[#E3CCCD] border border-[#E3CCCD]/30 hover:bg-[#E3CCCD]/25 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isRestoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  Restaurer cette version
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
