import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  queueByTable: new Map<string, Array<{ data: unknown; error: unknown }>>(),
  calls: {
    from: [] as string[],
    in: [] as Array<{ table: string; column: string; values: unknown[] }>,
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
    eq: vi.fn(() => query),
    in: vi.fn((column: string, values: unknown[]) => {
      mockState.calls.in.push({ table, column, values });
      return query;
    }),
    single: vi.fn(async () => response),
    throwOnError: vi.fn(async () => {
      if (response.error) throw response.error;
      return response;
    }),
    then: (resolve: (value: { data: unknown; error: unknown; count?: number }) => unknown, reject?: (reason: unknown) => unknown) =>
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
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(async () => ({ error: null })),
          getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://cdn.test/char.png" } })),
        })),
      },
    },
  };
});

import {
  getDerivedAttacks,
  getHpGainPerLevel,
  usePersonnageDetail,
} from "@/hooks/systems/cof/personnage/usePersonnageDetail";

function queueTableResponse(table: string, response: { data: unknown; error: unknown }) {
  const queue = mockState.queueByTable.get(table) ?? [];
  queue.push(response);
  mockState.queueByTable.set(table, queue);
}

describe("usePersonnageDetail helpers", () => {
  it("getDerivedAttacks calcule contact/distance/magie", () => {
    const attacks = getDerivedAttacks(4, { FOR: 2, AGI: 1, VOL: 3 });
    expect(attacks).toEqual({ contact: 6, distance: 5, magie: 7 });
  });

  it("getHpGainPerLevel utilise pv_par_niveau quand defini", () => {
    const hpGain = getHpGainPerLevel({
      pv_par_niveau: 5,
      caracteristiques: { CON: 2 },
    });
    expect(hpGain).toBe(7);
  });

  it("getHpGainPerLevel fallback sur dr_de + CON", () => {
    const hpGain = getHpGainPerLevel({
      dr_de: "d8",
      caracteristiques: { CON: -1 },
    });
    expect(hpGain).toBe(7);
  });
});

describe("usePersonnageDetail data methods", () => {
  beforeEach(() => {
    mockState.queueByTable.clear();
    mockState.calls.from = [];
    mockState.calls.in = [];
  });

  it("fetchPlayers filtre les super_admin et mappe id/pseudo", async () => {
    queueTableResponse("utilisateurs", {
      data: [
        { id: "u1", pseudo: "Admin", role: "super_admin" },
        { id: "u2", pseudo: "Lina", role: "joueur" },
      ],
      error: null,
    });

    const { result } = renderHook(() => usePersonnageDetail());
    const players = await result.current.fetchPlayers();

    expect(players).toEqual([{ id: "u2", pseudo: "Lina" }]);
    expect(mockState.calls.from).toContain("utilisateurs");
  });

  it("fetchVoieDetailsByPathways interroge voies avec ids de pathways", async () => {
    queueTableResponse("voies", {
      data: [{ id: "v1", nom: "Voie du Fer", type: "profil", capacites: {} }],
      error: null,
    });

    const { result } = renderHook(() => usePersonnageDetail());
    const voies = await result.current.fetchVoieDetailsByPathways([
      { voie_id: "v1" },
      { voie_id: null },
    ]);

    expect(voies).toEqual([{ id: "v1", nom: "Voie du Fer", type: "profil", capacites: {} }]);
    expect(mockState.calls.in).toContainEqual({
      table: "voies",
      column: "id",
      values: ["v1"],
    });
  });

  it("fetchVoieDetailsByPathways retourne [] sans pathways", async () => {
    const { result } = renderHook(() => usePersonnageDetail());
    const voies = await result.current.fetchVoieDetailsByPathways([]);

    expect(voies).toEqual([]);
    expect(mockState.calls.from).toEqual([]);
  });
});
