import type { RangsState, VoieRang } from "@/types/compendium";

export type RangSection = "bonus" | "capacites" | "actions" | "familiers" | "legacies";

type RangItemValue = Record<string, string | boolean>;

export function createEmptyRangItem(section: RangSection): RangItemValue {
  if (section === "bonus") return { titre: "", type: "", valeur: "", condition: "" };
  if (section === "capacites") return { titre: "", description: "" };
  if (section === "actions") {
    return {
      titre: "",
      type: "",
      sort: false,
      cout_mana: "",
      dm: "",
      test_oppose: false,
      test_type: "",
      resultat_si_reussi: "",
      description: "",
    };
  }
  if (section === "familiers") return { titre: "", description: "" };
  return { titre: "", description: "" };
}

export function hasRangItemContent(item: unknown): boolean {
  return Object.values(item as Record<string, unknown>).some(
    (value) => (typeof value === "string" && value.trim().length > 0) || (typeof value === "boolean" && value),
  );
}

export function updateRangFieldState(
  rangs: RangsState,
  rangKey: keyof RangsState,
  field: keyof VoieRang,
  value: string,
): RangsState {
  return {
    ...rangs,
    [rangKey]: {
      ...rangs[rangKey],
      [field]: value,
    },
  };
}

export function updateRangItemState(
  rangs: RangsState,
  rangKey: keyof RangsState,
  section: RangSection,
  itemIdx: number,
  field: string,
  value: string | boolean,
): RangsState {
  const current = rangs[rangKey];
  const items = Array.isArray(current[section])
    ? [...(current[section] as unknown as RangItemValue[])]
    : [];
  const item = { ...(items[itemIdx] || {}) };
  item[field] = value;
  items[itemIdx] = item;

  return {
    ...rangs,
    [rangKey]: {
      ...current,
      [section]: items,
    },
  };
}

export function addRangItemState(
  rangs: RangsState,
  rangKey: keyof RangsState,
  section: RangSection,
): { next: RangsState; newIndex: number } {
  const current = rangs[rangKey];
  const items = Array.isArray(current[section])
    ? [...(current[section] as unknown as RangItemValue[])]
    : [];
  const newIndex = items.length;
  items.push(createEmptyRangItem(section));

  return {
    next: {
      ...rangs,
      [rangKey]: {
        ...current,
        [section]: items,
      },
    },
    newIndex,
  };
}

export function removeRangItemState(
  rangs: RangsState,
  rangKey: keyof RangsState,
  section: RangSection,
  itemIdx: number,
): RangsState {
  const current = rangs[rangKey];
  const items = Array.isArray(current[section])
    ? [...(current[section] as unknown as RangItemValue[])]
    : [];
  items.splice(itemIdx, 1);

  return {
    ...rangs,
    [rangKey]: {
      ...current,
      [section]: items,
    },
  };
}

export function duplicateRangItemState(
  rangs: RangsState,
  rangKey: keyof RangsState,
  section: RangSection,
  itemIdx: number,
): RangsState {
  const current = rangs[rangKey];
  const items = Array.isArray(current[section])
    ? [...(current[section] as unknown as RangItemValue[])]
    : [];
  items.splice(itemIdx + 1, 0, { ...items[itemIdx] });

  return {
    ...rangs,
    [rangKey]: {
      ...current,
      [section]: items,
    },
  };
}

export function toggleOpenItem(prev: Set<string>, key: string): Set<string> {
  const next = new Set(prev);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}
