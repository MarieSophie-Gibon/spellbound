/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, X, Search, Loader2, PawPrint, Pencil, ChevronDown, Swords } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DeleteConfirmModal } from "@/components/compendium/DeleteConfirmModal";
import { MonsterWizard } from "@/components/compendium/bestiaire/MonsterWizard";
import type { MonstreStats, MonstreCombat, MonstreAttaque, MonstreCapacite } from "@/types/compendium";

// ── Types ─────────────────────────────────────────────────────────────────

export interface FamilierData {
  nom: string;
  nc: string;
  type_creature: string;
  taille: string;
  description: string;
  stats: MonstreStats;
  combat: MonstreCombat;
  attaques: MonstreAttaque[];
  capacites: MonstreCapacite[];
}

interface Familier {
  id: string;
  monster_id: string;
  monster_nom: string;
  monster_image_url: string | null;
  custom_name: string | null;
  pv: number;
  pv_max: number;
  notes: string | null;
  data: FamilierData | null;
}

interface MonsterResult {
  id: string;
  nom: string;
  image_url: string | null;
  combat: any;
  stats: any;
  attaques: any[];
  capacites: any[];
  nc: string | null;
  type_creature: string | null;
  taille: string | null;
  description: string | null;
}

interface FamilierTabProps {
  pjId: string;
  pnjId?: string;
  type: "pj" | "pnj";
  campaignId: string;
  readOnly?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────

const STAT_KEYS = ["for", "agi", "con", "int", "per", "vol", "cha"] as const;
const STAT_LABELS: Record<string, string> = {
  for: "FOR", agi: "AGI", con: "CON", int: "INT", per: "PER", vol: "VOL", cha: "CHA",
};
const DEFAULT_STATS: MonstreStats = {
  agi: { mod: 0, sup: false }, cha: { mod: 0, sup: false }, con: { mod: 0, sup: false },
  for: { mod: 0, sup: false }, int: { mod: 0, sup: false }, per: { mod: 0, sup: false }, vol: { mod: 0, sup: false },
};
const DEFAULT_COMBAT: MonstreCombat = { pv: 10, rd: 0, pv_max: 10, defense: 10, initiative: 10, attaque_magique: null };

// ── Sous-composants inline ────────────────────────────────────────────────

function StatCell({ label, value, sup }: { label: string; value: number; sup?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg px-1.5 py-1.5">
      <span className="text-[9px] uppercase tracking-wider text-white/40">{label}</span>
      <span className={`text-sm font-semibold ${value > 0 ? "text-emerald-400" : value < 0 ? "text-red-400" : "text-white/60"}`}>
        {value > 0 ? `+${value}` : value}
      </span>
      {sup && <span className="text-[8px] text-amber-400/70 border border-amber-400/25 rounded px-0.5 leading-tight">SUP</span>}
    </div>
  );
}

function CombatBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
      <span className="text-[9px] uppercase tracking-wider text-white/40">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function CapaciteRow({ cap }: { cap: MonstreCapacite }) {
  const [open, setOpen] = useState(false);
  const typeColor =
    cap.type === "action" ? "text-blue-300/70 border-blue-400/30" :
    cap.type === "action_limitee" ? "text-amber-300/70 border-amber-400/30" :
    cap.type === "sort" ? "text-purple-300/70 border-purple-400/30" :
    "text-white/40 border-white/15";
  const typeLabel =
    cap.type === "action" ? "Action" :
    cap.type === "action_limitee" ? "Lim." :
    cap.type === "sort" ? "Sort" : "Passif";

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-white/3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-[13px] font-medium text-white/90 truncate">{cap.nom || "Capacité"}</span>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${typeColor}`}>{typeLabel}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && cap.description && (
        <div className="px-3 pb-3 pt-1 text-[12px] text-white/70 leading-relaxed border-t border-white/8 whitespace-pre-wrap">
          {cap.description}
        </div>
      )}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────

