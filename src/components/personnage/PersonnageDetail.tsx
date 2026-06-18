/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import {
  User,
  Pencil,
  Trash2,
  X,
  Save,
  UploadCloud,
  Sword,
  Target,
  Shield,
  Heart,
  RefreshCw,
  Star,
  Sparkles,
  Zap,
  Swords,
  Wand2,
  ArrowUpCircle,
  BookOpen,
  Package,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MagicCard } from "@/components/ui/MagicCard";
import { PvBadge } from "@/components/ui/PvBadge";
import { VoieBlock } from "@/components/ui/VoieBlock";
import { CombatStatCard } from "@/components/ui/CombatStatCard";
import { EditNumField } from "@/components/ui/EditNumField";

// Imports des sous-composants
import InventoryTab from "@/components/personnage/InventoryTab";
import LoreTab from "@/components/personnage/LoreTab";
import LevelUpOverlay from "@/components/personnage/LevelUpOverlay";

const STATS_KEYS = ["FOR", "CON", "AGI", "PER", "CHA", "INT", "VOL"] as const;
type StatKey = (typeof STATS_KEYS)[number];

export interface VoieDetail {
  id: string;
  nom: string;
  type: string;
  peuple_id?: string | null;
  profil_id?: string | null;
  capacites: Record<
    string,
    { nom: string; type?: string; description: string }
  >;
}

interface PersonnageDetailProps {
  pj: {
    id: string;
    name: string;
    image_url: string | null;
    user_id?: string | null;
    stats: any;
    pathways: any;
    inventory: any;
  } | null;
  type?: "pj" | "pnj";
  isFullscreen: boolean;
  readOnly?: boolean;
  onToggleFullscreen: () => void;
  onDeleteClick: () => void;
  onCreateClick: () => void;
  onEditSuccess: () => void;
}

const getCost = (rang: number) => (rang <= 2 ? 1 : 2);

function getDerivedAttacks(level: number, characteristics: Record<string, number>) {
  const forStat = Number(characteristics?.FOR ?? 0);
  const agi = Number(characteristics?.AGI ?? 0);
  const vol = Number(characteristics?.VOL ?? 0);

  return {
    contact: level + forStat,
    distance: level + agi,
    magie: level + vol,
  };
}

function getDieFaces(die: string | number | null | undefined) {
  const raw = String(die ?? "d6");
  const match = raw.match(/\d+/);
  return match ? Number(match[0]) : 6;
}

function getHpGainPerLevel(stats: any) {
  const characteristics = stats?.caracteristiques ?? {};
  const con = Number(characteristics?.CON ?? 0);
  // Si la valeur est stockée à la création, on l'utilise directement
  if (typeof stats?.pv_par_niveau === "number") {
    return stats.pv_par_niveau + con;
  }
  // Fallback sur le dé de récupération pour compatibilité
  const drFaces = getDieFaces(stats?.dr_de ?? "d6");
  return Math.max(1, drFaces + con);
}

