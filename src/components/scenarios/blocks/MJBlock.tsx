import { StickyNote, Link2Off } from "lucide-react";

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

export function MJBlock({ data, isEditing, attachedToLabel, fullWidth, onChange, onDetach }: MJBlockProps) {
  const widthClass = fullWidth ? "w-full" : "max-w-xl";
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
        <textarea
          value={data.note || ""}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder="Notes rapides MJ : decisions des PJ, consequences, idees pour la prochaine session..."
          className="w-full bg-amber-50/60 border border-amber-800/20 rounded-lg px-3 py-2 text-[13px] leading-relaxed text-amber-950 placeholder:text-amber-800/50 outline-none resize-none overflow-hidden min-h-24"
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = `${target.scrollHeight}px`;
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
      <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
        {data.note || <span className="italic text-amber-900/40">Note vide...</span>}
      </p>
    </div>
  );
}
