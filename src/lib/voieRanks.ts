import type { RangsState, VoieRang, VoieRangAction, VoieRangBonus, VoieRangCapaciteDetail } from "@/types/compendium";
import { EMPTY_RANGS } from "@/types/compendium";

const isNonEmpty = (value?: string | null) => !!value && value.trim().length > 0;

const emptyBonus = (): VoieRangBonus => ({ titre: "", type: "", valeur: "", condition: "" });
const emptyCapacite = (): VoieRangCapaciteDetail => ({ titre: "", description: "" });
const emptyAction = (): VoieRangAction => ({
  titre: "",
  type: "",
  sort: false,
  cout_mana: "",
  dm: "",
  test_oppose: false,
  test_type: "",
  resultat_si_reussi: "",
  description: "",
});

export interface NormalizedVoieRang {
  titre: string;
  nom: string;
  type: string;
  description: string;
  bonus: VoieRangBonus[];
  capacites: VoieRangCapaciteDetail[];
  actions: VoieRangAction[];
}

const normalizeBonusItem = (input: unknown): VoieRangBonus => {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    titre: typeof source.titre === "string" ? source.titre : "",
    type: typeof source.type === "string" ? source.type : "",
    valeur: typeof source.valeur === "string" ? source.valeur : "",
    condition: typeof source.condition === "string" ? source.condition : "",
  };
};

const normalizeCapaciteItem = (input: unknown): VoieRangCapaciteDetail => {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    titre: typeof source.titre === "string" ? source.titre : "",
    description: typeof source.description === "string" ? source.description : "",
  };
};

const normalizeActionItem = (input: unknown): VoieRangAction => {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    titre: typeof source.titre === "string" ? source.titre : "",
    type:
      source.type === "A" || source.type === "M" || source.type === "L" || source.type === "G"
        ? source.type
        : "",
    sort: !!source.sort,
    cout_mana: typeof source.cout_mana === "string" ? source.cout_mana : "",
    dm: typeof source.dm === "string" ? source.dm : "",
    test_oppose: !!source.test_oppose,
    test_type: typeof source.test_type === "string" ? source.test_type : "",
    resultat_si_reussi: typeof source.resultat_si_reussi === "string" ? source.resultat_si_reussi : "",
    description: typeof source.description === "string" ? source.description : "",
  };
};

const asArray = <T>(value: unknown, mapFn: (item: unknown) => T): T[] => {
  if (Array.isArray(value)) return value.map(mapFn);
  if (value && typeof value === "object") return [mapFn(value)];
  return [];
};

export function normalizeVoieRang(input: unknown): NormalizedVoieRang {
  const rank: NormalizedVoieRang = {
    titre: "",
    nom: "",
    type: "",
    description: "",
    bonus: [],
    capacites: [],
    actions: [],
  };

  if (!input || typeof input !== "object") return rank;
  const source = input as Record<string, unknown>;

  rank.titre = typeof source.titre === "string" ? source.titre : "";
  rank.nom = typeof source.nom === "string" ? source.nom : "";
  rank.type = typeof source.type === "string" ? source.type : "";
  rank.description = typeof source.description === "string" ? source.description : "";

  rank.bonus = asArray(source.bonus, normalizeBonusItem);

  rank.capacites = asArray(source.capacites, normalizeCapaciteItem);
  if (rank.capacites.length === 0 && source.capacite) {
    rank.capacites = asArray(source.capacite, normalizeCapaciteItem);
  }

  rank.actions = asArray(source.actions, normalizeActionItem);
  if (rank.actions.length === 0 && source.action) {
    rank.actions = asArray(source.action, normalizeActionItem);
  }

  // Legacy payloads stored only nom/description/type. Promote to capacite for display/edit consistency.
  if (rank.capacites.length === 0 && (isNonEmpty(rank.nom) || isNonEmpty(rank.description))) {
    rank.capacites = [{
      titre: rank.nom || "",
      description: rank.description || "",
    }];
  }

  if (!isNonEmpty(rank.titre)) {
    rank.titre = rank.capacites[0]?.titre || rank.actions[0]?.titre || rank.bonus[0]?.titre || rank.nom || "";
  }

  if (rank.bonus.length === 0) rank.bonus = [emptyBonus()];
  if (rank.capacites.length === 0) rank.capacites = [emptyCapacite()];
  if (rank.actions.length === 0) rank.actions = [emptyAction()];

  return rank;
}

