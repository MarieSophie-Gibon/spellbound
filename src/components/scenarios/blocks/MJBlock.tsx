import { useLayoutEffect, useRef } from "react";
import { StickyNote, Link2Off } from "lucide-react";

export type MJNoteColor = "yellow" | "red" | "blue" | "green" | "pink";

export interface MJNoteData {
  session?: string;
  note?: string;
  anchorBlockId?: string;
  position?: "above" | "below" | "right";
  color?: MJNoteColor;
}

interface MJBlockProps {
  data: MJNoteData;
  isEditing: boolean;
  attachedToLabel?: string | null;
  fullWidth?: boolean;
  onChange: (newData: Partial<MJNoteData>) => void;
  onDetach?: () => void;
}

interface MJPalette {
  label: string;
  swatch: string;
  cardEdit: string;
  cardView: string;
  posBorder: string;
  posActive: string;
  posIdle: string;
  detach: string;
  toolbarBtn: string;
  hint: string;
  textarea: string;
  header: string;
  empty: string;
}

// Classes ecrites en entier: Tailwind ne detecte pas les noms construits dynamiquement.
const MJ_PALETTES: Record<MJNoteColor, MJPalette> = {
  yellow: {
    label: "Jaune",
    swatch: "bg-amber-300",
    cardEdit: "border-amber-300/40 bg-amber-200/85 text-amber-950",
    cardView: "border-amber-300/30 bg-amber-200/80 text-amber-950",
    posBorder: "border-amber-900/15",
    posActive: "bg-amber-300/50 font-semibold",
    posIdle: "bg-amber-50/40 hover:bg-amber-200/50",
    detach: "border-amber-900/20 hover:bg-amber-100/60",
    toolbarBtn: "border-amber-900/30 bg-amber-100/55 text-amber-950 hover:bg-amber-100/75",
    hint: "text-amber-900/60",
    textarea: "bg-amber-50/60 border-amber-800/20 text-amber-950 placeholder:text-amber-800/50",
    header: "text-amber-900/75",
    empty: "text-amber-900/40",
  },
  red: {
    label: "Rouge",
    swatch: "bg-red-300",
    cardEdit: "border-red-300/40 bg-red-200/85 text-red-950",
    cardView: "border-red-300/30 bg-red-200/80 text-red-950",
    posBorder: "border-red-900/15",
    posActive: "bg-red-300/50 font-semibold",
    posIdle: "bg-red-50/40 hover:bg-red-200/50",
    detach: "border-red-900/20 hover:bg-red-100/60",
    toolbarBtn: "border-red-900/30 bg-red-100/55 text-red-950 hover:bg-red-100/75",
    hint: "text-red-900/60",
    textarea: "bg-red-50/60 border-red-800/20 text-red-950 placeholder:text-red-800/50",
    header: "text-red-900/75",
    empty: "text-red-900/40",
  },
  blue: {
    label: "Bleu",
    swatch: "bg-sky-300",
    cardEdit: "border-sky-300/40 bg-sky-200/85 text-sky-950",
    cardView: "border-sky-300/30 bg-sky-200/80 text-sky-950",
    posBorder: "border-sky-900/15",
    posActive: "bg-sky-300/50 font-semibold",
    posIdle: "bg-sky-50/40 hover:bg-sky-200/50",
    detach: "border-sky-900/20 hover:bg-sky-100/60",
    toolbarBtn: "border-sky-900/30 bg-sky-100/55 text-sky-950 hover:bg-sky-100/75",
    hint: "text-sky-900/60",
    textarea: "bg-sky-50/60 border-sky-800/20 text-sky-950 placeholder:text-sky-800/50",
    header: "text-sky-900/75",
    empty: "text-sky-900/40",
  },
  green: {
    label: "Vert",
    swatch: "bg-emerald-300",
    cardEdit: "border-emerald-300/40 bg-emerald-200/85 text-emerald-950",
    cardView: "border-emerald-300/30 bg-emerald-200/80 text-emerald-950",
    posBorder: "border-emerald-900/15",
    posActive: "bg-emerald-300/50 font-semibold",
    posIdle: "bg-emerald-50/40 hover:bg-emerald-200/50",
    detach: "border-emerald-900/20 hover:bg-emerald-100/60",
    toolbarBtn: "border-emerald-900/30 bg-emerald-100/55 text-emerald-950 hover:bg-emerald-100/75",
    hint: "text-emerald-900/60",
    textarea: "bg-emerald-50/60 border-emerald-800/20 text-emerald-950 placeholder:text-emerald-800/50",
    header: "text-emerald-900/75",
    empty: "text-emerald-900/40",
  },
  pink: {
    label: "Rose",
    swatch: "bg-pink-300",
    cardEdit: "border-pink-300/40 bg-pink-200/85 text-pink-950",
    cardView: "border-pink-300/30 bg-pink-200/80 text-pink-950",
    posBorder: "border-pink-900/15",
    posActive: "bg-pink-300/50 font-semibold",
    posIdle: "bg-pink-50/40 hover:bg-pink-200/50",
    detach: "border-pink-900/20 hover:bg-pink-100/60",
    toolbarBtn: "border-pink-900/30 bg-pink-100/55 text-pink-950 hover:bg-pink-100/75",
    hint: "text-pink-900/60",
    textarea: "bg-pink-50/60 border-pink-800/20 text-pink-950 placeholder:text-pink-800/50",
    header: "text-pink-900/75",
    empty: "text-pink-900/40",
  },
};

