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

const getCost = (rang: number) => (rang <= 2 ? 1 : 2);

const isLevelLocked = (rang: number, newLevel: number) => {
  if (rang === 4 && newLevel < 5) return true;
  if (rang === 5 && newLevel < 7) return true;
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
    "profile" | "ownProfile" | "prestige" | "peuple" | ""
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

  // On récupère le peuple "d'origine" (en excluant le faux peuple Mage) pour gérer les restrictions d'achat
  const currentPeupleId = pj.pathways
    ?.map((p: any) => allVoies.find((v: any) => v.id === p.voie_id) || voieDetails.find((vd) => vd.id === p.voie_id))
    ?.find((v: any) => v?.peuple_id && !isMageVoie(v))?.peuple_id;

  const currentProfileId =
    pj?.stats?.profil_id ||
    voieDetails.find((v) => v.profil_id)?.profil_id ||
    allVoies.find((v) =>
      ((pj.pathways as any[]) || []).some((p: any) => p.voie_id === v.id) && !!v.profil_id,
    )?.profil_id;

  const ownedVoieIds = new Set(
    ((pj.pathways as any[]) || []).map((p) => p.voie_id),
  );
  const pendingNewVoieIds = new Set(pendingRanks.map((pr: any) => pr.voie_id));

  // Filtrage scindé des nouvelles voies
  const filteredAvailableVoies = allVoies.filter((v: VoieDetail) => {
    if (ownedVoieIds.has(v.id) || pendingNewVoieIds.has(v.id)) return false;

    // Bloquer si une autre voie de peuple est déjà sélectionnée
    if (v.peuple_id && currentPeupleId && v.peuple_id !== currentPeupleId)
      return false;

    if (unlockType === "peuple") return !!v.peuple_id;
    if (unlockType === "prestige") return v.type === "prestige";
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
        {(pj.pathways as any[]).map((pathway, i) => {
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

          const cost = getCost(nextRank);
          const isLocked = isLevelLocked(nextRank, targetLevel);
          
          // La restriction s'applique si le joueur a la voie du mage ET que la voie actuelle est une voie de peuple (qui n'est PAS la voie du Mage)
          const isPeuplePathBlockedByMage = hasMagePath && !!voie.peuple_id && !isMageVoie(voie);
          const nextRankCapacite = getRankCapacite(voie, nextRank);

          return (
            <div
              key={i}
              className={`border rounded-xl p-4 flex flex-col gap-2 ${isPeuplePathBlockedByMage ? "bg-black/20 border-white/5" : "bg-white/5 border-white/10"}`}
            >
              <div className="flex justify-between items-center">
                <span className={`text-sm font-semibold ${isPeuplePathBlockedByMage ? "text-white/40" : "text-white/90"}`}>
                  {voie.nom} — Rang {nextRank}
                </span>
                <span className={`text-[10px] border rounded-full px-2 py-0.5 ${isPeuplePathBlockedByMage ? "text-white/20 border-white/10" : "text-[#E3CCCD] border-[#E3CCCD]/30"}`}>
                  Coût : {cost} pt{cost > 1 ? "s" : ""}
                </span>
              </div>
              {nextRankCapacite && (
                <div className={`rounded-lg border px-3 py-2 ${isPeuplePathBlockedByMage ? "bg-black/20 border-white/5" : "bg-black/20 border-white/10"}`}>
                  <p className={`text-xs font-semibold ${isPeuplePathBlockedByMage ? "text-white/35" : "text-[#E3CCCD]/90"}`}>
                    {nextRankCapacite.nom || `Capacité de rang ${nextRank}`}
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
                  Niveau insuffisant (Rang {nextRank} requiert niv.{" "}
                  {nextRank === 4 ? 5 : 7}).
                </p>
              ) : (
                <button
                  disabled={pointsRemaining < cost}
                  onClick={() =>
                    setPendingRanks([
                      ...pendingRanks,
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { key: "ownProfile", label: "Profil" },
              { key: "profile", label: "Autre Profil" },
              { key: "prestige", label: "Prestige" },
              { key: "peuple", label: "Voie du Peuple" },
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

          {((unlockType === "ownProfile" && !!currentProfileId) ||
            (unlockType === "profile" && selectedProfileId) ||
            unlockType === "prestige" ||
            unlockType === "peuple") && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-white/40">
                Voies disponibles :
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredAvailableVoies.map((v) => (
                  (() => {
                    const rank1Capacite = getRankCapacite(v, 1);
                    return (
                  <button
                    key={v.id}
                    disabled={pointsRemaining < 1}
                    onClick={() => {
                      setPendingRanks([
                        ...pendingRanks,
                        { voie_id: v.id, rang: 1 },
                      ]);
                      setUnlockType("");
                    }}
                    className="flex justify-between items-center p-3 bg-white/5 hover:bg-[#E3CCCD]/10 border border-white/10 rounded-xl text-left text-xs text-white transition-all disabled:opacity-30"
                  >
                    <span className="min-w-0 pr-2">
                      <span className="block">{v.nom} (Rang 1)</span>
                      {rank1Capacite?.nom && (
                        <span className="block text-[11px] text-white/50 truncate">
                          {rank1Capacite.nom}
                        </span>
                      )}
                      {rank1Capacite?.description && (
                        <span className="block text-[10px] text-white/40 leading-relaxed line-clamp-2 mt-0.5">
                          {rank1Capacite.description}
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
                    Aucune voie disponible ou restriction de peuple active.
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
              return (
                <div
                  key={idx}
                  className="flex justify-between items-center bg-[#E3CCCD]/10 border border-[#E3CCCD]/30 rounded-lg p-2 text-xs text-white"
                >
                  <span>
                    {v?.nom} — Rang {pr.rang}
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