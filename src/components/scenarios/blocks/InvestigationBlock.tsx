import { Search, Dices, CheckCircle2 } from "lucide-react";

interface InvestigationBlockProps {
  data: {
    title?: string;
    description?: string;
    stat?: string;
    dd?: number;
    success?: string;
  };
  onChange: (newData: Partial<InvestigationBlockProps["data"]>) => void;
}

const STATS = ["FOR", "CON", "AGI", "PER", "INT", "CHA", "VOL"];

export function InvestigationBlock({ data, onChange }: InvestigationBlockProps) {
  return (
    <div className="flex flex-col border border-sky-500/20 bg-sky-500/5 rounded-2xl overflow-hidden shadow-lg">
      <div className="p-4 md:p-5 flex flex-col gap-4">
        
        {/* HEADER & CONTEXTE */}
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 shadow-inner">
            <Search className="w-5 h-5 text-sky-400" />
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={data.title || ""}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Titre de l'enquête (ex: Fouiller le bureau...)"
              className="w-full bg-transparent font-serif text-lg text-sky-100 outline-none placeholder:text-sky-100/30 mb-1"
            />
            <textarea
              value={data.description || ""}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Description ou contexte avant le jet..."
              className="w-full bg-transparent text-white/70 text-[13px] leading-relaxed outline-none resize-none overflow-hidden min-h-[40px] placeholder:text-white/20 border-b border-sky-500/20 focus:border-sky-400/50 transition-colors"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
          </div>
        </div>

        {/* MÉCANIQUE (JET ET DD) */}
        <div className="flex flex-wrap items-center gap-4 bg-black/20 border border-sky-500/10 rounded-xl p-3">
          <div className="flex items-center gap-2 text-sky-400">
            <Dices className="w-4 h-4" />
            <span className="text-[11px] uppercase tracking-widest font-medium">Test de Caractéristique</span>
          </div>
          
          <div className="w-px h-6 bg-sky-500/20 hidden md:block"></div>
          
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <select
              value={data.stat || "PER"}
              onChange={(e) => onChange({ stat: e.target.value })}
              className="bg-black/30 border border-sky-500/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-sky-400/50 appearance-none cursor-pointer"
            >
              {STATS.map(s => (
                <option key={s} value={s} className="bg-[#1E1941]">{s}</option>
              ))}
            </select>
            
            <div className="flex items-center gap-2 bg-black/30 border border-sky-500/20 rounded-lg px-3 py-1.5 focus-within:border-sky-400/50 transition-colors">
              <span className="text-[11px] text-sky-400/60 font-bold">DD</span>
              <input
                type="number"
                min={1}
                value={data.dd || 10}
                onChange={(e) => onChange({ dd: parseInt(e.target.value) || 10 })}
                className="w-8 bg-transparent text-sm text-white text-center outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* RÉSULTAT (SUCCÈS UNIQUEMENT) */}
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 flex flex-col gap-2 mt-1">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[11px] uppercase tracking-widest font-bold">En cas de réussite</span>
          </div>
          <textarea
            value={data.success || ""}
            onChange={(e) => onChange({ success: e.target.value })}
            placeholder="Ce qu'ils découvrent s'ils réussissent le jet (sinon, ils ne trouvent rien de spécial)..."
            className="w-full bg-transparent text-emerald-50/80 text-[13px] leading-relaxed outline-none resize-none overflow-hidden min-h-[60px] placeholder:text-emerald-500/30"
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${target.scrollHeight}px`;
            }}
          />
        </div>

      </div>
    </div>
  );
}