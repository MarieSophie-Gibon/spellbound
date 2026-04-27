/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X, ArrowRight, ArrowLeft, Save,
  Image as ImageIcon, UploadCloud, Info,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  Expert:     [3, 2, 1, 1, 0, 0, -1],
  Spécialiste:[4, 2, 1, 0, 0, -1, -1],
};

interface PeupleRef {
  id: string;
  nom: string;
  caracteristiques: string; // champ lisible depuis data->caracteristiques
  voie_id: string | null;
  voie?: { id: string; nom: string; capacites: any };
}

interface FamilleRef {
  id: string;
  nom: string;
  groupe: string;
  pv_niveau: number;
  de_recuperation: string;
  bonus_chance: number;
  equipement_base: string | null;
  voies?: Array<{ id: string; nom: string; capacites: any }>;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

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

  // ── Step 3 ──────────────────────────────────
  // voie du peuple (auto) + 2 voies famille (choix)
  const [selectedFamilleVoieIds, setSelectedFamilleVoieIds] = useState<string[]>([]);
  // capacité rang1 cochée par voie
  const [checkedRanks, setCheckedRanks] = useState<Record<string, boolean>>({});
  // override mage rang2
  const [mageExtra, setMageExtra] = useState(false);

  // ── Step 4 ──────────────────────────────────
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
        .select("id, nom, data, voie:voies(id, nom, capacites)")
        .order("nom");
      if (pData) {
        setPeuples(pData.map((p: any) => ({
          id: p.id,
          nom: p.nom,
          caracteristiques: p.data?.caracteristiques ?? "",
          voie_id: p.voie?.id ?? null,
          voie: p.voie ?? undefined,
        })));
      }

