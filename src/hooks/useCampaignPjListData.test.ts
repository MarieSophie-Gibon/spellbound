import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  queueByTable: new Map<string, Array<{ data: unknown; error: unknown }>>(),
  calls: {
    from: [] as string[],
    select: [] as Array<{ table: string; fields: string }>,
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
    select: vi.fn((fields: string) => {
      mockState.calls.select.push({ table, fields });
      return query;
    }),
    order: vi.fn(() => query),
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

import { useCampaignPjListData } from "@/hooks/useCampaignPjListData";

function queueTableResponse(table: string, response: { data: unknown; error: unknown }) {
  const queue = mockState.queueByTable.get(table) ?? [];
  queue.push(response);
  mockState.queueByTable.set(table, queue);
}

describe("useCampaignPjListData", () => {
  beforeEach(() => {
    mockState.queueByTable.clear();
    mockState.calls.from = [];
    mockState.calls.select = [];
  });

  it("fetchPeuples retourne les peuples", async () => {
    queueTableResponse("peuples", {
      data: [{ id: "p1", nom: "Humain", data: {} }],
      error: null,
    });

    const { result } = renderHook(() => useCampaignPjListData());
    const peuples = await result.current.fetchPeuples();

    expect(peuples).toEqual([{ id: "p1", nom: "Humain", data: {} }]);
    expect(mockState.calls.select).toContainEqual({
      table: "peuples",
      fields: "id, nom, image_url, description, data",
    });
  });

  it("fetchProfils retourne les profils", async () => {
    queueTableResponse("profils", {
      data: [{ id: "pr1", nom: "Guerrier" }],
      error: null,
    });

    const { result } = renderHook(() => useCampaignPjListData());
    const profils = await result.current.fetchProfils();

    expect(profils).toEqual([{ id: "pr1", nom: "Guerrier" }]);
    expect(mockState.calls.select).toContainEqual({
      table: "profils",
      fields: "id, nom",
    });
  });

  it("fetchPlayers retourne les joueurs", async () => {
    queueTableResponse("utilisateurs", {
      data: [{ id: "u1", pseudo: "MageNoir" }],
      error: null,
    });

    const { result } = renderHook(() => useCampaignPjListData());
    const players = await result.current.fetchPlayers();

    expect(players).toEqual([{ id: "u1", pseudo: "MageNoir" }]);
    expect(mockState.calls.select).toContainEqual({
      table: "utilisateurs",
      fields: "id, pseudo",
    });
  });

  it("retourne [] en cas d erreur", async () => {
    queueTableResponse("profils", {
      data: null,
      error: new Error("boom"),
    });

    const { result } = renderHook(() => useCampaignPjListData());
    const profils = await result.current.fetchProfils();

    expect(profils).toEqual([]);
  });
});
