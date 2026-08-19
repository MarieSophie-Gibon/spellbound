import { Link2 } from "lucide-react";

export type LinkMode = "internal_block" | "cross_chapter";

export interface LinkBlockData {
  mode: LinkMode;
  label: string;
  targetBlockId?: string;
  targetChapitreId?: string;
}

interface LinkTargetOption {
  id: string;
  label: string;
}

interface LinkBlockProps {
  data: LinkBlockData;
  isEditing: boolean;
  internalTargets: LinkTargetOption[];
  chapterTargets: LinkTargetOption[];
  targetChapterBlockTargets: LinkTargetOption[];
  onChange: (patch: Partial<LinkBlockData>) => void;
  onOpen: () => void;
}

export function LinkBlock({
  data,
  isEditing,
  internalTargets,
  chapterTargets,
  targetChapterBlockTargets,
  onChange,
  onOpen,
}: LinkBlockProps) {
  if (isEditing) {
    return (
      <div className="rounded-xl border border-sky-300/25 bg-sky-500/8 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sky-200/90 text-[12px] uppercase tracking-wider font-semibold">
          <Link2 className="w-4 h-4" />
          Link / Retrolien
        </div>

        <input
          type="text"
          value={data.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Texte du lien (ex: Retour au camp)"
          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white/85 outline-none focus:border-sky-300/35"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1.5 text-[11px] text-white/60">
            Mode
            <select
              value={data.mode}
              onChange={(e) => {
                const mode = e.target.value as LinkMode;
                onChange({ mode, targetBlockId: "", targetChapitreId: "" });
              }}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white/85 outline-none focus:border-sky-300/35"
            >
              <option value="internal_block">Bloc du chapitre courant</option>
              <option value="cross_chapter">Autre chapitre</option>
            </select>
          </label>

          {data.mode === "internal_block" ? (
            <label className="flex flex-col gap-1.5 text-[11px] text-white/60">
              Bloc cible
              <select
                value={data.targetBlockId || ""}
                onChange={(e) => onChange({ targetBlockId: e.target.value })}
                className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white/85 outline-none focus:border-sky-300/35"
              >
                <option value="">Selectionner un bloc</option>
                {internalTargets.map((target) => (
                  <option key={target.id} value={target.id}>{target.label}</option>
                ))}
              </select>
            </label>
          ) : (
            <label className="flex flex-col gap-1.5 text-[11px] text-white/60">
              Chapitre cible
              <select
                value={data.targetChapitreId || ""}
                onChange={(e) => onChange({ targetChapitreId: e.target.value, targetBlockId: "" })}
                className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white/85 outline-none focus:border-sky-300/35"
              >
                <option value="">Selectionner un chapitre</option>
                {chapterTargets.map((target) => (
                  <option key={target.id} value={target.id}>{target.label}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        {data.mode === "cross_chapter" && !!data.targetChapitreId && (
          <label className="flex flex-col gap-1.5 text-[11px] text-white/60">
            Bloc cible (optionnel)
            <select
              value={data.targetBlockId || ""}
              onChange={(e) => onChange({ targetBlockId: e.target.value })}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white/85 outline-none focus:border-sky-300/35"
            >
              <option value="">Ouvrir en haut du chapitre</option>
              {targetChapterBlockTargets.map((target) => (
                <option key={target.id} value={target.id}>{target.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>
    );
  }

    const internalTarget = internalTargets.find((target) => target.id === data.targetBlockId);
    const selectedChapter = chapterTargets.find((target) => target.id === data.targetChapitreId);
    const selectedCrossBlock = targetChapterBlockTargets.find((target) => target.id === data.targetBlockId);

  const isTargetReady = data.mode === "internal_block"
    ? !!data.targetBlockId
    : !!data.targetChapitreId;

    const chapterLabel = data.mode === "internal_block"
      ? "Ce chapitre"
      : (selectedChapter?.label || data.targetChapitreId || "Chapitre non defini");

    const blockLabel = data.mode === "internal_block"
      ? (internalTarget?.label || data.targetBlockId || "Bloc non defini")
      : (selectedCrossBlock?.label || (data.targetBlockId ? data.targetBlockId : "Haut du chapitre"));

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!isTargetReady}
      className="w-full text-left rounded-xl border border-sky-300/20 bg-sky-400/7 hover:bg-sky-400/12 px-4 py-3 transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
    >
      <div className="flex items-center gap-2 text-sky-200">
        <Link2 className="w-4 h-4 shrink-0" />
        <span className="text-[14px] font-medium">{data.label || "Lien sans titre"}</span>
      </div>
      <p className="mt-1 text-[11px] text-white/50">
        {data.mode === "internal_block" ? "Vers un bloc de ce chapitre" : "Vers un autre chapitre"}
      </p>
      <p className="mt-2 text-[11px] text-white/65">
        Chapitre: <span className="text-white/85">{chapterLabel}</span>
      </p>
      <p className="text-[11px] text-white/65">
        Bloc: <span className="text-white/85">{blockLabel}</span>
      </p>
    </button>
  );
}
