/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  User,
  Pencil,
  Trash2,
  X,
  Save,
  UploadCloud,
  Sword,
  MoreHorizontal,
  Target,
  Shield,
  Heart,
  RefreshCw,
  Clover,
  Sparkles,
  Zap,
  Wand2,
  ArrowUpCircle,
  BookOpen,
  Package,
  PawPrint,
  Dices,
  Plus,
  Minus,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MagicCard } from "@/components/ui/MagicCard";
import { VoieBlock } from "@/components/ui/VoieBlock";
import { EditNumField } from "@/components/ui/EditNumField";

import InventoryTab from "@/components/personnage/InventoryTab";
import LoreTab from "@/components/personnage/LoreTab";
import LevelUpOverlay from "@/components/personnage/LevelUpOverlay";
import FamilierTab from "@/components/personnage/FamilierTab";
import VoieEditModal from "@/components/personnage/VoieEditModal";

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

interface PersonnageDetailMobileProps {
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
  campaignId: string;
  isFullscreen: boolean;
  readOnly?: boolean;
  technicalSheetOnly?: boolean;
  isMJ?: boolean;
  showFullscreenToggle?: boolean;
  onToggleFullscreen: () => void;
  onDeleteClick: () => void;
  onCreateClick: () => void;
  onEditSuccess: () => void;
}

const getCost = (rang: number) => (rang <= 2 ? 1 : 2);
const isPrestigeType = (type?: string | null) =>
  (type || "").toLowerCase() === "prestige";

function getDerivedAttacks(
  level: number,
  characteristics: Record<string, number>,
) {
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
  if (typeof stats?.pv_par_niveau === "number") {
    return stats.pv_par_niveau + con;
  }
  const drFaces = getDieFaces(stats?.dr_de ?? "d6");
  return Math.max(1, drFaces + con);
}