const MJ_COLOR_ORDER: MJNoteColor[] = ["yellow", "red", "blue", "green", "pink"];

function autoResize(target: HTMLTextAreaElement) {
  target.style.height = "auto";
  target.style.height = `${target.scrollHeight}px`;
}

export function MJBlock({ data, isEditing, attachedToLabel, fullWidth, onChange, onDetach }: MJBlockProps) {
  const widthClass = fullWidth ? "w-full" : "max-w-xl";
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const color: MJNoteColor = data.color && MJ_PALETTES[data.color] ? data.color : "yellow";
  const palette = MJ_PALETTES[color];

  useLayoutEffect(() => {
    if (textareaRef.current) autoResize(textareaRef.current);
  }, [isEditing, data.note]);

  const renderWithFormatting = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return <strong key={`mj-${idx}`} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("__") && part.endsWith("__") && part.length > 4) {
        return <span key={`mj-${idx}`} className="underline decoration-current underline-offset-2">{part.slice(2, -2)}</span>;
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return <em key={`mj-${idx}`} className="italic">{part.slice(1, -1)}</em>;
      }
      return <span key={`mj-${idx}`}>{part}</span>;
    });
  };

  if (isEditing) {
    return (
      <div className={`${widthClass} border ${palette.cardEdit} rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.25)] p-4 rotate-[-0.6deg]`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          {!!attachedToLabel && (
            <div className="inline-flex rounded-md overflow-hidden opacity-50 hover:opacity-100 transition-opacity">
              {(["above", "below", "right"] as const).map((pos, i) => (
                <button
                  key={pos}
                  onClick={() => onChange({ position: pos })}
                  className={`px-2 py-0.5 text-[10px] border ${palette.posBorder} ${i > 0 ? "-ml-px" : ""} ${(data.position ?? "below") === pos ? palette.posActive : palette.posIdle}`}
                >
                  {pos === "above" ? "↑" : pos === "below" ? "↓" : "→"}
                </button>
              ))}
            </div>
          )}
          {onDetach && (
            <button
              onClick={onDetach}
              className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border ${palette.detach} transition-colors opacity-50 hover:opacity-100 ml-auto`}
              title="Detacher le post-it"
            >
              <Link2Off className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="mb-2 flex items-center gap-1.5">
          {MJ_COLOR_ORDER.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange({ color: option })}
              className={`w-5 h-5 rounded-full border border-black/25 ${MJ_PALETTES[option].swatch} transition-transform ${option === color ? "ring-2 ring-black/45 scale-110" : "opacity-70 hover:opacity-100"}`}
              title={`Post-it ${MJ_PALETTES[option].label.toLowerCase()}`}
              aria-label={`Post-it ${MJ_PALETTES[option].label.toLowerCase()}`}
            />
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={data.note || ""}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder="Notes rapides MJ : decisions des PJ, consequences, idees pour la prochaine session..."
          className={`w-full border rounded-lg px-3 py-2 text-[13px] leading-relaxed outline-none resize-none overflow-hidden min-h-24 ${palette.textarea}`}
        />
      </div>
    );
  }

  return (
    <div className={`${widthClass} border ${palette.cardView} rounded-xl shadow-[0_8px_20px_rgba(0,0,0,0.2)] p-4 rotate-[-0.4deg]`}>
      <div className={`flex items-center gap-2 mb-2 ${palette.header}`}>
        <StickyNote className="w-4 h-4" />
        <span className="text-[10px] uppercase tracking-widest font-semibold">Note MJ</span>
        {data.session && (
          <span className="text-[11px] font-medium normal-case tracking-normal">• {data.session}</span>
        )}
      </div>
      <p className="text-[13px] leading-relaxed whitespace-pre-wrap wrap-break-word">
        {data.note ? renderWithFormatting(data.note) : <span className={`italic ${palette.empty}`}>Note vide...</span>}
      </p>
    </div>
  );
}
