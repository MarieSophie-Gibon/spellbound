/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { ArrowUpCircle, X, Plus, Star, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VoieDetail {
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

interface VoieCapacite {
  nom?: string;
  type?: string;
  description?: string;
}

interface LevelUpOverlayProps {
  pj: any;
  targetLevel: number;
  pointsRemaining: number;
  pendingRanks: { voie_id: string; rang: number }[];
  setPendingRanks: (ranks: { voie_id: string; rang: number }[]) => void;
  voieDetails: VoieDetail[];
  allVoies: VoieDetail[];
  handleSaveLevelUp: () => void;
  setIsLevelingUp: (val: boolean) => void;
}

const getBaseCost = (rang: number) => (rang <= 2 ? 1 : 2);

const isPrestigeVoie = (voie?: VoieDetail | null) =>
  (voie?.type || "").toLowerCase() === "prestige";

const getDisplayedRank = (storedRank: number, voie?: VoieDetail | null) =>
  isPrestigeVoie(voie) ? storedRank + 3 : storedRank;

const getCostForRank = (storedRank: number, voie?: VoieDetail | null) =>
  isPrestigeVoie(voie) ? 2 : getBaseCost(storedRank);

const isLevelLocked = (
  storedRank: number,
  newLevel: number,
  voie?: VoieDetail | null,
) => {
  if (isPrestigeVoie(voie)) return newLevel <= 5;
  if (storedRank === 4 && newLevel < 5) return true;
  if (storedRank === 5 && newLevel < 7) return true;
  return false;
};

const getCapacitesObject = (voie: VoieDetail): Record<string, VoieCapacite> => {
  if (typeof voie.capacites === "string") {
    try {
      return JSON.parse(voie.capacites) as Record<string, VoieCapacite>;
    } catch {
      return {};
    }
  }
  return (voie.capacites as Record<string, VoieCapacite>) || {};
};

const getRankCapacite = (voie: VoieDetail, rang: number): VoieCapacite | null => {
  const caps = getCapacitesObject(voie);
  const cap = caps[`rang${rang}`];
  if (!cap || (!cap.nom && !cap.description)) return null;
  return cap;
};

// Fonction utilitaire pour identifier si une voie est la "Voie de la Magie"
const isMageVoie = (v?: VoieDetail | null) => {
  if (!v) return false;
  const nom = v.nom.toLowerCase();
  return nom.includes("magie") || nom.includes("mage");
};

export default function LevelUpOverlay({
  pj,
  targetLevel,
  pointsRemaining,
  pendingRanks,
  setPendingRanks,
  voieDetails,
  allVoies,
  handleSaveLevelUp,
  setIsLevelingUp,
}: LevelUpOverlayProps) {
  const [unlockType, setUnlockType] = useState<
    "profile" | "ownProfile" | "prestige" | ""
  >("");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");

  useEffect(() => {
    supabase
      .from("profils")
      .select("id, nom")
      .order("nom")
      .then(({ data }) => {
        if (data) setProfiles(data);
      });
  }, []);

  // On vérifie si le joueur possède la voie de Magie
  const hasMagePath = (pj.pathways || []).some((p: any) => {
    const v = allVoies.find((av) => av.id === p.voie_id) || voieDetails.find((vd) => vd.id === p.voie_id);
    return isMageVoie(v);
  });

  const currentProfileId =
    pj?.stats?.profil_id ||
    voieDetails.find((v) => v.profil_id)?.profil_id ||
    allVoies.find((v) =>
      ((pj.pathways as any[]) || []).some((p: any) => p.voie_id === v.id) && !!v.profil_id,
    )?.profil_id;

  const ownedVoieIds = new Set(((pj.pathways as any[]) || []).map((p) => p.voie_id));
  const pendingNewVoieIds = new Set(pendingRanks.map((pr: any) => pr.voie_id));
  const getNextRankForVoieId = (voieId: string) => {
    const existingPath = ((pj.pathways as any[]) || []).find((p: any) => p.voie_id === voieId);
    const baseRanks = existingPath?.rangs_acquis || [];
    const pendingForThisPath = pendingRanks
      .filter((pr: any) => pr.voie_id === voieId)
      .map((pr: any) => pr.rang);
    const allRanks = [...baseRanks, ...pendingForThisPath];
    return allRanks.length > 0 ? Math.max(...allRanks) + 1 : 1;
  };
  const pathwaysForUpgrade = [
    ...((pj.pathways as any[]) || []),
    ...Array.from(pendingNewVoieIds)
      .filter((voieId) => !ownedVoieIds.has(voieId))
      .map((voieId) => ({ voie_id: voieId, rangs_acquis: [] })),
  ].sort((a, b) => {
    const aPending = pendingNewVoieIds.has(a.voie_id) ? 1 : 0;
    const bPending = pendingNewVoieIds.has(b.voie_id) ? 1 : 0;
    return bPending - aPending;
  });

  // Filtrage scindé des nouvelles voies
  const filteredAvailableVoies = allVoies.filter((v: VoieDetail) => {
    if (ownedVoieIds.has(v.id)) return false;

    // Une voie de peuple ne peut plus être débloquée via le level up.
    if (v.peuple_id) return false;

    // Les voies de prestige ne sont proposées que via l'onglet prestige,
    // et uniquement après avoir atteint le niveau 5.
    if (isPrestigeVoie(v)) {
      if (unlockType !== "prestige") return false;
      if (targetLevel <= 5) return false;
    }

    if (unlockType === "prestige") return v.type === "prestige" && targetLevel > 5;
    if (unlockType === "ownProfile") return !!currentProfileId && v.profil_id === currentProfileId;
    if (unlockType === "profile") return v.profil_id === selectedProfileId;
    return false;
  });

  return (
    <div className="absolute inset-0 z-50 bg-[#1E1941]/95 backdrop-blur-xl flex flex-col p-6 animate-in fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-3xl text-white tracking-wider flex items-center gap-3">
            <ArrowUpCircle className="w-8 h-8 text-[#E3CCCD]" /> Passage au
            Niveau {targetLevel}
          </h2>
          <p className="text-white/50 text-sm mt-1">
            Dépensez vos 2 points de capacité.
          </p>
        </div>
        <button
          onClick={() => {
            setIsLevelingUp(false);
            setPendingRanks([]);
          }}
          className="p-2 text-white/40 hover:text-white transition-colors bg-white/5 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-black/30 border border-white/10 rounded-xl p-4 mb-6 flex items-center justify-between">
        <span className="text-white/70 uppercase tracking-widest text-xs font-bold">
          Points disponibles
        </span>
        <span
          className={`text-3xl font-mono font-bold ${pointsRemaining === 0 ? "text-emerald-400" : "text-[#E3CCCD]"}`}
        >
          {pointsRemaining}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-white/10">
        {/* Liste des Voies possédées */}
        {pathwaysForUpgrade.map((pathway, i) => {
          const voie =
            voieDetails.find((v: any) => v.id === pathway.voie_id) ||
            allVoies.find((v) => v.id === pathway.voie_id);
          if (!voie) return null;
          
          const baseRanks = pathway.rangs_acquis || [];
          const pendingForThisPath = pendingRanks
            .filter((pr: any) => pr.voie_id === pathway.voie_id)
            .map((pr: any) => pr.rang);
          
          const nextRank =
            [...baseRanks, ...pendingForThisPath].length > 0
              ? Math.max(...baseRanks, ...pendingForThisPath) + 1
              : 1;
          
          if (nextRank > 5) return null;

          const cost = getCostForRank(nextRank, voie);
          const isLocked = isLevelLocked(nextRank, targetLevel, voie);
          const displayedRank = getDisplayedRank(nextRank, voie);
          
          // La restriction s'applique si le joueur a la voie du mage ET que la voie actuelle est une voie de peuple (qui n'est PAS la voie du Mage)
          const isPeuplePathBlockedByMage = hasMagePath && !!voie.peuple_id && !isMageVoie(voie);
          const nextRankCapacite = getRankCapacite(voie, nextRank);

          return (
            <div
              key={`${pathway.voie_id}-${nextRank}-${i}`}
              className={`border rounded-xl p-4 flex flex-col gap-2 ${isPeuplePathBlockedByMage ? "bg-black/20 border-white/5" : "bg-white/5 border-white/10"}`}
            >
              <div className="flex justify-between items-center">
                <span className={`text-sm font-semibold ${isPeuplePathBlockedByMage ? "text-white/40" : "text-white/90"}`}>
                  {voie.nom} — Rang {displayedRank}
                </span>
                <span className={`text-[10px] border rounded-full px-2 py-0.5 ${isPeuplePathBlockedByMage ? "text-white/20 border-white/10" : "text-[#E3CCCD] border-[#E3CCCD]/30"}`}>
                  Coût : {cost} pt{cost > 1 ? "s" : ""}
                </span>
              </div>
              {nextRankCapacite && (
                <div className={`rounded-lg border px-3 py-2 ${isPeuplePathBlockedByMage ? "bg-black/20 border-white/5" : "bg-black/20 border-white/10"}`}>
                  <p className={`text-xs font-semibold ${isPeuplePathBlockedByMage ? "text-white/35" : "text-[#E3CCCD]/90"}`}>
                    {nextRankCapacite.nom || `Capacité de rang ${displayedRank}`}
                    {nextRankCapacite.type ? <span className="text-white/40 font-normal"> ({nextRankCapacite.type})</span> : null}
                  </p>
                  {nextRankCapacite.description && (
                    <p className={`text-[11px] leading-relaxed mt-1 ${isPeuplePathBlockedByMage ? "text-white/30" : "text-white/60"}`}>
                      {nextRankCapacite.description}
                    </p>
                  )}
                </div>
              )}
              {isPeuplePathBlockedByMage ? (
                 <p className="text-xs text-violet-400/50 italic">
                  Évolution verrouillée (Voie de la Magie active).
                 </p>
              ) : isLocked ? (
                <p className="text-xs text-red-400/70 italic">
                  {isPrestigeVoie(voie)
                    ? "Les voies de prestige sont accessibles à partir du niveau 5."
                    : `Niveau insuffisant (Rang ${displayedRank} requiert niv. ${nextRank === 4 ? 5 : 7}).`}
                </p>
              ) : (
                <button
                  disabled={pointsRemaining < cost}
                  onClick={() =>
                    setPendingRanks((prev) => [
                      ...prev,
                      { voie_id: pathway.voie_id, rang: nextRank },
                    ])
                  }
                  className="self-end flex items-center gap-1 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs rounded-lg disabled:opacity-30"
                >
                  <Plus className="w-3 h-3" /> Acquérir
                </button>
              )}
            </div>
          );
        })}

        {/* Débloquer une nouvelle voie */}
        <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
          <h3 className="text-sm font-serif text-white/90 flex items-center gap-2">
            <Star className="w-4 h-4 text-[#E3CCCD]" /> Débloquer une nouvelle
            Voie
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { key: "ownProfile", label: "Profil" },
              { key: "profile", label: "Autre Profil" },
              ...(targetLevel > 5 ? [{ key: "prestige", label: "Prestige" }] : []),
            ].map((b) => (
              <button
                key={b.key}
                onClick={() => {
                  setUnlockType(b.key as any);
                  setSelectedProfileId("");
                }}
                disabled={b.key === "ownProfile" && !currentProfileId}
                className={`py-2 rounded-xl text-xs font-medium border border-white/10 transition-all ${unlockType === b.key ? "bg-[#E3CCCD]/20 border-[#E3CCCD]/50 text-[#E3CCCD]" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
              >
                {b.label}
              </button>
            ))}
          </div>

          {unlockType === "ownProfile" && !currentProfileId && (
            <p className="text-xs text-white/40 italic">
              Aucun profil principal détecté pour ce personnage.
            </p>
          )}

          {unlockType === "profile" && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-[#E3CCCD]/60">
                Sélectionner le profil d'hybridation
              </p>
              <Select value={selectedProfileId || "__none__"} onValueChange={(v) => setSelectedProfileId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="w-full h-11 bg-[#120D2F]/70 border border-[#E3CCCD]/30 rounded-xl text-[#E3CCCD] text-sm shadow-inner shadow-black/30 data-placeholder:text-[#E3CCCD]/45 focus:border-[#E3CCCD]/70 focus:ring-2 focus:ring-[#E3CCCD]/20 transition-all">
                  <SelectValue placeholder="Choisir un profil..." />
                </SelectTrigger>
                <SelectContent className="z-60 bg-[#120D2F]/95 border border-[#E3CCCD]/30 rounded-xl text-white shadow-2xl shadow-black/50">
                  <SelectItem
                    value="__none__"
                    className="text-white/45 data-highlighted:bg-white/10 data-highlighted:text-white"
                  >
                    -- Sélectionner le profil d'hybridation --
                  </SelectItem>
                  {profiles.map((p) => (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                      className="data-highlighted:bg-[#E3CCCD]/20 data-highlighted:text-[#E3CCCD] data-[state=checked]:bg-[#E3CCCD]/15"
                    >
                      {p.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {unlockType === "prestige" && targetLevel <= 5 && (
            <p className="text-xs text-red-400/70 italic">
              Les voies de prestige sont disponibles après avoir atteint le niveau 5.
            </p>
          )}

          {((unlockType === "ownProfile" && !!currentProfileId) ||
            (unlockType === "profile" && selectedProfileId) ||
            unlockType === "prestige") && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-white/40">
                Voies disponibles :
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredAvailableVoies.map((v) => (
                  (() => {
                    const nextRank = getNextRankForVoieId(v.id);
                    if (nextRank > 5) return null;
                    const rankCapacite = getRankCapacite(v, nextRank);
                    const unlockCost = getCostForRank(nextRank, v);
                    const displayedRank = getDisplayedRank(nextRank, v);
                    const isLocked = isLevelLocked(nextRank, targetLevel, v);
                    return (
                  <button
                    key={v.id}
                    disabled={pointsRemaining < unlockCost || isLocked}
                    onClick={() => {
                      setPendingRanks((prev) => {
                        const alreadyPicked = prev.some(
                          (item: any) => item.voie_id === v.id && item.rang === nextRank,
                        );
                        if (alreadyPicked) return prev;
                        return [...prev, { voie_id: v.id, rang: nextRank }];
                      });
                    }}
                    className="flex justify-between items-center p-3 bg-white/5 hover:bg-[#E3CCCD]/10 border border-white/10 rounded-xl text-left text-xs text-white transition-all disabled:opacity-30"
                  >
                    <span className="min-w-0 pr-2">
                      <span className="block">
                        {v.nom} (Rang {displayedRank}) - Coût {unlockCost} pt{unlockCost > 1 ? "s" : ""}
                      </span>
                      {rankCapacite?.nom && (
                        <span className="block text-[11px] text-white/50 truncate">
                          {rankCapacite.nom}
                        </span>
                      )}
                      {rankCapacite?.description && (
                        <span className="block text-[10px] text-white/40 leading-relaxed line-clamp-2 mt-0.5">
                          {rankCapacite.description}
                        </span>
                      )}
                      {isLocked && (
                        <span className="block text-[10px] text-red-400/70 mt-0.5">
                          {isPrestigeVoie(v)
                            ? "Débloquée après le niveau 5."
                            : `Niveau insuffisant pour le rang ${displayedRank}.`}
                        </span>
                      )}
                    </span>
                    <Plus className="w-3.5 h-3.5 text-[#E3CCCD]" />
                  </button>
                    );
                  })()
                ))}
                {filteredAvailableVoies.length === 0 && (
                  <p className="text-white/30 text-xs italic">
                    Aucune voie disponible.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Résumé des modifications */}
        {pendingRanks.length > 0 && (
          <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              Acquisitions en attente :
            </p>
            {pendingRanks.map((pr: any, idx: number) => {
              const v =
                allVoies.find((x) => x.id === pr.voie_id) ||
                voieDetails.find((x) => x.id === pr.voie_id);
              const displayedRank = getDisplayedRank(pr.rang, v);
              return (
                <div
                  key={idx}
                  className="flex justify-between items-center bg-[#E3CCCD]/10 border border-[#E3CCCD]/30 rounded-lg p-2 text-xs text-white"
                >
                  <span>
                    {v?.nom} — Rang {displayedRank}
                  </span>
                  <button
                    onClick={() =>
                      setPendingRanks(
                        pendingRanks.filter((_: any, i: number) => i !== idx),
                      )
                    }
                    className="text-red-400 hover:text-red-300"
                  >
                    Annuler
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="shrink-0 pt-4 border-t border-white/10 flex justify-end">
        <button
          disabled={pointsRemaining !== 0}
          onClick={handleSaveLevelUp}
          className="px-6 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 font-bold rounded-xl disabled:opacity-30 flex items-center gap-2"
        >
          <Check className="w-4 h-4" /> Confirmer le Niveau {targetLevel}
        </button>
      </div>
    </div>
  );
}