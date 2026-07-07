import { ArrowLeft, BookOpen, Plus, RefreshCcw, StickyNote } from "lucide-react";
import { CombatTabButton } from "./CombatTabButton";

interface CombatTopActionsProps {
  onOpenGrimoire: () => void;
  onToggleNote: () => void;
  onToggleEvents: () => void;
  onBackToScenario?: () => void;
  onNextTurn: () => void;
  hasCombatants: boolean;
}

export function CombatTopActions({
  onOpenGrimoire,
  onToggleNote,
  onToggleEvents,
  onBackToScenario,
  onNextTurn,
  hasCombatants,
}: CombatTopActionsProps) {
  return (
    <div className="absolute top-0 right-4 z-40 flex max-w-[calc(100%-13rem)] flex-wrap items-center justify-end gap-1.5">
      <CombatTabButton
        onClick={onOpenGrimoire}
        icon={<BookOpen className="w-3 h-3 text-indigo-200" />}
        label="Grimoire"
        aria-label="Ouvrir le grimoire"
        className="px-3.5"
      />
      <CombatTabButton
        onClick={onToggleNote}
        icon={<StickyNote className="w-3 h-3 text-indigo-200" />}
        label="Post-it"
        aria-label="Afficher ou masquer la note de combat"
        className="px-3.5"
      />
      <CombatTabButton
        onClick={onToggleEvents}
        icon={<Plus className="w-3 h-3 text-indigo-200" />}
        label="Évènements"
        aria-label="Gérer les évènements de round"
        className="px-3.5"
      />
      {onBackToScenario && (
        <CombatTabButton
          onClick={onBackToScenario}
          icon={<ArrowLeft className="w-3 h-3 text-indigo-200" />}
          label="Retour"
          aria-label="Retour au scénario"
          className="px-3.5"
        />
      )}
      {hasCombatants && (
        <CombatTabButton
          onClick={onNextTurn}
          icon={<RefreshCcw className="w-3 h-3 text-indigo-200 group-hover:rotate-180 transition-transform duration-300" />}
          label="Fin du Tour"
          className="px-4"
        />
      )}
    </div>
  );
}