export default function FamilierTab({ pjId, pnjId, type, campaignId, readOnly }: FamilierTabProps) {
  const [familiers, setFamiliers] = useState<Familier[]>([]);
  const [isLoading, setIsLoading] = useState(true); // true par défaut : on charge toujours au montage
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingDataId, setLoadingDataId] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<MonsterResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const [editingFamilier, setEditingFamilier] = useState<Familier | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);

  const [familierToDelete, setFamilierToDelete] = useState<Familier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const ownerId = type === "pj" ? pjId : (pnjId ?? pjId);

  // ── Chargement ─ pattern sans setState synchrone dans l'effect ──────────
  useEffect(() => {
    let cancelled = false;
    const col = type === "pj" ? "pj_id" : "pnj_id";

    supabase.from("pj_familiers").select("*").eq(col, ownerId).order("created_at")
      .then(({ data }) => {
        if (!cancelled) {
          setFamiliers((data as Familier[]) ?? []);
          setIsLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [ownerId, type]);

  const fetchFamiliers = () => {
    const col = type === "pj" ? "pj_id" : "pnj_id";
    supabase.from("pj_familiers").select("*").eq(col, ownerId).order("created_at")
      .then(({ data }) => {
        setFamiliers((data as Familier[]) ?? []);
      });
  };

  // Quand on déplie une carte sans données, on les charge depuis le bestiaire.
  // On utilise une ref pour éviter d'avoir familiers dans les deps (boucle infinie).
  const familiersByIdRef = useRef<Map<string, Familier>>(new Map());
  useEffect(() => {
    familiersByIdRef.current = new Map(familiers.map((f) => [f.id, f]));
  }, [familiers]);

  useEffect(() => {
    if (!expandedId) return;
    const f = familiersByIdRef.current.get(expandedId);
    if (!f || f.data || !f.monster_id) return;

    let cancelled = false;
    const monsterId = f.monster_id;
    const familierPvMax = f.pv_max;

    // setTimeout(0) pour sortir du corps synchrone de l’effect
    const t = setTimeout(() => setLoadingDataId(expandedId), 0);
    supabase.from("bestiaire")
      .select("nom, nc, type_creature, taille, description, stats, combat, attaques, capacites")
      .eq("id", monsterId).single()
      .then(({ data: monster }) => {
        if (cancelled || !monster) { setLoadingDataId(null); return; }
        const pvMax = Number(monster.combat?.pv_max ?? monster.combat?.pv ?? familierPvMax);
        const snapshotData: FamilierData = {
          nom: monster.nom, nc: monster.nc ?? "1",
          type_creature: monster.type_creature ?? "Animal", taille: monster.taille ?? "Moyenne",
          description: monster.description ?? "",
          stats: monster.stats ?? DEFAULT_STATS,
          combat: { pv: pvMax, pv_max: pvMax, defense: Number(monster.combat?.defense ?? 10), initiative: Number(monster.combat?.initiative ?? 10), rd: Number(monster.combat?.rd ?? 0), attaque_magique: monster.combat?.attaque_magique ?? null },
          attaques: monster.attaques ?? [], capacites: monster.capacites ?? [],
        };
        setLoadingDataId(null);
        setFamiliers((prev) => prev.map((x) => x.id === f.id ? { ...x, data: snapshotData } : x));
        void supabase.from("pj_familiers").update({ data: snapshotData }).eq("id", f.id);
      });
    return () => { cancelled = true; clearTimeout(t); };
  }, [expandedId]);

  useEffect(() => {
    if (!isAddOpen) return;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      let query = supabase
        .from("bestiaire")
        .select("id, nom, image_url, combat, stats, attaques, capacites, nc, type_creature, taille, description")
        .or(`campaign_id.eq.${campaignId},campaign_id.is.null`)
        .order("nom").limit(50);
      if (searchTerm.trim()) query = query.ilike("nom", `%${searchTerm}%`);
      const { data } = await query;
      setSearchResults((data as MonsterResult[]) ?? []);
      setIsSearching(false);
    }, searchTerm.trim() ? 250 : 0);
    return () => clearTimeout(timer);
  }, [isAddOpen, searchTerm, campaignId]);

  const handleAdd = async (monster: MonsterResult) => {
    setAddingId(monster.id);
    setAddError(null);
    const pvMax = Number(monster.combat?.pv_max ?? monster.combat?.pv ?? 10);
    const col = type === "pj" ? "pj_id" : "pnj_id";
    const snapshotData: FamilierData = {
      nom: monster.nom, nc: monster.nc ?? "1",
      type_creature: monster.type_creature ?? "Animal", taille: monster.taille ?? "Moyenne",
      description: monster.description ?? "",
      stats: monster.stats ?? DEFAULT_STATS,
      combat: { pv: pvMax, pv_max: pvMax, defense: Number(monster.combat?.defense ?? 10), initiative: Number(monster.combat?.initiative ?? 10), rd: Number(monster.combat?.rd ?? 0), attaque_magique: monster.combat?.attaque_magique ?? null },
      attaques: monster.attaques ?? [], capacites: monster.capacites ?? [],
    };
    const { error } = await supabase.from("pj_familiers").insert({
      [col]: ownerId, monster_id: monster.id, monster_nom: monster.nom,
      monster_image_url: monster.image_url ?? null, pv: pvMax, pv_max: pvMax, data: snapshotData,
    });
    setAddingId(null);
    if (error) { setAddError(error.message); }
    else { setIsAddOpen(false); setSearchTerm(""); setSearchResults([]); setAddError(null); void fetchFamiliers(); }
  };

  // Si data est null (ancien familier), re-fetch depuis bestiaire avant d'éditer
  const openEdit = async (f: Familier) => {
    if (!f.data && f.monster_id) {
      setLoadingEditId(f.id);
      const { data: monster } = await supabase
        .from("bestiaire")
        .select("nom, nc, type_creature, taille, description, stats, combat, attaques, capacites")
        .eq("id", f.monster_id).single();
      setLoadingEditId(null);
      if (monster) {
        const pvMax = Number(monster.combat?.pv_max ?? monster.combat?.pv ?? f.pv_max);
        setEditingFamilier({
          ...f,
          data: {
            nom: monster.nom, nc: monster.nc ?? "1",
            type_creature: monster.type_creature ?? "Animal", taille: monster.taille ?? "Moyenne",
            description: monster.description ?? "",
            stats: monster.stats ?? DEFAULT_STATS,
            combat: { pv: pvMax, pv_max: pvMax, defense: Number(monster.combat?.defense ?? 10), initiative: Number(monster.combat?.initiative ?? 10), rd: Number(monster.combat?.rd ?? 0), attaque_magique: monster.combat?.attaque_magique ?? null },
            attaques: monster.attaques ?? [], capacites: monster.capacites ?? [],
          },
        });
        return;
      }
    }
    setEditingFamilier(f);
  };

  const confirmDelete = async () => {
    if (!familierToDelete) return;
    setIsDeleting(true);
    await supabase.from("pj_familiers").delete().eq("id", familierToDelete.id);
    setIsDeleting(false); setFamilierToDelete(null);
    void fetchFamiliers();
  };

  const pvPercent = (pv: number, pvMax: number) => pvMax > 0 ? Math.max(0, Math.min(100, (pv / pvMax) * 100)) : 0;
  const pvColor = (pct: number) => pct > 60 ? "bg-emerald-400" : pct > 25 ? "bg-amber-400" : "bg-red-400";

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>;

  return (
    <div className="animate-in fade-in duration-200 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 flex items-center gap-1.5">
          <PawPrint className="w-3.5 h-3.5" /> Familiers ({familiers.length})
        </p>
        {!readOnly && (
          <button onClick={() => setIsAddOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border border-[#E3CCCD]/30 text-[#E3CCCD]/70 hover:text-[#E3CCCD] hover:bg-[#E3CCCD]/10 transition-all">
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        )}
      </div>

      {familiers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <PawPrint className="w-10 h-10 text-white/10" />
          <p className="text-white/30 text-sm italic">Aucun familier associé.</p>
          
        </div>
      ) : (
        <div className="space-y-3">
          {familiers.map((f) => {
            const displayName = f.custom_name || f.monster_nom;
            const pct = pvPercent(f.pv, f.pv_max);
            const isExpanded = expandedId === f.id;
            const d = f.data;

            return (
              <div key={f.id} className="bg-[#1E1941]/40 border border-[#E3CCCD]/15 rounded-xl overflow-hidden">

                {/* ── Résumé cliquable ────────────────────────── */}
                <div className="flex gap-3 items-center p-4">
                  <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-white/10 bg-black/20">
                    <img src={f.monster_image_url ?? "/default-avatar.png"} alt={displayName} className="w-full h-full object-cover" />
                  </div>

                  <button className="flex-1 min-w-0 text-left" onClick={() => setExpandedId(isExpanded ? null : f.id)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white text-sm">{displayName}</span>
                      {f.custom_name && <span className="text-[10px] text-white/30 italic">{f.monster_nom}</span>}
                      {d && <span className="text-[10px] text-white/25 border border-white/10 rounded px-1.5 py-0.5">{d.type_creature} · NC {d.nc}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pvColor(pct)}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] font-mono text-white/40 shrink-0">{f.pv}/{f.pv_max} PV</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-white/25 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {!readOnly && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => openEdit(f)} disabled={loadingEditId === f.id} className="p-1.5 rounded-full text-white/35 hover:text-white/80 hover:bg-white/10 transition-colors disabled:opacity-40" title="Modifier">
                        {loadingEditId === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                      </button>
                      <button onClick={() => setFamilierToDelete(f)} className="p-1.5 rounded-full text-white/35 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Retirer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Section dépliable ────────────────────────── */}
                {isExpanded && (
                  <div className="border-t border-[#E3CCCD]/10 px-4 pb-5 pt-4 space-y-5 animate-in fade-in duration-150">
                    {loadingDataId === f.id ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                      </div>
                    ) : !d ? (
                      <p className="text-[12px] text-white/30 italic text-center py-4">
                        Impossible de charger les données depuis le bestiaire.
                      </p>
                    ) : (
                      <>
                        {d.description && (
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-[#E3CCCD]/30 mb-1.5">Description</p>
                            <p className="text-[13px] text-white/70 leading-relaxed whitespace-pre-wrap">{d.description}</p>
                          </div>
                        )}

                        {f.notes && (
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-[#E3CCCD]/30 mb-1.5">Notes</p>
                            <p className="text-[13px] text-white/55 italic leading-relaxed">{f.notes}</p>
                          </div>
                        )}

                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-[#E3CCCD]/30 mb-2">Combat</p>
                          <div className="flex gap-2 flex-wrap">
                            <CombatBadge label="PV max" value={f.pv_max} />
                            {d.combat?.defense != null && <CombatBadge label="Défense" value={d.combat.defense} />}
                            {d.combat?.initiative != null && <CombatBadge label="Initiative" value={d.combat.initiative} />}
                            {d.combat?.rd != null && d.combat.rd > 0 && <CombatBadge label="RD" value={d.combat.rd} />}
                          </div>
                        </div>

                        {d.stats && (
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-[#E3CCCD]/30 mb-2">Caractéristiques</p>
                            <div className="grid grid-cols-7 gap-1">
                              {STAT_KEYS.map((k) => (
                                <StatCell key={k} label={STAT_LABELS[k]} value={d.stats[k]?.mod ?? 0} sup={d.stats[k]?.sup} />
                              ))}
                            </div>
                          </div>
                        )}

                        {d.attaques && d.attaques.length > 0 && (
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-[#E3CCCD]/30 mb-2">Attaques</p>
                            <div className="space-y-1.5">
                              {d.attaques.map((att, i) => (
                                <div key={i} className="flex items-center gap-3 border border-white/10 rounded-lg px-3 py-2 bg-white/3">
                                  <Swords className="w-3.5 h-3.5 text-[#E3CCCD]/25 shrink-0" />
                                  <span className="flex-1 text-[13px] text-white/80">{att.attaque_base || "—"}</span>
                                  {att.dm && <span className="font-mono text-[12px] text-[#E3CCCD]/65 shrink-0">{att.dm}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {d.capacites && d.capacites.length > 0 && (
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-[#E3CCCD]/30 mb-2">Capacités</p>
                            <div className="space-y-1.5">
                              {d.capacites.map((cap, i) => <CapaciteRow key={i} cap={cap} />)}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal : Ajouter ──────────────────────────────────────────── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#12102E] border border-[#E3CCCD]/20 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E3CCCD]/15">
              <p className="font-serif text-lg text-[#E3CCCD]">Associer un familier</p>
              <button onClick={() => { setIsAddOpen(false); setSearchTerm(""); setSearchResults([]); }} className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-3 border-b border-[#E3CCCD]/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                <input autoFocus value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Rechercher un monstre..." className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-xl pl-9 pr-4 py-2 text-white text-sm outline-none transition-colors placeholder:text-white/30" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
              {addError && <div className="mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-[12px]">Erreur : {addError}</div>}
              {isSearching
                ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
                : searchResults.length === 0
                  ? <p className="text-center text-white/30 text-sm py-8 italic">{searchTerm ? "Aucun monstre trouvé." : "Tapez pour rechercher..."}</p>
                  : searchResults.map((m) => (
                    <button key={m.id} onClick={() => handleAdd(m)} disabled={addingId === m.id} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/8 transition-colors text-left group disabled:opacity-50">
                      <div className="w-9 h-9 rounded-lg overflow-hidden border border-white/10 bg-black/20 shrink-0">
                        <img src={m.image_url ?? "/default-avatar.png"} alt={m.nom} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm group-hover:text-[#E3CCCD] transition-colors truncate">{m.nom}</p>
                        {m.combat?.pv_max && <p className="text-[11px] text-white/35">{m.combat.pv_max} PV max</p>}
                      </div>
                      {addingId === m.id
                        ? <Loader2 className="w-4 h-4 text-[#E3CCCD]/70 shrink-0 animate-spin" />
                        : <Plus className="w-4 h-4 text-white/30 group-hover:text-[#E3CCCD]/70 shrink-0 transition-colors" />}
                    </button>
                  ))
              }
            </div>
          </div>
        </div>
      )}

      {/* ── MonsterWizard : édition complète ─────────────────────────── */}
      {editingFamilier && (
        <MonsterWizard
          onClose={() => setEditingFamilier(null)}
          onSuccess={() => { setEditingFamilier(null); void fetchFamiliers(); }}
          initialData={{
            id: editingFamilier.id,
            nom: editingFamilier.custom_name || editingFamilier.data?.nom || editingFamilier.monster_nom,
            nc: editingFamilier.data?.nc ?? "1",
            type_creature: editingFamilier.data?.type_creature ?? "Animal",
            taille: editingFamilier.data?.taille ?? "Moyenne",
            description: editingFamilier.data?.description ?? "",
            stats: editingFamilier.data?.stats ?? DEFAULT_STATS,
            combat: editingFamilier.data?.combat ?? { ...DEFAULT_COMBAT, pv: editingFamilier.pv_max, pv_max: editingFamilier.pv_max },
            attaques: editingFamilier.data?.attaques ?? [],
            capacites: editingFamilier.data?.capacites ?? [],
            image_url: editingFamilier.monster_image_url ?? undefined,
            data: {},
          }}
          onSavePayload={async (payload, imageUrl) => {
            const combat = payload.combat as MonstreCombat;
            const newNom = (payload.nom as string).trim();
            const { error } = await supabase.from("pj_familiers").update({
              custom_name: newNom !== editingFamilier.monster_nom ? newNom : null,
              pv_max: combat.pv_max,
              pv: Math.min(editingFamilier.pv, combat.pv_max),
              monster_image_url: imageUrl ?? editingFamilier.monster_image_url,
              data: payload,
            }).eq("id", editingFamilier.id);
            if (error) throw new Error(error.message);
          }}
        />
      )}

      {/* ── Confirmation suppression ──────────────────────────────────── */}
      {familierToDelete && (
        <DeleteConfirmModal
          name={familierToDelete.custom_name || familierToDelete.monster_nom}
          title="Retirer ce familier ?"
          description={`${familierToDelete.custom_name || familierToDelete.monster_nom} sera retiré de la liste des familiers.`}
          isDeleting={isDeleting}
          onConfirm={confirmDelete}
          onCancel={() => setFamilierToDelete(null)}
        />
      )}
    </div>
  );
}
