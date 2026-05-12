/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from "react";
import { ModalLayout } from "@/components/ui/ModalLayout";
import {
  X, ArrowRight, ArrowLeft, Save,
  Image as ImageIcon, UploadCloud, Info, ChevronDown,
  Heart, RefreshCw, Star, Sparkles, Zap, Shield, Swords, Target, Wand2,
  Dice1,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Equipement } from "@/types/compendium";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface PJWizardProps {
  campaignId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Sexe = "Masculin" | "Féminin" | "Autre";

const STATS_KEYS = ["FOR", "CON", "AGI", "PER", "CHA", "INT", "VOL"] as const;
type StatKey = (typeof STATS_KEYS)[number];
type StatsMap = Record<StatKey, number>;

const STAT_LABEL: Record<StatKey, string> = {
  FOR: "Force", CON: "Constitution", AGI: "Agilité",
  PER: "Perception", CHA: "Charisme", INT: "Intelligence", VOL: "Volonté",
};

// Tableaux de base (7 valeurs à assigner)
const TABLEAUX: Record<string, number[]> = {
  Polyvalent: [2, 2, 2, 1, 1, 0, -1],
  Expert: [3, 2, 1, 1, 0, 0, -1],
  Spécialiste: [4, 2, 1, 0, 0, -1, -1],
};

interface PeupleRef {
  id: string;
  nom: string;
  description: string;
  caracteristiques: string;
  voie_id: string | null;
  voie?: { id: string; nom: string; capacites: any };
  demi_elf: boolean;
  image_url?: string;
  data?: any;
}

interface FamilleRef {
  id: string;
  nom: string;
  groupe: string;
  description: string | null;
  pv_niveau: number;
  de_recuperation: string;
  bonus_chance: number;
  equipement_base: string | null;
  maitrise_equipement: string | null;
  image_url?: string;
  voies?: Array<{ id: string; nom: string; capacites: any }>;
}

function buildDefaultStats(): StatsMap {
  return { FOR: 0, CON: 0, AGI: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 };
}

function computeDerived(stats: StatsMap, famille: FamilleRef | null, nbSorts: number) {
  const pv = famille ? 2 * famille.pv_niveau + stats.CON : stats.CON;
  const drQty = famille?.groupe === "Mystiques"
    ? 3 + stats.CON
    : 2 + stats.CON;
  const drDe = famille?.de_recuperation ?? "d6";
  const pc = (famille?.groupe === "Aventuriers" ? 3 : 2) + stats.CHA;
  const pm = stats.VOL + nbSorts;
  const initiative = 10 + stats.PER;
  const defense = 10 + stats.AGI;
  const attContact = 1 + stats.FOR;
  const attDistance = 1 + stats.AGI;
  const attMagie = 1 + stats.VOL;
  return { pv, drQty, drDe, pc, pm, initiative, defense, attContact, attDistance, attMagie };
}

// ─────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────

export function PJWizard({ campaignId, onClose, onSuccess }: PJWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Step 1 ──────────────────────────────────
  const [nom, setNom] = useState("");
  const [sexe, setSexe] = useState<Sexe>("Masculin");
  const [age, setAge] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [peuples, setPeuples] = useState<PeupleRef[]>([]);
  const [familles, setFamilles] = useState<FamilleRef[]>([]);
  const [selectedPeupleId, setSelectedPeupleId] = useState<string>("");
  const [selectedFamilleId, setSelectedFamilleId] = useState<string>("");

  // ── Step 2 ──────────────────────────────────
  const [tableau, setTableau] = useState<string>("Polyvalent");
  // pool = les modificateurs non encore assignés
  const [pool, setPool] = useState<number[]>([...TABLEAUX["Polyvalent"]]);
  const [stats, setStats] = useState<StatsMap>(buildDefaultStats());
  // Suivi des stats explicitement assignées (permet de gérer la valeur 0)
  const [assignedStats, setAssignedStats] = useState<Set<StatKey>>(new Set());
  // Bonus additionnels (peuple + voies)
  const [bonusPeuple, setBonusPeuple] = useState<StatsMap>(buildDefaultStats());
  const [bonusVoies, setBonusVoies] = useState<StatsMap>(buildDefaultStats());
  // Source active dans la phase bonus
  const [bonusSource, setBonusSource] = useState<"peuple" | "voies">("peuple");

  // ── Step 3 ──────────────────────────────────
  // voie du peuple (auto) + 2 voies famille (choix)
  const [selectedFamilleVoieIds, setSelectedFamilleVoieIds] = useState<string[]>([]);
  // Demi-Elfe : voie choisie
  const [selectedDemiElfVoieId, setSelectedDemiElfVoieId] = useState<string>("");
  // override mage rang2
  const [mageExtra, setMageExtra] = useState(false);

  // ── Step 4 ──────────────────────────────────
  const [equipements, setEquipements] = useState<Equipement[]>([]);
  const [selectedEquipementIds, setSelectedEquipementIds] = useState<string[]>([]);
  const [eqSearch, setEqSearch] = useState("");
  const [eqDropdownOpen, setEqDropdownOpen] = useState(false);
  const eqDropdownRef = useRef<HTMLDivElement>(null);
  const [nbSorts, setNbSorts] = useState(0);
  const [derived, setDerived] = useState(() => computeDerived(buildDefaultStats(), null, 0));
  const [overrides, setOverrides] = useState<Partial<typeof derived>>({});

  // ── Step 5 ──────────────────────────────────
  const [ideal, setIdeal] = useState("");
  const [travers, setTravers] = useState("");
  const [historique, setHistorique] = useState("");

  // ── Fetch données ────────────────────────────
  useEffect(() => {
    async function fetchRef() {
      // Peuples avec leur voie
      const { data: pData } = await supabase
        .from("peuples")
        .select("id, nom, description, data, demi_elf, image_url, voie:voies(id, nom, capacites)")
        .order("nom");
      if (pData) {
        console.log("[PJWizard] peuples raw:", JSON.stringify(pData.map((p: any) => ({ nom: p.nom, demi_elf: p.demi_elf, voie: p.voie })), null, 2));
        setPeuples(pData.map((p: any) => {
          const voie = Array.isArray(p.voie) ? p.voie[0] : p.voie;
          return {
            id: p.id,
            nom: p.nom,
            description: p.description ?? "",
            caracteristiques: p.data?.caracteristiques ?? "",
            voie_id: voie?.id ?? null,
            voie: voie ?? undefined,
            demi_elf: !!p.demi_elf,
            image_url: p.image_url ?? undefined,
            data: p.data,
          };
        }));
      }

      // Familles (profils) avec leurs voies et stats de la famille archétype
      const { data: fData, error: fError } = await supabase
        .from("profils")
        .select("id, nom, description, equipement_base, maitrise_equipement, image_url, famille:familles(nom, pv_niveau, de_recuperation, bonus_chance), voies(id, nom, capacites)")
        .or(`campaign_id.eq.${campaignId},campaign_id.is.null`)
        .order("nom");
      if (fError) console.error("[PJWizard] profils error:", fError);
      if (fData) {
        setFamilles(fData.map((f: any) => {
          const arch = Array.isArray(f.famille) ? f.famille[0] : f.famille;
          return {
            id: f.id,
            nom: f.nom,
            groupe: arch?.nom ?? "",
            description: f.description ?? null,
            pv_niveau: arch?.pv_niveau ?? 0,
            de_recuperation: arch?.de_recuperation ?? "d6",
            bonus_chance: arch?.bonus_chance ?? 0,
            equipement_base: f.equipement_base ?? null,
            maitrise_equipement: f.maitrise_equipement ?? null,
            image_url: f.image_url ?? undefined,
            voies: f.voies ?? [],
          };
        }));
      }

      // Équipements
      const { data: eqData } = await supabase
        .from("equipements")
        .select("id, nom, categorie, prix, data")
        .order("categorie")
        .order("nom");
      if (eqData) setEquipements(eqData as Equipement[]);
    }
    fetchRef();
  }, [campaignId]);
  const totalStats: StatsMap = {
    FOR: stats.FOR + bonusPeuple.FOR + bonusVoies.FOR,
    CON: stats.CON + bonusPeuple.CON + bonusVoies.CON,
    AGI: stats.AGI + bonusPeuple.AGI + bonusVoies.AGI,
    PER: stats.PER + bonusPeuple.PER + bonusVoies.PER,
    CHA: stats.CHA + bonusPeuple.CHA + bonusVoies.CHA,
    INT: stats.INT + bonusPeuple.INT + bonusVoies.INT,
    VOL: stats.VOL + bonusPeuple.VOL + bonusVoies.VOL,
  };

  // Recalcul dérivé quand stats / famille / nbSorts changent
  useEffect(() => {
    const fam = familles.find(f => f.id === selectedFamilleId) ?? null;
    setDerived(computeDerived(totalStats, fam, nbSorts));
    setOverrides({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, bonusPeuple, bonusVoies, selectedFamilleId, familles, nbSorts]);

  // Fermer le dropdown équipement au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (eqDropdownRef.current && !eqDropdownRef.current.contains(e.target as Node)) {
        setEqDropdownOpen(false);
      }
    };
    if (eqDropdownOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [eqDropdownOpen]);

  // Quand le tableau change, reset pool et stats
  const handleTableauChange = (t: string) => {
    setTableau(t);
    setPool([...TABLEAUX[t]]);
    setStats(buildDefaultStats());
    setAssignedStats(new Set());
  };

  // Helpers bonus
  const adjustBonus = (source: "peuple" | "voies", stat: StatKey, delta: number) => {
    if (source === "peuple") setBonusPeuple(prev => ({ ...prev, [stat]: prev[stat] + delta }));
    else setBonusVoies(prev => ({ ...prev, [stat]: prev[stat] + delta }));
  };

  // Assigner une valeur du pool à une stat
  const assignPoolValue = (stat: StatKey, poolIndex: number) => {
    const value = pool[poolIndex];
    const newPool = pool.filter((_, i) => i !== poolIndex);
    // Si la stat était déjà assignée, remettre l'ancienne valeur dans le pool
    if (assignedStats.has(stat)) {
      newPool.push(stats[stat]);
      newPool.sort((a, b) => b - a);
    }
    setPool(newPool.sort((a, b) => b - a));
    setStats(prev => ({ ...prev, [stat]: value }));
    setAssignedStats(prev => new Set([...prev, stat]));
  };

  // Retirer l'assignation d'une stat
  const unassignStat = (stat: StatKey) => {
    if (!assignedStats.has(stat)) return;
    const value = stats[stat];
    setPool(prev => [...prev, value].sort((a, b) => b - a));
    setStats(prev => ({ ...prev, [stat]: 0 }));
    setAssignedStats(prev => { const next = new Set(prev); next.delete(stat); return next; });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const selectedPeuple = peuples.find(p => p.id === selectedPeupleId);
  const selectedFamille = familles.find(f => f.id === selectedFamilleId);
  const familleVoies = selectedFamille?.voies ?? [];
  const isMage = selectedFamille?.groupe?.toLowerCase().includes("mystique") || false;
  const isDemiElf = (selectedPeuple?.nom?.toLowerCase().includes("demi") && selectedPeuple?.nom?.toLowerCase().includes("elf")) ?? false;

  // Sélection voies famille (max 2)
  const toggleFamilleVoie = (voieId: string) => {
    setSelectedFamilleVoieIds(prev => {
      if (prev.includes(voieId)) return prev.filter(v => v !== voieId);
      if (prev.length >= 2) return prev;
      return [...prev, voieId];
    });
  };

  // ── Submit ──────────────────────────────────
  const handleSubmit = async () => {
    if (!nom.trim()) return alert("Le nom est obligatoire.");
    setIsSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `pj/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("compendium").upload(path, imageFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("compendium").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const d = { ...derived, ...overrides };

      const pjVoies: Array<{ voie_id: string; rangs_acquis: number[] }> = [];
      // Voie du peuple
      if (isDemiElf) {
        if (selectedDemiElfVoieId) pjVoies.push({ voie_id: selectedDemiElfVoieId, rangs_acquis: [1] });
      } else if (selectedPeuple?.voie_id) {
        pjVoies.push({ voie_id: selectedPeuple.voie_id, rangs_acquis: [1] });
      }
      // Voies famille
      for (const vid of selectedFamilleVoieIds) {
        pjVoies.push({ voie_id: vid, rangs_acquis: mageExtra && isMage ? [1, 2] : [1] });
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("pj").insert({
        campaign_id: campaignId,
        player_id: user?.id ?? null,
        name: nom.trim(),
        image_url: imageUrl,
        stats: {
          sexe,
          age: age.trim() || null,
          caracteristiques: totalStats,
          pv: d.pv, pv_max: d.pv,
          dr_qty: d.drQty, dr_de: d.drDe,
          pc: d.pc, pm: d.pm,
          initiative: d.initiative,
          defense: d.defense,
          att_contact: d.attContact,
          att_distance: d.attDistance,
          att_magie: d.attMagie,
          nb_sorts: nbSorts,
          ideal, travers, historique,
        },
        pathways: pjVoies,
        inventory: {
          equipement_base: selectedFamille?.equipement_base ?? null,
          selected_equipement_ids: selectedEquipementIds,
        },
      });
      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Steps config ─────────────────────────────
  const STEPS = [
    { num: 1, label: "Origine" },
    { num: 2, label: "Caract." },
    { num: 3, label: "Voies" },
    { num: 4, label: "Dérivées" },
    { num: 5, label: "Lore" },
  ];

  const canAdvance = () => {
    if (step === 1) return nom.trim().length > 0 && selectedPeupleId && selectedFamilleId;
    if (step === 2) return pool.length === 0;
    if (step === 3) return selectedFamilleVoieIds.length === 2 && (!isDemiElf || !!selectedDemiElfVoieId);
    return true;
  };

  // ── Derived display helper ───────────────────
  const dv = { ...derived, ...overrides } as any;
  const setOverride = (key: string, value: number) => setOverrides(prev => ({ ...prev, [key]: value }));

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <ModalLayout>
        {/* HEADER */}
        <div className="relative z-10 shrink-0 px-8 pt-7 pb-5 border-b border-white/8 bg-black/10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 mb-1">Nouveau Personnage Joueur</p>
            </div>
            <button onClick={onClose} className="p-2 text-white/30 hover:text-white/70 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-center">
                <button
                  onClick={() => { if (s.num < step) setStep(s.num); }}
                  className={`flex items-center gap-2 transition-colors ${step === s.num ? "text-[#E3CCCD]" : step > s.num ? "text-white/60 hover:text-white/80" : "text-white/20 cursor-default"}`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all ${step === s.num ? "border-[#E3CCCD] bg-[#E3CCCD]/15 text-[#E3CCCD]" : step > s.num ? "border-white/30 bg-white/10 text-white/50" : "border-white/15 text-white/20"}`}>
                    {s.num}
                  </span>
                  <span className="text-[11px] uppercase tracking-widest font-medium hidden sm:block">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`w-5 h-px mx-2 transition-colors ${step > s.num ? "bg-white/30" : "bg-white/10"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div className="relative z-10 flex-1 overflow-y-auto px-8 py-7 scrollbar-thin scrollbar-thumb-white/8">

          {/* ── STEP 1 : Concept & Origine ── */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
              {/* Nom */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Nom *</label>
                <input
                  type="text" value={nom} onChange={e => setNom(e.target.value)} autoFocus
                  placeholder="ex : Aldric de Brumes..."
                  className="w-full bg-transparent border-b border-white/30 focus:border-[#E3CCCD]/80 py-2.5 text-white text-lg outline-none transition-colors placeholder:text-white/35"
                />
              </div>

              {/* Sexe & Âge */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Sexe</label>
                  <div className="flex gap-2 pt-1">
                    {(["Masculin", "Féminin", "Autre"] as Sexe[]).map(s => (
                      <button
                        key={s} type="button" onClick={() => setSexe(s)}
                        className={`px-3 py-1.5 rounded-full text-[12px] border transition-all ${sexe === s ? "border-[#E3CCCD]/60 bg-[#E3CCCD]/15 text-[#E3CCCD]" : "border-white/15 text-white/50 hover:border-white/30 hover:text-white/70"}`}
                      >{s}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Âge</label>
                  <input
                    type="text" value={age} onChange={e => setAge(e.target.value)}
                    placeholder="ex : 24 ans"
                    className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-2 text-white text-sm outline-none transition-colors placeholder:text-white/25"
                  />
                </div>
              </div>

              {/* Peuple */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Peuple *</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {peuples.length === 0 && <p className="text-white/30 text-xs italic">Chargement...</p>}
                  {peuples.map(p => (
                    <button
                      key={p.id} type="button" onClick={() => setSelectedPeupleId(p.id)}
                      className={`px-3 py-1.5 rounded-full text-[12px] border transition-all ${selectedPeupleId === p.id ? "border-[#E3CCCD]/60 bg-[#E3CCCD]/15 text-[#E3CCCD]" : "border-white/15 text-white/50 hover:border-white/30 hover:text-white/70"}`}
                    >
                      {p.nom}
                      {p.demi_elf && <span className="ml-1 text-[10px] opacity-60">✦</span>}
                    </button>
                  ))}
                </div>
                {/* Panneau d'info peuple */}
                {selectedPeuple && (
                  <div className="mt-2 p-3 rounded-xl border border-[#E3CCCD]/15 bg-[#E3CCCD]/4 space-y-2">
                    <div className="flex gap-3">
                      {selectedPeuple.image_url && (
                        <img src={selectedPeuple.image_url} alt={selectedPeuple.nom} className="w-12 h-16 object-cover rounded-lg shrink-0 opacity-80" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-[#E3CCCD]/80 mb-1">{selectedPeuple.nom}</p>
                        {selectedPeuple.description && (
                          <p className="text-[11px] text-white/50 leading-relaxed line-clamp-3">{selectedPeuple.description}</p>
                        )}
                      </div>
                    </div>
                    {selectedPeuple.data?.traits && (
                      <p className="text-[11px] text-white/45 leading-relaxed">
                        <span className="text-white/30">Traits ·</span> {selectedPeuple.data.traits}
                      </p>
                    )}
                    {selectedPeuple.caracteristiques && (
                      <p className="text-[11px] text-white/45 leading-relaxed">
                        <span className="text-white/30">Caract. ·</span> {selectedPeuple.caracteristiques}
                      </p>
                    )}
                    {selectedPeuple.voie && (
                      <p className="text-[11px] text-[#E3CCCD]/50">
                        <span className="text-white/30">Voie ·</span> {selectedPeuple.voie.nom}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Famille (Profil) */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Famille (Profil) *</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {familles.length === 0 && <p className="text-white/30 text-xs italic">Chargement...</p>}
                  {familles.map(f => (
                    <button
                      key={f.id} type="button" onClick={() => { setSelectedFamilleId(f.id); setSelectedFamilleVoieIds([]); }}
                      className={`px-3 py-1.5 rounded-full text-[12px] border transition-all ${selectedFamilleId === f.id ? "border-[#E3CCCD]/60 bg-[#E3CCCD]/15 text-[#E3CCCD]" : "border-white/15 text-white/50 hover:border-white/30 hover:text-white/70"}`}
                    >{f.nom}</button>
                  ))}
                </div>
                {/* Panneau d'info famille */}
                {selectedFamille && (
                  <div className="mt-2 p-3 rounded-xl border border-white/12 bg-white/4 space-y-2">
                    <div className="flex gap-3">
                      {selectedFamille.image_url && (
                        <img src={selectedFamille.image_url} alt={selectedFamille.nom} className="w-12 h-16 object-cover rounded-lg shrink-0 opacity-80" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[11px] font-medium text-white/80">{selectedFamille.nom}</p>
                          <span className="text-[10px] uppercase tracking-widest text-white/30 border border-white/15 rounded-full px-1.5 py-0.5">{selectedFamille.groupe}</span>
                        </div>
                        {selectedFamille.description && (
                          <p className="text-[11px] text-white/50 leading-relaxed line-clamp-3">{selectedFamille.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4 text-[11px] text-white/45">
                      <span><span className="text-white/25">PV/niv ·</span> {selectedFamille.pv_niveau}</span>
                      <span><span className="text-white/25">Récup ·</span> {selectedFamille.de_recuperation}</span>
                      {selectedFamille.bonus_chance !== 0 && (
                        <span><span className="text-white/25">Chance ·</span> {selectedFamille.bonus_chance > 0 ? `+${selectedFamille.bonus_chance}` : selectedFamille.bonus_chance}</span>
                      )}
                    </div>
                    {selectedFamille.voies && selectedFamille.voies.length > 0 && (
                      <p className="text-[11px] text-white/40">
                        <span className="text-white/25">Voies ·</span> {selectedFamille.voies.map(v => v.nom).join(" · ")}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Image */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Illustration</label>
                <div className="flex gap-4 items-start">
                  <div className="w-24 h-24 rounded-xl border border-white/15 bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                    {imagePreview
                      ? <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                      : <ImageIcon className="w-7 h-7 text-white/15" />}
                  </div>
                  <div className="flex-1">
                    <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-white/20 text-[12px] text-white/40 hover:border-white/40 hover:text-white/60 cursor-pointer transition-colors">
                      <UploadCloud className="w-4 h-4" />
                      Choisir une image...
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                    <p className="text-[11px] text-white/25 mt-2">PNG, JPG ou WEBP · max 5 Mo</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2 : Caractéristiques ── */}
          {step === 2 && (
            <div className="space-y-5 animate-in slide-in-from-right-4 fade-in">
              {/* Choix tableau */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Tableau de base</label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(TABLEAUX).map(([name, vals]) => (
                    <button
                      key={name} type="button" onClick={() => handleTableauChange(name)}
                      className={`p-3 rounded-xl border text-left transition-all ${tableau === name ? "border-[#E3CCCD]/50 bg-[#E3CCCD]/10" : "border-white/15 hover:border-white/25"}`}
                    >
                      <p className={`text-[12px] font-medium mb-1 ${tableau === name ? "text-[#E3CCCD]" : "text-white/60"}`}>{name}</p>
                      <p className="text-[11px] text-white/40">{vals.map(v => v > 0 ? `+${v}` : `${v}`).join(", ")}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pool restant — disparaît quand vide */}
              {pool.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                    Valeurs à distribuer
                    <span className="ml-2 text-amber-400/70">({pool.length} restante{pool.length > 1 ? "s" : ""})</span>
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {pool.map((v, i) => (
                      <span key={i} className="px-3 py-1 rounded-lg bg-white/8 border border-white/15 text-white/70 text-[13px] font-mono">
                        {v > 0 ? `+${v}` : `${v}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Grille unifiée ── */}
              {pool.length === 0 && (
                <>
                  {/* En-tête phase bonus */}
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/8" />
                    <span className="text-[10px] uppercase tracking-[0.15em] text-emerald-400/60 shrink-0">
                      ✓ Base complète — ajoutez les bonus
                    </span>
                    <div className="h-px flex-1 bg-white/8" />
                  </div>

                  {/* Toggle source */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBonusSource("peuple")}
                      className={`flex-1 py-2 rounded-xl border text-[12px] transition-all ${bonusSource === "peuple" ? "border-[#E3CCCD]/50 bg-[#E3CCCD]/10 text-[#E3CCCD]" : "border-white/12 text-white/40 hover:border-white/25 hover:text-white/60"}`}
                    >
                      Bonus du Peuple
                    </button>
                    <button
                      type="button"
                      onClick={() => setBonusSource("voies")}
                      className={`flex-1 py-2 rounded-xl border text-[12px] transition-all ${bonusSource === "voies" ? "border-emerald-400/40 bg-emerald-400/8 text-emerald-300" : "border-white/12 text-white/40 hover:border-white/25 hover:text-white/60"}`}
                    >
                      Bonus Voies / Divers
                    </button>
                  </div>

                  {/* Texte de référence peuple */}
                  {bonusSource === "peuple" && selectedPeuple?.caracteristiques && (
                    <p className="text-[11px] text-white/45 italic leading-relaxed px-1">
                      Référence : {selectedPeuple.caracteristiques}
                    </p>
                  )}
                </>
              )}

              {/* Grille stats (phase assignation OU phase bonus) */}
              <div className="grid grid-cols-1 gap-2">
                {STATS_KEYS.map(stat => {
                  const baseVal = stats[stat];
                  const bonusActive = bonusSource === "peuple" ? bonusPeuple[stat] : bonusVoies[stat];
                  const total = totalStats[stat];
                  const isBonus = pool.length === 0;

                  return (
                    <div
                      key={stat}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isBonus
                          ? bonusSource === "peuple"
                            ? "bg-[#E3CCCD]/4 border-[#E3CCCD]/10"
                            : "bg-emerald-400/4 border-emerald-400/10"
                          : "bg-white/4 border-white/8 hover:bg-white/6"
                        }`}
                    >
                      <div className={`w-10 text-[11px] uppercase tracking-widest font-bold ${isBonus ? (bonusSource === "peuple" ? "text-[#E3CCCD]/50" : "text-emerald-400/50") : "text-white/50"}`}>{stat}</div>
                      <div className="text-[11px] text-white/35 flex-1">{STAT_LABEL[stat]}</div>

                      {/* Valeur de base (toujours visible) */}
                      <div className={`font-mono text-sm w-8 text-center ${isBonus ? "text-white/30" : "text-white"}`}>
                        {baseVal > 0 ? `+${baseVal}` : baseVal}
                      </div>

                      {/* Contrôles */}
                      {!isBonus ? (
                        /* Phase assignation : boutons pool */
                        <div className="flex gap-1.5 items-center">
                          {pool.map((v, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => assignPoolValue(stat, i)}
                              className="px-2 py-0.5 rounded text-[11px] font-mono bg-white/8 border border-white/15 text-white/60 hover:bg-[#E3CCCD]/15 hover:text-[#E3CCCD] hover:border-[#E3CCCD]/40 transition-all"
                            >
                              {v > 0 ? `+${v}` : `${v}`}
                            </button>
                          ))}
                          {assignedStats.has(stat) && (
                            <button
                              type="button"
                              onClick={() => unassignStat(stat)}
                              className="text-[11px] px-2 py-0.5 rounded border border-red-400/20 text-red-400/50 hover:text-red-400 hover:border-red-400/40 transition-all"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ) : (
                        /* Phase bonus : +/- */
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => adjustBonus(bonusSource, stat, -1)}
                            disabled={bonusActive <= -3}
                            className="w-6 h-6 rounded-md border border-white/15 text-white/40 hover:text-white hover:border-white/30 flex items-center justify-center text-sm disabled:opacity-20 transition-all"
                          >−</button>
                          <span className={`w-8 text-center font-mono text-sm ${bonusActive > 0
                              ? bonusSource === "peuple" ? "text-[#E3CCCD]" : "text-emerald-400"
                              : bonusActive < 0 ? "text-red-400/70"
                                : "text-white/30"
                            }`}>
                            {bonusActive > 0 ? `+${bonusActive}` : bonusActive}
                          </span>
                          <button
                            type="button"
                            onClick={() => adjustBonus(bonusSource, stat, 1)}
                            disabled={bonusActive >= 4}
                            className="w-6 h-6 rounded-md border border-white/15 text-white/40 hover:text-white hover:border-white/30 flex items-center justify-center text-sm disabled:opacity-20 transition-all"
                          >+</button>
                        </div>
                      )}

                      {/* Total final (visible uniquement en phase bonus) */}
                      {isBonus && (
                        <div className="w-12 text-right">
                          <span className="text-[12px] text-white/60 font-mono font-semibold">
                            {total > 0 ? `+${total}` : total}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Récap totaux en phase bonus */}
              {pool.length === 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {STATS_KEYS.map(stat => {
                    const t = totalStats[stat];
                    return (
                      <div key={stat} className="flex flex-col items-center px-3 py-2 rounded-xl bg-white/5 border border-white/10 min-w-14">
                        <span className="text-[10px] uppercase tracking-widest text-white/35 mb-0.5">{stat}</span>
                        <span className={`font-mono text-sm font-semibold ${t > 0 ? "text-white" : t < 0 ? "text-red-400/70" : "text-white/30"}`}>
                          {t > 0 ? `+${t}` : t}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3 : Voies & Capacités ── */}
          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
              {/* Voie du peuple */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                  Voie du Peuple {isDemiElf ? "— choisissez" : "(automatique)"}
                </label>
                {isDemiElf ? (
                  <div className="space-y-2">
                    <p className="text-[11px] text-[#E3CCCD]/50 italic px-1">
                      En tant que Demi-Elfe, choisissez votre héritage elfe parmi :
                    </p>
                    {peuples.filter(p => p.demi_elf && p.voie).length === 0 && (
                      <p className="text-[12px] text-red-400/50 italic">Aucun peuple demi-elfe avec une voie associée trouvé.</p>
                    )}
                    {peuples.filter(p => p.demi_elf && p.voie?.id).map(peuple => {
                      const voieId = peuple.voie!.id;
                      const selected = !!voieId && selectedDemiElfVoieId === voieId;
                      return (
                        <button
                          key={peuple.id}
                          type="button"
                          onClick={() => voieId && setSelectedDemiElfVoieId(voieId)}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${selected ? "border-[#E3CCCD]/50 bg-[#E3CCCD]/10" : "border-white/15 hover:border-white/30 hover:bg-white/4"
                            }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className={`text-[13px] font-medium ${selected ? "text-[#E3CCCD]" : "text-white/70"}`}>{peuple.nom}</p>
                            {selected && <span className="text-[11px] text-[#E3CCCD]/60">✓ Sélectionné</span>}
                          </div>
                          <p className="text-[11px] text-white/40 mb-1">Voie : {peuple.voie!.nom}</p>
                          {peuple.voie!.capacites?.rang1 && (
                            <p className="text-[12px] text-white/35">
                              Rang 1 · {peuple.voie!.capacites.rang1.nom}
                              {peuple.voie!.capacites.rang1.type && <span className="ml-1 text-white/20">({peuple.voie!.capacites.rang1.type})</span>}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : selectedPeuple?.voie ? (
                  <div className="p-4 rounded-xl border border-[#E3CCCD]/20 bg-[#E3CCCD]/5">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#E3CCCD]/45 mb-1">{selectedPeuple.nom}</p>
                    <p className="text-[13px] text-[#E3CCCD]/90 font-medium mb-1">{selectedPeuple.voie.nom}</p>
                    {selectedPeuple.voie.capacites?.rang1 && (
                      <p className="text-[12px] text-white/60">
                        <span className="text-white/40">Rang 1 ·</span> {selectedPeuple.voie.capacites.rang1.nom}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[12px] text-white/25 italic">Aucune voie de peuple associée.</p>
                )}
              </div>

              {/* Voies famille (choix 2) */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                  Voies de Famille — choisissez 2
                  <span className="ml-2 text-white/30">({selectedFamilleVoieIds.length}/2)</span>
                </label>
                {familleVoies.length === 0 && (
                  <p className="text-[12px] text-white/25 italic">Aucune voie rattachée à cette famille.</p>
                )}
                <div className="space-y-2">
                  {familleVoies.map((voie: any) => {
                    const selected = selectedFamilleVoieIds.includes(voie.id);
                    const disabled = !selected && selectedFamilleVoieIds.length >= 2;
                    return (
                      <button
                        key={voie.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleFamilleVoie(voie.id)}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${selected ? "border-[#E3CCCD]/50 bg-[#E3CCCD]/10" : disabled ? "border-white/8 opacity-40 cursor-not-allowed" : "border-white/15 hover:border-white/30 hover:bg-white/4"}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-[13px] font-medium ${selected ? "text-[#E3CCCD]" : "text-white/70"}`}>{voie.nom}</p>
                          {selected && <span className="text-[11px] text-[#E3CCCD]/60">✓ Sélectionnée</span>}
                        </div>
                        {voie.capacites?.rang1 && (
                          <p className="text-[12px] text-white/45">
                            Rang 1 · {voie.capacites.rang1.nom}
                            {voie.capacites.rang1.type && <span className="ml-1 text-white/25">({voie.capacites.rang1.type})</span>}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Encart mage */}
              {isMage && (
                <div className="flex gap-3 p-4 rounded-xl border border-amber-400/20 bg-amber-400/5">
                  <Info className="w-4 h-4 text-amber-400/60 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-[12px] text-white/70 leading-relaxed">
                      <span className="text-amber-300 font-medium">Exception Mystique :</span> Votre famille appartient aux Mystiques. Un personnage mage peut acquérir une capacité de rang 2 supplémentaire dès le niveau 1.
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox" checked={mageExtra}
                        onChange={e => setMageExtra(e.target.checked)}
                        className="accent-amber-400 w-4 h-4"
                      />
                      <span className="text-[12px] text-white/60">Acquérir une capacité rang 2 supplémentaire</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4 : Statistiques Dérivées ── */}
          {step === 4 && (
            <div className="space-y-5 animate-in slide-in-from-right-4 fade-in">
              <div className="flex gap-3 p-4 rounded-xl border border-white/10 bg-white/4">
                <Info className="w-4 h-4 text-white/40 shrink-0 mt-0.5" />
                <p className="text-[12px] text-white/50 leading-relaxed">
                  Ces valeurs sont calculées automatiquement. Vous pouvez les modifier manuellement si besoin.
                </p>
              </div>

              {/* Encart équipement de base famille */}
              {selectedFamille && (
                <div className="space-y-2 p-4 rounded-xl border border-amber-400/20 bg-amber-400/5">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-amber-400/60 mb-2">Équipement de base — {selectedFamille.nom}</p>
                  {selectedFamille.equipement_base ? (
                    <p className="text-[12px] text-white/55 leading-relaxed whitespace-pre-line">{selectedFamille.equipement_base}</p>
                  ) : (
                    <p className="text-[12px] text-white/25 italic">Aucun équipement de base renseigné.</p>
                  )}
                </div>
              )}

              {/* Sélection équipements (multi-select dropdown) */}
              {(() => {
                const COMBAT_CATS = ["arme contact", "arme distance", "armure", "bouclier"];
                const allCombat = equipements.filter(eq =>
                  COMBAT_CATS.some(c => eq.categorie?.toLowerCase().trim() === c)
                );
                const filtered = allCombat.filter(eq =>
                  !eqSearch ||
                  eq.nom.toLowerCase().includes(eqSearch.toLowerCase()) ||
                  (eq.categorie?.toLowerCase() ?? "").includes(eqSearch.toLowerCase())
                );
                const grouped = filtered.reduce<Record<string, Equipement[]>>((acc, eq) => {
                  const cat = eq.categorie || "Divers";
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(eq);
                  return acc;
                }, {});
                const toggle = (id: string) => setSelectedEquipementIds(prev =>
                  prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                );
                const selectedItems = allCombat.filter(eq => selectedEquipementIds.includes(eq.id));
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Équipements</label>
                      {selectedEquipementIds.length > 0 && (
                        <span className="text-[11px] text-[#E3CCCD]/60">{selectedEquipementIds.length} sélectionné{selectedEquipementIds.length > 1 ? "s" : ""}</span>
                      )}
                    </div>
                    {/* Encarts équipements sélectionnés */}
                    {selectedItems.length > 0 && (
                      <div className="space-y-1.5">
                        {selectedItems.map(eq => {
                          const proprietes: Array<{ label: string; valeur: string }> = eq.data?.proprietes ?? [];
                          return (
                            <div key={eq.id} className="flex items-start gap-3 p-3 rounded-xl border border-[#E3CCCD]/20 bg-[#E3CCCD]/5">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-[12px] font-medium text-[#E3CCCD]/90">{eq.nom}</p>
                                  <span className="text-[10px] uppercase tracking-widest text-white/25 border border-white/10 rounded-full px-1.5 py-0.5">{eq.categorie}</span>
                                  {eq.prix && <span className="text-[11px] text-white/30 ml-auto">{eq.prix}</span>}
                                </div>
                                {eq.data?.description && (
                                  <p className="text-[11px] text-white/50 leading-relaxed mb-1">{eq.data.description}</p>
                                )}
                                {proprietes.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {proprietes.map((p, i) => (
                                      <span key={i} className="text-[11px] text-white/45 font-mono">
                                        <span className="text-white/25">{p.label} </span>{p.valeur}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <button type="button" onClick={() => toggle(eq.id)} className="text-white/20 hover:text-red-400/70 transition-colors shrink-0 mt-0.5 text-[13px] leading-none">×</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Dropdown */}
                    <div className="relative" ref={eqDropdownRef}>
                      <div
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors cursor-text ${eqDropdownOpen ? "border-white/30 bg-white/8" : "border-white/15 bg-white/5 hover:border-white/25"}`}
                        onClick={() => setEqDropdownOpen(true)}
                      >
                        <input
                          type="text"
                          value={eqSearch}
                          onChange={e => { setEqSearch(e.target.value); setEqDropdownOpen(true); }}
                          onFocus={() => setEqDropdownOpen(true)}
                          placeholder="Rechercher un équipement..."
                          className="flex-1 bg-transparent outline-none text-white text-[12px] placeholder:text-white/30"
                        />
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-white/30 shrink-0 transition-transform cursor-pointer ${eqDropdownOpen ? "rotate-180" : ""}`}
                          onClick={e => { e.stopPropagation(); setEqDropdownOpen(o => !o); }}
                        />
                      </div>
                      {eqDropdownOpen && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-xl border border-white/15 bg-[#1E1941] shadow-2xl overflow-hidden max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).length === 0 ? (
                            <p className="text-[12px] text-white/30 italic text-center py-4">Aucun résultat</p>
                          ) : (
                            Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
                              <div key={cat}>
                                <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/25 bg-white/5 sticky top-0">{cat}</div>
                                {items.map(eq => {
                                  const selected = selectedEquipementIds.includes(eq.id);
                                  return (
                                    <button
                                      key={eq.id}
                                      type="button"
                                      onMouseDown={e => { e.preventDefault(); toggle(eq.id); }}
                                      className={`w-full text-left px-3 py-2.5 flex items-start justify-between gap-2 hover:bg-white/8 transition-colors ${selected ? "bg-[#E3CCCD]/8" : ""}`}
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-[12px] font-medium ${selected ? "text-[#E3CCCD]" : "text-white/65"}`}>{eq.nom}</p>
                                        {eq.data?.description && (
                                          <p className="text-[11px] text-white/30 leading-snug mt-0.5 truncate">{eq.data.description}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {eq.prix && <span className="text-[11px] text-white/30">{eq.prix}</span>}
                                        {selected && <span className="text-[#E3CCCD]/60 text-[11px]">✓</span>}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* PM : nb sorts */}
              <div className="flex items-center gap-4 p-3 rounded-xl bg-white/4 border border-white/8">
                <span className="text-[12px] text-white/50 flex-1">Sorts connus (pour PM)</span>
                <input
                  type="number" min={0} value={nbSorts}
                  onChange={e => setNbSorts(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-16 bg-transparent border-b border-white/30 focus:border-[#E3CCCD]/60 py-1 text-white text-sm text-center outline-none"
                />
              </div>

              {/* Grille dérivées */}
              {(() => {
                const StatCard = ({
                  k, label, formula, isText, icon: Icon, color,
                }: {
                  k: string; label: string; formula: string;
                  isText?: boolean;
                  icon: React.ElementType;
                  color: string;
                }) => {
                  const val = overrides[k as keyof typeof overrides] !== undefined
                    ? overrides[k as keyof typeof overrides]
                    : dv[k];
                  return (
                    <div className={`flex flex-col items-center gap-1 p-3 rounded-xl border bg-white/4 hover:bg-white/6 transition-colors ${color}`}>
                      <Icon className="w-5 h-5 opacity-40 shrink-0 text-white" />
                      {isText ? (
                        <input
                          type="text"
                          value={overrides[k as keyof typeof overrides] !== undefined ? String(overrides[k as keyof typeof overrides]) : String(dv[k])}
                          onChange={e => setOverrides(prev => ({ ...prev, [k]: e.target.value }))}
                          title={label}
                          className="w-full text-center font-mono text-xl font-bold text-white bg-transparent outline-none"
                        />
                      ) : (
                        <input
                          type="number"
                          value={val as number}
                          onChange={e => setOverride(k, parseInt(e.target.value) || 0)}
                          title={label}
                          className="w-full text-center font-mono text-xl font-bold text-white bg-transparent outline-none"
                        />
                      )}
                      <span className="text-[10px] text-white/35 text-center leading-tight">{label}</span>
                      <span className="text-[9px] text-white/20 text-center leading-none font-mono">{formula}</span>
                    </div>
                  );
                };
                return (
                  <div className="space-y-3">
                    {/* Vigueur */}
                    <p className="text-[10px] uppercase tracking-widest text-white/25">Vigueur</p>
                    <div className="grid grid-cols-3 gap-2">
                      <StatCard k="pv" label="PV" formula={`2×${selectedFamille?.pv_niveau ?? "?"}+CON${stats.CON >= 0 ? "+" : ""}${stats.CON}`} icon={Heart} color="border-rose-400/20" />
                      <StatCard k="drQty" label="DR (qté)" formula={`${isMage ? "3" : "2"}+CON${stats.CON >= 0 ? "+" : ""}${stats.CON}`} icon={RefreshCw} color="border-rose-400/15" />
                      <StatCard k="drDe" label="DR (dé)" formula={selectedFamille?.de_recuperation ?? "d6"} isText icon={Dice1} color="border-rose-400/15" />
                    </div>
                    {/* Ressources */}
                    <p className="text-[10px] uppercase tracking-widest text-white/25 pt-1">Ressources</p>
                    <div className="grid grid-cols-2 gap-2">
                      <StatCard k="pc" label="Points de Chance" formula={`${selectedFamille?.groupe === "Aventuriers" ? "3" : "2"}+CHA${stats.CHA >= 0 ? "+" : ""}${stats.CHA}`} icon={Star} color="border-amber-400/20" />
                      <StatCard k="pm" label="Points de Mana" formula={`VOL${stats.VOL >= 0 ? "+" : ""}${stats.VOL}+${nbSorts}sorts`} icon={Sparkles} color="border-violet-400/20" />
                    </div>
                    {/* Combat */}
                    <p className="text-[10px] uppercase tracking-widest text-white/25 pt-1">Combat</p>
                    <div className="grid grid-cols-5 gap-2">
                      <StatCard k="initiative" label="Init." formula={`10+PER${stats.PER >= 0 ? "+" : ""}${stats.PER}`} icon={Zap} color="border-yellow-400/20" />
                      <StatCard k="defense" label="Déf." formula={`10+AGI${stats.AGI >= 0 ? "+" : ""}${stats.AGI}`} icon={Shield} color="border-sky-400/20" />
                      <StatCard k="attContact" label="Att. C" formula={`1+FOR${stats.FOR >= 0 ? "+" : ""}${stats.FOR}`} icon={Swords} color="border-orange-400/20" />
                      <StatCard k="attDistance" label="Att. D" formula={`1+AGI${stats.AGI >= 0 ? "+" : ""}${stats.AGI}`} icon={Target} color="border-orange-400/15" />
                      <StatCard k="attMagie" label="Att. M" formula={`1+VOL${stats.VOL >= 0 ? "+" : ""}${stats.VOL}`} icon={Wand2} color="border-violet-400/15" />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── STEP 5 : Équipement & Lore ── */}
          {step === 5 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
              {/* Équipement de base */}
              {selectedFamille?.equipement_base && (
                <div className="p-4 rounded-xl border border-white/15 bg-white/4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-2">Équipement de base ({selectedFamille.nom})</p>
                  <p className="text-[13px] text-white/70 leading-relaxed whitespace-pre-line">{selectedFamille.equipement_base}</p>
                </div>
              )}

              {/* Idéal */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Idéal Héroïque</label>
                <textarea
                  value={ideal} onChange={e => setIdeal(e.target.value)} rows={3}
                  placeholder="Ce qui pousse votre personnage à agir en héros..."
                  className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-xl p-3.5 text-white text-sm outline-none transition-colors resize-none placeholder:text-white/25 leading-relaxed"
                />
              </div>

              {/* Travers */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Travers</label>
                <textarea
                  value={travers} onChange={e => setTravers(e.target.value)} rows={2}
                  placeholder="Une faiblesse, une obsession, une peur..."
                  className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-xl p-3.5 text-white text-sm outline-none transition-colors resize-none placeholder:text-white/25 leading-relaxed"
                />
              </div>

              {/* Historique */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Historique (Secret Intime)</label>
                <textarea
                  value={historique} onChange={e => setHistorique(e.target.value)} rows={4}
                  placeholder="Le passé du personnage, son secret, ce qu'il cache..."
                  className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-xl p-3.5 text-white text-sm outline-none transition-colors resize-none placeholder:text-white/25 leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="relative z-10 shrink-0 px-8 py-5 border-t border-white/8 bg-black/10 flex items-center justify-between gap-3">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-white/50 hover:text-white hover:border-white/30 text-[13px] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {step > 1 ? "Retour" : "Annuler"}
          </button>

          <div className="flex items-center gap-2">
            {STEPS.map(s => (
              <div key={s.num} className={`w-1.5 h-1.5 rounded-full transition-all ${step === s.num ? "bg-[#E3CCCD]" : step > s.num ? "bg-white/40" : "bg-white/15"}`} />
            ))}
          </div>

          {step < STEPS.length ? (
            <button
              onClick={() => { if (!canAdvance()) return alert(step === 1 ? "Complétez le nom, le peuple et la famille." : step === 2 ? "Assignez toutes les valeurs." : "Choisissez 2 voies de famille."); setStep(s => s + 1); }}
              disabled={!canAdvance()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E3CCCD]/15 border border-[#E3CCCD]/30 text-[#E3CCCD] hover:bg-[#E3CCCD]/25 text-[13px] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Suivant <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E3CCCD]/20 border border-[#E3CCCD]/40 text-[#E3CCCD] hover:bg-[#E3CCCD]/30 text-[13px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? "Sauvegarde..." : "Créer le personnage"}
            </button>
          )}
        </div>
    </ModalLayout>
  );
}
