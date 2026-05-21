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
import LevelUpOverlay from "@/components/personnage/LevelUpOverlay"; // <-- L'import du nouveau fichier

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
    stats: any;
    pathways: any;
    inventory: any;
  } | null;
  isFullscreen: boolean;             // <-- NOUVEAU
  onToggleFullscreen: () => void;    // <-- NOUVEAU
  onDeleteClick: () => void;
  onCreateClick: () => void;
  onEditSuccess: () => void;
}

const getCost = (rang: number) => (rang <= 2 ? 1 : 2);

export function PersonnageDetail({
  pj,
  isFullscreen,
  onToggleFullscreen,
  onDeleteClick,
  onEditSuccess,
}: PersonnageDetailProps) {
  const [voieDetails, setVoieDetails] = useState<VoieDetail[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"stats" | "inventory" | "lore">(
    "stats",
  );

  // Level Up States
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [pendingRanks, setPendingRanks] = useState<
    { voie_id: string; rang: number }[]
  >([]);
  const [allVoies, setAllVoies] = useState<VoieDetail[]>([]);

  // Form Fields State
  const [editName, setEditName] = useState("");
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
  const [editIdeal, setEditIdeal] = useState("");
  const [editTravers, setEditTravers] = useState("");
  const [editHistorique, setEditHistorique] = useState("");

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
    if (!pj) return;
    setEditName(pj.name);
    setEditSexe(pj.stats?.sexe ?? "Masculin");
    setEditAge(pj.stats?.age ?? "");
    const c = pj.stats?.caracteristiques ?? {};
    setEditCaract(
      Object.fromEntries(STATS_KEYS.map((k) => [k, c[k] ?? 0])) as any,
    );
    setEditPv(pj.stats?.pv ?? 0);
    setEditPvMax(pj.stats?.pv_max ?? 0);
    setEditDrQty(pj.stats?.dr_qty ?? 0);
    setEditDrDe(pj.stats?.dr_de ?? "d6");
    setEditPc(pj.stats?.pc ?? 0);
    setEditPm(pj.stats?.pm ?? 0);
    setEditInitiative(pj.stats?.initiative ?? 0);
    setEditDefense(pj.stats?.defense ?? 0);
    setEditAttContact(pj.stats?.att_contact ?? 0);
    setEditAttDistance(pj.stats?.att_distance ?? 0);
    setEditAttMagie(pj.stats?.att_magie ?? 0);
    setEditNiveau(pj.stats?.niveau ?? 1);
    setEditIdeal(pj.stats?.ideal ?? "");
    setEditTravers(pj.stats?.travers ?? "");
    setEditHistorique(pj.stats?.historique ?? "");
    setIsEditing(false);
    setIsLevelingUp(false);
    setActiveTab("stats");
  }, [pj?.id]);

  const handleSave = async () => {
    if (!pj) return;
    setIsSaving(true);
    try {
      let imageUrl = pj.image_url;
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
      await supabase
        .from("pj")
        .update({
          name: editName.trim() || pj.name,
          image_url: imageUrl,
          stats: {
            ...pj.stats,
            sexe: editSexe,
            age: editAge,
            caracteristiques: editCaract,
            pv: editPv,
            pv_max: editPvMax,
            dr_qty: editDrQty,
            dr_de: editDrDe,
            pc: editPc,
            pm: editPm,
            initiative: editInitiative,
            defense: editDefense,
            att_contact: editAttContact,
            att_distance: editAttDistance,
            att_magie: editAttMagie,
            niveau: editNiveau,
            ideal: editIdeal,
            travers: editTravers,
            historique: editHistorique,
          },
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
      await supabase
        .from("pj")
        .update({
          pathways: updatedPathways,
          stats: { ...pj.stats, niveau: newLevel },
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

  const caract = pj.stats?.caracteristiques ?? {};
  const displayImageUrl = imagePreview ?? pj.image_url;
  const currentLevel = pj.stats?.niveau ?? 1;
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
              </>
            ) : (
              <>
                <h1 className="font-serif text-3xl text-white tracking-wider truncate">
                  {pj.name}
                </h1>
                <span className="text-[11px] uppercase tracking-widest text-[#E3CCCD]/60 border border-[#E3CCCD]/30 rounded-full px-2.5 py-0.5 shrink-0">
                  Niv. {currentLevel}
                </span>
                <button
                  onClick={() => setIsLevelingUp(true)}
                  className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 border border-emerald-400/50 bg-emerald-400/20 hover:bg-emerald-400/30 rounded-full px-3 py-1 shrink-0 flex items-center gap-1.5 transition-all ml-2 animate-pulse hover:animate-none shadow-[0_0_10px_rgba(52,211,153,0.3)] hover:shadow-[0_0_15px_rgba(52,211,153,0.5)]"
                >
                  <ArrowUpCircle className="w-3.5 h-3.5" /> Level Up
                </button>
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
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={onDeleteClick}
                  className="p-1 text-white/60 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded-full transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* TABS SELECTOR (Nouveau Design) */}
        <div className="flex gap-1 border-b border-[#E3CCCD]/20 px-2 mt-2">
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-[11px] font-bold uppercase tracking-widest transition-all border border-b-0 ${
              activeTab === "stats"
                ? "bg-[#1E1941]/60 border-[#E3CCCD]/30 text-[#E3CCCD] relative z-10 -mb-[1px] shadow-[0_-5px_15px_rgba(0,0,0,0.2)]"
                : "bg-black/10 border-transparent text-white/40 hover:text-white/80 hover:bg-white/5"
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Fiche Technique
          </button>

          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-[11px] font-bold uppercase tracking-widest transition-all border border-b-0 ${
              activeTab === "inventory"
                ? "bg-[#1E1941]/60 border-[#E3CCCD]/30 text-[#E3CCCD] relative z-10 -mb-[1px] shadow-[0_-5px_15px_rgba(0,0,0,0.2)]"
                : "bg-black/10 border-transparent text-white/40 hover:text-white/80 hover:bg-white/5"
            }`}
          >
            <Package className="w-3.5 h-3.5" /> Sac & Équipement
          </button>

          <button
            onClick={() => setActiveTab("lore")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-[11px] font-bold uppercase tracking-widest transition-all border border-b-0 ${
              activeTab === "lore"
                ? "bg-[#1E1941]/60 border-[#E3CCCD]/30 text-[#E3CCCD] relative z-10 -mb-[1px] shadow-[0_-5px_15px_rgba(0,0,0,0.2)]"
                : "bg-black/10 border-transparent text-white/40 hover:text-white/80 hover:bg-white/5"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Histoire & Lore
          </button>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        {/* ONGLET 1 : FICHE TECHNIQUE */}
        {activeTab === "stats" && (
          <>
            <div className="flex flex-col md:flex-row gap-3 items-stretch animate-in fade-in duration-200">
              <div className="relative shrink-0 mx-auto md:mx-0">
                <MagicCard
                  imageUrl={displayImageUrl}
                  title={pj.name}
                  badge={<PvBadge pvMax={pj.stats?.pv_max} />}
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
                      className="flex flex-col items-center gap-0.5 min-w-[40px] md:min-w-0"
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
                            pj.stats?.att_contact != null
                              ? `+${pj.stats.att_contact}`
                              : "—"
                          }
                          color="text-orange-400/70"
                          border="border-orange-400/20"
                        />
                        <CombatStatCard
                          icon={Target}
                          label="Distance"
                          value={
                            pj.stats?.att_distance != null
                              ? `+${pj.stats.att_distance}`
                              : "—"
                          }
                          color="text-orange-400/70"
                          border="border-orange-400/20"
                        />
                        <CombatStatCard
                          icon={Wand2}
                          label="Magie"
                          value={
                            pj.stats?.att_magie != null
                              ? `+${pj.stats.att_magie}`
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
                          value={`${pj.stats?.pv ?? 0} / ${pj.stats?.pv_max ?? 0}`}
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
                  // On récupère le max rang acquis dans le tableau rangs_acquis (ex: si [1, 2], max est 2)
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
        {activeTab === "inventory" && (
          <InventoryTab 
            pjId={pj.id}
            profilId={pj.stats?.profil_id || voieDetails.find(v => v.profil_id)?.profil_id} 
            pjStats={pj.stats}
            onUpdateStats={async (newStats) => {
              // Met à jour la base de données quand la monnaie change !
              await supabase.from("pj").update({ stats: newStats }).eq("id", pj.id);
              onEditSuccess(); // Rafraîchit l'UI parente
            }}
          />
        )}

        {/* ONGLET 3 : LORE */}
        {activeTab === "lore" && (
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
        )}
      </div>
    </div>
  );
}