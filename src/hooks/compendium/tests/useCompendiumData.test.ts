import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  queueByTable: new Map<string, Array<{ data: unknown; error: unknown }>>(),
  calls: {
    from: [] as string[],
    or: [] as Array<{ table: string; filter: string }>,
    is: [] as Array<{ table: string; column: string; value: unknown }>,
    eq: [] as Array<{ table: string; column: string; value: unknown }>,
  },
}));

function dequeueResponse(table: string) {
  const queue = mockState.queueByTable.get(table);
  if (!queue || queue.length === 0) {
    return { data: [], error: null };
  }
  return queue.shift() ?? { data: [], error: null };
}

function makeQuery(table: string, response: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    eq: vi.fn((column: string, value: unknown) => {
      mockState.calls.eq.push({ table, column, value });
      return query;
    }),
    or: vi.fn((filter: string) => {
      mockState.calls.or.push({ table, filter });
      return query;
    }),
    is: vi.fn((column: string, value: unknown) => {
      mockState.calls.is.push({ table, column, value });
      return query;
    }),
    in: vi.fn(() => query),
    delete: vi.fn(() => query),
    update: vi.fn(() => query),
    insert: vi.fn(() => query),
    single: vi.fn(async () => response),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(response).then(resolve, reject),
  };

  return query;
}

vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      from: vi.fn((table: string) => {
        mockState.calls.from.push(table);
        return makeQuery(table, dequeueResponse(table));
      }),
    },
  };
});

import { useCompendiumData } from "@/hooks/compendium/useCompendiumData";

function queueTableResponse(table: string, response: { data: unknown; error: unknown }) {
  const queue = mockState.queueByTable.get(table) ?? [];
  queue.push(response);
  mockState.queueByTable.set(table, queue);
}

describe("useCompendiumData", () => {
  beforeEach(() => {
    mockState.queueByTable.clear();
    mockState.calls.from = [];
    mockState.calls.or = [];
    mockState.calls.is = [];
    mockState.calls.eq = [];
  });

  it("applique le filtre campagne sur fetchPeuples", async () => {
    queueTableResponse("peuples", { data: [{ id: "p1", nom: "Humain" }], error: null });

    const { result } = renderHook(() => useCompendiumData());
    const peuples = await result.current.fetchPeuples("camp-1");

    expect(peuples).toEqual([{ id: "p1", nom: "Humain" }]);
    expect(mockState.calls.or).toContainEqual({
      table: "peuples",
      filter: "campaign_id.eq.camp-1,campaign_id.is.null",
    });
  });

  it("applique le filtre global sur fetchPeuples sans campaignId", async () => {
    queueTableResponse("peuples", { data: [{ id: "p2", nom: "Nain" }], error: null });

    const { result } = renderHook(() => useCompendiumData());
    await result.current.fetchPeuples();

    expect(mockState.calls.is).toContainEqual({
      table: "peuples",
      column: "campaign_id",
      value: null,
    });
  });

  it("mappe correctement la table de suppression equipement", async () => {
    queueTableResponse("armes_distance", { data: null, error: null });

    const { result } = renderHook(() => useCompendiumData());
    await result.current.deleteEquipement("arme_distance", "eq-42");

    expect(mockState.calls.from).toContain("armes_distance");
    expect(mockState.calls.eq).toContainEqual({
      table: "armes_distance",
      column: "id",
      value: "eq-42",
    });
  });

  it("hydrate famille_nom sur fetchVoiesPrestige", async () => {
    queueTableResponse("voies", {
      data: [
        {
          id: "v1",
          nom: "Voie du Feu",
          type: "prestige",
          capacites: {},
          familles: { nom: "Arcanistes" },
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useCompendiumData());
    const voies = await result.current.fetchVoiesPrestige("camp-2");

    expect(voies[0].famille_nom).toBe("Arcanistes");
  });
});
