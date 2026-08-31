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
    targetChapitreId?: string;
  }>;
}

interface LinkTargetOption {
  id: string;
  label: string;
}

interface LinkChoice {
  label: string;
  targetBlockId: string;
  targetChapitreId: string;
}

const EMPTY_CHOICE: LinkChoice = { label: "", targetBlockId: "", targetChapitreId: "" };

interface LinkBlockProps {
  data: LinkBlockData;
  isEditing: boolean;
  internalTargets: LinkTargetOption[];
  chapterTargets: LinkTargetOption[];
  getChapitreBlockTargets: (chapitreId: string) => LinkTargetOption[];
  onChange: (patch: Partial<LinkBlockData>) => void;
  onOpen: (targetBlockId?: string, targetChapitreId?: string) => void;
}

export function LinkBlock({
  data,
  isEditing,
  internalTargets,
  chapterTargets,
  getChapitreBlockTargets,
  onChange,
  onOpen,
}: LinkBlockProps) {
  const internalLinks: LinkChoice[] = (data.internalLinks || []).map((entry) => ({
    label: typeof entry?.label === "string" ? entry.label : "",
    targetBlockId: typeof entry?.targetBlockId === "string" ? entry.targetBlockId : "",
    targetChapitreId: typeof entry?.targetChapitreId === "string" ? entry.targetChapitreId : "",
  }));

  const editableLinks = internalLinks.length ? internalLinks : [EMPTY_CHOICE];

  const setInternalLinks = (nextLinks: LinkChoice[]) => {
    const safeLinks = nextLinks.length > 0 ? nextLinks : [EMPTY_CHOICE];
    const firstResolvedTarget = safeLinks.find((entry) => !!entry.targetBlockId && !entry.targetChapitreId)?.targetBlockId || "";
    onChange({ internalLinks: safeLinks, targetBlockId: firstResolvedTarget });
  };

  const blockTargetsForChoice = (choice: LinkChoice) => (
    choice.targetChapitreId ? getChapitreBlockTargets(choice.targetChapitreId) : internalTargets
  );

  const updateChoice = (index: number, patch: Partial<LinkChoice>) => {
    const next = [...editableLinks];
    next[index] = { ...next[index], ...patch };
    setInternalLinks(next);
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
          placeholder="Titre du bloc de choix (ex: Que font-ils ?)"
          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white/85 outline-none focus:border-sky-300/35"
        />

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-sky-200/80 font-semibold">Choix</p>
            <button
              type="button"
              onClick={() => setInternalLinks([...editableLinks, EMPTY_CHOICE])}
              className="inline-flex items-center gap-1.5 rounded-md border border-sky-300/30 bg-sky-500/12 px-2 py-1 text-[11px] text-sky-100 hover:bg-sky-500/18"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter un choix
            </button>
          </div>

          {editableLinks.map((choice, index) => (
            <div key={`${choice.targetChapitreId || "current"}-${choice.targetBlockId || "empty"}-${index}`} className="rounded-lg border border-white/8 bg-black/15 p-2 space-y-2">
              <input
                type="text"
                value={choice.label}
                onChange={(e) => updateChoice(index, { label: e.target.value })}
                placeholder="Texte du choix (ex: Prendre la porte de gauche)"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white/85 outline-none focus:border-sky-300/35"
              />

              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                <select
                  value={choice.targetChapitreId}
                  onChange={(e) => updateChoice(index, { targetChapitreId: e.target.value, targetBlockId: "" })}
                  className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white/85 outline-none focus:border-sky-300/35"
                >
                  <option value="">Chapitre courant</option>
                  {chapterTargets.map((target) => (
                    <option key={target.id} value={target.id}>{target.label}</option>
                  ))}
                </select>

                <select
                  value={choice.targetBlockId}
                  onChange={(e) => updateChoice(index, { targetBlockId: e.target.value })}
                  className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white/85 outline-none focus:border-sky-300/35"
                >
                  <option value="">{choice.targetChapitreId ? "Haut du chapitre" : "Selectionner un bloc"}</option>
                  {blockTargetsForChoice(choice).map((target) => (
                    <option key={target.id} value={target.id}>{target.label}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    if (editableLinks.length <= 1) {
                      setInternalLinks([EMPTY_CHOICE]);
                      return;
                    }
                    setInternalLinks(editableLinks.filter((_, i) => i !== index));
                  }}
                  className="h-9.5 w-9.5 inline-flex items-center justify-center rounded-lg border border-white/10 bg-black/25 text-white/55 hover:text-red-300 hover:border-red-300/40"
                  title="Supprimer ce choix"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasChoices = internalLinks.some((choice) => !!choice.targetBlockId || !!choice.targetChapitreId);

  return (
    <div className="w-full rounded-xl border border-sky-300/20 bg-sky-400/7 px-4 py-3">
      <div className="flex items-center gap-2 text-sky-200">
        <Link2 className="w-4 h-4 shrink-0" />
        <span className="text-[14px] font-medium">{data.label || "Choix de navigation"}</span>
      </div>
      <p className="mt-1 text-[11px] text-white/50">Bifurcations du chapitre</p>

      <div className="mt-3 space-y-2">
        {internalLinks.length === 0 && (
          <p className="text-[11px] text-white/45">Aucun choix configure.</p>
        )}

        {internalLinks.map((choice, index) => {
          const chapterOption = choice.targetChapitreId
            ? chapterTargets.find((target) => target.id === choice.targetChapitreId)
            : undefined;
          const blockOption = blockTargetsForChoice(choice).find((target) => target.id === choice.targetBlockId);
          const choiceLabel = choice.label || blockOption?.label || `Choix ${index + 1}`;
          const isReady = choice.targetChapitreId ? true : !!choice.targetBlockId;
          const targetHint = choice.targetChapitreId
            ? `${chapterOption?.label || choice.targetChapitreId} / ${blockOption?.label || "Haut du chapitre"}`
            : (blockOption?.label || (choice.targetBlockId ? choice.targetBlockId : "Bloc non defini"));

          return (
            <button
              key={`${choice.targetChapitreId || "current"}-${choice.targetBlockId || "empty"}-${index}`}
              type="button"
              onClick={() => onOpen(choice.targetBlockId || undefined, choice.targetChapitreId || undefined)}
              disabled={!isReady}
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
