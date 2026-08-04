import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  queueByTable: new Map<string, Array<{ data: unknown; error: unknown }>>(),
  calls: {
    from: [] as string[],
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
    delete: vi.fn(() => query),
    eq: vi.fn((column: string, value: unknown) => {
      mockState.calls.eq.push({ table, column, value });
      return query;
    }),
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown, reject?: (reason: unknown) => unknown) =>
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

import { usePersonnagesData } from "@/hooks/usePersonnagesData";

function queueTableResponse(table: string, response: { data: unknown; error: unknown }) {
  const queue = mockState.queueByTable.get(table) ?? [];
  queue.push(response);
  mockState.queueByTable.set(table, queue);
}

describe("usePersonnagesData", () => {
  beforeEach(() => {
    mockState.queueByTable.clear();
    mockState.calls.from = [];
    mockState.calls.eq = [];
  });

  it("fetchPersonnages retourne PJ et PNJ", async () => {
    queueTableResponse("pj", {
      data: [{ id: "pj1", name: "Aldric", image_url: null, stats: {}, pathways: {}, inventory: {} }],
      error: null,
    });
    queueTableResponse("pnj", {
      data: [{ id: "pnj1", name: "Garde", image_url: null, stats: {}, pathways: {}, inventory: {} }],
      error: null,
    });

    const { result } = renderHook(() => usePersonnagesData());
    const data = await result.current.fetchPersonnages("camp-1");

    expect(data.pjs).toHaveLength(1);
    expect(data.pnjs).toHaveLength(1);
    expect(mockState.calls.eq).toContainEqual({ table: "pj", column: "campaign_id", value: "camp-1" });
    expect(mockState.calls.eq).toContainEqual({ table: "pnj", column: "campaign_id", value: "camp-1" });
  });

  it("fetchPersonnages retourne [] pour une table en erreur", async () => {
    queueTableResponse("pj", {
      data: null,
      error: new Error("pj error"),
    });
    queueTableResponse("pnj", {
      data: [{ id: "pnj1", name: "Garde", image_url: null, stats: {}, pathways: {}, inventory: {} }],
      error: null,
    });

    const { result } = renderHook(() => usePersonnagesData());
    const data = await result.current.fetchPersonnages("camp-2");

    expect(data.pjs).toEqual([]);
    expect(data.pnjs).toHaveLength(1);
  });

  it("deletePersonnage cible la table pnj", async () => {
    queueTableResponse("pnj", { data: null, error: null });

    const { result } = renderHook(() => usePersonnagesData());
    await result.current.deletePersonnage("pnj", "pnj-42");

    expect(mockState.calls.from).toContain("pnj");
    expect(mockState.calls.eq).toContainEqual({ table: "pnj", column: "id", value: "pnj-42" });
  });

  it("deletePersonnage propage l'erreur Supabase", async () => {
    queueTableResponse("pj", { data: null, error: new Error("delete failed") });

    const { result } = renderHook(() => usePersonnagesData());
    await expect(result.current.deletePersonnage("pj", "pj-99")).rejects.toThrow("delete failed");
  });
});
