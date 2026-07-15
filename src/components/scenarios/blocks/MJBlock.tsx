import { useRef } from "react";
import { StickyNote, Link2Off, Bold } from "lucide-react";

export interface MJNoteData {
  session?: string;
  note?: string;
  anchorBlockId?: string;
  position?: "above" | "below" | "right";
}

interface MJBlockProps {
  data: MJNoteData;
  isEditing: boolean;
  attachedToLabel?: string | null;
  fullWidth?: boolean;
  onChange: (newData: Partial<MJNoteData>) => void;
  onDetach?: () => void;
}

function preserveScroll(fn: () => void) {
  const scrollContainer = document.querySelector('[data-chapitre-scroll="true"]') as HTMLElement | null;
  const savedTop = scrollContainer?.scrollTop ?? null;
  const savedWindow = window.scrollY;
  fn();
  requestAnimationFrame(() => {
    if (scrollContainer && savedTop !== null) {
      scrollContainer.scrollTop = savedTop;
      requestAnimationFrame(() => {
        scrollContainer.scrollTop = savedTop;
      });
    }
    if (window.scrollY !== savedWindow) window.scrollTo({ top: savedWindow, behavior: "auto" });
  });
}

function resizeTextareaPreserveScroll(target: HTMLTextAreaElement) {
  const scrollContainer = document.querySelector('[data-chapitre-scroll="true"]') as HTMLElement | null;
  const savedTop = scrollContainer?.scrollTop ?? null;
  target.style.height = "auto";
  target.style.height = `${target.scrollHeight}px`;
  if (scrollContainer && savedTop !== null) {
    scrollContainer.scrollTop = savedTop;
    requestAnimationFrame(() => {
      scrollContainer.scrollTop = savedTop;
    });
  }
}

export function MJBlock({ data, isEditing, attachedToLabel, fullWidth, onChange, onDetach }: MJBlockProps) {
  const widthClass = fullWidth ? "w-full" : "max-w-xl";
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const applyBold = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const text = textarea.value || "";
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? start;
    const selected = text.slice(start, end);

    if (start === end) {
      const nextText = `${text.slice(0, start)}****${text.slice(end)}`;
      preserveScroll(() => onChange({ note: nextText }));
      requestAnimationFrame(() => {
        const next = textareaRef.current;
        if (!next) return;
        next.focus();
        const caret = start + 2;
        next.setSelectionRange(caret, caret);
      });
      return;
    }

    const nextText = `${text.slice(0, start)}**${selected}**${text.slice(end)}`;
    preserveScroll(() => onChange({ note: nextText }));
    requestAnimationFrame(() => {
      const next = textareaRef.current;
      if (!next) return;
      next.focus();
      next.setSelectionRange(start + 2, end + 2);
    });
  };

  const renderWithBold = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return <strong key={`mj-${idx}`} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      return <span key={`mj-${idx}`}>{part}</span>;
    });
  };

  if (isEditing) {
    return (
      <div className={`${widthClass} border border-amber-300/40 bg-amber-200/85 text-amber-950 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.25)] p-4 rotate-[-0.6deg]`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          {!!attachedToLabel && (
            <div className="inline-flex rounded-md overflow-hidden opacity-50 hover:opacity-100 transition-opacity">
              {(["above", "below", "right"] as const).map((pos, i) => (
                <button
                  key={pos}
                  onClick={() => onChange({ position: pos })}
                  className={`px-2 py-0.5 text-[10px] border border-amber-900/15 ${i > 0 ? "-ml-px" : ""} ${(data.position ?? "below") === pos ? "bg-amber-300/50 font-semibold" : "bg-amber-50/40 hover:bg-amber-200/50"}`}
                >
                  {pos === "above" ? "↑" : pos === "below" ? "↓" : "→"}
                </button>
              ))}
            </div>
          )}
          {onDetach && (
            <button
              onClick={onDetach}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border border-amber-900/20 hover:bg-amber-100/60 transition-colors opacity-50 hover:opacity-100 ml-auto"
              title="Detacher le post-it"
            >
              <Link2Off className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={applyBold}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-amber-900/30 bg-amber-100/55 text-amber-950 hover:bg-amber-100/75 transition-colors"
            title="Mettre en gras (Ctrl/Cmd+B)"
          >
            <Bold className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-wide">Gras</span>
          </button>
          <span className="text-[10px] text-amber-900/60">Sélectionnez du texte puis Ctrl/Cmd+B</span>
        </div>
        <textarea
          ref={textareaRef}
          value={data.note || ""}
          onChange={(e) => preserveScroll(() => onChange({ note: e.target.value }))}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
              e.preventDefault();
              applyBold();
              return;
            }
            e.stopPropagation();
          }}
          placeholder="Notes rapides MJ : decisions des PJ, consequences, idees pour la prochaine session..."
          className="w-full bg-amber-50/60 border border-amber-800/20 rounded-lg px-3 py-2 text-[13px] leading-relaxed text-amber-950 placeholder:text-amber-800/50 outline-none resize-none overflow-hidden min-h-24"
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            resizeTextareaPreserveScroll(target);
          }}
        />
      </div>
    );
  }

  return (
    <div className={`${widthClass} border border-amber-300/30 bg-amber-200/80 text-amber-950 rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.2)] p-4 rotate-[-0.4deg]`}>
      <div className="flex items-center gap-2 text-amber-900/75 mb-2">
        <StickyNote className="w-4 h-4" />
        <span className="text-[10px] uppercase tracking-widest font-semibold">Note MJ</span>
        {data.session && (
          <span className="text-[11px] font-medium normal-case tracking-normal">• {data.session}</span>
        )}
      </div>
      <p className="text-[13px] leading-relaxed whitespace-pre-wrap wrap-break-word">
        {data.note ? renderWithBold(data.note) : <span className="italic text-amber-900/40">Note vide...</span>}
      </p>
    </div>
  );
}
