import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { GripVertical, X } from "lucide-react";

interface CombatStickyNoteProps {
  isVisible: boolean;
  isDragging: boolean;
  note: string;
  position: { x: number; y: number };
  noteRef: RefObject<HTMLDivElement | null>;
  onPointerDown: (e: ReactPointerEvent) => void;
  onChangeNote: (value: string) => void;
  onClose: () => void;
}

export function CombatStickyNote({
  isVisible,
  isDragging,
  note,
  position,
  noteRef,
  onPointerDown,
  onChangeNote,
  onClose,
}: CombatStickyNoteProps) {
  if (!isVisible) return null;

  return (
    <div
      ref={noteRef}
      className="fixed z-50 w-70 max-w-[86vw] pointer-events-auto"
      style={{ left: position.x, top: position.y }}
    >
      <div className="rounded-xl border border-amber-300/50 bg-[#F5DF83]/95 shadow-2xl">
        <div
          onPointerDown={onPointerDown}
          className={`flex items-center justify-between rounded-t-xl border-b border-amber-600/35 bg-amber-300/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-900/90 select-none touch-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
          title="Déplacer la note de combat"
        >
          <GripVertical className="h-3.5 w-3.5" />
          <span>Note de combat</span>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onClose}
            className="rounded-full p-0.5 text-amber-900/60 hover:text-amber-900 hover:bg-amber-400/50 transition-colors"
            title="Fermer"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <textarea
          value={note}
          onChange={(e) => onChangeNote(e.target.value)}
          placeholder="Notes rapides, rappels, effets temporaires..."
          className="min-h-45 w-full resize-y rounded-b-xl bg-transparent px-3 py-2 text-sm text-amber-950/90 outline-none placeholder:text-amber-900/45"
        />
      </div>
    </div>
  );
}
