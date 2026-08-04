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
    or: vi.fn(() => query),
    is: vi.fn(() => query),
    in: vi.fn((column: string, values: unknown[]) => {
      mockState.calls.in.push({ table, column, values });
      return query;
    }),
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
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(async () => ({ error: null })),
          getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://cdn.test/image.png" } })),
        })),
      },
    },
  };
});

import { useProfilData } from "@/hooks/compendium/useProfilData";

function queueTableResponse(table: string, response: { data: unknown; error: unknown }) {
  const queue = mockState.queueByTable.get(table) ?? [];
  queue.push(response);
  mockState.queueByTable.set(table, queue);
}

describe("useProfilData", () => {
  beforeEach(() => {
    mockState.queueByTable.clear();
    mockState.calls.from = [];
    mockState.calls.in = [];
  });

  it("fetchEquipementOptions retourne les 3 listes triées par table", async () => {
    queueTableResponse("armes_contact", { data: [{ id: "c1", nom: "Dague" }], error: null });
    queueTableResponse("armes_distance", { data: [{ id: "d1", nom: "Arc" }], error: null });
    queueTableResponse("armures", { data: [{ id: "a1", nom: "Cuir" }], error: null });

    const { result } = renderHook(() => useProfilData());
    const options = await result.current.fetchEquipementOptions();

    expect(options.armesContact).toEqual([{ id: "c1", nom: "Dague" }]);
    expect(options.armesDistance).toEqual([{ id: "d1", nom: "Arc" }]);
    expect(options.armures).toEqual([{ id: "a1", nom: "Cuir" }]);
  });

  it("fetchEquipementNames ne requête que les catégories présentes", async () => {
    queueTableResponse("armes_contact", { data: [{ nom: "Hache" }], error: null });
    queueTableResponse("armures", { data: [{ nom: "Plastron" }], error: null });

    const { result } = renderHook(() => useProfilData());
    const names = await result.current.fetchEquipementNames({
      arme_contact: ["w1"],
      armure: ["ar1"],
    });

    expect(names).toEqual({
      arme_contact: ["Hache"],
      arme_distance: [],
      armure: ["Plastron"],
    });
    expect(mockState.calls.from).toContain("armes_contact");
    expect(mockState.calls.from).toContain("armures");
    expect(mockState.calls.from).not.toContain("armes_distance");
    expect(mockState.calls.in).toContainEqual({
      table: "armes_contact",
      column: "id",
      values: ["w1"],
    });
  });
});