export function PersonnageDetailMobile({
  pj,
  type = "pj",
  campaignId,
  readOnly,
  technicalSheetOnly = false,
  isMJ = false,
  showFullscreenToggle = true,
  onToggleFullscreen,
  onDeleteClick,
  onEditSuccess,
}: PersonnageDetailMobileProps) {
  const [voieDetails, setVoieDetails] = useState<VoieDetail[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    "stats" | "inventory" | "lore" | "familiers"
  >("stats");

  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [isEditingVoies, setIsEditingVoies] = useState(false);
  const [pendingRanks, setPendingRanks] = useState<
    { voie_id: string; rang: number }[]
  >([]);
  const [allVoies, setAllVoies] = useState<VoieDetail[]>([]);

  const [editUserId, setEditUserId] = useState("");
  const [players, setPlayers] = useState<Array<{ id: string; pseudo: string }>>(
    [],
  );
  const [editSexe, setEditSexe] = useState("Masculin");
  const [editAge, setEditAge] = useState("");
  const [editCaract, setEditCaract] = useState<Record<StatKey, number>>(
    () => Object.fromEntries(STATS_KEYS.map((k) => [k, 0])) as any,
  );
  const [editBonusCaract, setEditBonusCaract] = useState<
    Record<StatKey, boolean>
  >(() => Object.fromEntries(STATS_KEYS.map((k) => [k, false])) as any);
  const [editPv, setEditPv] = useState(0);
  const [editPvMax, setEditPvMax] = useState(0);
  const [editDrQty, setEditDrQty] = useState(0);
  const [editDrDe, setEditDrDe] = useState("d6");
  const [editPc, setEditPc] = useState(0);
  const [editPm, setEditPm] = useState(0);

  const [editIdeal, setEditIdeal] = useState("");
  const [editTravers, setEditTravers] = useState("");
  const [editHistorique, setEditHistorique] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [showPvModal, setShowPvModal] = useState(false);
  const [lastDiceRoll, setLastDiceRoll] = useState<number | null>(null);
  const [inlineDrQty, setInlineDrQty] = useState(0);
  const [showPcModal, setShowPcModal] = useState(false);
  const [showPmModal, setShowPmModal] = useState(false);
  const [showCombatModal, setShowCombatModal] = useState(false);
  const [showCaractModal, setShowCaractModal] = useState(false);
  const [inlineCaract, setInlineCaract] = useState<Record<StatKey, number>>(
    () => Object.fromEntries(STATS_KEYS.map((k) => [k, 0])) as any,
  );
  const [inlineBonusCaract, setInlineBonusCaract] = useState<Record<StatKey, boolean>>(
    () => Object.fromEntries(STATS_KEYS.map((k) => [k, false])) as any,
  );
  const [inlinePmCurrent, setInlinePmCurrent] = useState(0);
  const [inlinePmMax, setInlinePmMax] = useState(0);
  const [inlineInit, setInlineInit] = useState(0);
  const [inlineDef, setInlineDef] = useState(0);
  const [inlineAttContact, setInlineAttContact] = useState(0);
  const [inlineAttDistance, setInlineAttDistance] = useState(0);
  const [inlineAttMagie, setInlineAttMagie] = useState(0);
  const [inlinePvCurrent, setInlinePvCurrent] = useState(0);
  const [inlinePvMax, setInlinePvMax] = useState(0);
  const [inlinePcCurrent, setInlinePcCurrent] = useState(0);
  const [inlinePcMax, setInlinePcMax] = useState(0);
  const [isInlineSaving, setIsInlineSaving] = useState(false);
  const [showRestToast, setShowRestToast] = useState(false);
  const restToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quickImageInputRef = useRef<HTMLInputElement | null>(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameDraft, setEditNameDraft] = useState("");
  const headerMenuRef = useRef<HTMLDivElement | null>(null);

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
    if (isLevelingUp || isEditingVoies) {
      supabase
        .from("voies")
        .select("id, nom, type, peuple_id, profil_id, capacites")
        .order("nom")
        .then(({ data }) => {
          if (data) setAllVoies(data as VoieDetail[]);
        });
    }
  }, [isLevelingUp, isEditingVoies]);

  useEffect(() => {
    if (type !== "pj") return;
    supabase
      .from("utilisateurs")
      .select("id, pseudo, role")
      .order("pseudo")
      .then(({ data }) => {
        if (data) {
          setPlayers(
            (data as any[])
              .filter((p) => p.role !== "mj")
              .map((p) => ({ id: p.id, pseudo: p.pseudo })),
          );
        }
      });
  }, [type]);

  useEffect(() => {
    if (!pj) return;
    setEditUserId(type === "pj" ? (pj.user_id ?? "") : "");
    setEditSexe(pj.stats?.sexe ?? "Masculin");
    setEditAge(pj.stats?.age ?? "");
    const c = pj.stats?.caracteristiques ?? {};
    setEditCaract(
      Object.fromEntries(STATS_KEYS.map((k) => [k, c[k] ?? 0])) as any,
    );
    const bc = pj.stats?.bonus_caracteristiques ?? {};
    setEditBonusCaract(
      Object.fromEntries(STATS_KEYS.map((k) => [k, bc[k] ?? false])) as any,
    );
    setEditPv(pj.stats?.pv ?? 0);
    setEditPvMax(
      Math.max(Number(pj.stats?.pv_max ?? 0), Number(pj.stats?.pv ?? 0)),
    );
    setEditDrQty(pj.stats?.dr_qty ?? 0);
    setEditDrDe(pj.stats?.dr_de ?? "d6");
    setEditPc(pj.stats?.pc ?? 0);
    setEditPm(pj.stats?.pm ?? 0);
    setEditIdeal(pj.stats?.ideal ?? "");
    setEditTravers(pj.stats?.travers ?? "");
    setEditHistorique(pj.stats?.historique ?? "");
    setEditDescription(pj.stats?.description ?? "");
    setEditNotes(pj.stats?.notes ?? "");
    setIsEditing(false);
    setIsLevelingUp(false);
    setActiveTab("stats");
  }, [pj, type]);

  useEffect(() => {
    if (!technicalSheetOnly) return;
    setActiveTab("stats");
    setIsLevelingUp(false);
  }, [technicalSheetOnly]);

  useEffect(() => {
    if (!pj) return;
    const pv = Number(pj.stats?.pv ?? 0);
    const pvMax = Math.max(Number(pj.stats?.pv_max ?? 0), pv);
    const pc = Number(pj.stats?.pc ?? 0);
    const pcMax = Math.max(Number(pj.stats?.pc_max ?? pc), pc);
    setInlinePvCurrent(pv);
    setInlinePvMax(pvMax);
    setInlineDrQty(Number(pj.stats?.dr_qty ?? 0));
    setInlinePcCurrent(pc);
    setInlinePcMax(pcMax);
    setInlinePmCurrent(Number(pj.stats?.pm ?? 0));
    setInlinePmMax(Math.max(Number(pj.stats?.pm_max ?? 0), Number(pj.stats?.pm ?? 0)));
    setInlineInit(Number(pj.stats?.initiative ?? 0));
    setInlineDef(Number(pj.stats?.defense ?? 0));
    setInlineAttContact(Number(pj.stats?.att_contact ?? 0));
    setInlineAttDistance(Number(pj.stats?.att_distance ?? 0));
    setInlineAttMagie(Number(pj.stats?.att_magie ?? 0));
    setShowPvModal(false);
    setShowPcModal(false);
    setShowPmModal(false);
    setShowCombatModal(false);
    setShowCaractModal(false);
    const c = pj.stats?.caracteristiques ?? {};
    setInlineCaract(Object.fromEntries(STATS_KEYS.map((k) => [k, Number(c[k] ?? 0)])) as any);
    const bc = pj.stats?.bonus_caracteristiques ?? {};
    setInlineBonusCaract(Object.fromEntries(STATS_KEYS.map((k) => [k, bc[k] ?? false])) as any);
    setLastDiceRoll(null);
  }, [pj, pj?.id, pj?.stats]);

  const handleSaveName = async () => {
    if (!pj || !editNameDraft.trim()) return;
    setIsInlineSaving(true);
    try {
      const table = type === "pnj" ? "pnj" : "pj";
      await supabase.from(table).update({ name: editNameDraft.trim() }).eq("id", pj.id);
      setIsEditingName(false);
      onEditSuccess();
    } catch (err: any) {
      alert(err.message || "Erreur lors du renommage");
    } finally {
      setIsInlineSaving(false);
    }
  };

  const saveQuickStats = async (patch: Record<string, unknown>) => {
    if (!pj) return;
    setIsInlineSaving(true);
    try {
      const table = type === "pnj" ? "pnj" : "pj";
      await supabase
        .from(table)
        .update({ stats: { ...(pj.stats ?? {}), ...patch } })
        .eq("id", pj.id);
      onEditSuccess();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la mise a jour rapide");
    } finally {
      setIsInlineSaving(false);
    }
  };

  const handleQuickImageChange = async (file: File) => {
    if (!pj) return;
    setIsInlineSaving(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${type}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("compendium")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("compendium").getPublicUrl(path);
      const table = type === "pnj" ? "pnj" : "pj";

      await supabase
        .from(table)
        .update({ image_url: urlData.publicUrl })
        .eq("id", pj.id);

      setImagePreview(urlData.publicUrl);
      onEditSuccess();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la mise a jour de l'image");
    } finally {
      setIsInlineSaving(false);
    }
  };

  const handleSaveLevelUp = async () => {
    if (!pj) return;
    setIsInlineSaving(true);
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
      const forStat = Number(caract.FOR ?? 0);
      const agi = Number(caract.AGI ?? 0);
      const vol = Number(caract.VOL ?? 0);

      const hpGain = getHpGainPerLevel(stats);
      const currentPvMax = Math.max(
        Number(stats.pv_max ?? stats.pv ?? 0),
        Number(stats.pv ?? 0),
      );
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
      setIsInlineSaving(false);
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

  const isNonCombatantPNJ = type === "pnj" && pj.stats?.is_combatant !== true;

  const caract = pj.stats?.caracteristiques ?? {};
  const displayImageUrl = imagePreview ?? pj.image_url;
  const assignedPlayer = players.find((p) => p.id === (pj.user_id ?? ""));
  const currentLevel = pj.stats?.niveau ?? 1;
  const derivedCurrentAttacks = getDerivedAttacks(
    currentLevel,
    caract as Record<string, number>,
  );
  const derivedCurrentPvMax = Math.max(
    Number(pj.stats?.pv_max ?? 0),
    Number(pj.stats?.pv ?? 0),
  );
  const derivedCurrentPcMax = Math.max(
    Number(pj.stats?.pc_max ?? pj.stats?.pc ?? 0),
    Number(pj.stats?.pc ?? 0),
  );
  const canQuickEdit = !readOnly && !isNonCombatantPNJ;
  const targetLevel = currentLevel + 1;
  const pointsSpent = pendingRanks.reduce((acc, curr) => {
    const voie =
      allVoies.find((v) => v.id === curr.voie_id) ||
      voieDetails.find((v) => v.id === curr.voie_id);
    const cost = isPrestigeType(voie?.type) ? 2 : getCost(curr.rang);
    return acc + cost;
  }, 0);
  const pointsRemaining = 2 - pointsSpent;

  const mobileNavItems: Array<{
    key: "stats" | "inventory" | "lore" | "familiers";
    label: string;
    icon: typeof Shield;
  }> = [];

  if (!isNonCombatantPNJ) {
    mobileNavItems.push(
      { key: "stats", label: "Technique", icon: Shield },
      { key: "inventory", label: "Equipement", icon: Package },
    );
    if (!technicalSheetOnly) {
      mobileNavItems.push(
        {
          key: "lore",
          label: type === "pnj" ? "Description" : "Lore",
          icon: BookOpen,
        },
        { key: "familiers", label: "Familiers", icon: PawPrint },
      );
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 relative p-2 pb-5">
      {isEditingVoies && !readOnly && createPortal(
        <VoieEditModal
          pj={pj}
          type={type}
          voieDetails={voieDetails}
          allVoies={allVoies}
          onSaved={onEditSuccess}
          onClose={() => setIsEditingVoies(false)}
        />,
        document.body,
      )}

      {/* OVERLAY DE NIVEAU */}
      {isLevelingUp && !readOnly && !technicalSheetOnly && (
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

      {/* NAV MOBILE */}
      {mobileNavItems.length > 0 && (
        <div className="sticky top-0 z-20 mb-3">
          <div
            className={`grid gap-1 rounded-xl border border-[#E3CCCD]/35 bg-white/14 backdrop-blur-xl p-1.5 shadow-[0_10px_26px_rgba(0,0,0,0.25)] ${mobileNavItems.length >= 4 ? "grid-cols-4" : "grid-cols-2"}`}
          >
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`h-10 rounded-lg text-[9px] font-bold uppercase tracking-wide transition-all flex flex-col items-center justify-center gap-0.5 ${
                    isActive
                      ? "bg-white/24 text-white border border-[#E3CCCD]/55"
                      : "text-white/82 bg-white/8 border border-transparent"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col mb-2 shrink-0 gap-1 rounded-xl border border-[#E3CCCD]/30 bg-linear-to-r from-[#E3CCCD]/20 via-[#CDB7E3]/16 to-[#E3CCCD]/14 backdrop-blur-md p-2">
        <div className="flex justify-between px-1 gap-2 items-center">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isEditingName ? (
              <>
                <input
                  value={editNameDraft}
                  onChange={(e) => setEditNameDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setIsEditingName(false); }}
                  autoFocus
                  className="font-serif text-xl text-white tracking-wider bg-transparent border-b border-[#E3CCCD]/60 outline-none focus:border-[#E3CCCD] w-full"
                />
                <button onClick={() => setIsEditingName(false)} className="p-1 text-white/50 hover:text-white shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleSaveName} disabled={isInlineSaving} className="p-1 text-emerald-400 hover:text-emerald-300 shrink-0 disabled:opacity-50">
                  <Save className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <h1 className="font-serif text-xl text-white tracking-wider truncate">
                  {pj.name}
                </h1>
                {!isNonCombatantPNJ && (
                  <span className="text-[9px] uppercase tracking-widest text-[#E3CCCD]/60 border border-[#E3CCCD]/30 rounded-full px-2 py-0.5 shrink-0">
                    Niv. {currentLevel}
                  </span>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {showFullscreenToggle && (
              <button
                onClick={onToggleFullscreen}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Retour à la liste"
              >
                <Package className="w-4 h-4" />
              </button>
            )}

            {!readOnly && (
              <div className="relative" ref={headerMenuRef}>
                <button
                  onClick={() => setShowHeaderMenu((v) => !v)}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  aria-label="Options"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {showHeaderMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowHeaderMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-xl border border-[#E3CCCD]/25 bg-[#1E1941]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                      <button
                        onClick={() => {
                          setEditNameDraft(pj.name);
                          setIsEditingName(true);
                          setShowHeaderMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-white/85 hover:bg-white/10 transition-colors text-left"
                      >
                        <Pencil className="w-4 h-4 text-[#E3CCCD]/60 shrink-0" />
                        Éditer le nom
                      </button>
                      {!isNonCombatantPNJ && !technicalSheetOnly && (
                        <button
                          onClick={() => {
                            setIsLevelingUp(true);
                            setShowHeaderMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-emerald-300/90 hover:bg-emerald-400/10 transition-colors text-left border-t border-white/8"
                        >
                          <ArrowUpCircle className="w-4 h-4 shrink-0" />
                          Level Up
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowHeaderMenu(false);
                          onDeleteClick();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-red-400/85 hover:bg-red-400/10 transition-colors text-left border-t border-white/8"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                        Supprimer
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {type === "pj" && (
          <div>
            {isEditing ? (
              <div className="max-w-sm space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                  Joueur rattaché
                </label>
                <select
                  value={editUserId}
                  onChange={(e) => setEditUserId(e.target.value)}
                  className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-xl px-3.5 py-2 text-white text-sm outline-none transition-colors appearance-none cursor-pointer"
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
            ) : (
              <p className="text-[8.5px] text-[#E3CCCD]/60 uppercase tracking-widest">
                Joueur : {assignedPlayer?.pseudo ?? "Non assigné"}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4 flex-1">

        {/* ========================================================= */}
        {/* VUE UNIQUE : PNJ NON COMBATTANT                           */}
        {/* ========================================================= */}
        {isNonCombatantPNJ && (
          <div className="flex flex-col gap-6 items-stretch animate-in fade-in duration-200 mt-2">
            <div className="relative shrink-0 mx-auto">
              <MagicCard imageUrl={displayImageUrl} title={pj.name} />
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
                      const reader = new FileReader();
                      reader.onload = (ev) =>
                        setImagePreview(ev.target?.result as string);
                      reader.readAsDataURL(f);
                    }}
                  />
                </label>
              )}
            </div>

            <div className="flex-1 space-y-6">
              {isEditing ? (
                <>
                  <div className="flex flex-col gap-4">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                        Sexe
                      </label>
                      <select
                        value={editSexe}
                        onChange={(e) => setEditSexe(e.target.value)}
                        className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none transition-colors appearance-none cursor-pointer"
                      >
                        <option value="Masculin" className="bg-[#1E1941]">
                          Masculin
                        </option>
                        <option value="Féminin" className="bg-[#1E1941]">
                          Féminin
                        </option>
                        <option value="Autre" className="bg-[#1E1941]">
                          Autre
                        </option>
                      </select>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                        Âge
                      </label>
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
                    <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                      Description publique
                    </label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={4}
                      className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-xl p-3.5 text-white text-sm outline-none transition-colors resize-none placeholder:text-white/25 leading-relaxed"
                    />
                  </div>
                  {isMJ && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-[0.15em] text-sky-400/60">
                        Notes du MJ (Secret)
                      </label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={5}
                        className="w-full bg-sky-500/5 border border-sky-500/20 focus:border-sky-400/50 rounded-xl p-3.5 text-sky-100 text-sm outline-none transition-colors resize-none placeholder:text-sky-200/30 leading-relaxed"
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  {(pj.stats?.sexe || pj.stats?.age) && (
                    <div className="flex items-center gap-2 text-[12px] text-[#E3CCCD]/60 uppercase tracking-widest font-medium">
                      {pj.stats.sexe}{" "}
                      {pj.stats.age ? ` · ${pj.stats.age}` : ""}
                    </div>
                  )}
                  <div className="space-y-2">
                    <h3 className="font-serif text-xl text-[#E3CCCD]">
                      Description
                    </h3>
                    <div className="bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-xl p-4 text-[13px] leading-relaxed text-white/80 whitespace-pre-wrap shadow-inner min-h-24">
                      {pj.stats?.description || (
                        <span className="text-white/30 italic">
                          Aucune description...
                        </span>
                      )}
                    </div>
                  </div>
                  {isMJ && (
                    <div className="space-y-2">
                      <h3 className="font-serif text-xl text-sky-400">
                        Notes du MJ
                      </h3>
                      <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 text-[13px] leading-relaxed text-sky-100 whitespace-pre-wrap shadow-inner min-h-24">
                        {pj.stats?.notes || (
                          <span className="text-sky-200/40 italic">
                            Aucune note secrète...
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {isNonCombatantPNJ && !isEditing && (
          <div className="mt-2">
            <FamilierTab
              pjId=""
              pnjId={pj.id}
              type="pnj"
              campaignId={campaignId}
              readOnly={readOnly}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* ONGLET 1 : FICHE TECHNIQUE                                */}
        {/* ========================================================= */}
        {!isNonCombatantPNJ && activeTab === "stats" && (
          <>
            {/* Card gauche + infos droite */}
            <div className="flex gap-2 items-stretch animate-in fade-in duration-200 mb-2">
              {/* LEFT : carte image */}
              <div className="relative shrink-0 self-stretch">
                <MagicCard
                  imageUrl={displayImageUrl}
                  size="fluid"
                />
                {canQuickEdit && (
                  <>
                    <button
                      type="button"
                      onClick={() => quickImageInputRef.current?.click()}
                      className="absolute inset-0 z-10 rounded-lg border border-transparent hover:border-[#E3CCCD]/40 bg-black/0 hover:bg-black/35 transition-all"
                      aria-label="Modifier l'image"
                    />
                    <div className="absolute bottom-2 right-2 z-20 pointer-events-none rounded-md bg-black/55 border border-white/20 px-2 py-1 text-[9px] text-white/90 uppercase tracking-wider">
                      Image
                    </div>
                    <input
                      ref={quickImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const reader = new FileReader();
                        reader.onload = (ev) =>
                          setImagePreview(ev.target?.result as string);
                        reader.readAsDataURL(f);
                        await handleQuickImageChange(f);
                        e.currentTarget.value = "";
                      }}
                    />
                  </>
                )}
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
                      const reader = new FileReader();
                        reader.onload = (ev) =>
                          setImagePreview(ev.target?.result as string);
                        reader.readAsDataURL(f);
                      }}
                    />
                  </label>
                )}
              </div>

              {/* RIGHT : stats */}
              <div className="flex-1 min-w-0 self-stretch">
                {/* Ressources */}
                <div
                  className="h-full border border-emerald-400/20 rounded-lg p-2.5 flex flex-col justify-between shadow-inner"
                  style={{
                    background:
                      "linear-gradient(to right, rgba(16,185,129,0.05) 0%, rgba(6,78,59,0.2) 100%)",
                  }}
                >
                  {isEditing ? (
                    <div className="flex flex-col gap-2 flex-1 justify-around">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase text-emerald-400/60">PV / Max</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editPv}
                            onChange={(e) => setEditPv(parseInt(e.target.value) || 0)}
                            className="w-full text-center font-mono text-xs text-white bg-white/8 border border-white/15 rounded py-1"
                          />
                          <span className="text-white/30">/</span>
                          <input
                            type="number"
                            value={editPvMax}
                            onChange={(e) => setEditPvMax(parseInt(e.target.value) || 0)}
                            className="w-full text-center font-mono text-xs text-white bg-white/8 border border-white/15 rounded py-1"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase text-emerald-400/60">Récup.</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editDrQty}
                            onChange={(e) => setEditDrQty(parseInt(e.target.value) || 0)}
                            className="w-8 text-center font-mono text-xs text-white bg-white/8 border border-white/15 rounded py-1"
                          />
                          <span className="text-white/30 font-mono text-xs">×</span>
                          <input
                            type="text"
                            value={editDrDe}
                            onChange={(e) => setEditDrDe(e.target.value)}
                            className="w-full text-center font-mono text-xs text-white bg-white/8 border border-white/15 rounded py-1"
                          />
                        </div>
                      </div>
                      <EditNumField label="PC" value={editPc} onChange={setEditPc} />
                      <EditNumField label="PM" value={editPm} onChange={setEditPm} />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 flex-1">
                      {/* PV avec barre de progression */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!canQuickEdit) return;
                          setInlinePvCurrent(pj.stats?.pv ?? 0);
                          setInlinePvMax(Math.max(Number(pj.stats?.pv_max ?? 0), Number(pj.stats?.pv ?? 0)));
                          setInlineDrQty(Number(pj.stats?.dr_qty ?? 0));
                          setLastDiceRoll(null);
                          setShowPvModal(true);
                        }}
                        disabled={!canQuickEdit}
                        className="flex flex-col gap-1 text-left disabled:cursor-default"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase tracking-wider text-white/70 flex items-center gap-1">
                            <Heart className="w-4 h-4 text-emerald-400" /> PV
                          </span>
                          <div className="flex items-center gap-1.5">
                            {pj.stats?.dr_qty != null && (
                              <span className="font-mono text-[9px] font-bold text-emerald-300 bg-emerald-400/15 border border-emerald-400/30 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                                <RefreshCw className="w-2.5 h-2.5" />
                                {pj.stats.dr_qty}×{pj.stats.dr_de ?? "d6"}
                              </span>
                            )}
                            <span className="font-mono text-[12px] font-bold text-white">
                              {pj.stats?.pv ?? 0}
                              <span className="text-white/50 font-normal text-[10px]">/{derivedCurrentPvMax}</span>
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-400 transition-all"
                            style={{ width: `${derivedCurrentPvMax > 0 ? Math.min(100, Math.round(((pj.stats?.pv ?? 0) / derivedCurrentPvMax) * 100)) : 0}%` }}
                          />
                        </div>
                      </button>

                      {canQuickEdit && (
                        <button
                          type="button"
                          onClick={async () => {
                            const currentStats = pj.stats ?? {};
                            const pvMax = Math.max(Number(currentStats.pv_max ?? 0), Number(currentStats.pv ?? 0));
                            const pcMax = Math.max(Number(currentStats.pc_max ?? currentStats.pc ?? 0), Number(currentStats.pc ?? 0));
                            const pmMax = Number(currentStats.pm_max ?? currentStats.pm ?? 0);
                            await saveQuickStats({
                              pv: pvMax,
                              pc: pcMax,
                              pm: pmMax,
                              pc_max: pcMax,
                            });
                            if (restToastTimer.current) clearTimeout(restToastTimer.current);
                            setShowRestToast(true);
                            restToastTimer.current = setTimeout(() => setShowRestToast(false), 2500);
                          }}
                          disabled={isInlineSaving}
                          className="h-7 rounded-lg border border-emerald-300/35 bg-emerald-400/10 text-emerald-200 text-[9px] uppercase tracking-widest font-bold hover:bg-emerald-400/20 transition-colors disabled:opacity-60"
                        >
                          Repos long
                        </button>
                      )}
                      {/* PC + PM */}
                      <div className="flex items-stretch gap-1.5">
                        <button
                          type="button"
                          onClick={() => canQuickEdit && setShowPcModal(true)}
                          disabled={!canQuickEdit}
                          className="relative flex-1 flex flex-col items-center justify-center gap-0 rounded-lg border border-emerald-400/25 bg-emerald-400/8 py-1 disabled:cursor-default"
                        >
                          <Clover className="w-3 h-3 text-emerald-400 absolute top-1 left-1.5" />
                          <span className="font-mono text-[13px] font-bold text-white leading-none">
                            {pj.stats?.pc ?? 0}
                            <span className="text-[10px] font-normal text-white/55">/{derivedCurrentPcMax}</span>
                          </span>
                          <span className="text-[8px] uppercase tracking-widest text-white/50">PC</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => canQuickEdit && setShowPmModal(true)}
                          disabled={!canQuickEdit}
                          className="relative flex-1 flex flex-col items-center justify-center gap-0 rounded-lg border border-emerald-400/25 bg-emerald-400/8 py-1 disabled:cursor-default"
                        >
                          <Sparkles className="w-3 h-3 text-emerald-400 absolute top-1 left-1.5" />
                          <span className="font-mono text-[13px] font-bold text-white leading-none">
                            {pj.stats?.pm ?? 0}
                            <span className="text-[10px] font-normal text-white/55">/{Math.max(Number(pj.stats?.pm_max ?? 0), Number(pj.stats?.pm ?? 0))}</span>
                          </span>
                          <span className="text-[8px] uppercase tracking-widest text-white/50">PM</span>
                        </button>
                      </div>
                      {/* Init + Déf */}
                      <div className="flex items-stretch gap-1.5">
                        <button type="button" onClick={() => canQuickEdit && setShowCombatModal(true)} disabled={!canQuickEdit} className="relative flex-1 flex flex-col items-center justify-center gap-0 rounded-lg border border-[#E3CCCD]/20 bg-white/4 py-1 disabled:cursor-default">
                          <Zap className="w-3 h-3 text-yellow-400/80 absolute top-1 left-1.5" />
                          <span className="font-mono text-[13px] font-bold text-white leading-none">{pj.stats?.initiative ?? "—"}</span>
                          <span className="text-[8px] uppercase tracking-widest text-white/50">Init.</span>
                        </button>
                        <button type="button" onClick={() => canQuickEdit && setShowCombatModal(true)} disabled={!canQuickEdit} className="relative flex-1 flex flex-col items-center justify-center gap-0 rounded-lg border border-[#E3CCCD]/20 bg-white/4 py-1 disabled:cursor-default">
                          <Shield className="w-3 h-3 text-sky-400/80 absolute top-1 left-1.5" />
                          <span className="font-mono text-[13px] font-bold text-white leading-none">{pj.stats?.defense ?? "—"}</span>
                          <span className="text-[8px] uppercase tracking-widest text-white/50">Déf.</span>
                        </button>
                      </div>
                      {/* Contact + Distance + Magie */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <button type="button" onClick={() => canQuickEdit && setShowCombatModal(true)} disabled={!canQuickEdit} className="relative flex flex-col items-center justify-center gap-0 rounded-lg border border-[#E3CCCD]/20 bg-white/4 py-1 disabled:cursor-default">
                          <Sword className="w-3 h-3 text-orange-400/80 absolute top-1 left-1.5" />
                          <span className="font-mono text-[13px] font-bold text-white leading-none">{derivedCurrentAttacks.contact != null ? `+${derivedCurrentAttacks.contact}` : "—"}</span>
                          <span className="text-[8px] uppercase tracking-widest text-white/50">Cont.</span>
                        </button>
                        <button type="button" onClick={() => canQuickEdit && setShowCombatModal(true)} disabled={!canQuickEdit} className="relative flex flex-col items-center justify-center gap-0 rounded-lg border border-[#E3CCCD]/20 bg-white/4 py-1 disabled:cursor-default">
                          <Target className="w-3 h-3 text-orange-400/80 absolute top-1 left-1.5" />
                          <span className="font-mono text-[13px] font-bold text-white leading-none">{derivedCurrentAttacks.distance != null ? `+${derivedCurrentAttacks.distance}` : "—"}</span>
                          <span className="text-[8px] uppercase tracking-widest text-white/50">Dist.</span>
                        </button>
                        <button type="button" onClick={() => canQuickEdit && setShowCombatModal(true)} disabled={!canQuickEdit} className="relative flex flex-col items-center justify-center gap-0 rounded-lg border border-[#E3CCCD]/20 bg-white/4 py-1 disabled:cursor-default">
                          <Wand2 className="w-3 h-3 text-violet-400/80 absolute top-1 left-1.5" />
                          <span className="font-mono text-[13px] font-bold text-white leading-none">{derivedCurrentAttacks.magie != null ? `+${derivedCurrentAttacks.magie}` : "—"}</span>
                          <span className="text-[8px] uppercase tracking-widest text-white/50">Mag.</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* Stats bar — pleine largeur */}
            <button
              type="button"
              disabled={!canQuickEdit}
              onClick={() => canQuickEdit && setShowCaractModal(true)}
              className="w-full rounded-lg shadow-inner flex flex-row justify-evenly py-2 px-1 flex-wrap mb-2 disabled:cursor-default"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(227,204,205,0.2) 0%, rgba(36,27,89,0.82) 100%)",
              }}
            >
              {STATS_KEYS.map((stat) => {
                const v = caract[stat] ?? 0;
                const ev = editCaract[stat] ?? 0;
                const hasBonus = isEditing && ev !== v;
                const sup = pj.stats?.bonus_caracteristiques?.[stat] ?? false;
                return (
                  <div key={stat} className="flex flex-col items-center gap-0.5 min-w-10">
                    <span className="text-[9px] uppercase tracking-widest text-[#E3CCCD]/78">{stat}</span>
                    <span className={`font-mono text-sm font-bold leading-none ${(isEditing ? ev : v) > 0 ? "text-emerald-400" : (isEditing ? ev : v) < 0 ? "text-red-400" : "text-white/75"}`}>
                      {(isEditing ? ev : v) > 0 ? `+${isEditing ? ev : v}` : `${isEditing ? ev : v}`}
                      {hasBonus && <span className="text-[#F3E3CE] text-[9px]">*</span>}
                    </span>
                    {sup && !isEditing && (
                      <span className="text-[8px] font-bold text-amber-300 border border-amber-300/55 bg-amber-300/12 rounded px-0.5 leading-tight">◈</span>
                    )}
                  </div>
                );
              })}
            </button>

            {isEditing && (
              <div className="rounded-lg border border-[#E3CCCD]/20 bg-white/3 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 mb-3">
                  Caractéristiques
                </p>
                <div className="grid grid-cols-7 gap-2">
                  {STATS_KEYS.map((stat) => {
                    const v = editCaract[stat];
                    const sup = editBonusCaract[stat];
                    return (
                      <div
                        key={stat}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg border border-white/10 bg-white/4"
                      >
                        <span className="text-[9px] uppercase tracking-widest text-[#E3CCCD]/50">
                          {stat}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditCaract((prev) => ({
                              ...prev,
                              [stat]: prev[stat] + 1,
                            }))
                          }
                          className="w-7 h-5 rounded text-[12px] border border-white/15 text-white/40 hover:border-[#E3CCCD]/50 hover:text-[#E3CCCD] transition-all leading-none flex items-center justify-center"
                        >
                          +
                        </button>
                        <span
                          className={`font-mono text-sm font-bold tabular-nums ${v > 0 ? "text-emerald-400" : v < 0 ? "text-red-400/70" : "text-white/30"}`}
                        >
                          {v > 0 ? `+${v}` : `${v}`}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditCaract((prev) => ({
                              ...prev,
                              [stat]: prev[stat] - 1,
                            }))
                          }
                          className="w-7 h-5 rounded text-[12px] border border-white/15 text-white/40 hover:border-red-400/40 hover:text-red-400/70 transition-all leading-none flex items-center justify-center"
                        >
                          −
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEditBonusCaract((prev) => ({
                              ...prev,
                              [stat]: !prev[stat],
                            }))
                          }
                          className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider transition-all ${sup ? "border-amber-400/50 bg-amber-400/15 text-amber-400" : "border-white/15 text-white/25 hover:text-white/50 hover:border-white/30"}`}
                        >
                          BONUS
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Voies */}
            {pj.pathways?.length > 0 && (
              <div className="space-y-2 mt-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] uppercase tracking-widest text-[#E3CCCD]/50">
                    Voies
                  </span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setIsEditingVoies(true)}
                      className="flex items-center gap-1 text-[8px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-lg border border-[#E3CCCD]/25 text-white/45 hover:text-white/75 hover:bg-white/5 transition-colors"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      Modifier
                    </button>
                  )}
                </div>
                {(pj.pathways as any[]).map((pathway, i) => {
                  const voie = voieDetails.find((v) => v.id === pathway.voie_id);
                  const maxRang = Math.max(...(pathway.rangs_acquis || [1]));
                  const filteredCapacites = voie?.capacites
                    ? Object.fromEntries(
                        Object.entries(voie.capacites).filter(([key]) => {
                          const rangMatch = key.match(/rang(\d+)/);
                          if (rangMatch) {
                            return parseInt(rangMatch[1], 10) <= maxRang;
                          }
                          return false;
                        }),
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
            pjId={type === "pj" ? pj.id : ""}
            pnjId={type === "pnj" ? pj.id : null}
            profilId={
              pj.stats?.profil_id ||
              voieDetails.find((v) => v.profil_id)?.profil_id
            }
            pjStats={pj.stats}
            readOnly={readOnly || technicalSheetOnly}
            onUpdateStats={async (newStats) => {
              const table = type === "pnj" ? "pnj" : "pj";
              await supabase
                .from(table)
                .update({ stats: newStats })
                .eq("id", pj.id);
            }}
          />
        )}

        {/* ONGLET 3 : LORE */}
        {!isNonCombatantPNJ &&
          activeTab === "lore" &&
          (type === "pnj" ? (
            <div className="flex flex-col gap-6 items-stretch animate-in fade-in duration-200 mt-2">
              <div className="flex-1 space-y-6">
                {isEditing ? (
                  <>
                    <div className="flex flex-col gap-4">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                          Sexe
                        </label>
                        <select
                          value={editSexe}
                          onChange={(e) => setEditSexe(e.target.value)}
                          className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none transition-colors appearance-none cursor-pointer"
                        >
                          <option value="Masculin" className="bg-[#1E1941]">
                            Masculin
                          </option>
                          <option value="Féminin" className="bg-[#1E1941]">
                            Féminin
                          </option>
                          <option value="Autre" className="bg-[#1E1941]">
                            Autre
                          </option>
                        </select>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                          Âge
                        </label>
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
                      <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">
                        Description publique
                      </label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={6}
                        className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-xl p-3.5 text-white text-sm outline-none transition-colors resize-none placeholder:text-white/25 leading-relaxed"
                      />
                    </div>
                    {isMJ && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-[0.15em] text-sky-400/60">
                          Notes du MJ (Secret)
                        </label>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={6}
                          className="w-full bg-sky-500/5 border border-sky-500/20 focus:border-sky-400/50 rounded-xl p-3.5 text-sky-100 text-sm outline-none transition-colors resize-none placeholder:text-sky-200/30 leading-relaxed"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {(pj.stats?.sexe || pj.stats?.age) && (
                      <div className="flex items-center gap-2 text-[12px] text-[#E3CCCD]/60 uppercase tracking-widest font-medium">
                        {pj.stats.sexe}{" "}
                        {pj.stats.age ? ` · ${pj.stats.age}` : ""}
                      </div>
                    )}
                    <div className="space-y-2">
                      <h3 className="font-serif text-xl text-[#E3CCCD]">
                        Description
                      </h3>
                      <div className="bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-xl p-4 text-[13px] leading-relaxed text-white/80 whitespace-pre-wrap shadow-inner min-h-32">
                        {pj.stats?.description || (
                          <span className="text-white/30 italic">
                            Aucune description...
                          </span>
                        )}
                      </div>
                    </div>
                    {isMJ && (
                      <div className="space-y-2">
                        <h3 className="font-serif text-xl text-sky-400">
                          Notes du MJ
                        </h3>
                        <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 text-[13px] leading-relaxed text-sky-100 whitespace-pre-wrap shadow-inner min-h-32">
                          {pj.stats?.notes || (
                            <span className="text-sky-200/40 italic">
                              Aucune note secrète...
                            </span>
                          )}
                        </div>
                      </div>
                    )}
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
          ))}

        {/* ONGLET 4 : FAMILIERS */}
        {!isNonCombatantPNJ && activeTab === "familiers" && (
          <FamilierTab
            pjId={type === "pj" ? pj.id : ""}
            pnjId={type === "pnj" ? pj.id : undefined}
            type={type}
            campaignId={campaignId}
            readOnly={readOnly}
          />
        )}
      </div>

      {/* MODAL PC */}
      {showPcModal && canQuickEdit && createPortal(
        <div className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 pb-8" onClick={() => setShowPcModal(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-emerald-400/25 shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
            style={{ background: "linear-gradient(160deg,rgba(30,25,65,0.97) 0%,rgba(22,40,35,0.97) 100%)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/8">
              <div className="flex items-center gap-2"><Clover className="w-4 h-4 text-emerald-400" /><span className="text-sm font-semibold text-white tracking-wide">Points de Chance</span></div>
              <button onClick={() => setShowPcModal(false)} className="p-1 text-white/40 hover:text-white rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-emerald-200/60">PC actuel / maximum</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-1 rounded-xl border border-white/15 bg-white/6 px-2 py-1.5">
                  <button type="button" onClick={() => setInlinePcCurrent((v) => Math.max(0, v - 1))} className="p-1 text-white/50 hover:text-white"><Minus className="w-3 h-3" /></button>
                  <input type="number" value={inlinePcCurrent} onChange={(e) => setInlinePcCurrent(Math.max(0, parseInt(e.target.value) || 0))} className="flex-1 text-center font-mono text-base font-bold text-white bg-transparent outline-none w-0 min-w-0" />
                  <button type="button" onClick={() => setInlinePcCurrent((v) => v + 1)} className="p-1 text-white/50 hover:text-white"><Plus className="w-3 h-3" /></button>
                </div>
                <span className="text-white/30 text-lg font-light">/</span>
                <div className="flex-1 flex items-center gap-1 rounded-xl border border-white/15 bg-white/6 px-2 py-1.5">
                  <button type="button" onClick={() => setInlinePcMax((v) => Math.max(1, v - 1))} className="p-1 text-white/50 hover:text-white"><Minus className="w-3 h-3" /></button>
                  <input type="number" value={inlinePcMax} onChange={(e) => setInlinePcMax(Math.max(1, parseInt(e.target.value) || 1))} className="flex-1 text-center font-mono text-base font-bold text-white/70 bg-transparent outline-none w-0 min-w-0" />
                  <button type="button" onClick={() => setInlinePcMax((v) => v + 1)} className="p-1 text-white/50 hover:text-white"><Plus className="w-3 h-3" /></button>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${inlinePcMax > 0 ? Math.min(100, Math.round((inlinePcCurrent / inlinePcMax) * 100)) : 0}%` }} />
              </div>
            </div>
            <div className="flex gap-2 px-4 pb-4">
              <button type="button" onClick={() => setShowPcModal(false)} className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/60 text-[12px] font-semibold hover:bg-white/8 transition-colors">Annuler</button>
              <button type="button" disabled={isInlineSaving} onClick={async () => {
                const max = Math.max(inlinePcMax, inlinePcCurrent, 1);
                await saveQuickStats({ pc: Math.min(inlinePcCurrent, max), pc_max: max });
                setShowPcModal(false);
              }} className="flex-2 py-2.5 rounded-xl border border-emerald-400/40 bg-emerald-400/20 text-emerald-100 text-[12px] font-semibold hover:bg-emerald-400/30 transition-colors disabled:opacity-60">Sauvegarder</button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* MODAL PM */}
      {showPmModal && canQuickEdit && createPortal(
        <div className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 pb-8" onClick={() => setShowPmModal(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-violet-400/25 shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
            style={{ background: "linear-gradient(160deg,rgba(30,25,65,0.97) 0%,rgba(30,20,50,0.97) 100%)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/8">
              <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-400" /><span className="text-sm font-semibold text-white tracking-wide">Points de Mana</span></div>
              <button onClick={() => setShowPmModal(false)} className="p-1 text-white/40 hover:text-white rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-violet-200/60">PM actuel / maximum</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-1 rounded-xl border border-white/15 bg-white/6 px-2 py-1.5">
                  <button type="button" onClick={() => setInlinePmCurrent((v) => Math.max(0, v - 1))} className="p-1 text-white/50 hover:text-white"><Minus className="w-3 h-3" /></button>
                  <input type="number" value={inlinePmCurrent} onChange={(e) => setInlinePmCurrent(Math.max(0, parseInt(e.target.value) || 0))} className="flex-1 text-center font-mono text-base font-bold text-white bg-transparent outline-none w-0 min-w-0" />
                  <button type="button" onClick={() => setInlinePmCurrent((v) => v + 1)} className="p-1 text-white/50 hover:text-white"><Plus className="w-3 h-3" /></button>
                </div>
                <span className="text-white/30 text-lg font-light">/</span>
                <div className="flex-1 flex items-center gap-1 rounded-xl border border-white/15 bg-white/6 px-2 py-1.5">
                  <button type="button" onClick={() => setInlinePmMax((v) => Math.max(1, v - 1))} className="p-1 text-white/50 hover:text-white"><Minus className="w-3 h-3" /></button>
                  <input type="number" value={inlinePmMax} onChange={(e) => setInlinePmMax(Math.max(1, parseInt(e.target.value) || 1))} className="flex-1 text-center font-mono text-base font-bold text-white/70 bg-transparent outline-none w-0 min-w-0" />
                  <button type="button" onClick={() => setInlinePmMax((v) => v + 1)} className="p-1 text-white/50 hover:text-white"><Plus className="w-3 h-3" /></button>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${inlinePmMax > 0 ? Math.min(100, Math.round((inlinePmCurrent / inlinePmMax) * 100)) : 0}%` }} />
              </div>
            </div>
            <div className="flex gap-2 px-4 pb-4">
              <button type="button" onClick={() => setShowPmModal(false)} className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/60 text-[12px] font-semibold hover:bg-white/8 transition-colors">Annuler</button>
              <button type="button" disabled={isInlineSaving} onClick={async () => {
                const max = Math.max(inlinePmMax, inlinePmCurrent, 1);
                await saveQuickStats({ pm: Math.min(inlinePmCurrent, max), pm_max: max });
                setShowPmModal(false);
              }} className="flex-2 py-2.5 rounded-xl border border-violet-400/40 bg-violet-400/20 text-violet-100 text-[12px] font-semibold hover:bg-violet-400/30 transition-colors disabled:opacity-60">Sauvegarder</button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* MODAL CARACTÉRISTIQUES */}
      {showCaractModal && canQuickEdit && createPortal(
        <div className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 pb-8" onClick={() => setShowCaractModal(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-[#E3CCCD]/20 shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
            style={{ background: "linear-gradient(160deg,rgba(30,25,65,0.97) 0%,rgba(36,27,89,0.97) 100%)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/8">
              <span className="text-sm font-semibold text-white tracking-wide font-serif">Caractéristiques</span>
              <button onClick={() => setShowCaractModal(false)} className="p-1 text-white/40 hover:text-white rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 grid grid-cols-4 gap-2">
              {STATS_KEYS.map((stat) => {
                const v = inlineCaract[stat] ?? 0;
                const bonus = inlineBonusCaract[stat] ?? false;
                return (
                  <div key={stat} className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/4 p-2">
                    <span className="text-[9px] uppercase tracking-widest text-[#E3CCCD]/60">{stat}</span>
                    <button type="button" onClick={() => setInlineCaract((prev) => ({ ...prev, [stat]: prev[stat] + 1 }))}
                      className="w-full h-5 rounded border border-white/15 text-white/50 hover:text-white hover:border-[#E3CCCD]/50 text-xs transition-colors">+</button>
                    <span className={`font-mono text-base font-bold leading-none tabular-nums ${v > 0 ? "text-emerald-400" : v < 0 ? "text-red-400/80" : "text-white/60"}`}>
                      {v > 0 ? `+${v}` : `${v}`}
                    </span>
                    <button type="button" onClick={() => setInlineCaract((prev) => ({ ...prev, [stat]: prev[stat] - 1 }))}
                      className="w-full h-5 rounded border border-white/15 text-white/50 hover:text-red-400/70 hover:border-red-400/40 text-xs transition-colors">−</button>
                    <button type="button" onClick={() => setInlineBonusCaract((prev) => ({ ...prev, [stat]: !prev[stat] }))}
                      title="Bonus de race/profil"
                      className={`text-[9px]  border rounded px-1 leading-tight transition-colors ${bonus ? "text-amber-300 border-amber-300/55 bg-amber-300/12" : "text-white/50 border-white/10"}`}>Bonus</button>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 px-4 pb-4">
              <button type="button" onClick={() => setShowCaractModal(false)} className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/60 text-[12px] font-semibold hover:bg-white/8 transition-colors">Annuler</button>
              <button type="button" disabled={isInlineSaving} onClick={async () => {
                const newCaract = { ...inlineCaract };
                const newBonus = { ...inlineBonusCaract };
                const niveau = Number(pj.stats?.niveau ?? 1);
                const derived = getDerivedAttacks(niveau, newCaract as Record<string, number>);
                await saveQuickStats({
                  caracteristiques: newCaract,
                  bonus_caracteristiques: newBonus,
                  att_contact: derived.contact,
                  att_distance: derived.distance,
                  att_magie: derived.magie,
                });
                setShowCaractModal(false);
              }} className="flex-2 py-2.5 rounded-xl border border-[#E3CCCD]/30 bg-[#E3CCCD]/12 text-[#E3CCCD] text-[12px] font-semibold hover:bg-[#E3CCCD]/20 transition-colors disabled:opacity-60">Sauvegarder</button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* MODAL STATS COMBAT */}
      {showCombatModal && canQuickEdit && createPortal(
        <div className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 pb-8" onClick={() => setShowCombatModal(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
            style={{ background: "linear-gradient(160deg,rgba(30,25,65,0.97) 0%,rgba(25,30,50,0.97) 100%)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/8">
              <div className="flex items-center gap-2"><Sword className="w-4 h-4 text-orange-400/80" /><span className="text-sm font-semibold text-white tracking-wide">Stats de combat</span></div>
              <button onClick={() => setShowCombatModal(false)} className="p-1 text-white/40 hover:text-white rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {([
                { label: "Initiative", value: inlineInit, set: setInlineInit, icon: <Zap className="w-3.5 h-3.5 text-yellow-400/80" /> },
                { label: "Défense", value: inlineDef, set: setInlineDef, icon: <Shield className="w-3.5 h-3.5 text-sky-400/80" /> },
                { label: "Contact", value: inlineAttContact, set: setInlineAttContact, icon: <Sword className="w-3.5 h-3.5 text-orange-400/80" /> },
                { label: "Distance", value: inlineAttDistance, set: setInlineAttDistance, icon: <Target className="w-3.5 h-3.5 text-orange-400/80" /> },
                { label: "Magie", value: inlineAttMagie, set: setInlineAttMagie, icon: <Wand2 className="w-3.5 h-3.5 text-violet-400/80" /> },
              ] as { label: string; value: number; set: (v: number) => void; icon: React.ReactNode }[]).map(({ label, value, set, icon }) => (
                <div key={label} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/50">{icon}{label}</div>
                  <div className="flex items-center gap-1 rounded-xl border border-white/15 bg-white/6 px-2 py-1.5">
                    <button type="button" onClick={() => set(value - 1)} className="p-1 text-white/50 hover:text-white"><Minus className="w-3 h-3" /></button>
                    <input type="number" value={value} onChange={(e) => set(parseInt(e.target.value) || 0)} className="flex-1 text-center font-mono text-base font-bold text-white bg-transparent outline-none w-0 min-w-0" />
                    <button type="button" onClick={() => set(value + 1)} className="p-1 text-white/50 hover:text-white"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 px-4 pb-4">
              <button type="button" onClick={() => setShowCombatModal(false)} className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/60 text-[12px] font-semibold hover:bg-white/8 transition-colors">Annuler</button>
              <button type="button" disabled={isInlineSaving} onClick={async () => {
                await saveQuickStats({ initiative: inlineInit, defense: inlineDef, att_contact: inlineAttContact, att_distance: inlineAttDistance, att_magie: inlineAttMagie });
                setShowCombatModal(false);
              }} className="flex-2 py-2.5 rounded-xl border border-white/20 bg-white/10 text-white text-[12px] font-semibold hover:bg-white/18 transition-colors disabled:opacity-60">Sauvegarder</button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* TOAST REPOS LONG */}
      {showRestToast && createPortal(
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-9999 pointer-events-none animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-400/40 bg-[#0f2e22]/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] px-4 py-3">
            <RefreshCw className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[13px] font-semibold text-emerald-100 whitespace-nowrap">Repos long — PV, PC &amp; PM restaurés</span>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL PV */}
      {showPvModal && canQuickEdit && createPortal(
        <div className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 pb-8" onClick={() => setShowPvModal(false)}>
          <div
            className="w-full max-w-sm rounded-2xl border border-emerald-400/25 shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
            style={{ background: "linear-gradient(160deg,rgba(30,25,65,0.97) 0%,rgba(22,40,35,0.97) 100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white tracking-wide">Points de Vie</span>
              </div>
              <button onClick={() => setShowPvModal(false)} className="p-1 text-white/40 hover:text-white rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* PV current / max */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-emerald-200/60">PV actuel / maximum</p>
                <div className="flex items-center gap-3">
                  {/* PV actuel */}
                  <div className="flex-1 flex items-center gap-1 rounded-xl border border-white/15 bg-white/6 px-2 py-1.5">
                    <button type="button" onClick={() => setInlinePvCurrent((v) => Math.max(0, v - 1))} className="p-1 text-white/50 hover:text-white"><Minus className="w-3 h-3" /></button>
                    <input
                      type="number"
                      value={inlinePvCurrent}
                      onChange={(e) => setInlinePvCurrent(Math.max(0, parseInt(e.target.value) || 0))}
                      className="flex-1 text-center font-mono text-base font-bold text-white bg-transparent outline-none w-0 min-w-0"
                    />
                    <button type="button" onClick={() => setInlinePvCurrent((v) => v + 1)} className="p-1 text-white/50 hover:text-white"><Plus className="w-3 h-3" /></button>
                  </div>
                  <span className="text-white/30 text-lg font-light">/</span>
                  {/* PV max */}
                  <div className="flex-1 flex items-center gap-1 rounded-xl border border-white/15 bg-white/6 px-2 py-1.5">
                    <button type="button" onClick={() => setInlinePvMax((v) => Math.max(1, v - 1))} className="p-1 text-white/50 hover:text-white"><Minus className="w-3 h-3" /></button>
                    <input
                      type="number"
                      value={inlinePvMax}
                      onChange={(e) => setInlinePvMax(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 text-center font-mono text-base font-bold text-white/70 bg-transparent outline-none w-0 min-w-0"
                    />
                    <button type="button" onClick={() => setInlinePvMax((v) => v + 1)} className="p-1 text-white/50 hover:text-white"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
                {/* barre de prévisualisation */}
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all"
                    style={{ width: `${inlinePvMax > 0 ? Math.min(100, Math.round((inlinePvCurrent / inlinePvMax) * 100)) : 0}%` }}
                  />
                </div>
              </div>

              {/* Dés de récupération */}
              <div className="space-y-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] uppercase tracking-widest text-emerald-200/70">Dés de récupération</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-emerald-300">
                    {inlineDrQty}×{pj.stats?.dr_de ?? "d6"}
                  </span>
                </div>

                {lastDiceRoll !== null && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-400/15 border border-emerald-400/30 px-3 py-2">
                    <Dices className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span className="text-sm font-bold text-emerald-200">+{lastDiceRoll} PV récupérés</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={inlineDrQty <= 0}
                    onClick={() => {
                      const dieStr = pj.stats?.dr_de ?? "d6";
                      const sides = parseInt(dieStr.replace(/[^0-9]/g, "")) || 6;
                      const roll = Math.ceil(Math.random() * sides);
                      setLastDiceRoll(roll);
                      setInlinePvCurrent((v) => Math.min(v + roll, inlinePvMax));
                      setInlineDrQty((q) => Math.max(0, q - 1));
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-400/15 text-emerald-200 text-[11px] font-semibold py-2 hover:bg-emerald-400/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    Utiliser un dé
                  </button>
                  <button
                    type="button"
                    onClick={() => setInlineDrQty((q) => q + 1)}
                    className="flex items-center justify-center gap-1 rounded-lg border border-white/20 bg-white/6 text-white/70 text-[11px] font-semibold px-3 py-2 hover:bg-white/12 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-4 pb-4">
              <button
                type="button"
                onClick={() => setShowPvModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/60 text-[12px] font-semibold hover:bg-white/8 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isInlineSaving}
                onClick={async () => {
                  const normalizedPvMax = Math.max(inlinePvMax, inlinePvCurrent, 1);
                  const normalizedPv = Math.min(Math.max(inlinePvCurrent, 0), normalizedPvMax);
                  await saveQuickStats({ pv: normalizedPv, pv_max: normalizedPvMax, dr_qty: inlineDrQty });
                  setShowPvModal(false);
                }}
                className="flex-2 py-2.5 rounded-xl border border-emerald-400/40 bg-emerald-400/20 text-emerald-100 text-[12px] font-semibold hover:bg-emerald-400/30 transition-colors disabled:opacity-60"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