      // Familles avec leurs voies
      const { data: fData } = await supabase
        .from("familles")
        .select("id, nom, groupe, pv_niveau, de_recuperation, bonus_chance, equipement_base, voies(id, nom, capacites)")
        .order("nom");
      if (fData) {
        setFamilles(fData.map((f: any) => ({
          id: f.id,
          nom: f.nom,
          groupe: f.groupe ?? "",
          pv_niveau: f.pv_niveau ?? 0,
          de_recuperation: f.de_recuperation ?? "d6",
          bonus_chance: f.bonus_chance ?? 0,
          equipement_base: f.equipement_base ?? null,
          voies: f.voies ?? [],
        })));
      }
    }
    fetchRef();
  }, []);

  // Recalcul dérivé quand stats / famille / nbSorts changent
  useEffect(() => {
    const fam = familles.find(f => f.id === selectedFamilleId) ?? null;
    setDerived(computeDerived(stats, fam, nbSorts));
    setOverrides({});
  }, [stats, selectedFamilleId, familles, nbSorts]);

  // Quand le tableau change, reset pool et stats
  const handleTableauChange = (t: string) => {
    setTableau(t);
    setPool([...TABLEAUX[t]]);
    setStats(buildDefaultStats());
  };

  // Assigner une valeur du pool à une stat
  const assignPoolValue = (stat: StatKey, poolIndex: number) => {
    const value = pool[poolIndex];
    // Libère l'ancienne valeur si déjà assignée
    const oldValue = stats[stat];
    const newPool = pool.filter((_, i) => i !== poolIndex);
    if (oldValue !== 0 || pool.includes(0)) {
      // Remettre l'ancienne valeur dans le pool seulement si ce n'était pas 0 par défaut
      const wasAssigned = Object.values(stats).some(
        (v, _i) => v === oldValue && STATS_KEYS[_i] === stat
      );
      if (wasAssigned && oldValue !== undefined) {
        newPool.push(oldValue);
        newPool.sort((a, b) => b - a);
      }
    }
    setPool(newPool.sort((a, b) => b - a));
    setStats(prev => ({ ...prev, [stat]: value }));
  };

  // Retirer l'assignation d'une stat
  const unassignStat = (stat: StatKey) => {
    const value = stats[stat];
    setPool(prev => [...prev, value].sort((a, b) => b - a));
    setStats(prev => ({ ...prev, [stat]: 0 }));
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
      if (selectedPeuple?.voie_id) {
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
          caracteristiques: stats,
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
        inventory: selectedFamille ? { equipement_base: selectedFamille.equipement_base } : {},
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
    if (step === 3) return selectedFamilleVoieIds.length === 2;
    return true;
  };

  // ── Derived display helper ───────────────────
  const dv = { ...derived, ...overrides } as any;
  const setOverride = (key: string, value: number) => setOverrides(prev => ({ ...prev, [key]: value }));

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return createPortal(
    <div className="fixed inset-0 z-9999 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col h-[85vh] animate-in zoom-in-95 duration-200 border border-white/10 overflow-hidden"
        style={{ background: "linear-gradient(160deg, rgba(100,70,180,0.38) 0%, rgba(70,45,140,0.44) 50%, rgba(130,80,160,0.38) 100%)" }}
      >
        <div className="absolute inset-0 backdrop-blur-3xl -z-10" />
        <div className="absolute inset-0 bg-white/3 -z-10" />
        <div className="absolute inset-px rounded-2xl border border-white/10 pointer-events-none z-0" />

        {/* HEADER */}
        <div className="relative z-10 shrink-0 px-8 pt-7 pb-5 border-b border-white/8 bg-black/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 mb-1">Nouveau Personnage Joueur</p>
              <h2 className="font-serif text-2xl text-white tracking-wide">Création de Personnage</h2>
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
                    >{p.nom}</button>
                  ))}
                </div>
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
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
              {/* Info peuple */}
              {selectedPeuple?.caracteristiques && (
                <div className="flex gap-3 p-4 rounded-xl border border-[#E3CCCD]/20 bg-[#E3CCCD]/5">
                  <Info className="w-4 h-4 text-[#E3CCCD]/60 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-[#E3CCCD]/60 mb-1">
                      Modificateurs de {selectedPeuple.nom}
                    </p>
                    <p className="text-[12px] text-white/70 leading-relaxed">{selectedPeuple.caracteristiques}</p>
                  </div>
                </div>
              )}

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

              {/* Pool restant */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                  Valeurs à distribuer
                  {pool.length > 0 && <span className="ml-2 text-amber-400/70">({pool.length} restante{pool.length > 1 ? "s" : ""})</span>}
                  {pool.length === 0 && <span className="ml-2 text-emerald-400/70">✓ Toutes assignées</span>}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {pool.map((v, i) => (
                    <span key={i} className="px-3 py-1 rounded-lg bg-white/8 border border-white/15 text-white/70 text-[13px] font-mono">
                      {v > 0 ? `+${v}` : `${v}`}
                    </span>
                  ))}
                  {pool.length === 0 && (
                    <span className="text-[12px] text-white/25 italic">Pool vide</span>
                  )}
                </div>
              </div>

              {/* Grille stats */}
              <div className="grid grid-cols-1 gap-2">
                {STATS_KEYS.map(stat => (
                  <div key={stat} className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/8 hover:bg-white/6 transition-colors">
                    <div className="w-10 text-[11px] uppercase tracking-widest text-white/50 font-bold">{stat}</div>
                    <div className="text-[11px] text-white/35 flex-1">{STAT_LABEL[stat]}</div>
                    <div className="text-white font-mono text-sm w-10 text-center">
                      {stats[stat] > 0 ? `+${stats[stat]}` : stats[stat]}
                    </div>
                    {/* Boutons d'assignation */}
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
                      {stats[stat] !== 0 && (
                        <button
                          type="button"
                          onClick={() => unassignStat(stat)}
                          className="text-[11px] px-2 py-0.5 rounded border border-red-400/20 text-red-400/50 hover:text-red-400 hover:border-red-400/40 transition-all"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 3 : Voies & Capacités ── */}
          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
              {/* Voie du peuple (auto) */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Voie du Peuple (automatique)</label>
                {selectedPeuple?.voie ? (
                  <div className="p-4 rounded-xl border border-[#E3CCCD]/20 bg-[#E3CCCD]/5">
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
              {[
                { key: "pv", label: "Points de Vigueur (PV)", formula: `(2 × PV famille: ${selectedFamille?.pv_niveau ?? "?"}) + CON (${stats.CON})` },
                { key: "drQty", label: "Dés de Récupération (qté)", formula: `${isMage ? "3" : "2"} + CON (${stats.CON})` },
                { key: "drDe", label: "Dé de récupération (type)", formula: selectedFamille?.de_recuperation ?? "d6", isText: true },
                { key: "pc", label: "Points de Chance (PC)", formula: `${selectedFamille?.groupe === "Aventuriers" ? "3" : "2"} + CHA (${stats.CHA})` },
                { key: "pm", label: "Points de Mana (PM)", formula: `VOL (${stats.VOL}) + Sorts (${nbSorts})` },
                { key: "initiative", label: "Initiative", formula: `10 + PER (${stats.PER})` },
                { key: "defense", label: "Défense", formula: `10 + AGI (${stats.AGI})` },
                { key: "attContact", label: "Attaque Contact", formula: `1 + FOR (${stats.FOR})` },
                { key: "attDistance", label: "Attaque Distance", formula: `1 + AGI (${stats.AGI})` },
                { key: "attMagie", label: "Attaque Magie", formula: `1 + VOL (${stats.VOL})` },
              ].map(({ key, label, formula, isText }) => (
                <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/8">
                  <div className="flex-1">
                    <p className="text-[12px] text-white/70">{label}</p>
                    <p className="text-[11px] text-white/30 mt-0.5">{formula}</p>
                  </div>
                  {isText ? (
                    <input
                      type="text"
                      value={overrides[key as keyof typeof overrides] !== undefined ? String(overrides[key as keyof typeof overrides]) : String(dv[key])}
                      onChange={e => setOverrides(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-16 bg-transparent border-b border-white/30 focus:border-[#E3CCCD]/60 py-1 text-white text-sm text-center outline-none"
                    />
                  ) : (
                    <input
                      type="number"
                      value={overrides[key as keyof typeof overrides] !== undefined ? overrides[key as keyof typeof overrides] as number : dv[key] as number}
                      onChange={e => setOverride(key, parseInt(e.target.value) || 0)}
                      className="w-16 bg-transparent border-b border-white/30 focus:border-[#E3CCCD]/60 py-1 text-white text-sm text-center outline-none"
                    />
                  )}
                </div>
              ))}
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
      </div>
    </div>,
    document.body
  );
}
