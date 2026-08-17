/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  getRankPrimaryDescription,
  getRankTitle,
  hasRangContent,
  normalizeVoieRang,
} from "@/lib/voieRanks";

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

export interface VoieCapacite {
  nom?: string;
  type?: string;
  description?: string;
}

export interface ProfileFamilyMeta {
  famille_id: string | null;
  famille_nom: string | null;
  profil_nom: string | null;
}

export interface UseLevelUpOptions {
  pj: any;
  targetLevel: number;
  pendingRanks: { voie_id: string; rang: number }[];
  setPendingRanks: (ranks: { voie_id: string; rang: number }[]) => void;
  voieDetails: VoieDetail[];
  allVoies: VoieDetail[];
}

export const getBaseCost = (rang: number) => (rang <= 2 ? 1 : 2);

export const isPrestigeVoie = (voie?: VoieDetail | null) =>
  (voie?.type || "").toLowerCase() === "prestige";

export const getDisplayedRank = (storedRank: number, voie?: VoieDetail | null) =>
  isPrestigeVoie(voie) ? storedRank + 3 : storedRank;

export const getCostForRank = (storedRank: number, voie?: VoieDetail | null) =>
  isPrestigeVoie(voie) ? 2 : getBaseCost(storedRank);

export const isLevelLocked = (
  storedRank: number,
  newLevel: number,
  voie?: VoieDetail | null
) => {
  if (isPrestigeVoie(voie)) return newLevel < 5;
  if (storedRank === 4 && newLevel < 5) return true;
  if (storedRank === 5 && newLevel < 7) return true;
  return false;
};

export const getCapacitesObject = (voie: VoieDetail): Record<string, VoieCapacite> => {
  if (typeof voie.capacites === "string") {
    try {
      return JSON.parse(voie.capacites) as Record<string, VoieCapacite>;
    } catch {
      return {};
    }
  }
  return (voie.capacites as Record<string, VoieCapacite>) || {};
};

export const getRankCapacite = (
  voie: VoieDetail,
  rang: number
): VoieCapacite | null => {
  const caps = getCapacitesObject(voie);
  const normalized = normalizeVoieRang(caps[`rang${rang}`]);
  if (!hasRangContent(normalized)) return null;
  return {
    nom: getRankTitle(normalized, `Rang ${rang}`),
    type: normalized.actions[0]?.type || normalized.type || "",
    description: getRankPrimaryDescription(normalized),
  };
};

export const isMageVoie = (v?: VoieDetail | null) => {
  if (!v) return false;
  const nom = v.nom.toLowerCase();
  return nom.includes("magie") || nom.includes("mage");
};

