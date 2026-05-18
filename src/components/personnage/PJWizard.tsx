/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from "react";
import { ModalLayout } from "@/components/ui/ModalLayout";
import {
  X,
  ArrowRight,
  ArrowLeft,
  Save,
  Image as ImageIcon,
  UploadCloud,
  Info,
  ChevronDown,
  Heart,
  RefreshCw,
  Star,
  Sparkles,
  Zap,
  Shield,
  Swords,
  Target,
  Wand2,
  Dice1,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MagicCard } from "@/components/ui/MagicCard";
import type {
  Sexe,
  StatKey,
  StatsMap,
  PeupleRef,
  FamilleRef,
  EquipItem,
} from "@/lib/types/compendium";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface PJWizardProps {
  campaignId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const STATS_KEYS = ["FOR", "CON", "AGI", "PER", "CHA", "INT", "VOL"] as const;

const STAT_LABEL: Record<StatKey, string> = {
  FOR: "Force",
  CON: "Constitution",
  AGI: "Agilité",
  PER: "Perception",
  CHA: "Charisme",
  INT: "Intelligence",
  VOL: "Volonté",
};

// Tableaux de base (7 valeurs à assigner)
const TABLEAUX: Record<string, number[]> = {
  Polyvalent: [2, 2, 2, 1, 1, 0, -1],
  Expert: [3, 2, 1, 1, 0, 0, -1],
  Spécialiste: [4, 2, 1, 0, 0, -1, -1],
};

function buildDefaultStats(): StatsMap {
  return { FOR: 0, CON: 0, AGI: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 };
}

function computeDerived(stats: StatsMap, famille: FamilleRef | null) {
  const pv = famille ? 2 * famille.pv_niveau + stats.CON : stats.CON;
  const drQty = famille?.groupe === "Mystiques" ? 3 + stats.CON : 2 + stats.CON;
  const drDe = famille?.de_recuperation ?? "d6";
  const pc = (famille?.groupe === "Aventuriers" ? 3 : 2) + stats.CHA;
  const pm = stats.VOL;
  const initiative = 10 + stats.PER;
  const defense = 10 + stats.AGI;
  const attContact = 1 + stats.FOR;
  const attDistance = 1 + stats.AGI;
  const attMagie = 1 + stats.VOL;
  return {
    pv,
    drQty,
    drDe,
    pc,
    pm,
    initiative,
    defense,
    attContact,
    attDistance,
    attMagie,
  };
}

// ─────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────

export function PJWizard({ campaignId, onClose, onSuccess }: PJWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Step 1 ──────────────────────────────────
  const [nom, setNom] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [players, setPlayers] = useState<{ id: string; pseudo: string }[]>([]);
  const [sexe, setSexe] = useState<Sexe>("Masculin");
  const [age, setAge] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [peuples, setPeuples] = useState<PeupleRef[]>([]);
  const [familles, setFamilles] = useState<FamilleRef[]>([]);
  const [selectedPeupleId, setSelectedPeupleId] = useState<string>("");
  const [selectedFamilleId, setSelectedFamilleId] = useState<string>("");
  const [selectedGroupeNom, setSelectedGroupeNom] = useState<string>("");

  // ── Step 2 ──────────────────────────────────
  const [tableau, setTableau] = useState<string>("Polyvalent");
  const [pool, setPool] = useState<number[]>([...TABLEAUX["Polyvalent"]]);
  const [stats, setStats] = useState<StatsMap>(buildDefaultStats());
  const [assignedStats, setAssignedStats] = useState<Set<StatKey>>(new Set());
  const [dragPoolIndex, setDragPoolIndex] = useState<number | null>(null);
  const [dragOverStat, setDragOverStat] = useState<StatKey | null>(null);
  const [bonusPeuple, setBonusPeuple] = useState<StatsMap>(buildDefaultStats());
  const [bonusVoies] = useState<StatsMap>(buildDefaultStats());

  // ── Step 3 ──────────────────────────────────
  const [selectedFamilleVoieIds, setSelectedFamilleVoieIds] = useState<
    string[]
  >([]);
  const [selectedDemiElfVoieId] =
    useState<string>("");
  const [selectedSecondPeupleVoieId, setSelectedSecondPeupleVoieId] =
    useState<string>("");
  const [showSecondPeupleVoies, setShowSecondPeupleVoies] = useState(false);
  const [mageExtra] = useState(false);

  // ── Step 4 ──────────────────────────────────
  const [armesContact, setArmesContact] = useState<EquipItem[]>([]);
  const [armesDistance, setArmesDistance] = useState<EquipItem[]>([]);
  const [armures, setArmures] = useState<EquipItem[]>([]);
  const [selectedEquipItems, setSelectedEquipItems] = useState<EquipItem[]>([]);
  const [eqSearch, setEqSearch] = useState("");
  const [eqDropdownOpen, setEqDropdownOpen] = useState(false);
  const eqDropdownRef = useRef<HTMLDivElement>(null);
  const [derived, setDerived] = useState(() =>
    computeDerived(buildDefaultStats(), null),
  );
  const [overrides, setOverrides] = useState<Partial<typeof derived>>({});

  // ── Step 5 ──────────────────────────────────
  const [ideal, setIdeal] = useState("");
  const [travers, setTravers] = useState("");
  const [historique, setHistorique] = useState("");

  // ── Fetch données ────────────────────────────
  useEffect(() => {
    async function fetchRef() {
      // Joueurs
      const { data: playersData } = await supabase
        .from("utilisateurs")
        .select("id, pseudo")
        .order("pseudo");
      if (playersData) setPlayers(playersData);

      // Peuples avec leur voie
      const { data: pData } = await supabase
        .from("peuples")
        .select(
          "id, nom, description, data, multi, image_url, voie:voies!peuple_id(id, nom, capacites)",
        )
        .order("nom");
      if (pData) {
        setPeuples(
          pData.map((p: any) => {
            const voie = Array.isArray(p.voie) ? p.voie[0] : p.voie;
            return {
              id: p.id,
              nom: p.nom,
              description: p.description ?? "",
              caracteristiques: p.data?.caracteristiques ?? "",
              voie_id: voie?.id ?? null,
              voie: voie ?? undefined,
              demi_elf: !!p.multi,
              image_url: p.image_url ?? undefined,
              data: p.data,
            };
          }),
        );
      }

      // Familles (profils) avec leurs voies et stats de la famille archétype
      const { data: fData, error: fError } = await supabase
        .from("profils")
        .select(
          "id, nom, description, equipement_base, maitrise_equipement, image_url, data, famille:familles(nom, pv_niveau, de_recuperation, bonus_chance), voies(id, nom, capacites)",
        )
        .or(`campaign_id.eq.${campaignId},campaign_id.is.null`)
        .order("nom");
      if (fError) console.error("[PJWizard] profils error:", fError);
      if (fData) {
        setFamilles(
          fData.map((f: any) => {
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
              equipement_associe: (f.data?.equipement_associe ?? null) as {
                arme_contact?: string[];
                arme_distance?: string[];
                armure?: string[];
              } | null,
            };
          }),
        );
      }

      // Armes et armures
      const [r1, r2, r3] = await Promise.all([
        supabase
          .from("armes_contact")
          .select("id, nom, dm, type_de_dm")
          .order("nom"),
        supabase
          .from("armes_distance")
          .select("id, nom, dm, portee")
          .order("nom"),
        supabase.from("armures").select("id, nom, bonus_def").order("nom"),
      ]);
      if (r1.data)
        setArmesContact(
          r1.data.map((item: any) => ({
            id: item.id,
            nom: item.nom,
            source: "arme_contact" as const,
            details:
              [item.dm, item.type_de_dm].filter(Boolean).join(" ") || undefined,
          })),
        );
      if (r2.data)
        setArmesDistance(
          r2.data.map((item: any) => ({
            id: item.id,
            nom: item.nom,
            source: "arme_distance" as const,
            details:
              [item.dm, item.portee ? `Portée ${item.portee}` : null]
                .filter(Boolean)
                .join(" · ") || undefined,
          })),
        );
      if (r3.data)
        setArmures(
          r3.data.map((item: any) => ({
            id: item.id,
            nom: item.nom,
            source: "armure" as const,
            details: item.bonus_def ? `Déf. +${item.bonus_def}` : undefined,
          })),
        );
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

  // Recalcul dérivé quand stats / famille changent
  useEffect(() => {
    const fam = familles.find((f) => f.id === selectedFamilleId) ?? null;
    setDerived(computeDerived(totalStats, fam));
    setOverrides({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, bonusPeuple, bonusVoies, selectedFamilleId, familles]);

  // Fermer le dropdown équipement au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        eqDropdownRef.current &&
        !eqDropdownRef.current.contains(e.target as Node)
      ) {
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
    setStats((prev) => ({ ...prev, [stat]: value }));
    setAssignedStats((prev) => new Set([...prev, stat]));
  };

  // Retirer l'assignation d'une stat
  const unassignStat = (stat: StatKey) => {
    if (!assignedStats.has(stat)) return;
    const value = stats[stat];
    setPool((prev) => [...prev, value].sort((a, b) => b - a));
    setStats((prev) => ({ ...prev, [stat]: 0 }));
    setAssignedStats((prev) => {
      const next = new Set(prev);
      next.delete(stat);
      return next;
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const selectedPeuple = peuples.find((p) => p.id === selectedPeupleId);
  const selectedFamille = familles.find((f) => f.id === selectedFamilleId);
  const familleVoies = selectedFamille?.voies ?? [];
  const isMage =
    selectedFamille?.groupe?.toLowerCase().includes("mystique") || false;
  const isDemiElf =
    (selectedPeuple?.nom?.toLowerCase().includes("demi") &&
      selectedPeuple?.nom?.toLowerCase().includes("elf")) ??
    false;
  const uniqueGroupes = Array.from(
    new Map(familles.map((f) => [f.groupe, f])).values(),
  ).sort((a, b) => a.groupe.localeCompare(b.groupe));
  const filteredProfils = selectedGroupeNom
    ? familles.filter((f) => f.groupe === selectedGroupeNom)
    : [];

  const profilEquipItems: EquipItem[] = (() => {
    const equip = selectedFamille?.equipement_associe;
    if (!equip) return [];
    return [
      ...armesContact.filter((item) => equip.arme_contact?.includes(item.id)),
      ...armesDistance.filter((item) => equip.arme_distance?.includes(item.id)),
      ...armures.filter((item) => equip.armure?.includes(item.id)),
    ];
  })();

  // Sélection voies famille (max 2)
  const toggleFamilleVoie = (voieId: string) => {
    setSelectedFamilleVoieIds((prev) => {
      if (prev.includes(voieId)) return prev.filter((v) => v !== voieId);
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
        const { error: upErr } = await supabase.storage
          .from("compendium")
          .upload(path, imageFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage
          .from("compendium")
          .getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const d = { ...derived, ...overrides };

      const pjVoies: Array<{ voie_id: string; rangs_acquis: number[] }> = [];
      // Voie du peuple
      if (isDemiElf) {
        if (selectedDemiElfVoieId)
          pjVoies.push({ voie_id: selectedDemiElfVoieId, rangs_acquis: [1] });
      } else if (selectedPeuple?.voie_id) {
        pjVoies.push({ voie_id: selectedPeuple.voie_id, rangs_acquis: [1] });
      }
      // Voies famille
      for (const vid of selectedFamilleVoieIds) {
        pjVoies.push({
          voie_id: vid,
          rangs_acquis: mageExtra && isMage ? [1, 2] : [1],
        });
      }
      // Seconde voie du peuple (optionnel)
      if (selectedSecondPeupleVoieId) {
        pjVoies.push({
          voie_id: selectedSecondPeupleVoieId,
          rangs_acquis: [1],
        });
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("pj").insert({
        campaign_id: campaignId,
        player_id: selectedPlayerId || user?.id || null,
        name: nom.trim(),
        image_url: imageUrl,
        stats: {
          sexe,
          age: age.trim() || null,
          niveau: 1,
          caracteristiques: totalStats,
          pv: d.pv,
          pv_max: d.pv,
          dr_qty: d.drQty,
          dr_de: d.drDe,
          pc: d.pc,
          pm: d.pm,
          initiative: d.initiative,
          defense: d.defense,
          att_contact: d.attContact,
          att_distance: d.attDistance,
          att_magie: d.attMagie,
          ideal,
          travers,
          historique,
        },
        pathways: pjVoies,
        inventory: {
          equipement_base: selectedFamille?.equipement_base ?? null,
          selected_equipements: selectedEquipItems,
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
    { num: 2, label: "Famille" },
    { num: 3, label: "Caract." },
    { num: 4, label: "Voies" },
    { num: 5, label: "Dérivées" },
    { num: 6, label: "Lore" },
  ];

  const canAdvance = () => {
    if (step === 1) return nom.trim().length > 0 && !!selectedPeupleId;
    if (step === 2) return !!selectedFamilleId;
    if (step === 3) return pool.length === 0;
    if (step === 4)
      return (
        selectedFamilleVoieIds.length === 2 &&
        (!isDemiElf || !!selectedDemiElfVoieId)
      );
    return true;
  };

  // ── Derived display helper ───────────────────
  const dv = { ...derived, ...overrides } as any;
  const setOverride = (key: string, value: number) =>
    setOverrides((prev) => ({ ...prev, [key]: value }));

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <ModalLayout>
      {/* HEADER */}
      <div className="relative z-10 shrink-0 px-8 pt-7 pb-5 border-b border-white/8 bg-black/10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 mb-1">
              Nouveau Personnage Joueur
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/30 hover:text-white/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <button
                onClick={() => {
                  if (s.num < step) setStep(s.num);
                }}
                className={`flex items-center gap-2 transition-colors ${step === s.num ? "text-[#E3CCCD]" : step > s.num ? "text-white/60 hover:text-white/80" : "text-white/20 cursor-default"}`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all ${step === s.num ? "border-[#E3CCCD] bg-[#E3CCCD]/15 text-[#E3CCCD]" : step > s.num ? "border-white/30 bg-white/10 text-white/50" : "border-white/15 text-white/20"}`}
                >
                  {s.num}
                </span>
                <span className="text-[11px] uppercase tracking-widest font-medium hidden sm:block">
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-5 h-px mx-2 transition-colors ${step > s.num ? "bg-white/30" : "bg-white/10"}`}
                />
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
            {/* Nom + Joueur */}
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                  Nom du personnage *
                </label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  autoFocus
                  placeholder="ex : Aldric de Brumes..."
                  className="w-full bg-transparent border-b border-white/30 focus:border-[#E3CCCD]/80 py-2.5 text-white text-lg outline-none transition-colors placeholder:text-white/35"
                />
              </div>
              <div className="w-[30%] space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                  Joueur rattaché
                </label>
                <select
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none transition-colors appearance-none cursor-pointer"
                >
                  <option value="" className="bg-[#1E1941] text-white/50">
                    — Aucun joueur assigné —
                  </option>
                  {players.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      className="bg-[#1E1941] text-white"
                    >
                      {p.pseudo}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sexe & Âge */}
            <div className="flex gap-4 items-start">
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                  Sexe
                </label>
                <div className="flex gap-2 pt-1">
                  {(["Masculin", "Féminin", "Autre"] as Sexe[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSexe(s)}
                      className={`px-3 py-1.5 rounded-full text-[12px] border transition-all ${sexe === s ? "border-[#E3CCCD]/60 bg-[#E3CCCD]/15 text-[#E3CCCD]" : "border-white/15 text-white/50 hover:border-white/30 hover:text-white/70"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-[30%] space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                  Âge
                </label>
                <input
                  type="text"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="ex : 24 ans"
                  className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-2 text-white text-sm outline-none transition-colors placeholder:text-white/25"
                />
              </div>
            </div>

            {/* Peuple */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                Peuple *
              </label>
              {peuples.length === 0 && (
                <p className="text-white/30 text-xs italic pt-1">
                  Chargement...
                </p>
              )}
              <div className="flex gap-3 pt-1">
                {/* Liste */}
                <div className="flex flex-col gap-1 w-44 shrink-0 h-95 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-1">
                  {peuples
                    .filter((p) => !p.nom.toLowerCase().includes("mage"))
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPeupleId(p.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left ${selectedPeupleId === p.id ? "border-[#E3CCCD]/50 bg-[#E3CCCD]/8 text-[#E3CCCD]" : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5 text-white/60"}`}
                      >
                        <div className="w-6 h-6 rounded-md overflow-hidden shrink-0 bg-white/8 flex items-center justify-center">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.nom}
                              className="w-full h-full object-cover opacity-80"
                            />
                          ) : (
                            <span className="text-white/15 text-xs">◈</span>
                          )}
                        </div>
                        <span className="text-[12px] font-medium flex-1 min-w-0 truncate">
                          {p.nom}
                        </span>
                        {selectedPeupleId === p.id && (
                          <span className="text-[#E3CCCD]/60 text-[10px] shrink-0">
                            ✓
                          </span>
                        )}
                      </button>
                    ))}
                </div>
                {/* Card détail — MagicCard à gauche + infos à droite */}
                <div className="flex-1 min-w-0">
                  {selectedPeuple ? (
                    <div className="flex gap-4 p-3 rounded-xl border border-white/12 bg-white/4">
                      {/* MagicCard réduite via scale (sans affecter les autres usages) */}
                      <div className="pointer-events-none shrink-0">
                        <MagicCard
                          title={selectedPeuple.nom}
                          imageUrl={selectedPeuple.image_url}
                        />
                      </div>

                      {/* Infos à droite */}
                      <div className="flex-1 min-w-0 space-y-2 py-1 overflow-y-auto max-h-95 scrollbar-thin scrollbar-thumb-white/10">
                        {selectedPeuple.description && (
                          <p className="text-[11px] text-white/50 leading-relaxed">
                            {selectedPeuple.description}
                          </p>
                        )}
                        {selectedPeuple.data?.traits && (
                          <p className="text-[11px] text-white/40 leading-relaxed">
                            <span className="text-white/25">Traits ·</span>{" "}
                            {selectedPeuple.data.traits}
                          </p>
                        )}
                        {selectedPeuple.caracteristiques && (
                          <p className="text-[11px] text-[#E3CCCD]/55 font-mono">
                            <span className="text-white/30 font-sans">
                              Caract. ·
                            </span>{" "}
                            {selectedPeuple.caracteristiques}
                          </p>
                        )}
                        {selectedPeuple.voie && (
                          <div className="space-y-1.5 pt-2 border-t border-white/8">
                            <p className="text-[10px] uppercase tracking-[0.12em] text-[#E3CCCD]/50">
                              {selectedPeuple.voie.nom}
                            </p>
                            {selectedPeuple.voie.capacites && (
                              <div className="space-y-1.5">
                                {[1, 2, 3, 4, 5].map((rang) => {
                                  const cap =
                                    selectedPeuple.voie!.capacites?.[
                                      `rang${rang}`
                                    ];
                                  if (!cap) return null;
                                  return (
                                    <div key={rang} className="space-y-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-white/25 font-mono shrink-0">
                                          R{rang}
                                        </span>
                                        <span className="text-[11px] text-white/65 font-medium">
                                          {cap.nom}
                                        </span>
                                        {cap.type && (
                                          <span className="text-[10px] text-white/25 italic">
                                            ({cap.type})
                                          </span>
                                        )}
                                      </div>
                                      {cap.description && (
                                        <p className="text-[10px] text-white/35 leading-relaxed pl-5">
                                          {cap.description}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full rounded-xl border border-white/8 bg-white/2 min-h-28">
                      <p className="text-[12px] text-white/20 italic">
                        Sélectionnez un peuple
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2 : Famille & Profil ── */}
        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
            {/* Famille */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                Famille *
              </label>
              {familles.length === 0 && (
                <p className="text-white/30 text-xs italic pt-1">
                  Chargement...
                </p>
              )}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {uniqueGroupes.map((g) => {
                  const sel = selectedGroupeNom === g.groupe;
                  const count = familles.filter(
                    (f) => f.groupe === g.groupe,
                  ).length;
                  return (
                    <button
                      key={g.groupe}
                      type="button"
                      onClick={() => {
                        setSelectedGroupeNom(g.groupe);
                        setSelectedFamilleId("");
                        setSelectedFamilleVoieIds([]);
                        setSelectedEquipItems([]);
                      }}
                      className={`p-3 rounded-xl border transition-all text-left ${sel ? "border-[#E3CCCD]/50 bg-[#E3CCCD]/8" : "border-white/12 bg-white/3 hover:border-white/25 hover:bg-white/5"}`}
                    >
                      <p
                        className={`text-[13px] font-medium ${sel ? "text-[#E3CCCD]" : "text-white/70"}`}
                      >
                        {g.groupe}
                      </p>
                      <div className="flex gap-3 mt-1 text-[11px] text-white/30">
                        <span>PV/niv {g.pv_niveau}</span>
                        <span>{g.de_recuperation}</span>
                        <span>
                          {count} profil{count > 1 ? "s" : ""}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Profil (si famille choisie) */}
            {selectedGroupeNom && (
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                  Profil *
                </label>
                <div className="flex gap-3 pt-1">
                  {/* Liste des profils */}
                  <div className="flex flex-col gap-1 w-44 shrink-0 h-95 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-1">
                    {filteredProfils.map((f) => {
                      const sel = selectedFamilleId === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setSelectedFamilleId(f.id);
                            setSelectedFamilleVoieIds([]);
                            setSelectedEquipItems([]);
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left ${sel ? "border-[#E3CCCD]/50 bg-[#E3CCCD]/8 text-[#E3CCCD]" : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5 text-white/60"}`}
                        >
                          <div className="w-6 h-6 rounded-md overflow-hidden shrink-0 bg-white/8 flex items-center justify-center">
                            {f.image_url ? (
                              <img
                                src={f.image_url}
                                alt={f.nom}
                                className="w-full h-full object-cover opacity-80"
                              />
                            ) : (
                              <span className="text-white/15 text-xs">◈</span>
                            )}
                          </div>
                          <span className="text-[12px] font-medium flex-1 min-w-0 truncate">
                            {f.nom}
                          </span>
                          {sel && (
                            <span className="text-[#E3CCCD]/60 text-[10px] shrink-0">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {/* Card détail — MagicCard + infos */}
                  <div className="flex-1 min-w-0">
                    {selectedFamille ? (
                      <div className="flex gap-4 p-3 rounded-xl border border-white/12 bg-white/4">
                        <div className="pointer-events-none shrink-0">
                          <MagicCard
                            title={selectedFamille.nom}
                            imageUrl={selectedFamille.image_url}
                          />
                        </div>
                        {/* Infos à droite */}
                        <div className="flex-1 min-w-0 space-y-2 py-1 overflow-y-auto max-h-95 scrollbar-thin scrollbar-thumb-white/10">
                          <span className="text-[10px] uppercase tracking-widest text-white/30 border border-white/15 rounded-full px-1.5 py-0.5 inline-block">
                            {selectedFamille.groupe}
                          </span>
                          {selectedFamille.description && (
                            <p className="text-[11px] text-white/50 leading-relaxed">
                              {selectedFamille.description}
                            </p>
                          )}
                          <div className="flex gap-4 text-[11px] text-white/45 flex-wrap">
                            <span>
                              <span className="text-white/25">PV/niv ·</span>{" "}
                              {selectedFamille.pv_niveau}
                            </span>
                            <span>
                              <span className="text-white/25">Récup ·</span>{" "}
                              {selectedFamille.de_recuperation}
                            </span>
                            {selectedFamille.bonus_chance !== 0 && (
                              <span>
                                <span className="text-white/25">Chance ·</span>{" "}
                                {selectedFamille.bonus_chance > 0
                                  ? `+${selectedFamille.bonus_chance}`
                                  : selectedFamille.bonus_chance}
                              </span>
                            )}
                          </div>
                          {selectedFamille.voies &&
                            selectedFamille.voies.length > 0 && (
                              <div className="space-y-1 pt-2 border-t border-white/8">
                                <p className="text-[10px] uppercase tracking-[0.12em] text-[#E3CCCD]/50">
                                  Voies
                                </p>
                                {selectedFamille.voies.map((v) => (
                                  <p
                                    key={v.id}
                                    className="text-[11px] text-white/50"
                                  >
                                    {v.nom}
                                  </p>
                                ))}
                              </div>
                            )}
                          {selectedFamille.equipement_base && (
                            <div className="space-y-1 pt-2 border-t border-white/8">
                              <p className="text-[10px] uppercase tracking-[0.12em] text-white/30">
                                Équipement de base
                              </p>
                              <p className="text-[11px] text-white/40 leading-relaxed whitespace-pre-line">
                                {selectedFamille.equipement_base}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full rounded-xl border border-white/8 bg-white/2 min-h-28">
                        <p className="text-[12px] text-white/20 italic">
                          Sélectionnez un profil
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3 : Caractéristiques ── */}
        {step === 3 && (
          <div className="flex gap-4 animate-in slide-in-from-right-4 fade-in">
            {/* ── Colonne gauche ── */}
            <div className="w-56 shrink-0 space-y-4">
              {/* Encart peuple */}
              {selectedPeuple && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-[#E3CCCD]/15 bg-[#E3CCCD]/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#E3CCCD]/50 mb-0.5">
                      {selectedPeuple.nom}
                    </p>
                    {selectedPeuple.caracteristiques && (
                      <p className="text-[11px] text-white/45 font-mono leading-relaxed">
                        {selectedPeuple.caracteristiques}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Choix tableau */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/50">
                  Tableau de base
                </label>
                <div className="space-y-1">
                  {Object.entries(TABLEAUX).map(([name]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleTableauChange(name)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all ${tableau === name ? "border-[#E3CCCD]/50 bg-[#E3CCCD]/10" : "border-white/12 hover:border-white/25"}`}
                    >
                      <p
                        className={`text-[12px] font-medium ${tableau === name ? "text-[#E3CCCD]" : "text-white/55"}`}
                      >
                        {name}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pool — valeurs à glisser */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/50">
                  {pool.length > 0 ? (
                    <>
                      <span>Glisser vers une stat</span>{" "}
                      <span className="text-amber-400/70 normal-case">
                        ({pool.length})
                      </span>
                    </>
                  ) : (
                    <span className="text-[#E3CCCD]/60">
                      Distribution complète ✓
                    </span>
                  )}
                </label>
                <div className="flex flex-wrap gap-1.5 min-h-8">
                  {pool.map((v, i) => (
                    <div
                      key={i}
                      draggable
                      onDragStart={(e) => {
                        setDragPoolIndex(i);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDragPoolIndex(null);
                        setDragOverStat(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white/80 text-[13px] font-mono cursor-grab active:cursor-grabbing select-none hover:bg-[#E3CCCD]/15 hover:border-[#E3CCCD]/40 hover:text-[#E3CCCD] transition-all"
                    >
                      {v > 0 ? `+${v}` : `${v}`}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Colonne droite : stats ── */}
            <div className="flex-1 min-w-0 space-y-1.5">
              {/* En-tête colonnes */}
              <div className="flex items-center gap-2 px-3 pb-1">
                <div className="w-10 shrink-0" />
                <div className="flex-1" />
                <div className="w-8 text-[9px] uppercase tracking-widest text-white/25 text-center shrink-0">
                  Base
                </div>
                <div className="w-20 text-[9px] uppercase tracking-widest text-white/25 text-center shrink-0">
                  Bonus peuple
                </div>
                <div className="w-10 text-[9px] uppercase tracking-widest text-white/25 text-right shrink-0">
                  Total
                </div>
                <div className="w-5 shrink-0" />
              </div>

              {STATS_KEYS.map((stat) => {
                const baseVal = stats[stat];
                const bp = bonusPeuple[stat];
                const total = totalStats[stat];
                const isAssigned = assignedStats.has(stat);
                const isDragOver =
                  dragOverStat === stat && dragPoolIndex !== null;
                return (
                  <div
                    key={stat}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragPoolIndex !== null) setDragOverStat(stat);
                    }}
                    onDragLeave={() => setDragOverStat(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragPoolIndex !== null)
                        assignPoolValue(stat, dragPoolIndex);
                      setDragPoolIndex(null);
                      setDragOverStat(null);
                    }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${
                      isDragOver
                        ? "border-[#E3CCCD]/60 bg-[#E3CCCD]/10"
                        : isAssigned
                          ? "border-white/15 bg-white/5"
                          : "border-white/8 bg-white/3"
                    }`}
                  >
                    <div className="w-10 text-[11px] uppercase tracking-widest font-bold text-white/50 shrink-0">
                      {stat}
                    </div>
                    <div className="text-[11px] text-white/35 flex-1 min-w-0 truncate">
                      {STAT_LABEL[stat]}
                    </div>
                    {/* Valeur base */}
                    <div
                      className={`font-mono text-sm w-8 text-center font-semibold shrink-0 ${isAssigned ? "text-white" : "text-white/15"}`}
                    >
                      {isAssigned
                        ? baseVal > 0
                          ? `+${baseVal}`
                          : `${baseVal}`
                        : "—"}
                    </div>
                    {/* Bonus peuple +/− */}
                    <div className="flex items-center gap-1 w-20 justify-center shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setBonusPeuple((prev) => ({
                            ...prev,
                            [stat]: prev[stat] - 1,
                          }))
                        }
                        className="w-5 h-5 rounded flex items-center justify-center text-[12px] border border-white/12 text-white/35 hover:border-red-400/40 hover:text-red-400/70 transition-all leading-none"
                      >
                        −
                      </button>
                      <span
                        className={`font-mono text-[12px] w-6 text-center tabular-nums ${bp > 0 ? "text-[#E3CCCD]" : bp < 0 ? "text-red-400/70" : "text-white/20"}`}
                      >
                        {bp > 0 ? `+${bp}` : bp}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setBonusPeuple((prev) => ({
                            ...prev,
                            [stat]: prev[stat] + 1,
                          }))
                        }
                        className="w-5 h-5 rounded flex items-center justify-center text-[12px] border border-white/12 text-white/35 hover:border-[#E3CCCD]/40 hover:text-[#E3CCCD] transition-all leading-none"
                      >
                        +
                      </button>
                    </div>
                    {/* Total */}
                    <div
                      className={`font-mono text-sm w-10 text-right font-bold shrink-0 ${total > 0 ? "text-[#E3CCCD]/80" : total < 0 ? "text-red-400/70" : "text-white/20"}`}
                    >
                      {total > 0 ? `+${total}` : total}
                    </div>
                    {/* Retirer assignation */}
                    {isAssigned ? (
                      <button
                        type="button"
                        onClick={() => unassignStat(stat)}
                        className="w-5 h-5 shrink-0 rounded flex items-center justify-center text-[10px] border border-red-400/20 text-red-400/40 hover:text-red-400 hover:border-red-400/40 transition-all"
                      >
                        ✕
                      </button>
                    ) : (
                      <div className="w-5 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP 4 : Voies & Capacités ── */}
        {step === 4 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
            {/* Encart contextuel */}
            <div className="flex gap-3 p-4 rounded-xl border border-[#E3CCCD]/15 bg-[#E3CCCD]/5">
              <Info className="w-4 h-4 text-[#E3CCCD]/50 shrink-0 mt-0.5" />
              <div className="text-[12px] text-white/55 leading-relaxed space-y-1.5">
                <p>
                  Choisissez 2 voies de profil, et ajoutez optionnellement une
                  voie du peuple additionnelle.
                </p>
              </div>
            </div>

            {/* Voie du peuple */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                Voie du Peuple
              </label>
              {selectedPeuple?.voie ? (
                <div className="p-4 rounded-xl border border-[#E3CCCD]/20 bg-[#E3CCCD]/5">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[#E3CCCD]/45 mb-1">
                    {selectedPeuple.voie.nom}
                  </p>
                  {selectedPeuple.voie.capacites?.rang1 && (
                    <>
                      <p className="text-[12px] text-white/60">
                        <span className="text-white/40">Rang 1 ·</span>{" "}
                        {selectedPeuple.voie.capacites.rang1.nom}
                      </p>
                      {selectedPeuple.voie.capacites.rang1.description && (
                        <p className="text-[11px] text-white/45 mt-1 leading-relaxed">
                          {selectedPeuple.voie.capacites.rang1.description}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <p className="text-[12px] text-white/25 italic">
                  Aucune voie de peuple associée.
                </p>
              )}
            </div>

            {/* Seconde voie du peuple (optionnel) */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSecondPeupleVoies}
                  onChange={(e) => {
                    setShowSecondPeupleVoies(e.target.checked);
                    if (!e.target.checked) setSelectedSecondPeupleVoieId("");
                  }}
                  className="accent-[#E3CCCD] w-4 h-4"
                />
                <span className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                  Voie du Peuple additionnelle{" "}
                  <span className="text-white/30 normal-case">(optionnel)</span>
                </span>
              </label>
              {showSecondPeupleVoies && (
                <div className="space-y-2 pt-1">
                  
                  <div className="grid grid-cols-3 gap-2">
                    {peuples
                      .filter(
                        (p) =>
                          p.demi_elf &&
                          p.voie?.id &&
                          p.voie.id !==
                            (isDemiElf
                              ? selectedDemiElfVoieId
                              : selectedPeuple?.voie_id),
                      )
                      .map((p) => {
                        const voie = p.voie!;
                        const selected = selectedSecondPeupleVoieId === voie.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() =>
                              setSelectedSecondPeupleVoieId(
                                selected ? "" : voie.id,
                              )
                            }
                            className={`w-full text-left p-4 rounded-xl border transition-all ${selected ? "border-[#E3CCCD]/50 bg-[#E3CCCD]/10" : "border-white/15 hover:border-white/30 hover:bg-white/4"}`}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <p
                                className={`text-[13px] font-medium ${selected ? "text-[#E3CCCD]" : "text-white/70"}`}
                              >
                                {voie.nom}
                              </p>
                              {selected && (
                                <span className="text-[11px] text-[#E3CCCD]/60">
                                  ✓
                                </span>
                              )}
                            </div>
                            {voie.capacites?.rang1 && (
                              <>
                                <p className="text-[12px] text-white/35">
                                  Rang 1 · {voie.capacites.rang1.nom}
                                  {voie.capacites.rang1.type && (
                                    <span className="ml-1 text-white/20">
                                      ({voie.capacites.rang1.type})
                                    </span>
                                  )}
                                </p>
                                {voie.capacites.rang1.description && (
                                  <p className="text-[11px] text-white/25 mt-1 leading-relaxed">
                                    {voie.capacites.rang1.description}
                                  </p>
                                )}
                              </>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Voies famille (choix 2) */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                Voies de Famille — choisissez 2
                <span className="ml-2 text-white/30">
                  ({selectedFamilleVoieIds.length}/2)
                </span>
              </label>
              {familleVoies.length === 0 && (
                <p className="text-[12px] text-white/25 italic">
                  Aucune voie rattachée à cette famille.
                </p>
              )}
              <div className="space-y-2">
                {familleVoies.map((voie: any) => {
                  const selected = selectedFamilleVoieIds.includes(voie.id);
                  const disabled =
                    !selected && selectedFamilleVoieIds.length >= 2;
                  return (
                    <button
                      key={voie.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleFamilleVoie(voie.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${selected ? "border-[#E3CCCD]/50 bg-[#E3CCCD]/10" : disabled ? "border-white/8 opacity-40 cursor-not-allowed" : "border-white/15 hover:border-white/30 hover:bg-white/4"}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p
                          className={`text-[13px] font-medium ${selected ? "text-[#E3CCCD]" : "text-white/70"}`}
                        >
                          {voie.nom}
                        </p>
                        {selected && (
                          <span className="text-[11px] text-[#E3CCCD]/60">
                            ✓ Sélectionnée
                          </span>
                        )}
                      </div>
                      {voie.capacites?.rang1 && (
                        <>
                          <p className="text-[12px] text-white/45">
                            Rang 1 · {voie.capacites.rang1.nom}
                            {voie.capacites.rang1.type && (
                              <span className="ml-1 text-white/25">
                                ({voie.capacites.rang1.type})
                              </span>
                            )}
                          </p>
                          {voie.capacites.rang1.description && (
                            <p className="text-[11px] text-white/30 mt-1 leading-relaxed">
                              {voie.capacites.rang1.description}
                            </p>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5 : Statistiques Dérivées ── */}
        {step === 5 && (
          <div className="space-y-5 animate-in slide-in-from-right-4 fade-in">
            <div className="flex gap-3 p-4 rounded-xl border border-white/10 bg-white/4">
              <Info className="w-4 h-4 text-white/40 shrink-0 mt-0.5" />
              <p className="text-[12px] text-white/50 leading-relaxed">
                Ces valeurs sont calculées automatiquement. Vous pouvez les
                modifier manuellement si besoin.
              </p>
            </div>

            {/* Encart équipement de base famille */}
            {selectedFamille && (
              <div className="space-y-2 p-4 rounded-xl border border-amber-400/20 bg-amber-400/5">
                <p className="text-[10px] uppercase tracking-[0.15em] text-amber-400/60 mb-2">
                  Équipement de base — {selectedFamille.nom}
                </p>
                {selectedFamille.equipement_base ? (
                  <p className="text-[12px] text-white/55 leading-relaxed whitespace-pre-line">
                    {selectedFamille.equipement_base}
                  </p>
                ) : (
                  <p className="text-[12px] text-white/25 italic">
                    Aucun équipement de base renseigné.
                  </p>
                )}
              </div>
            )}

            {/* Sélection équipements */}
            {(() => {
              const SOURCE_LABELS: Record<string, string> = {
                arme_contact: "Arme contact",
                arme_distance: "Arme distance",
                armure: "Armure",
              };
              const filtered = profilEquipItems.filter(
                (item) =>
                  !eqSearch ||
                  item.nom.toLowerCase().includes(eqSearch.toLowerCase()),
              );
              const grouped = filtered.reduce<Record<string, EquipItem[]>>(
                (acc, item) => {
                  const cat = SOURCE_LABELS[item.source] ?? item.source;
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(item);
                  return acc;
                },
                {},
              );
              const toggle = (item: EquipItem) =>
                setSelectedEquipItems((prev) =>
                  prev.some((x) => x.id === item.id && x.source === item.source)
                    ? prev.filter(
                        (x) => !(x.id === item.id && x.source === item.source),
                      )
                    : [...prev, item],
                );
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                      Équipements
                    </label>
                    {selectedEquipItems.length > 0 && (
                      <span className="text-[11px] text-[#E3CCCD]/60">
                        {selectedEquipItems.length} sélectionné
                        {selectedEquipItems.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {/* Encarts équipements sélectionnés */}
                  {selectedEquipItems.length > 0 && (
                    <div className="space-y-1.5">
                      {selectedEquipItems.map((item) => (
                        <div
                          key={`${item.source}-${item.id}`}
                          className="flex items-start gap-3 p-3 rounded-xl border border-[#E3CCCD]/20 bg-[#E3CCCD]/5"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-[12px] font-medium text-[#E3CCCD]/90">
                                {item.nom}
                              </p>
                              <span className="text-[10px] uppercase tracking-widest text-white/25 border border-white/10 rounded-full px-1.5 py-0.5">
                                {SOURCE_LABELS[item.source]}
                              </span>
                            </div>
                            {item.details && (
                              <p className="text-[11px] text-white/50 leading-relaxed">
                                {item.details}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => toggle(item)}
                            className="text-white/20 hover:text-red-400/70 transition-colors shrink-0 mt-0.5 text-[13px] leading-none"
                          >
                            ×
                          </button>
                        </div>
                      ))}
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
                        onChange={(e) => {
                          setEqSearch(e.target.value);
                          setEqDropdownOpen(true);
                        }}
                        onFocus={() => setEqDropdownOpen(true)}
                        placeholder={
                          profilEquipItems.length === 0
                            ? "Aucun équipement associé au profil"
                            : "Rechercher un équipement..."
                        }
                        className="flex-1 bg-transparent outline-none text-white text-[12px] placeholder:text-white/30"
                      />
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-white/30 shrink-0 transition-transform cursor-pointer ${eqDropdownOpen ? "rotate-180" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEqDropdownOpen((o) => !o);
                        }}
                      />
                    </div>
                    {eqDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-xl border border-white/15 bg-[#1E1941] shadow-2xl overflow-hidden max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                        {Object.entries(grouped).sort(([a], [b]) =>
                          a.localeCompare(b),
                        ).length === 0 ? (
                          <p className="text-[12px] text-white/30 italic text-center py-4">
                            Aucun résultat
                          </p>
                        ) : (
                          Object.entries(grouped)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([cat, items]) => (
                              <div key={cat}>
                                <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/25 bg-white/5 sticky top-0">
                                  {cat}
                                </div>
                                {items.map((item) => {
                                  const selected = selectedEquipItems.some(
                                    (x) =>
                                      x.id === item.id &&
                                      x.source === item.source,
                                  );
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        toggle(item);
                                      }}
                                      className={`w-full text-left px-3 py-2.5 flex items-start justify-between gap-2 hover:bg-white/8 transition-colors ${selected ? "bg-[#E3CCCD]/8" : ""}`}
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p
                                          className={`text-[12px] font-medium ${selected ? "text-[#E3CCCD]" : "text-white/65"}`}
                                        >
                                          {item.nom}
                                        </p>
                                        {item.details && (
                                          <p className="text-[11px] text-white/30 leading-snug mt-0.5 truncate">
                                            {item.details}
                                          </p>
                                        )}
                                      </div>
                                      {selected && (
                                        <span className="text-[#E3CCCD]/60 text-[11px] shrink-0">
                                          ✓
                                        </span>
                                      )}
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

            {/* Grille dérivées */}
            {(() => {
              const StatCard = ({
                k,
                label,
                formula,
                isText,
                icon: Icon,
                color,
              }: {
                k: string;
                label: string;
                formula: string;
                isText?: boolean;
                icon: React.ElementType;
                color: string;
              }) => {
                const val =
                  overrides[k as keyof typeof overrides] !== undefined
                    ? overrides[k as keyof typeof overrides]
                    : dv[k];
                return (
                  <div
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border bg-white/4 hover:bg-white/6 transition-colors ${color}`}
                  >
                    <Icon className="w-5 h-5 opacity-40 shrink-0 text-white" />
                    {isText ? (
                      <input
                        type="text"
                        value={
                          overrides[k as keyof typeof overrides] !== undefined
                            ? String(overrides[k as keyof typeof overrides])
                            : String(dv[k])
                        }
                        onChange={(e) =>
                          setOverrides((prev) => ({
                            ...prev,
                            [k]: e.target.value,
                          }))
                        }
                        title={label}
                        className="w-full text-center font-mono text-xl font-bold text-white bg-transparent outline-none"
                      />
                    ) : (
                      <input
                        type="number"
                        value={val as number}
                        onChange={(e) =>
                          setOverride(k, parseInt(e.target.value) || 0)
                        }
                        title={label}
                        className="w-full text-center font-mono text-xl font-bold text-white bg-transparent outline-none"
                      />
                    )}
                    <span className="text-[10px] text-white/35 text-center leading-tight">
                      {label}
                    </span>
                    <span className="text-[9px] text-white/20 text-center leading-none font-mono">
                      {formula}
                    </span>
                  </div>
                );
              };
              return (
                <div className="space-y-3">
                  {/* Vigueur */}
                  <p className="text-[10px] uppercase tracking-widest text-white/25">
                    Vigueur
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <StatCard
                      k="pv"
                      label="PV"
                      formula={`2×${selectedFamille?.pv_niveau ?? "?"}+CON${stats.CON >= 0 ? "+" : ""}${stats.CON}`}
                      icon={Heart}
                      color="border-rose-400/20"
                    />
                    <StatCard
                      k="drQty"
                      label="DR (qté)"
                      formula={`${isMage ? "3" : "2"}+CON${stats.CON >= 0 ? "+" : ""}${stats.CON}`}
                      icon={RefreshCw}
                      color="border-rose-400/15"
                    />
                    <StatCard
                      k="drDe"
                      label="DR (dé)"
                      formula={selectedFamille?.de_recuperation ?? "d6"}
                      isText
                      icon={Dice1}
                      color="border-rose-400/15"
                    />
                  </div>
                  {/* Ressources */}
                  <p className="text-[10px] uppercase tracking-widest text-white/25 pt-1">
                    Ressources
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <StatCard
                      k="pc"
                      label="Points de Chance"
                      formula={`${selectedFamille?.groupe === "Aventuriers" ? "3" : "2"}+CHA${stats.CHA >= 0 ? "+" : ""}${stats.CHA}`}
                      icon={Star}
                      color="border-amber-400/20"
                    />
                    <StatCard
                      k="pm"
                      label="Points de Mana"
                      formula={`VOL${stats.VOL >= 0 ? "+" : ""}${stats.VOL}`}
                      icon={Sparkles}
                      color="border-violet-400/20"
                    />
                  </div>
                  {/* Combat */}
                  <p className="text-[10px] uppercase tracking-widest text-white/25 pt-1">
                    Combat
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    <StatCard
                      k="initiative"
                      label="Init."
                      formula={`10+PER${stats.PER >= 0 ? "+" : ""}${stats.PER}`}
                      icon={Zap}
                      color="border-yellow-400/20"
                    />
                    <StatCard
                      k="defense"
                      label="Déf."
                      formula={`10+AGI${stats.AGI >= 0 ? "+" : ""}${stats.AGI}`}
                      icon={Shield}
                      color="border-sky-400/20"
                    />
                    <StatCard
                      k="attContact"
                      label="Att. C"
                      formula={`1+FOR${stats.FOR >= 0 ? "+" : ""}${stats.FOR}`}
                      icon={Swords}
                      color="border-orange-400/20"
                    />
                    <StatCard
                      k="attDistance"
                      label="Att. D"
                      formula={`1+AGI${stats.AGI >= 0 ? "+" : ""}${stats.AGI}`}
                      icon={Target}
                      color="border-orange-400/15"
                    />
                    <StatCard
                      k="attMagie"
                      label="Att. M"
                      formula={`1+VOL${stats.VOL >= 0 ? "+" : ""}${stats.VOL}`}
                      icon={Wand2}
                      color="border-violet-400/15"
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── STEP 6 : Lore ── */}
        {step === 6 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
            {/* Idéal */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                Idéal Héroïque
              </label>
              <textarea
                value={ideal}
                onChange={(e) => setIdeal(e.target.value)}
                rows={3}
                placeholder="Ce qui pousse votre personnage à agir en héros..."
                className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-xl p-3.5 text-white text-sm outline-none transition-colors resize-none placeholder:text-white/25 leading-relaxed"
              />
            </div>

            {/* Travers */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                Travers
              </label>
              <textarea
                value={travers}
                onChange={(e) => setTravers(e.target.value)}
                rows={2}
                placeholder="Une faiblesse, une obsession, une peur..."
                className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-xl p-3.5 text-white text-sm outline-none transition-colors resize-none placeholder:text-white/25 leading-relaxed"
              />
            </div>

            {/* Historique */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                Historique (Secret Intime)
              </label>
              <textarea
                value={historique}
                onChange={(e) => setHistorique(e.target.value)}
                rows={4}
                placeholder="Le passé du personnage, son secret, ce qu'il cache..."
                className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-xl p-3.5 text-white text-sm outline-none transition-colors resize-none placeholder:text-white/25 leading-relaxed"
              />
            </div>

            {/* Illustration */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                Illustration
              </label>
              <div className="flex gap-4 items-start">
                <div className="w-24 h-24 rounded-xl border border-white/15 bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-7 h-7 text-white/15" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-white/20 text-[12px] text-white/40 hover:border-white/40 hover:text-white/60 cursor-pointer transition-colors">
                    <UploadCloud className="w-4 h-4" />
                    Choisir une image...
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                  <p className="text-[11px] text-white/25 mt-2">
                    PNG, JPG ou WEBP · max 5 Mo
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="relative z-10 shrink-0 px-8 py-5 border-t border-white/8 bg-black/10 flex items-center justify-between gap-3">
        {step > 1 ? (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-white/50 hover:text-white hover:border-white/30 text-[13px] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          {STEPS.map((s) => (
            <div
              key={s.num}
              className={`w-1.5 h-1.5 rounded-full transition-all ${step === s.num ? "bg-[#E3CCCD]" : step > s.num ? "bg-white/40" : "bg-white/15"}`}
            />
          ))}
        </div>

        {step < STEPS.length ? (
          <button
            onClick={() => {
              if (!canAdvance())
                return alert(
                  step === 1
                    ? "Complétez le nom et sélectionnez un peuple."
                    : step === 2
                      ? "Sélectionnez une famille et un profil."
                      : step === 3
                        ? "Assignez toutes les valeurs."
                        : "Choisissez 2 voies de famille.",
                );
              setStep((s) => s + 1);
            }}
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
