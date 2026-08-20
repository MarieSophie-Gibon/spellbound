import { Link2, Plus, Trash2 } from "lucide-react";

export type LinkMode = "internal_block" | "cross_chapter";

export interface LinkBlockData {
  mode: LinkMode;
  label: string;
  targetBlockId?: string;
  targetChapitreId?: string;
  internalLinks?: Array<{
    label: string;
    targetBlockId: string;
  }>;
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
  onOpen: (targetBlockId?: string) => void;
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
  const normalizedInternalLinks = (data.internalLinks || []).map((entry) => ({
    label: typeof entry?.label === "string" ? entry.label : "",
    targetBlockId: typeof entry?.targetBlockId === "string" ? entry.targetBlockId : "",
  }));

  const internalLinks = normalizedInternalLinks.length > 0
    ? normalizedInternalLinks
    : (data.targetBlockId ? [{ label: data.label || "", targetBlockId: data.targetBlockId }] : []);

  const setInternalLinks = (nextLinks: Array<{ label: string; targetBlockId: string }>) => {
    const safeLinks = nextLinks.length > 0 ? nextLinks : [{ label: "", targetBlockId: "" }];
    const firstResolvedTarget = safeLinks.find((entry) => !!entry.targetBlockId)?.targetBlockId || "";
    onChange({ internalLinks: safeLinks, targetBlockId: firstResolvedTarget });
  };

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
          placeholder={data.mode === "internal_block" ? "Titre du bloc de choix (ex: Que font-ils ?)" : "Texte du lien (ex: Retour au camp)"}
          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white/85 outline-none focus:border-sky-300/35"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1.5 text-[11px] text-white/60">
            Mode
            <select
              value={data.mode}
              onChange={(e) => {
                const mode = e.target.value as LinkMode;
                onChange({
                  mode,
                  targetBlockId: "",
                  targetChapitreId: "",
                  internalLinks: mode === "internal_block" ? [{ label: "", targetBlockId: "" }] : [],
                });
              }}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white/85 outline-none focus:border-sky-300/35"
            >
              <option value="internal_block">Bloc du chapitre courant</option>
              <option value="cross_chapter">Autre chapitre</option>
            </select>
          </label>

          {data.mode === "cross_chapter" && (
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

        {data.mode === "internal_block" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-wider text-sky-200/80 font-semibold">Choix internes</p>
              <button
                type="button"
                onClick={() => setInternalLinks([...(internalLinks.length ? internalLinks : [{ label: "", targetBlockId: "" }]), { label: "", targetBlockId: "" }])}
                className="inline-flex items-center gap-1.5 rounded-md border border-sky-300/30 bg-sky-500/12 px-2 py-1 text-[11px] text-sky-100 hover:bg-sky-500/18"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter un choix
              </button>
            </div>

            {(internalLinks.length ? internalLinks : [{ label: "", targetBlockId: "" }]).map((choice, index) => (
              <div key={`${choice.targetBlockId || "empty"}-${index}`} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                <input
                  type="text"
                  value={choice.label}
                  onChange={(e) => {
                    const next = [...(internalLinks.length ? internalLinks : [{ label: "", targetBlockId: "" }])];
                    next[index] = { ...next[index], label: e.target.value };
                    setInternalLinks(next);
                  }}
                  placeholder="Texte du choix (ex: Prendre la porte de gauche)"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white/85 outline-none focus:border-sky-300/35"
                />

                <select
                  value={choice.targetBlockId}
                  onChange={(e) => {
                    const next = [...(internalLinks.length ? internalLinks : [{ label: "", targetBlockId: "" }])];
                    next[index] = { ...next[index], targetBlockId: e.target.value };
                    setInternalLinks(next);
                  }}
                  className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white/85 outline-none focus:border-sky-300/35"
                >
                  <option value="">Selectionner un bloc</option>
                  {internalTargets.map((target) => (
                    <option key={target.id} value={target.id}>{target.label}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    const source = internalLinks.length ? internalLinks : [{ label: "", targetBlockId: "" }];
                    if (source.length <= 1) {
                      setInternalLinks([{ label: "", targetBlockId: "" }]);
                      return;
                    }
                    setInternalLinks(source.filter((_, i) => i !== index));
                  }}
                  className="h-9.5 w-9.5 inline-flex items-center justify-center rounded-lg border border-white/10 bg-black/25 text-white/55 hover:text-red-300 hover:border-red-300/40"
                  title="Supprimer ce choix"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

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

  const selectedChapter = chapterTargets.find((target) => target.id === data.targetChapitreId);
  const selectedCrossBlock = targetChapterBlockTargets.find((target) => target.id === data.targetBlockId);

  if (data.mode === "internal_block") {
    const hasChoices = internalLinks.some((choice) => !!choice.targetBlockId);

    return (
      <div className="w-full rounded-xl border border-sky-300/20 bg-sky-400/7 px-4 py-3">
        <div className="flex items-center gap-2 text-sky-200">
          <Link2 className="w-4 h-4 shrink-0" />
          <span className="text-[14px] font-medium">{data.label || "Choix de navigation"}</span>
        </div>
        <p className="mt-1 text-[11px] text-white/50">Bifurcations internes du chapitre</p>

        <div className="mt-3 space-y-2">
          {internalLinks.length === 0 && (
            <p className="text-[11px] text-white/45">Aucun choix configure.</p>
          )}

          {internalLinks.map((choice, index) => {
            const internalTarget = internalTargets.find((target) => target.id === choice.targetBlockId);
            const choiceLabel = choice.label || internalTarget?.label || `Choix ${index + 1}`;
            const targetHint = internalTarget?.label || (choice.targetBlockId ? choice.targetBlockId : "Bloc non defini");

            return (
              <button
                key={`${choice.targetBlockId || "empty"}-${index}`}
                type="button"
                onClick={() => onOpen(choice.targetBlockId || undefined)}
                disabled={!choice.targetBlockId}
                className="w-full text-left rounded-lg border border-white/10 bg-black/20 hover:bg-black/30 px-3 py-2 transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <p className="text-[13px] text-white/85 font-medium">{choiceLabel}</p>
                <p className="text-[11px] text-white/50">Vers: {targetHint}</p>
              </button>
            );
          })}
        </div>

        {!hasChoices && (
          <p className="mt-2 text-[11px] text-white/45">Selectionnez au moins une cible pour activer les choix.</p>
        )}
      </div>
    );
  }

  const isTargetReady = !!data.targetChapitreId;
  const chapterLabel = selectedChapter?.label || data.targetChapitreId || "Chapitre non defini";
  const blockLabel = selectedCrossBlock?.label || (data.targetBlockId ? data.targetBlockId : "Haut du chapitre");

  return (
    <button
      type="button"
      onClick={() => onOpen()}
      disabled={!isTargetReady}
      className="w-full text-left rounded-xl border border-sky-300/20 bg-sky-400/7 hover:bg-sky-400/12 px-4 py-3 transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
    >
      <div className="flex items-center gap-2 text-sky-200">
        <Link2 className="w-4 h-4 shrink-0" />
        <span className="text-[14px] font-medium">{data.label || "Lien sans titre"}</span>
      </div>
      <p className="mt-1 text-[11px] text-white/50">Vers un autre chapitre</p>
      <p className="mt-2 text-[11px] text-white/65">
        Chapitre: <span className="text-white/85">{chapterLabel}</span>
      </p>
      <p className="text-[11px] text-white/65">
        Bloc: <span className="text-white/85">{blockLabel}</span>
      </p>
    </button>
  );
}
