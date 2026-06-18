import { useState } from "react";
import { Search, Dices, CheckCircle2, XCircle, Plus, Trash2, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CheckTest {
  title?: string;
  stat?: string;
  dd?: number;
  success?: string;
  failure?: string;
}

interface InvestigationBlockData {
  title?: string;
  description?: string;
  tests?: CheckTest[];
  // Legacy single-test fields
  stat?: string;
  dd?: number;
  success?: string;
  failure?: string;
}

interface InvestigationBlockProps {
  data: InvestigationBlockData;
  onChange: (newData: Partial<InvestigationBlockData>) => void;
  isEditing?: boolean;
}

const STATS = ["FOR", "CON", "AGI", "PER", "INT", "CHA", "VOL"];
const STAT_LABELS: Record<string, string> = {
  FOR: "Force",
  CON: "Constitution",
  AGI: "Agilite",
  PER: "Perception",
  INT: "Intelligence",
  CHA: "Charisme",
  VOL: "Volonte",
};

function migrateTests(data: InvestigationBlockData): CheckTest[] {
  if (data.tests && data.tests.length > 0) return data.tests;
  // Migrate legacy single-test fields
  if (data.stat || data.dd || data.success || data.failure) {
    return [{ title: "", stat: data.stat || "PER", dd: data.dd || 10, success: data.success || "", failure: data.failure || "" }];
  }
  return [{ title: "", stat: "PER", dd: 10, success: "", failure: "" }];
}

export function InvestigationBlock({ data, onChange, isEditing = true }: InvestigationBlockProps) {
  const [collapsed, setCollapsed] = useState(false);
  const tests = migrateTests(data);

  const updateTest = (index: number, patch: Partial<CheckTest>) => {
    const updated = tests.map((t, i) => (i === index ? { ...t, ...patch } : t));
    onChange({ tests: updated });
  };

  const addTest = () => {
    onChange({ tests: [...tests, { title: "", stat: "PER", dd: 10, success: "", failure: "" }] });
  };

  const removeTest = (index: number) => {
    const updated = tests.filter((_, i) => i !== index);
    onChange({ tests: updated.length > 0 ? updated : [{ title: "", stat: "PER", dd: 10, success: "", failure: "" }] });
  };

  return (
    <div className="flex flex-col border border-sky-500/20 bg-sky-500/5 rounded-2xl overflow-hidden shadow-lg">

      {/* HEADER COLLAPSIBLE */}
      <div className="flex items-center gap-2 px-4 md:px-5 py-3">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 hover:bg-sky-500/20 transition-colors group"
        >
          <ChevronDown className={`w-4 h-4 text-sky-400/50 group-hover:text-sky-400 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`} />
        </button>
        {isEditing ? (
          <input
            type="text"
            value={data.title || ""}
            onChange={(e) => onChange({ title: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            placeholder="Titre de l'enquête (ex: Fouiller le bureau...)"
            className="flex-1 bg-transparent font-serif text-base text-sky-100 outline-none placeholder:text-sky-100/30 min-w-0"
          />
        ) : (
          <span className="flex-1 font-serif text-base text-sky-100 truncate">
            {data.title || <span className="text-sky-100/30 italic">Enquête sans titre</span>}
          </span>
        )}
        <div className="flex items-center gap-2 shrink-0">
          {collapsed && tests.length > 0 && (
            <span className="text-[11px] text-sky-400/50 uppercase tracking-widest">{tests.length} test{tests.length > 1 ? "s" : ""}</span>
          )}
          <Search className="w-3.5 h-3.5 text-sky-400/30" />
        </div>
      </div>

      {/* CONTENU */}
      {!collapsed && (
      <div className="p-4 md:p-5 pt-0 flex flex-col gap-4">

        {/* DESCRIPTION */}
        {(isEditing || data.description) && (
          <textarea
            value={data.description || ""}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Description ou contexte avant le jet..."
            className="w-full bg-transparent text-white/70 text-[13px] leading-relaxed outline-none resize-none overflow-hidden min-h-10 placeholder:text-white/20 border-b border-sky-500/20 focus:border-sky-400/50 transition-colors"
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${target.scrollHeight}px`;
            }}
          />
        )}

        {/* TESTS */}
        <div className="flex flex-col gap-5">
          {tests.map((test, index) => {
            const currentStat = test.stat || "PER";
            return (
            <div key={index} className="flex flex-col gap-3 border border-sky-500/15 rounded-xl p-3 bg-black/10">

              {/* TEST HEADER: titre + supprimer */}
              <div className="flex items-center gap-2">
                <Dices className="w-4 h-4 text-sky-400 shrink-0" />
                <input
                  type="text"
                  value={test.title || ""}
                  onChange={(e) => updateTest(index, { title: e.target.value })}
                  placeholder={`Test ${index + 1} — nom du jet (ex: Perception, Discrétion...)`}
                  className="flex-1 bg-transparent text-sky-100 text-sm font-medium outline-none placeholder:text-sky-100/30"
                />
                {tests.length > 1 && (
                  <button
                    onClick={() => removeTest(index)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* MÉCANIQUE (JET ET DD) */}
              <div className="flex flex-wrap items-center gap-3 bg-black/20 border border-sky-500/10 rounded-xl px-3 py-2">
                <div className="flex items-center gap-3 flex-1 min-w-50">
                  <Select
                    value={currentStat}
                    onValueChange={(value) => updateTest(index, { stat: value })}
                  >
                    <SelectTrigger className="h-8 min-w-44 bg-black/30 border border-sky-500/20 rounded-lg px-2.5 py-1.5 text-sm text-white focus:border-sky-400/45 focus:ring-2 focus:ring-sky-400/15">
                      <SelectValue placeholder="PER">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-[10px] uppercase tracking-wide font-semibold text-sky-200">
                            {currentStat}
                          </span>
                          <span className="text-[12px] text-white/70 truncate">
                            {STAT_LABELS[currentStat] || currentStat}
                          </span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="z-60 bg-[#1E1941]/95 border border-sky-500/25 text-white rounded-xl shadow-xl shadow-black/40">
                      <SelectGroup>
                        <SelectLabel className="text-[10px] uppercase tracking-widest text-sky-300/55 px-2 py-1">
                          Caracteristique
                        </SelectLabel>
                        <SelectSeparator className="bg-sky-500/15" />
                        {STATS.map((s) => (
                          <SelectItem
                            key={s}
                            value={s}
                            className="text-[12px] data-highlighted:bg-sky-500/15 data-highlighted:text-sky-100 data-[state=checked]:bg-sky-500/12"
                          >
                            <div className="flex items-center justify-between w-full gap-3">
                              <span className="text-[10px] uppercase tracking-wide font-semibold text-sky-200/85">{s}</span>
                              <span className="text-[11px] text-white/55">{STAT_LABELS[s]}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2 bg-black/30 border border-sky-500/20 rounded-lg px-3 py-1.5 focus-within:border-sky-400/50 transition-colors">
                    <span className="text-[11px] text-sky-400/60 font-bold">DD</span>
                    <input
                      type="number"
                      min={1}
                      value={test.dd || 10}
                      onChange={(e) => updateTest(index, { dd: parseInt(e.target.value) || 10 })}
                      className="w-8 bg-transparent text-sm text-white text-center outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SUCCÈS */}
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-[11px] uppercase tracking-widest font-bold">En cas de réussite</span>
                </div>
                <textarea
                  value={test.success || ""}
                  onChange={(e) => updateTest(index, { success: e.target.value })}
                  placeholder="Ce qu'ils découvrent s'ils réussissent le jet..."
                  className="w-full bg-transparent text-emerald-50/80 text-[13px] leading-relaxed outline-none resize-none overflow-hidden min-h-12 placeholder:text-emerald-500/30"
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                />
              </div>

              {/* ÉCHEC */}
              <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-red-400">
                  <XCircle className="w-4 h-4" />
                  <span className="text-[11px] uppercase tracking-widest font-bold">En cas d'échec</span>
                </div>
                <textarea
                  value={test.failure || ""}
                  onChange={(e) => updateTest(index, { failure: e.target.value })}
                  placeholder="Conséquences en cas d'échec (indice partiel, fausse piste, coût, menace, etc.)..."
                  className="w-full bg-transparent text-red-50/80 text-[13px] leading-relaxed outline-none resize-none overflow-hidden min-h-12 placeholder:text-red-500/30"
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                />
              </div>

            </div>
            );
          })}
        </div>

        {/* AJOUTER UN TEST */}
        <button
          onClick={addTest}
          className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-dashed border-sky-500/20 text-sky-400/60 hover:text-sky-400 hover:border-sky-400/40 hover:bg-sky-500/5 transition-colors text-[12px] uppercase tracking-widest font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter un test
        </button>

      </div>
      )}
    </div>
  );
}