export function useLevelUp({
  pj,
  targetLevel,
  pendingRanks,
  setPendingRanks,
  voieDetails,
  allVoies,
}: UseLevelUpOptions) {
  const [unlockType, setUnlockType] = useState<
    "profile" | "ownProfile" | "hybrid" | "prestige" | ""
  >("");
  const [expandedRankDescriptions, setExpandedRankDescriptions] = useState<
    Record<string, boolean>
  >({});
  const [collapsedProfileGroups, setCollapsedProfileGroups] = useState<
    Record<string, boolean>
  >({});
  const [profileFamilyById, setProfileFamilyById] = useState<
    Record<string, ProfileFamilyMeta>
  >({});

  useEffect(() => {
    supabase
      .from("profils")
      .select("id, nom, famille_id, familles(nom)")
      .order("nom")
      .then(({ data }) => {
        if (!data) return;

        const next: Record<string, ProfileFamilyMeta> = {};
        (data as Array<any>).forEach((p) => {
          const relatedFamilyName = Array.isArray(p.familles)
            ? (p.familles[0]?.nom ?? null)
            : (p.familles?.nom ?? null);
          next[p.id] = {
            famille_id: p.famille_id ?? null,
            famille_nom: relatedFamilyName,
            profil_nom: p.nom ?? null,
          };
        });
        setProfileFamilyById(next);
      });
  }, []);

  const hasMagePath = (pj.pathways || []).some((p: any) => {
    const v =
      allVoies.find((av) => av.id === p.voie_id) ||
      voieDetails.find((vd) => vd.id === p.voie_id);
    return isMageVoie(v);
  });

  const currentProfileId =
    pj?.stats?.profil_id ||
    voieDetails.find((v) => v.profil_id)?.profil_id ||
    allVoies.find(
      (v) =>
        ((pj.pathways as any[]) || []).some((p: any) => p.voie_id === v.id) &&
        !!v.profil_id
    )?.profil_id;

  const characterProfileIds = Array.from(
    new Set(
      [
        pj?.stats?.profil_id,
        pj?.stats?.profils_id,
        currentProfileId,
        ...((pj.pathways as any[]) || []).map((p: any) => {
          const voie =
            allVoies.find((av) => av.id === p.voie_id) ||
            voieDetails.find((vd) => vd.id === p.voie_id);
          return voie?.profil_id;
        }),
      ].filter((id): id is string => typeof id === "string" && !!id)
    )
  );

  const characterFamilyIds = Array.from(
    new Set(
      characterProfileIds
        .map((profileId) => profileFamilyById[profileId]?.famille_id)
        .filter((id): id is string => typeof id === "string" && !!id)
    )
  );

  const relatedFamilyProfileIds = Array.from(
    new Set(
      Object.entries(profileFamilyById)
        .filter(
          ([, meta]) =>
            !!meta.famille_id && characterFamilyIds.includes(meta.famille_id)
        )
        .map(([profileId]) => profileId)
    )
  );

  const otherFamilyProfileIds = relatedFamilyProfileIds.filter(
    (id) => id !== currentProfileId
  );

  const hybridProfileIds = Array.from(
    new Set(
      Object.entries(profileFamilyById)
        .filter(([profileId, meta]) => {
          if (profileId === currentProfileId) return false;
          if (!meta.famille_id) return true;
          return !characterFamilyIds.includes(meta.famille_id);
        })
        .map(([profileId]) => profileId)
    )
  );

  const ownedVoieIds = new Set(
    ((pj.pathways as any[]) || []).map((p) => p.voie_id)
  );

  const getOwnedRanksForVoieId = (voieId: string) => {
    const existingPath = ((pj.pathways as any[]) || []).find(
      (p: any) => p.voie_id === voieId
    );
    return (existingPath?.rangs_acquis || []) as number[];
  };

  const getPendingRanksForVoieId = (voieId: string) =>
    pendingRanks
      .filter((pr: any) => pr.voie_id === voieId)
      .map((pr: any) => pr.rang);

  const getUnlockRanksForVoieId = (voieId: string) => {
    const ownedRanks = getOwnedRanksForVoieId(voieId);
    const firstUnlockRank =
      ownedRanks.length > 0 ? Math.max(...ownedRanks) + 1 : 1;

    if (unlockType === "prestige")
      return [firstUnlockRank].filter((r) => r <= 5);
    if (firstUnlockRank === 1) return [1, 2];
    return [firstUnlockRank].filter((r) => r <= 5);
  };

  const pathwaysForUpgrade = (pj.pathways as any[]) || [];

  const filteredAvailableVoies = allVoies.filter((v: VoieDetail) => {
    if (ownedVoieIds.has(v.id)) return false;
    if (v.peuple_id) return false;

    if (isPrestigeVoie(v)) {
      if (unlockType !== "prestige") return false;
      if (targetLevel < 5) return false;
    }

    if (unlockType === "prestige")
      return v.type === "prestige" && targetLevel >= 5;
    if (unlockType === "ownProfile")
      return !!currentProfileId && v.profil_id === currentProfileId;
    if (unlockType === "profile")
      return !!v.profil_id && otherFamilyProfileIds.includes(v.profil_id);
    if (unlockType === "hybrid")
      return !!v.profil_id && hybridProfileIds.includes(v.profil_id);
    return false;
  });

  const isPendingRank = (voieId: string, rang: number) =>
    pendingRanks.some((pr) => pr.voie_id === voieId && pr.rang === rang);

  const togglePendingRank = (voieId: string, rang: number) => {
    if (isPendingRank(voieId, rang)) {
      setPendingRanks(
        pendingRanks.filter(
          (pr) => !(pr.voie_id === voieId && pr.rang === rang)
        )
      );
      return;
    }
    setPendingRanks([
      ...pendingRanks.filter((pr) => pr.voie_id !== voieId),
      { voie_id: voieId, rang },
    ]);
  };

  const canSelectUnlockRank = (voieId: string, rang: number) => {
    if (rang <= 1) return true;

    const ownedRanks = getOwnedRanksForVoieId(voieId);
    const pendingForVoie = getPendingRanksForVoieId(voieId);
    return ownedRanks.includes(rang - 1) || pendingForVoie.includes(rang - 1);
  };

  const togglePendingUnlockRank = (voieId: string, rang: number) => {
    if (isPendingRank(voieId, rang)) {
      setPendingRanks(
        pendingRanks.filter(
          (pr) => !(pr.voie_id === voieId && pr.rang >= rang)
        )
      );
      return;
    }

    if (!canSelectUnlockRank(voieId, rang)) return;

    setPendingRanks([...pendingRanks, { voie_id: voieId, rang }]);
  };

  const canShowUnlockList =
    (unlockType === "ownProfile" && !!currentProfileId) ||
    (unlockType === "profile" && otherFamilyProfileIds.length > 0) ||
    (unlockType === "hybrid" && hybridProfileIds.length > 0) ||
    unlockType === "prestige";

  const unlockOptions = [
    { key: "ownProfile", label: "Profil" },
    { key: "profile", label: "Famille" },
    { key: "hybrid", label: "Hybride" },
    ...(targetLevel >= 5 ? [{ key: "prestige", label: "Prestige" }] : []),
  ];

  const groupedOtherProfileVoies = filteredAvailableVoies
    .slice()
    .sort((a, b) => {
      const aProfile = a.profil_id
        ? profileFamilyById[a.profil_id]?.profil_nom || "Sans profil"
        : "Sans profil";
      const bProfile = b.profil_id
        ? profileFamilyById[b.profil_id]?.profil_nom || "Sans profil"
        : "Sans profil";
      if (aProfile !== bProfile) return aProfile.localeCompare(bProfile, "fr");
      return a.nom.localeCompare(b.nom, "fr");
    })
    .reduce<Record<string, VoieDetail[]>>((acc, voie) => {
      const profileName = voie.profil_id
        ? profileFamilyById[voie.profil_id]?.profil_nom || "Sans profil"
        : "Sans profil";
      if (!acc[profileName]) acc[profileName] = [];
      acc[profileName].push(voie);
      return acc;
    }, {});

  const groupedHybridVoies = filteredAvailableVoies
    .slice()
    .sort((a, b) => {
      const aFamily = a.profil_id
        ? profileFamilyById[a.profil_id]?.famille_nom || "Sans famille"
        : "Sans famille";
      const bFamily = b.profil_id
        ? profileFamilyById[b.profil_id]?.famille_nom || "Sans famille"
        : "Sans famille";
      if (aFamily !== bFamily) return aFamily.localeCompare(bFamily, "fr");

      const aProfile = a.profil_id
        ? profileFamilyById[a.profil_id]?.profil_nom || "Sans profil"
        : "Sans profil";
      const bProfile = b.profil_id
        ? profileFamilyById[b.profil_id]?.profil_nom || "Sans profil"
        : "Sans profil";
      if (aProfile !== bProfile) return aProfile.localeCompare(bProfile, "fr");

      return a.nom.localeCompare(b.nom, "fr");
    })
    .reduce<Record<string, Record<string, VoieDetail[]>>>((acc, voie) => {
      const familyName = voie.profil_id
        ? profileFamilyById[voie.profil_id]?.famille_nom || "Sans famille"
        : "Sans famille";
      const profileName = voie.profil_id
        ? profileFamilyById[voie.profil_id]?.profil_nom || "Sans profil"
        : "Sans profil";

      if (!acc[familyName]) acc[familyName] = {};
      if (!acc[familyName][profileName]) acc[familyName][profileName] = [];
      acc[familyName][profileName].push(voie);
      return acc;
    }, {});

  const toggleRankDescription = (key: string) => {
    setExpandedRankDescriptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isProfileGroupCollapsed = (key: string) =>
    collapsedProfileGroups[key] ?? true;

  const toggleProfileGroup = (key: string) => {
    setCollapsedProfileGroups((prev) => ({
      ...prev,
      [key]: !(prev[key] ?? true),
    }));
  };

  return {
    unlockType,
    setUnlockType,
    expandedRankDescriptions,
    collapsedProfileGroups,
    profileFamilyById,
    hasMagePath,
    currentProfileId,
    otherFamilyProfileIds,
    hybridProfileIds,
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
  };
}