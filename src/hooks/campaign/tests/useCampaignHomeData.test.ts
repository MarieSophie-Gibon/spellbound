import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  queueByTable: new Map<string, Array<{ data: unknown; error: unknown }>>(),
  calls: {
    from: [] as string[],
    eq: [] as Array<{ table: string; column: string; value: unknown }>,
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
    eq: vi.fn((column: string, value: unknown) => {
      mockState.calls.eq.push({ table, column, value });
      return query;
    }),
    in: vi.fn((column: string, values: unknown[]) => {
      mockState.calls.in.push({ table, column, values });
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

import { useCampaignHomeData } from "@/hooks/campaign/useCampaignHomeData";

function queueTableResponse(table: string, response: { data: unknown; error: unknown }) {
  const queue = mockState.queueByTable.get(table) ?? [];
  queue.push(response);
  mockState.queueByTable.set(table, queue);
}

describe("useCampaignHomeData", () => {
  beforeEach(() => {
    mockState.queueByTable.clear();
    mockState.calls.from = [];
    mockState.calls.eq = [];
    mockState.calls.in = [];
  });

  it("retourne les membres mappes id/pseudo", async () => {
    queueTableResponse("campaign_members", {
      data: [{ user_id: "u1" }, { user_id: "u2" }],
      error: null,
    });
    queueTableResponse("utilisateurs", {
      data: [
        { id: "u1", pseudo: "Alice" },
        { id: "u2", pseudo: "Bob" },
      ],
      error: null,
    });

    const { result } = renderHook(() => useCampaignHomeData());
    const members = await result.current.fetchCampaignMembers("camp-1");

    expect(members).toEqual([
      { id: "u1", pseudo: "Alice" },
      { id: "u2", pseudo: "Bob" },
    ]);
    expect(mockState.calls.eq).toContainEqual({
      table: "campaign_members",
      column: "campaign_id",
      value: "camp-1",
    });
    expect(mockState.calls.in).toContainEqual({
      table: "utilisateurs",
      column: "id",
      values: ["u1", "u2"],
    });
  });

  it("retourne [] si campaign_members est vide", async () => {
    queueTableResponse("campaign_members", { data: [], error: null });

    const { result } = renderHook(() => useCampaignHomeData());
    const members = await result.current.fetchCampaignMembers("camp-empty");

    expect(members).toEqual([]);
    expect(mockState.calls.from).toEqual(["campaign_members"]);
  });

  it("retourne les voies associees par ids", async () => {
    queueTableResponse("voies", {
      data: [
        { id: "v1", nom: "Voie de la Lame" },
        { id: "v2", nom: "Voie des Ombres" },
      ],
      error: null,
    });

    const { result } = renderHook(() => useCampaignHomeData());
    const voies = await result.current.fetchVoiesByIds(["v1", "v2"]);

    expect(voies).toEqual([
      { id: "v1", nom: "Voie de la Lame" },
      { id: "v2", nom: "Voie des Ombres" },
    ]);
    expect(mockState.calls.in).toContainEqual({
      table: "voies",
      column: "id",
      values: ["v1", "v2"],
    });
  });

  it("retourne [] sans requete voies si ids vide", async () => {
    const { result } = renderHook(() => useCampaignHomeData());
    const voies = await result.current.fetchVoiesByIds([]);

    expect(voies).toEqual([]);
    expect(mockState.calls.from).toEqual([]);
  });
});
