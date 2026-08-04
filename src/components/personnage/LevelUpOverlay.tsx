/* eslint-disable @typescript-eslint/no-explicit-any */
import { ArrowUpCircle, X, Star, Check, ChevronDown, ChevronUp } from "lucide-react";
import {
  getCostForRank,
  getDisplayedRank,
  getRankCapacite,
  getCapacitesObject,
  isLevelLocked,
  isMageVoie,
  isPrestigeVoie,
  useLevelUp,
  type VoieDetail,
} from "@/hooks/personnage/useLevelUp";
import { hasRangContent, normalizeVoieRang } from "@/lib/voieRanks";
import { RangCard } from "@/components/ui/RangCard";

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
  const {
    unlockType,
    setUnlockType,
    expandedRankDescriptions,
    hasMagePath,
    currentProfileId,
    pathwaysForUpgrade,
    filteredAvailableVoies,
    isPendingRank,
    togglePendingRank,
    canSelectUnlockRank,
    togglePendingUnlockRank,
    canShowUnlockList,
    unlockOptions,
    groupedOtherProfileVoies,
    groupedHybridVoies,
    toggleRankDescription,
    isProfileGroupCollapsed,
    toggleProfileGroup,
    getUnlockRanksForVoieId,
  } = useLevelUp({
    pj,
    targetLevel,
    pendingRanks,
    setPendingRanks,
    voieDetails,
    allVoies,
  });

  return (
    <div className="absolute inset-0 z-50 bg-linear-to-b from-[#3A2F72]/90 to-[#201A47]/88 backdrop-blur-lg flex flex-col animate-in fade-in">
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/16 bg-white/8 shrink-0">
        <div>
          <h2 className="font-serif text-xl text-white tracking-wider flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-[#E3CCCD]" /> Passage au Niveau {targetLevel}
          </h2>
        </div>
        <button
          onClick={() => {
            setIsLevelingUp(false);
            setPendingRanks([]);
          }}
          className="p-2 text-white/45 hover:text-white transition-colors bg-white/7 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 p-4 space-y-3">
        <div className="bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 flex items-center justify-between">
          <span className="text-white/70 uppercase tracking-widest text-xs font-bold">
            Points disponibles
          </span>
          <span
            className={`text-2xl leading-none font-mono font-bold ${pointsRemaining === 0 ? "text-emerald-400" : pointsRemaining < 0 ? "text-red-400" : "text-[#E3CCCD]"}`}
          >
            {pointsRemaining}
          </span>
        </div>
        {pointsRemaining < 0 && (
          <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
            Attention: vous avez dépassé le nombre de points de compétence disponibles ({Math.abs(pointsRemaining)} point{Math.abs(pointsRemaining) > 1 ? "s" : ""} en trop). La sauvegarde reste autorisée.
          </div>
        )}
        {pathwaysForUpgrade.map((pathway, i) => {
          const voie =
            voieDetails.find((v: any) => v.id === pathway.voie_id) ||
            allVoies.find((v) => v.id === pathway.voie_id);
          if (!voie) return null;
          
          const baseRanks = pathway.rangs_acquis || [];
          const pendingForThisPath = pendingRanks
            .filter((pr: any) => pr.voie_id === pathway.voie_id)
            .map((pr: any) => pr.rang);
          
          const nextBaseRank = baseRanks.length > 0 ? Math.max(...baseRanks) + 1 : 1;
          const selectedPendingRank = pendingForThisPath[pendingForThisPath.length - 1] ?? null;
          const nextRank = selectedPendingRank ?? nextBaseRank;

          if (nextRank > 5) return null;

          const cost = getCostForRank(nextRank, voie);
          const isLocked = isLevelLocked(nextRank, targetLevel, voie);
          const displayedRank = getDisplayedRank(nextRank, voie);
          const isPeuplePathBlockedByMage = hasMagePath && !!voie.peuple_id && !isMageVoie(voie);
          const nextRankCapacite = getRankCapacite(voie, nextRank);
          const normalizedRang = normalizeVoieRang(getCapacitesObject(voie)[`rang${nextRank}`]);
          const hasContent = hasRangContent(normalizedRang);
          const isPending = isPendingRank(pathway.voie_id, nextRank);
          const isUnavailable = !isPending && (isPeuplePathBlockedByMage || isLocked);
          const rankDescKey = `${pathway.voie_id}-${nextRank}`;
          const isRankDescriptionExpanded = !!expandedRankDescriptions[rankDescKey];
          const capName = nextRankCapacite?.nom || `Capacité de rang ${displayedRank}`;

          return (
            <div
              key={`${pathway.voie_id}-${nextRank}-${i}`}
              className={`rounded-xl border p-4 space-y-2 ${
                isPeuplePathBlockedByMage
                  ? "border-white/8 bg-black/20"
                  : "border-[#E3CCCD]/28 bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm font-semibold ${isPeuplePathBlockedByMage ? "text-white/40" : "text-white/90"}`}>
                  {voie.nom} - Rang {displayedRank}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    isPending
                      ? "text-emerald-200 border-emerald-400/45 bg-emerald-400/18"
                      : isPeuplePathBlockedByMage
                        ? "text-white/25 border-white/15"
                        : "text-[#E3CCCD] border-[#E3CCCD]/35"
                  }`}
                >
                  {isPending ? "Acquis" : `${cost} pt${cost > 1 ? "s" : ""}`}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-stretch gap-1">
                  <button
                    type="button"
                    disabled={isUnavailable}
                    onClick={() => togglePendingRank(pathway.voie_id, nextRank)}
                    className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${
                      isUnavailable
                        ? "border-white/10 bg-white/5 opacity-60 cursor-not-allowed"
                        : isPending
                          ? "border-emerald-400/30 bg-emerald-400/12 hover:bg-emerald-400/9 hover:border-red-400/28"
                          : "border-white/12 bg-white/6 hover:border-emerald-400/20 hover:bg-emerald-400/8"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                        isUnavailable
                          ? "border-white/20 bg-white/5"
                          : isPending
                            ? "border-emerald-400/60 bg-emerald-400/25"
                            : "border-white/20 bg-white/5"
                      }`}
                    >
                      {isPending && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                    </div>
                    <span className="text-[11px] text-white/55 font-mono shrink-0 w-12">
                      Rang {displayedRank}
                    </span>
                    <span className={`text-sm truncate ${isUnavailable ? "text-white/40" : isPending ? "text-white/90" : "text-white/75"}`}>
                      {capName}
                    </span>
                  </button>

                  {hasContent && (
                    <button
                      type="button"
                      onClick={() => toggleRankDescription(rankDescKey)}
                      className="px-2 rounded-lg border border-white/18 bg-white/8 text-white/60 hover:text-white/90 hover:bg-white/14 transition-colors"
                      title="Voir la description de ce rang"
                    >
                      {isRankDescriptionExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>

                {hasContent && isRankDescriptionExpanded && (
                  <RangCard rang={normalizedRang} rangNum={displayedRank} />
                )}

                {isPeuplePathBlockedByMage && (
                  <p className="text-xs text-violet-300/70 italic">Évolution verrouillée (Voie de la Magie active).</p>
                )}
                {isLocked && !isPeuplePathBlockedByMage && (
                  <p className="text-xs text-red-300/80 italic">
                    {isPrestigeVoie(voie)
                      ? "Voie prestige disponible à partir du niveau 5."
                      : `Niveau insuffisant pour le rang ${displayedRank}.`}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        <div className="pt-4 border-t border-white/10 space-y-3">
          <h3 className="text-base font-serif text-white/90 flex items-center gap-2">
            <Star className="w-4 h-4 text-[#E3CCCD]" /> Débloquer une nouvelle Voie
          </h3>

          <div className={`grid gap-2 ${unlockOptions.length >= 4 ? "grid-cols-4" : "grid-cols-3"}`}>
            {unlockOptions.map((b) => (
              <button
                key={b.key}
                onClick={() => {
                  setUnlockType(b.key as any);
                }}
                disabled={b.key === "ownProfile" && !currentProfileId}
                className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                  unlockType === b.key
                    ? "bg-[#E3CCCD]/18 border-[#E3CCCD]/40 text-[#E3CCCD]"
                    : "bg-white/6 border-white/12 text-white/65"
                }`}
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

          {unlockType === "prestige" && targetLevel <= 5 && (
            <p className="text-xs text-red-400/70 italic">
              Les voies de prestige sont disponibles après avoir atteint le niveau 5.
            </p>
          )}

          {canShowUnlockList && (
            <div className="space-y-2">
              {unlockType === "profile" ? (
                <div className="rounded-lg border border-white/22 bg-white/10 p-2 max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-white/15 space-y-2">
                  {Object.entries(groupedOtherProfileVoies).map(([profileName, voies]) => (
                    <div key={profileName} className="space-y-1">
                      {(() => {
                        const groupKey = `profile:${profileName}`;
                        const isCollapsed = isProfileGroupCollapsed(groupKey);

                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleProfileGroup(groupKey)}
                              className="w-full flex items-center justify-between text-[10px] uppercase tracking-widest text-white/60 px-1 pt-1"
                            >
                              <span>{profileName}</span>
                              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                            </button>
                            {!isCollapsed && voies.map((v) => {
                              const unlockRanks = getUnlockRanksForVoieId(v.id);

                              return unlockRanks.map((rank) => {
                                const unlockCost = getCostForRank(rank, v);
                                const displayedRank = getDisplayedRank(rank, v);
                                const isLocked = isLevelLocked(rank, targetLevel, v);
                                const isPending = isPendingRank(v.id, rank);
                                const isRankBlockedByPrerequisite = !canSelectUnlockRank(v.id, rank) && !isPending;
                                const isDisabled = (isLocked && !isPending) || isRankBlockedByPrerequisite;
                                const rankDescKey = `other-${v.id}-${rank}`;
                                const isRankDescriptionExpanded = !!expandedRankDescriptions[rankDescKey];
                                const normalizedRang = normalizeVoieRang(getCapacitesObject(v)[`rang${rank}`]);
                                const hasContent = hasRangContent(normalizedRang);

                                return (
                                  <div key={`${v.id}-${rank}`} className="space-y-1">
                                    <div className="flex items-stretch gap-1">
                                      <button
                                        type="button"
                                        disabled={isDisabled}
                                        onClick={() => togglePendingUnlockRank(v.id, rank)}
                                        className={`flex-1 flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-left transition-colors disabled:opacity-35 ${
                                          isPending
                                            ? "border-emerald-400/35 bg-emerald-400/14 hover:bg-emerald-400/10"
                                            : "border-white/22 bg-white/7 hover:border-amber-400/40 hover:bg-amber-400/12"
                                        }`}
                                      >
                                        <span className="min-w-0 flex items-center gap-2">
                                          <span
                                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                              isPending
                                                ? "border-emerald-400/60 bg-emerald-400/25"
                                                : "border-white/25 bg-white/6"
                                            }`}
                                          >
                                            {isPending && <Check className="w-2.5 h-2.5 text-emerald-300" />}
                                          </span>
                                          <span className={`text-sm font-medium truncate ${isPending ? "text-emerald-100" : "text-white/80"}`}>
                                            {v.nom} - Rang {displayedRank}
                                          </span>
                                        </span>
                                        <span className="flex items-center gap-1.5 shrink-0">
                                          {isPending && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded border text-emerald-200 border-emerald-400/40 bg-emerald-400/15">
                                              Selectionnee
                                            </span>
                                          )}
                                          <span className={`text-[11px] px-1.5 py-0.5 rounded border ${isPending ? "text-emerald-200 border-emerald-400/40 bg-emerald-400/15" : "text-[#E3CCCD]/80 border-[#E3CCCD]/30"}`}>
                                            {unlockCost} pt{unlockCost > 1 ? "s" : ""}
                                          </span>
                                        </span>
                                      </button>

                                      {hasContent && (
                                        <button
                                          type="button"
                                          onClick={() => toggleRankDescription(rankDescKey)}
                                          className="px-2 rounded-lg border border-white/18 bg-white/8 text-white/60 hover:text-white/90 hover:bg-white/14 transition-colors"
                                          title="Voir la description de ce rang"
                                        >
                                          {isRankDescriptionExpanded ? (
                                            <ChevronUp className="w-4 h-4" />
                                          ) : (
                                            <ChevronDown className="w-4 h-4" />
                                          )}
                                        </button>
                                      )}
                                    </div>

                                    {hasContent && isRankDescriptionExpanded && (
                                      <RangCard rang={normalizedRang} rangNum={displayedRank} />
                                    )}
                                  </div>
                                );
                              });
                            })}
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              ) : unlockType === "hybrid" ? (
                <div className="rounded-lg border border-white/22 bg-white/10 p-2 max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-white/15 space-y-2">
                  {Object.entries(groupedHybridVoies).map(([familyName, profiles]) => (
                    <div key={familyName} className="space-y-2 rounded-lg border border-[#E3CCCD]/28 bg-[#E3CCCD]/8 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#EEDCDD]">
                          {familyName}
                        </p>
                        <span className="text-[9px] uppercase tracking-wider text-[#E3CCCD]/75">
                          Famille
                        </span>
                      </div>
                      {Object.entries(profiles).map(([profileName, voies]) => (
                        <div key={`${familyName}-${profileName}`} className="space-y-1">
                          {(() => {
                            const groupKey = `hybrid:${familyName}:${profileName}`;
                            const isCollapsed = isProfileGroupCollapsed(groupKey);

                            return (
                              <>
                                <button
                                  type="button"
                                  onClick={() => toggleProfileGroup(groupKey)}
                                  className="w-full flex items-center justify-between text-[10px] uppercase tracking-widest text-white/60 px-1"
                                >
                                  <span>{profileName}</span>
                                  {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                                </button>
                                {!isCollapsed && voies.map((v) => {
                                  const unlockRanks = getUnlockRanksForVoieId(v.id);

                                  return unlockRanks.map((rank) => {
                                    const unlockCost = getCostForRank(rank, v);
                                    const displayedRank = getDisplayedRank(rank, v);
                                    const isLocked = isLevelLocked(rank, targetLevel, v);
                                    const isPending = isPendingRank(v.id, rank);
                                    const isRankBlockedByPrerequisite = !canSelectUnlockRank(v.id, rank) && !isPending;
                                    const isDisabled = (isLocked && !isPending) || isRankBlockedByPrerequisite;
                                    const rankDescKey = `hybrid-${v.id}-${rank}`;
                                    const isRankDescriptionExpanded = !!expandedRankDescriptions[rankDescKey];
                                    const normalizedRang = normalizeVoieRang(getCapacitesObject(v)[`rang${rank}`]);
                                    const hasContent = hasRangContent(normalizedRang);

                                    return (
                                      <div key={`${v.id}-${rank}`} className="space-y-1">
                                        <div className="flex items-stretch gap-1">
                                          <button
                                            type="button"
                                            disabled={isDisabled}
                                            onClick={() => togglePendingUnlockRank(v.id, rank)}
                                            className={`flex-1 flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-left transition-colors disabled:opacity-35 ${
                                              isPending
                                                ? "border-emerald-400/35 bg-emerald-400/14 hover:bg-emerald-400/10"
                                                : "border-white/22 bg-white/7 hover:border-amber-400/40 hover:bg-amber-400/12"
                                            }`}
                                          >
                                            <span className="min-w-0 flex items-center gap-2">
                                              <span
                                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                                  isPending
                                                    ? "border-emerald-400/60 bg-emerald-400/25"
                                                    : "border-white/25 bg-white/6"
                                                }`}
                                              >
                                                {isPending && <Check className="w-2.5 h-2.5 text-emerald-300" />}
                                              </span>
                                              <span className={`text-sm font-medium truncate ${isPending ? "text-emerald-100" : "text-white/80"}`}>
                                                {v.nom} - Rang {displayedRank}
                                              </span>
                                            </span>
                                            <span className="flex items-center gap-1.5 shrink-0">
                                              {isPending && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded border text-emerald-200 border-emerald-400/40 bg-emerald-400/15">
                                                  Selectionnee
                                                </span>
                                              )}
                                              <span className={`text-[11px] px-1.5 py-0.5 rounded border ${isPending ? "text-emerald-200 border-emerald-400/40 bg-emerald-400/15" : "text-[#E3CCCD]/80 border-[#E3CCCD]/30"}`}>
                                                {unlockCost} pt{unlockCost > 1 ? "s" : ""}
                                              </span>
                                            </span>
                                          </button>

                                          {hasContent && (
                                            <button
                                              type="button"
                                              onClick={() => toggleRankDescription(rankDescKey)}
                                              className="px-2 rounded-lg border border-white/18 bg-white/8 text-white/60 hover:text-white/90 hover:bg-white/14 transition-colors"
                                              title="Voir la description de ce rang"
                                            >
                                              {isRankDescriptionExpanded ? (
                                                <ChevronUp className="w-4 h-4" />
                                              ) : (
                                                <ChevronDown className="w-4 h-4" />
                                              )}
                                            </button>
                                          )}
                                        </div>

                                        {hasContent && isRankDescriptionExpanded && (
                                          <RangCard rang={normalizedRang} rangNum={displayedRank} />
                                        )}
                                      </div>
                                    );
                                  });
                                })}
                              </>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAvailableVoies.map((v) => {
                    const unlockRanks = getUnlockRanksForVoieId(v.id);

                    return unlockRanks.map((rank) => {
                      const rankCapacite = getRankCapacite(v, rank);
                      const unlockCost = getCostForRank(rank, v);
                      const displayedRank = getDisplayedRank(rank, v);
                      const isLocked = isLevelLocked(rank, targetLevel, v);
                      const isPending = isPendingRank(v.id, rank);
                      const isRankBlockedByPrerequisite = !canSelectUnlockRank(v.id, rank) && !isPending;
                      const isDisabled = (isLocked && !isPending) || isRankBlockedByPrerequisite;
                      const rankDescKey = `unlock-${v.id}-${rank}`;
                      const isRankDescriptionExpanded = !!expandedRankDescriptions[rankDescKey];
                      const capName = rankCapacite?.nom || `Capacité de rang ${displayedRank}`;
                      const normalizedRang = normalizeVoieRang(getCapacitesObject(v)[`rang${rank}`]);
                      const hasContent = hasRangContent(normalizedRang);

                      return (
                        <div key={`${v.id}-${rank}`} className="space-y-1">
                          <div className="flex items-stretch gap-1">
                            <button
                              disabled={isDisabled}
                              type="button"
                              onClick={() => togglePendingUnlockRank(v.id, rank)}
                              className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left disabled:opacity-35 ${
                                isPending
                                  ? "border-emerald-400/30 bg-emerald-400/12 hover:bg-emerald-400/9 hover:border-red-400/28"
                                  : "border-white/12 bg-white/6 hover:border-emerald-400/20 hover:bg-emerald-400/8"
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                  isPending
                                    ? "border-emerald-400/60 bg-emerald-400/25"
                                    : "border-white/20 bg-white/5"
                                }`}
                              >
                                {isPending && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                              </div>
                              <span className="min-w-0 flex-1">
                                <span className={`block text-sm ${isPending ? "text-white/90" : "text-white/75"}`}>
                                  {v.nom} - Rang {displayedRank}
                                </span>
                                <span className="block text-xs text-white/45 truncate">{capName}</span>
                              </span>
                              <span className="shrink-0 flex items-center gap-1.5">
                                {isPending && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded border text-emerald-200 border-emerald-400/40 bg-emerald-400/15">
                                    Selectionnee
                                  </span>
                                )}
                                <span className={`text-[11px] px-1.5 py-0.5 rounded border ${isPending ? "text-emerald-200 border-emerald-400/40 bg-emerald-400/15" : "text-[#E3CCCD]/80 border-[#E3CCCD]/30"}`}>
                                  {unlockCost} pt{unlockCost > 1 ? "s" : ""}
                                </span>
                              </span>
                            </button>

                            {hasContent && (
                              <button
                                type="button"
                                onClick={() => toggleRankDescription(rankDescKey)}
                                className="px-2 rounded-lg border border-white/18 bg-white/8 text-white/60 hover:text-white/90 hover:bg-white/14 transition-colors"
                                title="Voir la description de ce rang"
                              >
                                {isRankDescriptionExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>

                          {hasContent && isRankDescriptionExpanded && (
                            <RangCard rang={normalizedRang} rangNum={displayedRank} />
                          )}
                        </div>
                      );
                    });
                  })}
                </div>
              )}

              {filteredAvailableVoies.length === 0 && (
                <p className="text-white/35 text-sm italic">
                  {unlockType === "profile"
                    ? "Aucune voie disponible dans les profils de la famille."
                    : unlockType === "hybrid"
                      ? "Aucune voie disponible hors famille."
                      : "Aucune voie disponible."}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/16 bg-white/8 px-5 py-4 flex items-center justify-center gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setIsLevelingUp(false); setPendingRanks([]); }}
            className="px-4 py-2.5 rounded-xl border border-white/22 text-white/70 text-xs font-semibold hover:bg-white/10 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSaveLevelUp}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-400/40 bg-emerald-400/20 text-emerald-100 text-xs font-bold tracking-widest hover:bg-emerald-400/30 transition-colors"
          >
            <Check className="w-3.5 h-3.5" /> Confirmer le Niveau {targetLevel}
          </button>
        </div>
      </div>
    </div>
  );
}