export function PersonnageDetail({
  pj,
  type = "pj",
  isFullscreen,
  readOnly,
  onToggleFullscreen,
  onDeleteClick,
  onEditSuccess,
}: PersonnageDetailProps) {
  const [voieDetails, setVoieDetails] = useState<VoieDetail[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"stats" | "inventory" | "lore">("stats");

  // Level Up States
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [pendingRanks, setPendingRanks] = useState<{ voie_id: string; rang: number }[]>([]);
  const [allVoies, setAllVoies] = useState<VoieDetail[]>([]);

  // Form Fields State
  const [editName, setEditName] = useState("");
  const [editUserId, setEditUserId] = useState("");
  const [players, setPlayers] = useState<Array<{ id: string; pseudo: string }>>([]);
  const [editSexe, setEditSexe] = useState("Masculin");
  const [editAge, setEditAge] = useState("");
  const [editCaract, setEditCaract] = useState<Record<StatKey, number>>(
    () => Object.fromEntries(STATS_KEYS.map((k) => [k, 0])) as any,
  );
  const [editPv, setEditPv] = useState(0);
  const [editPvMax, setEditPvMax] = useState(0);
  const [editDrQty, setEditDrQty] = useState(0);
  const [editDrDe, setEditDrDe] = useState("d6");
  const [editPc, setEditPc] = useState(0);
  const [editPm, setEditPm] = useState(0);
  const [editInitiative, setEditInitiative] = useState(0);
  const [editDefense, setEditDefense] = useState(0);
  const [editAttContact, setEditAttContact] = useState(0);
  const [editAttDistance, setEditAttDistance] = useState(0);
  const [editAttMagie, setEditAttMagie] = useState(0);
  const [editNiveau, setEditNiveau] = useState(1);
  
  // PJ Lore
  const [editIdeal, setEditIdeal] = useState("");
  const [editTravers, setEditTravers] = useState("");
  const [editHistorique, setEditHistorique] = useState("");

  // PNJ Lore
  const [editDescription, setEditDescription] = useState("");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    if (!pj?.pathways?.length) {
      setVoieDetails([]);
      return;
    }
    const ids = (pj.pathways as any[]).map((p) => p.voie_id).filter(Boolean);
    if (!ids.length) return;
    supabase
      .from("voies")
      .select("id, nom, type, peuple_id, profil_id, capacites")
      .in("id", ids)
      .then(({ data }) => {
        if (data) setVoieDetails(data as VoieDetail[]);
      });
  }, [pj?.id, pj?.pathways]);

  useEffect(() => {
    if (isLevelingUp) {
      supabase
        .from("voies")
        .select("id, nom, type, peuple_id, profil_id, capacites")
        .order("nom")
        .then(({ data }) => {
          if (data) setAllVoies(data as VoieDetail[]);
        });
    }
  }, [isLevelingUp]);

  useEffect(() => {
    if (type !== "pj") return;
    supabase
      .from("utilisateurs")
      .select("id, pseudo, role")
      .order("pseudo")
      .then(({ data }) => {
        if (data) {
          setPlayers((data as any[])
            .filter((p) => p.role !== "mj")
            .map((p) => ({ id: p.id, pseudo: p.pseudo })));
        }
      });
  }, [type]);

  useEffect(() => {
    if (!pj) return;
    setEditName(pj.name);
    setEditUserId(type === "pj" ? (pj.user_id ?? "") : "");
    setEditSexe(pj.stats?.sexe ?? "Masculin");
    setEditAge(pj.stats?.age ?? "");
    const c = pj.stats?.caracteristiques ?? {};
    setEditCaract(
      Object.fromEntries(STATS_KEYS.map((k) => [k, c[k] ?? 0])) as any,
    );
    const levelForDerived = pj.stats?.niveau ?? 1;
    setEditPv(pj.stats?.pv ?? 0);
    setEditPvMax(Math.max(Number(pj.stats?.pv_max ?? 0), Number(pj.stats?.pv ?? 0)));
    setEditDrQty(pj.stats?.dr_qty ?? 0);
    setEditDrDe(pj.stats?.dr_de ?? "d6");
    setEditPc(pj.stats?.pc ?? 0);
    setEditPm(pj.stats?.pm ?? 0);
    setEditInitiative(pj.stats?.initiative ?? 0);
    setEditDefense(pj.stats?.defense ?? 0);
    const derivedFromStats = getDerivedAttacks(levelForDerived, c);
    setEditAttContact(derivedFromStats.contact);
    setEditAttDistance(derivedFromStats.distance);
    setEditAttMagie(derivedFromStats.magie);
    setEditNiveau(pj.stats?.niveau ?? 1);
    
    // Lore dynamique selon PJ ou PNJ
    setEditIdeal(pj.stats?.ideal ?? "");
    setEditTravers(pj.stats?.travers ?? "");
    setEditHistorique(pj.stats?.historique ?? "");
    setEditDescription(pj.stats?.description ?? "");
    setEditNotes(pj.stats?.notes ?? "");

    setIsEditing(false);
    setIsLevelingUp(false);
    
    // Si c'est un PJ ou un PNJ combattant, on remet l'onglet stats par défaut
    setActiveTab("stats");
  }, [pj, type]);

  const handleSave = async () => {
    if (!pj) return;
    setIsSaving(true);
    try {
      let imageUrl = pj.image_url;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${type}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("compendium")
          .upload(path, imageFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage
          .from("compendium")
          .getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const table = type === "pnj" ? "pnj" : "pj";

      const derivedAttacksForSave = getDerivedAttacks(editNiveau, editCaract as unknown as Record<string, number>);
      const baseStatsForSave = {
        ...(pj.stats ?? {}),
        caracteristiques: editCaract,
        dr_qty: editDrQty,
        dr_de: editDrDe,
      };
      const normalizedPvMaxForSave = Math.max(Number(editPvMax ?? 0), Number(editPv ?? 0));

      const statsToSave = type === "pnj" ? {
        ...pj.stats,
        sexe: editSexe,
        age: editAge,
        description: editDescription,
        notes: editNotes,
        ...(pj.stats?.is_combatant ? {
          caracteristiques: editCaract,
          pv: editPv,
          pv_max: normalizedPvMaxForSave,
          dr_qty: editDrQty,
          dr_de: editDrDe,
          pc: editPc,
          pm: editPm,
          initiative: editInitiative,
          defense: editDefense,
          att_contact: derivedAttacksForSave.contact,
          att_distance: derivedAttacksForSave.distance,
          att_magie: derivedAttacksForSave.magie,
          niveau: editNiveau,
        } : {})
      } : {
        ...pj.stats,
        sexe: editSexe,
        age: editAge,
        caracteristiques: editCaract,
        pv: editPv,
        pv_max: normalizedPvMaxForSave,
        dr_qty: editDrQty,
        dr_de: editDrDe,
        pc: editPc,
        pm: editPm,
        initiative: editInitiative,
        defense: editDefense,
        att_contact: derivedAttacksForSave.contact,
        att_distance: derivedAttacksForSave.distance,
        att_magie: derivedAttacksForSave.magie,
        niveau: editNiveau,
        ideal: editIdeal,
        travers: editTravers,
        historique: editHistorique,
      };

      // Déduire peuple_id depuis la voie du peuple (si elle existe)
      let peupleId: string | null = null;
      if (pj.pathways && Array.isArray(pj.pathways)) {
        // Cherche la voie qui correspond à un peuple (type === 'peuple')
        const peupleVoie = pj.pathways.find((v: any) => v.type === 'peuple' || v.isPeuple);
        if (peupleVoie && peupleVoie.voie_id) {
          peupleId = peupleVoie.voie_id;
        }
      }

      await supabase
        .from(table)
        .update({
          name: editName.trim() || pj.name,
          image_url: imageUrl,
          stats: statsToSave,
          ...(type === "pj" ? { user_id: editUserId || null } : {}),
          ...(peupleId ? { peuple_id: peupleId } : {}),
        })
        .eq("id", pj.id);

      setIsEditing(false);
      onEditSuccess();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLevelUp = async () => {
    if (!pj) return;
    setIsSaving(true);
    try {
      const newLevel = (pj.stats?.niveau ?? 1) + 1;
      const updatedPathways = [...(pj.pathways || [])];
      pendingRanks.forEach((pr) => {
        const pathwayIndex = updatedPathways.findIndex(
          (p: any) => p.voie_id === pr.voie_id,
        );
        if (pathwayIndex !== -1) {
          const rangsAcquis = [
            ...(updatedPathways[pathwayIndex].rangs_acquis || []),
          ];
          if (!rangsAcquis.includes(pr.rang)) {
            rangsAcquis.push(pr.rang);
            updatedPathways[pathwayIndex].rangs_acquis = rangsAcquis.sort(
              (a, b) => a - b,
            );
          }
        } else {
          updatedPathways.push({
            voie_id: pr.voie_id,
            rangs_acquis: [pr.rang],
          });
        }
      });

      const stats = pj.stats ?? {};
      const caract = stats.caracteristiques ?? {};
      const con = Number(caract.CON ?? 0);
      const forStat = Number(caract.FOR ?? 0);
      const agi = Number(caract.AGI ?? 0);
      const vol = Number(caract.VOL ?? 0);

      // Passage de niveau automatique: gain de PV + recalcul des bonus d'attaque.
      const hpGain = getHpGainPerLevel(stats);
      const currentPvMax = Math.max(Number(stats.pv_max ?? stats.pv ?? 0), Number(stats.pv ?? 0));
      const nextPvMax = currentPvMax + hpGain;
      const nextPv = Number(stats.pv ?? 0) + hpGain;
      const nextAttContact = newLevel + forStat;
      const nextAttDistance = newLevel + agi;
      const nextAttMagie = newLevel + vol;
      
      const table = type === "pnj" ? "pnj" : "pj";
      await supabase
        .from(table)
        .update({
          pathways: updatedPathways,
          stats: {
            ...stats,
            niveau: newLevel,
            pv: nextPv,
            pv_max: nextPvMax,
            att_contact: nextAttContact,
            att_distance: nextAttDistance,
            att_magie: nextAttMagie,
          },
        })
        .eq("id", pj.id);
        
      setIsLevelingUp(false);
      setPendingRanks([]);
      onEditSuccess();
    } catch (err: any) {
      alert("Erreur lors du passage de niveau : " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!pj) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-10 gap-4">
        <User className="w-12 h-12 text-white/10" />
        <p className="text-white/30 text-sm italic">
          Sélectionnez un personnage ou créez-en un nouveau.
        </p>
      </div>
    );
  }

  // Vérification stricte : c'est un PNJ et la case combatant n'est pas cochée
  const isNonCombatantPNJ = type === "pnj" && pj.stats?.is_combatant !== true;

  const caract = pj.stats?.caracteristiques ?? {};
  const displayImageUrl = imagePreview ?? pj.image_url;
  const assignedPlayer = players.find((p) => p.id === (pj.user_id ?? ""));
  const currentLevel = pj.stats?.niveau ?? 1;
  const derivedCurrentAttacks = getDerivedAttacks(currentLevel, caract as Record<string, number>);
  const derivedCurrentPvMax = Math.max(Number(pj.stats?.pv_max ?? 0), Number(pj.stats?.pv ?? 0));
  const targetLevel = currentLevel + 1;
  const pointsSpent = pendingRanks.reduce(
    (acc, curr) => acc + getCost(curr.rang),
    0,
  );
  const pointsRemaining = 2 - pointsSpent;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 p-3 md:p-5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 relative">
      {/* OVERLAY DE NIVEAU DÉCOUPÉ */}
      {isLevelingUp && (
        <LevelUpOverlay
          pj={pj}
          targetLevel={targetLevel}
          pointsRemaining={pointsRemaining}
          pendingRanks={pendingRanks}
          setPendingRanks={setPendingRanks}
          voieDetails={voieDetails}
          allVoies={allVoies}
          handleSaveLevelUp={handleSaveLevelUp}
          setIsLevelingUp={setIsLevelingUp}
        />
      )}

      {/* HEADER BAR */}
      <div className="flex flex-col mb-4 shrink-0 gap-4 mt-1">
        {/* Titre et Boutons d'édition */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-baseline gap-3 min-w-0 flex-1 mr-3">
            {isEditing ? (
              <>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                  className="font-serif text-3xl text-white tracking-wider bg-transparent border-b border-[#E3CCCD]/40 outline-none focus:border-[#E3CCCD]/80 w-full"
                />
                {!isNonCombatantPNJ && (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] uppercase tracking-widest text-white/40">
                      Niv.
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={editNiveau}
                      onChange={(e) =>
                        setEditNiveau(parseInt(e.target.value) || 1)
                      }
                      className="w-10 text-center font-mono text-sm text-white bg-white/8 border border-white/15 rounded-lg py-0.5 outline-none focus:border-[#E3CCCD]/50"
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <h1 className="font-serif text-3xl text-white tracking-wider truncate">
                  {pj.name}
                </h1>
                {!isNonCombatantPNJ && (
                  <span className="text-[11px] uppercase tracking-widest text-[#E3CCCD]/60 border border-[#E3CCCD]/30 rounded-full px-2.5 py-0.5 shrink-0">
                    Niv. {currentLevel}
                  </span>
                )}
                {/* Level Up caché pour les PNJ non combattants */}
                {!isNonCombatantPNJ && (
                  <button
                    onClick={() => setIsLevelingUp(true)}
                    className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 border border-emerald-400/50 bg-emerald-400/20 hover:bg-emerald-400/30 rounded-full px-3 py-1 shrink-0 flex items-center gap-1.5 transition-all ml-2 animate-pulse hover:animate-none shadow-[0_0_10px_rgba(52,211,153,0.3)] hover:shadow-[0_0_15px_rgba(52,211,153,0.5)]"
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5" /> Level Up
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-1 bg-[#1E1941]/80 border border-[#E3CCCD]/20 rounded-full px-2 py-1 backdrop-blur-md shadow-xl shrink-0">
            <button
              onClick={onToggleFullscreen}
              className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors mr-1"
              title={isFullscreen ? "Réduire" : "Plein écran"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <div className="w-px h-4 bg-white/20 mx-1"></div>
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="p-1.5 text-emerald-400/80 hover:text-emerald-300 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                {!readOnly && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                {!readOnly && (
                  <button
                    onClick={onDeleteClick}
                    className="p-1 text-white/60 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {type === "pj" && (
          <div className="px-2 mt-1">
            {isEditing ? (
              <div className="max-w-sm space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Joueur rattaché</label>
                <select
                  value={editUserId}
                  onChange={(e) => setEditUserId(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-xl px-3.5 py-2 text-white text-sm outline-none transition-colors appearance-none cursor-pointer"
                >
                  <option value="" className="bg-[#1E1941] text-white/50">— Aucun joueur assigné —</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#1E1941] text-white">{p.pseudo}</option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-[11px] text-[#E3CCCD]/60 uppercase tracking-widest">
                Joueur : {assignedPlayer?.pseudo ?? "Non assigné"}
              </p>
            )}
          </div>
        )}

        {/* TABS SELECTOR - Masqué si PNJ Non Combattant */}
        {!isNonCombatantPNJ && (
          <div className="flex gap-1 border-b border-[#E3CCCD]/20 px-2 mt-2">
            <button
              onClick={() => setActiveTab("stats")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-[11px] font-bold uppercase tracking-widest transition-all border border-b-0 ${
                activeTab === "stats"
                  ? "bg-[#1E1941]/60 border-[#E3CCCD]/30 text-[#E3CCCD] relative z-10 -mb-px shadow-[0_-5px_15px_rgba(0,0,0,0.2)]"
                  : "bg-black/10 border-transparent text-white/40 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Fiche Technique
            </button>

            <button
              onClick={() => setActiveTab("inventory")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-[11px] font-bold uppercase tracking-widest transition-all border border-b-0 ${
                activeTab === "inventory"
                  ? "bg-[#1E1941]/60 border-[#E3CCCD]/30 text-[#E3CCCD] relative z-10 -mb-px shadow-[0_-5px_15px_rgba(0,0,0,0.2)]"
                  : "bg-black/10 border-transparent text-white/40 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <Package className="w-3.5 h-3.5" /> Sac & Équipement
            </button>

            <button
              onClick={() => setActiveTab("lore")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-[11px] font-bold uppercase tracking-widest transition-all border border-b-0 ${
                activeTab === "lore"
                  ? "bg-[#1E1941]/60 border-[#E3CCCD]/30 text-[#E3CCCD] relative z-10 -mb-px shadow-[0_-5px_15px_rgba(0,0,0,0.2)]"
                  : "bg-black/10 border-transparent text-white/40 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> {type === "pnj" ? "Description & Notes" : "Histoire & Lore"}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4 flex-1">
        
        {/* ========================================================= */}
        {/* VUE UNIQUE : PNJ NON COMBATTANT                           */}
        {/* ========================================================= */}
        {isNonCombatantPNJ && (
          <div className="flex flex-col md:flex-row gap-6 items-stretch animate-in fade-in duration-200 mt-2">
            <div className="relative shrink-0 mx-auto md:mx-0">
              <MagicCard
                imageUrl={displayImageUrl}
                title={pj.name}
              />
              {isEditing && (
                <label className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 rounded-lg cursor-pointer opacity-0 hover:opacity-100 transition-opacity z-10">
                  <UploadCloud className="w-8 h-8 text-white/80" />
                  <span className="text-[12px] text-white/70">Changer l'image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setImageFile(f);
                      const reader = new FileReader();
                      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
                      reader.readAsDataURL(f);
                    }}
                  />
                </label>
              )}
            </div>
            
            <div className="flex-1 space-y-6">
              {isEditing ? (
                <>
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Sexe</label>
                      <select
                        value={editSexe}
                        onChange={(e) => setEditSexe(e.target.value)}
                        className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none transition-colors appearance-none cursor-pointer"
                      >
                        <option value="Masculin" className="bg-[#1E1941]">Masculin</option>
                        <option value="Féminin" className="bg-[#1E1941]">Féminin</option>
                        <option value="Autre" className="bg-[#1E1941]">Autre</option>
                      </select>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Âge</label>
                      <input
                        type="text"
                        value={editAge}
                        onChange={(e) => setEditAge(e.target.value)}
                        placeholder="ex : 45 ans"
                        className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Description publique</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={4}
                      className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-xl p-3.5 text-white text-sm outline-none transition-colors resize-none placeholder:text-white/25 leading-relaxed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.15em] text-sky-400/60">Notes du MJ (Secret)</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={5}
                      className="w-full bg-sky-500/5 border border-sky-500/20 focus:border-sky-400/50 rounded-xl p-3.5 text-sky-100 text-sm outline-none transition-colors resize-none placeholder:text-sky-200/30 leading-relaxed"
                    />
                  </div>
                </>
              ) : (
                <>
                  {(pj.stats?.sexe || pj.stats?.age) && (
                    <div className="flex items-center gap-2 text-[12px] text-[#E3CCCD]/60 uppercase tracking-widest font-medium">
                      {pj.stats.sexe} {pj.stats.age ? ` · ${pj.stats.age}` : ""}
                    </div>
                  )}
                  <div className="space-y-2">
                    <h3 className="font-serif text-xl text-[#E3CCCD]">Description</h3>
                    <div className="bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-xl p-4 text-[13px] leading-relaxed text-white/80 whitespace-pre-wrap shadow-inner min-h-24">
                      {pj.stats?.description || <span className="text-white/30 italic">Aucune description...</span>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-xl text-sky-400">Notes du MJ</h3>
                    <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 text-[13px] leading-relaxed text-sky-100 whitespace-pre-wrap shadow-inner min-h-24">
                      {pj.stats?.notes || <span className="text-sky-200/40 italic">Aucune note secrète...</span>}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VUES À ONGLETS : PJ & PNJ COMBATTANTS                     */}
        {/* ========================================================= */}
        {!isNonCombatantPNJ && activeTab === "stats" && (
          <>
            <div className="flex flex-col md:flex-row gap-3 items-stretch animate-in fade-in duration-200">
              <div className="relative shrink-0 mx-auto md:mx-0">
                <MagicCard
                  imageUrl={displayImageUrl}
                  title={pj.name}
                  badge={derivedCurrentPvMax ? <PvBadge pvMax={derivedCurrentPvMax} /> : undefined}
                />
                {isEditing && (
                  <label className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 rounded-lg cursor-pointer opacity-0 hover:opacity-100 transition-opacity z-10">
                    <UploadCloud className="w-8 h-8 text-white/80" />
                    <span className="text-[12px] text-white/70">
                      Changer l'image
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setImageFile(f);
                        const reader = new FileReader();
                        reader.onload = (ev) =>
                          setImagePreview(ev.target?.result as string);
                        reader.readAsDataURL(f);
                      }}
                    />
                  </label>
                )}
              </div>

              <div
                className="w-full md:w-20 shrink-0 rounded-lg border border-[#E3CCCD]/15 flex md:flex-col flex-row justify-evenly py-3 px-2 flex-wrap"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(55,42,132,0.25) 0%, rgba(18,13,47,0.85) 100%)",
                }}
              >
                {STATS_KEYS.map((stat) => {
                  const v = isEditing ? editCaract[stat] : (caract[stat] ?? 0);
                  return (
                    <div
                      key={stat}
                      className="flex flex-col items-center gap-0.5 min-w-10 md:min-w-0"
                    >
                      <span className="text-[9px] uppercase tracking-widest text-[#E3CCCD]/50">
                        {stat}
                      </span>
                      {isEditing ? (
                        <input
                          type="number"
                          value={v}
                          onChange={(e) =>
                            setEditCaract((prev) => ({
                              ...prev,
                              [stat]: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="w-10 text-center font-mono text-xs text-white bg-white/8 border border-white/15 rounded py-0.5 outline-none focus:border-[#E3CCCD]/50"
                        />
                      ) : (
                        <span
                          className={`font-mono text-sm font-bold leading-none ${v > 0 ? "text-white" : v < 0 ? "text-red-400/70" : "text-white/25"}`}
                        >
                          {v > 0 ? `+${v}` : `${v}`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex-1 flex flex-col gap-3 min-w-0">
                <div className="flex-1 bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-lg p-4 flex flex-col shadow-inner justify-center">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 flex items-center gap-1.5 mb-2">
                    <Swords className="w-3.5 h-3.5" /> Combat
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {isEditing ? (
                      <>
                        <EditNumField
                          label="Initiative"
                          value={editInitiative}
                          onChange={setEditInitiative}
                        />
                        <EditNumField
                          label="Défense"
                          value={editDefense}
                          onChange={setEditDefense}
                        />
                        <EditNumField
                          label="Contact"
                          value={editAttContact}
                          onChange={setEditAttContact}
                        />
                        <EditNumField
                          label="Distance"
                          value={editAttDistance}
                          onChange={setEditAttDistance}
                        />
                        <EditNumField
                          label="Magie"
                          value={editAttMagie}
                          onChange={setEditAttMagie}
                        />
                      </>
                    ) : (
                      <>
                        <CombatStatCard
                          icon={Zap}
                          label="Initiative"
                          value={String(pj.stats?.initiative ?? "—")}
                          color="text-yellow-400/70"
                          border="border-yellow-400/20"
                        />
                        <CombatStatCard
                          icon={Shield}
                          label="Défense"
                          value={String(pj.stats?.defense ?? "—")}
                          color="text-sky-400/70"
                          border="border-sky-400/20"
                        />
                        <CombatStatCard
                          icon={Sword}
                          label="Contact"
                          value={
                            derivedCurrentAttacks.contact != null
                              ? `+${derivedCurrentAttacks.contact}`
                              : "—"
                          }
                          color="text-orange-400/70"
                          border="border-orange-400/20"
                        />
                        <CombatStatCard
                          icon={Target}
                          label="Distance"
                          value={
                            derivedCurrentAttacks.distance != null
                              ? `+${derivedCurrentAttacks.distance}`
                              : "—"
                          }
                          color="text-orange-400/70"
                          border="border-orange-400/20"
                        />
                        <CombatStatCard
                          icon={Wand2}
                          label="Magie"
                          value={
                            derivedCurrentAttacks.magie != null
                              ? `+${derivedCurrentAttacks.magie}`
                              : "—"
                          }
                          color="text-violet-400/70"
                          border="border-violet-400/20"
                        />
                      </>
                    )}
                  </div>
                </div>

                <div
                  className="flex-1 border border-emerald-400/20 rounded-lg p-4 flex flex-col shadow-inner justify-center"
                  style={{
                    background:
                      "linear-gradient(to right, rgba(16,185,129,0.05) 0%, rgba(6,78,59,0.2) 100%)",
                  }}
                >
                  <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400/50 flex items-center gap-1.5 mb-2">
                    <Heart className="w-3.5 h-3.5" /> Ressources
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {isEditing ? (
                      <>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase text-emerald-400/60">
                            PV / Max
                          </span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editPv}
                              onChange={(e) =>
                                setEditPv(parseInt(e.target.value) || 0)
                              }
                              className="w-full text-center font-mono text-xs text-white bg-white/8 border border-white/15 rounded py-1"
                            />
                            <span className="text-white/30">/</span>
                            <input
                              type="number"
                              value={editPvMax}
                              onChange={(e) =>
                                setEditPvMax(parseInt(e.target.value) || 0)
                              }
                              className="w-full text-center font-mono text-xs text-white bg-white/8 border border-white/15 rounded py-1"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase text-emerald-400/60">
                            Récupération
                          </span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editDrQty}
                              onChange={(e) =>
                                setEditDrQty(parseInt(e.target.value) || 0)
                              }
                              className="w-10 text-center font-mono text-xs text-white bg-white/8 border border-white/15 rounded py-1"
                            />
                            <span className="text-white/30 font-mono">×</span>
                            <input
                              type="text"
                              value={editDrDe}
                              onChange={(e) => setEditDrDe(e.target.value)}
                              className="w-full text-center font-mono text-xs text-white bg-white/8 border border-white/15 rounded py-1"
                            />
                          </div>
                        </div>
                        <EditNumField
                          label="Chance (PC)"
                          value={editPc}
                          onChange={setEditPc}
                        />
                        <EditNumField
                          label="Mana (PM)"
                          value={editPm}
                          onChange={setEditPm}
                        />
                      </>
                    ) : (
                      <>
                        <CombatStatCard
                          icon={Heart}
                          label="Points de Vie"
                          value={`${pj.stats?.pv ?? 0} / ${derivedCurrentPvMax}`}
                          color="text-emerald-400/70"
                          border="border-emerald-400/20"
                        />
                        <CombatStatCard
                          icon={RefreshCw}
                          label="Récupération"
                          value={
                            pj.stats?.dr_qty != null
                              ? `${pj.stats.dr_qty}×${pj.stats.dr_de ?? "d6"}`
                              : "—"
                          }
                          color="text-emerald-400/70"
                          border="border-emerald-400/20"
                        />
                        <CombatStatCard
                          icon={Star}
                          label="Chance (PC)"
                          value={String(pj.stats?.pc ?? 0)}
                          color="text-emerald-400/70"
                          border="border-emerald-400/20"
                        />
                        <CombatStatCard
                          icon={Sparkles}
                          label="Mana (PM)"
                          value={String(pj.stats?.pm ?? 0)}
                          color="text-emerald-400/70"
                          border="border-emerald-400/20"
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Voies actives */}
            {pj.pathways?.length > 0 && (
              <div className="space-y-2 mt-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 mb-1">
                  Voies Apprises
                </p>
                {(pj.pathways as any[]).map((pathway, i) => {
                  const voie = voieDetails.find(
                    (v) => v.id === pathway.voie_id,
                  );
                  
                  // On filtre les capacités pour ne garder que celles qui ont été acquises
                  const maxRang = Math.max(...(pathway.rangs_acquis || [1]));
                  const filteredCapacites = voie?.capacites 
                    ? Object.fromEntries(
                        Object.entries(voie.capacites).filter(([key]) => {
                          const rangMatch = key.match(/rang(\d+)/);
                          if (rangMatch) {
                            return parseInt(rangMatch[1], 10) <= maxRang;
                          }
                          return false;
                        })
                      )
                    : {};

                  return (
                    <VoieBlock
                      key={i}
                      voieNom={voie?.nom ?? `Voie ${i + 1}`}
                      capacites={filteredCapacites}
                      rangsAcquis={pathway.rangs_acquis ?? []}
                      defaultOpen={i === 0}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ONGLET 2 : INVENTAIRE */}
        {!isNonCombatantPNJ && activeTab === "inventory" && (
          <InventoryTab 
            pjId={pj.id}
            profilId={pj.stats?.profil_id || voieDetails.find(v => v.profil_id)?.profil_id} 
            pjStats={pj.stats}
            onUpdateStats={async (newStats) => {
              const table = type === "pnj" ? "pnj" : "pj";
              await supabase.from(table).update({ stats: newStats }).eq("id", pj.id);
              // Ne pas appeler onEditSuccess() ici : cela rechargerait le pj et resetterait l'onglet actif
            }}
          />
        )}

        {/* ONGLET 3 : LORE (POUR PJ OU PNJ COMBATTANT) */}
        {!isNonCombatantPNJ && activeTab === "lore" && (
          type === "pnj" ? (
            <div className="flex flex-col gap-6 items-stretch animate-in fade-in duration-200 mt-2">
              <div className="flex-1 space-y-6">
                {isEditing ? (
                  <>
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Sexe</label>
                        <select
                          value={editSexe}
                          onChange={(e) => setEditSexe(e.target.value)}
                          className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none transition-colors appearance-none cursor-pointer"
                        >
                          <option value="Masculin" className="bg-[#1E1941]">Masculin</option>
                          <option value="Féminin" className="bg-[#1E1941]">Féminin</option>
                          <option value="Autre" className="bg-[#1E1941]">Autre</option>
                        </select>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Âge</label>
                        <input
                          type="text"
                          value={editAge}
                          onChange={(e) => setEditAge(e.target.value)}
                          placeholder="ex : 45 ans"
                          className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Description publique</label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={6}
                        className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-xl p-3.5 text-white text-sm outline-none transition-colors resize-none placeholder:text-white/25 leading-relaxed"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-sky-400/60">Notes du MJ (Secret)</label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={6}
                        className="w-full bg-sky-500/5 border border-sky-500/20 focus:border-sky-400/50 rounded-xl p-3.5 text-sky-100 text-sm outline-none transition-colors resize-none placeholder:text-sky-200/30 leading-relaxed"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {(pj.stats?.sexe || pj.stats?.age) && (
                      <div className="flex items-center gap-2 text-[12px] text-[#E3CCCD]/60 uppercase tracking-widest font-medium">
                        {pj.stats.sexe} {pj.stats.age ? ` · ${pj.stats.age}` : ""}
                      </div>
                    )}
                    <div className="space-y-2">
                      <h3 className="font-serif text-xl text-[#E3CCCD]">Description</h3>
                      <div className="bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-xl p-4 text-[13px] leading-relaxed text-white/80 whitespace-pre-wrap shadow-inner min-h-32">
                        {pj.stats?.description || <span className="text-white/30 italic">Aucune description...</span>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-serif text-xl text-sky-400">Notes du MJ</h3>
                      <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 text-[13px] leading-relaxed text-sky-100 whitespace-pre-wrap shadow-inner min-h-32">
                        {pj.stats?.notes || <span className="text-sky-200/40 italic">Aucune note secrète...</span>}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <LoreTab
              stats={pj.stats}
              isEditing={isEditing}
              editSexe={editSexe}
              setEditSexe={setEditSexe}
              editAge={editAge}
              setEditAge={setEditAge}
              editIdeal={editIdeal}
              setEditIdeal={setEditIdeal}
              editTravers={editTravers}
              setEditTravers={setEditTravers}
              editHistorique={editHistorique}
              setEditHistorique={setEditHistorique}
            />
          )
        )}
      </div>
    </div>
  );
}