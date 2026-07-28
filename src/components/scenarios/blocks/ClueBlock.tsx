import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Search, User, Package, Dices, X, ChevronDown, ChevronUp, Plus, Loader2 } from "lucide-react";

const STATS = ["FOR", "CON", "AGI", "PER", "CHA", "INT", "VOL"];

export interface ClueBlockData {
  title: string;
  text: string;
  npcs?: { id: string; name: string }[];
  items?: { id?: string; nom: string }[];
  testEnabled?: boolean;
  testStat?: string;
  testDd?: number;
  testDescription?: string;
}

interface ClueBlockProps {
  campaignId: string;
  data: ClueBlockData;
  onChange: (newData: Partial<ClueBlockData>) => void;
  isEditing: boolean;
}

// ── Mini fiche PNJ ─────────────────────────────────────────────────────────────
function PnjMiniCard({
  npc,
  onRemove,
  isEditing,
}: {
  npc: { id: string; name: string };
  onRemove?: () => void;
  isEditing?: boolean;
}) {
  const [details, setDetails] = useState<{
    image_url: string | null;
    stats?: { sexe?: string; age?: string; description?: string; niveau?: number };
  } | null>(null);

  useEffect(() => {
    supabase
      .from("pnj")
      .select("image_url, stats")
      .eq("id", npc.id)
      .single()
      .then(({ data }) => { if (data) setDetails(data); });
  }, [npc.id]);

  return (
    <div className="relative rounded-lg border border-violet-400/25 bg-violet-500/8 p-2.5 flex items-start gap-3">
      <div className="w-10 h-10 rounded-md overflow-hidden bg-violet-500/20 border border-violet-400/20 shrink-0">
        {details?.image_url ? (
          <img src={details.image_url} alt={npc.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-4 h-4 text-violet-300/40" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 pr-5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-semibold text-violet-100">{npc.name}</p>
          {details?.stats?.niveau !== undefined && (
            <span className="text-[9px] uppercase tracking-widest text-violet-300/60 border border-violet-400/25 rounded-full px-1.5 py-0.5">
              Niv. {details.stats.niveau}
            </span>
          )}
        </div>
        {(details?.stats?.sexe || details?.stats?.age) && (
          <p className="text-[10px] text-violet-200/50 mt-0.5">
            {[details.stats?.sexe, details.stats?.age].filter(Boolean).join(" · ")}
          </p>
        )}
        {details?.stats?.description && (
          <p className="text-[11px] text-violet-100/60 mt-1 line-clamp-2 leading-relaxed">
            {details.stats.description}
          </p>
        )}
      </div>
      {isEditing && onRemove && (
        <button type="button" onClick={onRemove} className="absolute top-2 right-2 text-white/25 hover:text-red-400 transition-colors">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────
export function ClueBlock({ campaignId, data, onChange, isEditing }: ClueBlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [npcSearch, setNpcSearch] = useState("");
  const [npcResults, setNpcResults] = useState<{ id: string; name: string }[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [itemResults, setItemResults] = useState<{ id: string; nom: string }[]>([]);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [showTest, setShowTest] = useState(data.testEnabled ?? false);

  const linkedNpcs = data.npcs ?? [];
  const linkedItems = data.items ?? [];

  // Auto-resize
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [data.text, isEditing]);

  // Recherche PNJ
  useEffect(() => {
    if (npcSearch.length < 2) return;
    supabase.from("pnj").select("id, name").eq("campaign_id", campaignId).ilike("name", `%${npcSearch}%`).limit(6)
      .then(({ data: res }) => setNpcResults(res ?? []));
  }, [npcSearch, campaignId]);

  // Recherche objets compendium
  useEffect(() => {
    if (itemSearch.length < 2) return;
    supabase.from("equipements").select("id, nom")
      .or(`campaign_id.eq.${campaignId},campaign_id.is.null`)
      .ilike("nom", `%${itemSearch}%`).limit(6)
      .then(({ data: res }) => setItemResults(res ?? []));
  }, [itemSearch, campaignId]);

  const addNpc = (npc: { id: string; name: string }) => {
    if (linkedNpcs.some((n) => n.id === npc.id)) return;
    onChange({ npcs: [...linkedNpcs, npc] });
    setNpcSearch(""); setNpcResults([]);
  };
  const removeNpc = (id: string) => onChange({ npcs: linkedNpcs.filter((n) => n.id !== id) });
  const addItem = (item: { id?: string; nom: string }) => {
    onChange({ items: [...linkedItems, item] });
    setItemSearch(""); setItemResults([]);
  };
  const removeItem = (idx: number) => onChange({ items: linkedItems.filter((_, i) => i !== idx) });

  const createAndLinkItem = async () => {
    const nom = itemSearch.trim();
    if (!nom) return;
    setIsCreatingItem(true);
    try {
      const { data: created, error } = await supabase.from("equipements").insert({ nom, campaign_id: campaignId }).select("id, nom").single();
      if (error) throw error;
      addItem({ id: created.id, nom: created.nom });
    } catch {
      addItem({ nom });
    } finally {
      setIsCreatingItem(false);
    }
  };

  /* ── VUE LECTURE ──────────────────────────────────────────────────────────── */
  if (!isEditing) {
    return (
      <div className="rounded-xl border border-sky-400/25 bg-sky-500/5 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-sky-500/10 border-b border-sky-400/15">
          <Search className="w-3.5 h-3.5 text-sky-400/70 shrink-0" />
          <span className="text-[13px] font-semibold text-sky-100 flex-1 truncate min-w-0">{data.title || "Indice"}</span>
          {linkedItems.map((item, i) => (
            <span key={item.id ?? i} className="flex items-center gap-1 text-[10px] text-amber-300 border border-amber-400/35 bg-amber-500/10 rounded-full px-2 py-0.5 shrink-0">
              <Package className="w-2.5 h-2.5" />{item.nom}
            </span>
          ))}
        </div>
        {data.text && (
          <p className="px-4 py-3 text-[14px] text-white/80 leading-relaxed whitespace-pre-wrap">{data.text}</p>
        )}
        {linkedNpcs.length > 0 && (
          <div className="px-4 pb-3 space-y-2">
            {linkedNpcs.map((npc) => <PnjMiniCard key={npc.id} npc={npc} />)}
          </div>
        )}
        {data.testEnabled && data.testStat && (
          <div className="mx-4 mb-3 flex items-center gap-3 rounded-lg border border-sky-400/25 bg-sky-500/10 px-3 py-2">
            <Dices className="w-4 h-4 text-sky-400/70 shrink-0" />
            <span className="text-[12px] font-bold text-sky-200">{data.testStat}</span>
            <span className="text-[11px] text-sky-300/70 font-mono">DD {data.testDd ?? 10}</span>
            {data.testDescription && <span className="text-[11px] text-white/55 truncate">{data.testDescription}</span>}
          </div>
        )}
      </div>
    );
  }

  /* ── MODE ÉDITION ─────────────────────────────────────────────────────────── */
  return (
    <div className="rounded-xl border border-sky-400/30 bg-sky-500/5 overflow-hidden">
      {/* Titre */}
      <div className="px-4 py-2.5 border-b border-sky-400/15 bg-sky-500/10">
        <input type="text" value={data.title ?? ""} onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Titre de l'indice..."
          className="w-full bg-transparent text-sky-100 font-semibold text-[14px] outline-none placeholder:text-sky-200/30" />
      </div>

      {/* Texte auto-resize */}
      <div className="px-4 py-3">
        <textarea
          ref={textareaRef}
          value={data.text ?? ""}
          onChange={(e) => {
            onChange({ text: e.target.value });
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          placeholder="Description, contexte, détails observés..."
          rows={3}
          className="w-full bg-transparent text-white/80 text-[13px] leading-relaxed outline-none resize-none overflow-hidden placeholder:text-white/25"
        />
      </div>

      {/* Mini fiches PNJ */}
      {linkedNpcs.length > 0 && (
        <div className="px-4 pb-3 space-y-2 border-t border-sky-400/10 pt-3">
          {linkedNpcs.map((npc) => <PnjMiniCard key={npc.id} npc={npc} onRemove={() => removeNpc(npc.id)} isEditing />)}
        </div>
      )}

      {/* Recherche PNJ + Objets */}
      <div className="px-4 pb-3 flex flex-wrap gap-3 border-t border-sky-400/10 pt-3">
        {/* PNJ */}
        <div className="flex-1 min-w-44 space-y-1">
          <label className="text-[9px] uppercase tracking-widest text-violet-300/60 flex items-center gap-1">
            <User className="w-3 h-3" />Ajouter un PNJ
          </label>
          <div className="relative">
            <input type="text" value={npcSearch} onChange={(e) => setNpcSearch(e.target.value)}
              placeholder="Rechercher un PNJ..."
              className="w-full bg-white/5 border border-white/15 focus:border-violet-400/50 rounded-lg px-2.5 py-1.5 text-white/80 text-[12px] outline-none placeholder:text-white/25" />
            {npcSearch.length >= 2 && npcResults.filter((r) => !linkedNpcs.some((n) => n.id === r.id)).length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-lg border border-white/15 bg-[#1E1941]/98 shadow-xl overflow-hidden">
                {npcResults.filter((r) => !linkedNpcs.some((n) => n.id === r.id)).map((npc) => (
                  <button key={npc.id} type="button" onClick={() => addNpc(npc)}
                    className="w-full text-left px-3 py-2 text-[12px] text-white/80 hover:bg-white/10 transition-colors">
                    {npc.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Objets */}
        <div className="flex-1 min-w-44 space-y-1">
          <label className="text-[9px] uppercase tracking-widest text-amber-300/60 flex items-center gap-1">
            <Package className="w-3 h-3" />Objets liés
          </label>
          {linkedItems.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {linkedItems.map((item, i) => (
                <div key={item.id ?? i} className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-1">
                  <span className="text-[12px] text-amber-200 truncate max-w-32">{item.nom}</span>
                  <button type="button" onClick={() => removeItem(i)} className="text-white/30 hover:text-red-400 transition-colors shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="relative">
            <input type="text" value={itemSearch} onChange={(e) => setItemSearch(e.target.value)}
              placeholder="Rechercher dans le compendium..."
              className="w-full bg-white/5 border border-white/15 focus:border-amber-400/50 rounded-lg px-2.5 py-1.5 text-white/80 text-[12px] outline-none placeholder:text-white/25" />
            {itemSearch.length >= 2 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-lg border border-white/15 bg-[#1E1941]/98 shadow-xl overflow-hidden">
                {itemResults.filter((r) => !linkedItems.some((i) => i.id === r.id)).map((item) => (
                  <button key={item.id} type="button" onClick={() => addItem({ id: item.id, nom: item.nom })}
                    className="w-full text-left px-3 py-2 text-[12px] text-white/80 hover:bg-white/10 transition-colors">
                    {item.nom}
                  </button>
                ))}
                <button type="button" onClick={createAndLinkItem} disabled={isCreatingItem}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-amber-300/80 hover:bg-amber-500/10 border-t border-white/8 transition-colors disabled:opacity-50">
                  {isCreatingItem ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Plus className="w-3.5 h-3.5 shrink-0" />}
                  Créer "{itemSearch}"
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Test associé */}
      <div className="px-4 pb-3 border-t border-sky-400/10 pt-3">
        <button type="button" onClick={() => { const next = !showTest; setShowTest(next); onChange({ testEnabled: next }); }}
          className="flex items-center gap-2 text-[11px] text-sky-300/70 hover:text-sky-200 transition-colors">
          <Dices className="w-3.5 h-3.5" />
          Test associé
          {showTest ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {showTest && (
          <div className="mt-2.5 flex flex-wrap gap-2 items-end">
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest text-sky-300/50">Caract.</label>
              <select value={data.testStat ?? "PER"} onChange={(e) => onChange({ testStat: e.target.value })}
                className="bg-sky-900/40 border border-sky-500/30 focus:border-sky-400/60 rounded-lg px-2.5 py-1.5 text-sky-100 text-[12px] outline-none cursor-pointer appearance-none">
                {STATS.map((s) => <option key={s} value={s} className="bg-[#1E1941]">{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest text-sky-300/50">DD</label>
              <input type="number" value={data.testDd ?? 10} onChange={(e) => onChange({ testDd: parseInt(e.target.value) || 10 })}
                className="w-16 text-center bg-sky-900/40 border border-sky-500/30 focus:border-sky-400/60 rounded-lg px-2 py-1.5 text-sky-100 text-[12px] outline-none" />
            </div>
            <div className="flex-1 min-w-32 space-y-1">
              <label className="text-[9px] uppercase tracking-widest text-sky-300/50">Description</label>
              <input type="text" value={data.testDescription ?? ""} onChange={(e) => onChange({ testDescription: e.target.value })}
                placeholder="Ce que révèle ce test..."
                className="w-full bg-sky-900/40 border border-sky-500/30 focus:border-sky-400/60 rounded-lg px-2.5 py-1.5 text-sky-100 text-[12px] outline-none placeholder:text-sky-200/25" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