export function normalizeRangsState(input: unknown): RangsState {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;

  return {
    rang1: normalizeVoieRang(source.rang1 ?? EMPTY_RANGS.rang1),
    rang2: normalizeVoieRang(source.rang2 ?? EMPTY_RANGS.rang2),
    rang3: normalizeVoieRang(source.rang3 ?? EMPTY_RANGS.rang3),
    rang4: normalizeVoieRang(source.rang4 ?? EMPTY_RANGS.rang4),
    rang5: normalizeVoieRang(source.rang5 ?? EMPTY_RANGS.rang5),
  };
}

export function hasBonus(rank: VoieRang): boolean {
  const normalized = normalizeVoieRang(rank);
  return normalized.bonus.some((bonus) => [bonus.titre, bonus.type, bonus.valeur, bonus.condition].some((v) => isNonEmpty(v)));
}

export function hasCapacite(rank: VoieRang): boolean {
  const normalized = normalizeVoieRang(rank);
  return normalized.capacites.some((capacite) => [capacite.titre, capacite.description].some((v) => isNonEmpty(v)));
}

export function hasAction(rank: VoieRang): boolean {
  const normalized = normalizeVoieRang(rank);
  return (
    normalized.actions.some((action) =>
      [
        action.titre,
        action.type,
        action.cout_mana,
        action.dm,
        action.test_type,
        action.resultat_si_reussi,
        action.description,
      ].some((v) => isNonEmpty(v)),
    )
  );
}

export function hasLegacyContent(rank: VoieRang): boolean {
  const normalized = normalizeVoieRang(rank);
  return [normalized.nom, normalized.type, normalized.description].some((v) => isNonEmpty(v));
}

export function hasRangContent(rank: VoieRang): boolean {
  return hasBonus(rank) || hasCapacite(rank) || hasAction(rank) || hasLegacyContent(rank);
}

export function getRankTitle(rank: VoieRang, fallback: string): string {
  const normalized = normalizeVoieRang(rank);
  return normalized.titre || normalized.capacites[0]?.titre || normalized.actions[0]?.titre || normalized.bonus[0]?.titre || normalized.nom || fallback;
}

export function getRankPrimaryDescription(rank: VoieRang): string {
  const normalized = normalizeVoieRang(rank);
  return normalized.capacites.find((cap) => isNonEmpty(cap.description))?.description ||
    normalized.actions.find((action) => isNonEmpty(action.description))?.description ||
    normalized.bonus.find((bonus) => isNonEmpty(bonus.condition))?.condition ||
    normalized.description ||
    "";
}

export function cleanupRankForSave(rank: VoieRang): VoieRang {
  const normalized = normalizeVoieRang(rank);

  const cleanBonuses = normalized.bonus.filter((bonus) =>
    [bonus.titre, bonus.type, bonus.valeur, bonus.condition].some((v) => isNonEmpty(v)),
  );
  const cleanCapacites = normalized.capacites.filter((capacite) =>
    [capacite.titre, capacite.description].some((v) => isNonEmpty(v)),
  );
  const cleanActions = normalized.actions.filter((action) =>
    [action.titre, action.type, action.cout_mana, action.dm, action.test_type, action.resultat_si_reussi, action.description].some((v) => isNonEmpty(v)),
  );

  const cleaned: VoieRang = {
    titre: normalized.titre,
    bonus: cleanBonuses.length ? cleanBonuses : null,
    capacites: cleanCapacites.length ? cleanCapacites : null,
    actions: cleanActions.length ? cleanActions : null,
  };

  return cleaned;
}

export function cleanupRangsForSave(rangs: RangsState): RangsState {
  return {
    rang1: cleanupRankForSave(rangs.rang1),
    rang2: cleanupRankForSave(rangs.rang2),
    rang3: cleanupRankForSave(rangs.rang3),
    rang4: cleanupRankForSave(rangs.rang4),
    rang5: cleanupRankForSave(rangs.rang5),
  };
}
