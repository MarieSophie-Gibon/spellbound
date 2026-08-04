import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type SupabaseResponse = { data?: unknown; error?: unknown };

const mockState = vi.hoisted(() => ({
  queueByKey: new Map<string, SupabaseResponse[]>(),
  calls: {
    from: [] as string[],
    eq: [] as Array<{ table: string; column: string; value: unknown; action: string }>,
    insert: [] as Array<{ table: string; payload: unknown }>,
    update: [] as Array<{ table: string; payload: unknown }>,
    delete: [] as Array<{ table: string }>,
    ilike: [] as Array<{ table: string; column: string; value: string }>,
    storageUpload: [] as Array<{ bucket: string; path: string; options?: unknown }>,
    storagePublicUrl: [] as Array<{ bucket: string; path: string }>,
  },
  auth: {
    getUser: vi.fn(),
  },
}));

function queueResponse(key: string, response: SupabaseResponse) {
  const queue = mockState.queueByKey.get(key) ?? [];
  queue.push(response);
  mockState.queueByKey.set(key, queue);
}

function dequeueResponse(table: string, action: string) {
  const key = `${table}:${action}`;
  const queue = mockState.queueByKey.get(key);
  if (queue && queue.length > 0) {
    return queue.shift() ?? { data: [], error: null };
  }
  const tableQueue = mockState.queueByKey.get(table);
  if (tableQueue && tableQueue.length > 0) {
    return tableQueue.shift() ?? { data: [], error: null };
  }
  return { data: [], error: null };
}

function makeQuery(table: string) {
  const state = {
    action: "select",
  };

  const query = {
    select: vi.fn(() => {
      if (state.action === "insert") {
        state.action = "insertSelect";
      } else {
        state.action = "select";
      }
      return query;
    }),
    order: vi.fn(() => query),
    or: vi.fn(() => query),
    is: vi.fn(() => query),
    in: vi.fn(() => query),
    ilike: vi.fn((column: string, value: string) => {
      mockState.calls.ilike.push({ table, column, value });
      return query;
    }),
    limit: vi.fn(() => query),
    neq: vi.fn(() => query),
    eq: vi.fn((column: string, value: unknown) => {
      mockState.calls.eq.push({ table, column, value, action: state.action });
      return query;
    }),
    single: vi.fn(async () => {
      state.action = "single";
      const result = dequeueResponse(table, state.action);
      return { data: result.data ?? null, error: result.error ?? null };
    }),
    insert: vi.fn((payload: unknown) => {
      state.action = "insert";
      mockState.calls.insert.push({ table, payload });
      return query;
    }),
    update: vi.fn((payload: unknown) => {
      state.action = "update";
      mockState.calls.update.push({ table, payload });
      return query;
    }),
    delete: vi.fn(() => {
      state.action = "delete";
      mockState.calls.delete.push({ table });
      return query;
    }),
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown, reject?: (reason: unknown) => unknown) => {
      const result = dequeueResponse(table, state.action);
      return Promise.resolve({ data: result.data ?? null, error: result.error ?? null }).then(resolve, reject);
    },
  };

  return query;
}

vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      auth: {
        getUser: (...args: unknown[]) => mockState.auth.getUser(...args),
      },
      from: (table: string) => {
        mockState.calls.from.push(table);
        return makeQuery(table);
      },
      storage: {
        from: (bucket: string) => ({
          upload: async (path: string, _file: unknown, options?: unknown) => {
            mockState.calls.storageUpload.push({ bucket, path, options });
            return { error: null };
          },
          getPublicUrl: (path: string) => {
            mockState.calls.storagePublicUrl.push({ bucket, path });
            return { data: { publicUrl: `https://cdn.test/${bucket}/${path}` } };
          },
        }),
      },
    },
  };
});

import { usePersonnageCreationData } from "@/hooks/personnage/usePersonnageCreationData";

describe("usePersonnageCreationData", () => {
  beforeEach(() => {
    mockState.queueByKey.clear();
    mockState.calls.from = [];
    mockState.calls.eq = [];
    mockState.calls.insert = [];
    mockState.calls.update = [];
    mockState.calls.delete = [];
    mockState.calls.ilike = [];
    mockState.calls.storageUpload = [];
    mockState.calls.storagePublicUrl = [];
    mockState.auth.getUser.mockReset();
    mockState.auth.getUser.mockResolvedValue({ data: { user: { id: "u-1" } } });
  });

  it("getCurrentUserId retourne l id utilisateur courant", async () => {
    const { result } = renderHook(() => usePersonnageCreationData());

    const id = await result.current.getCurrentUserId();

    expect(id).toBe("u-1");
    expect(mockState.auth.getUser).toHaveBeenCalledTimes(1);
  });

  it("fetchOldPjs enrichit campaign_nom et filtre sur user_id", async () => {
    queueResponse("pj:select", {
      data: [
        { id: "pj1", name: "A", campaign_id: "c1", user_id: "u-1" },
        { id: "pj2", name: "B", campaign_id: "c2", user_id: "u-1" },
      ],
      error: null,
    });
    queueResponse("campagnes:select", {
      data: [{ id: "c1", nom: "Saga 1" }],
      error: null,
    });

    const { result } = renderHook(() => usePersonnageCreationData());
    const rows = await result.current.fetchOldPjs("current-campaign", "u-1");

    expect(rows).toEqual([
      { id: "pj1", name: "A", campaign_id: "c1", user_id: "u-1", campaign_nom: "Saga 1" },
      { id: "pj2", name: "B", campaign_id: "c2", user_id: "u-1", campaign_nom: "Campagne inconnue" },
    ]);
    expect(mockState.calls.eq).toContainEqual({
      table: "pj",
      column: "user_id",
      value: "u-1",
      action: "select",
    });
  });

  it("clonePjWithInventory cree le pj et copie son inventaire", async () => {
    queueResponse("pj:insertSelect", {
      data: [{ id: "new-pj-1" }],
      error: null,
    });
    queueResponse("pj_inventaire:select", {
      data: [{ item_type: "armure", item_id: 12, nom_custom: "Armure" }],
      error: null,
    });
    queueResponse("pj_inventaire:insert", { data: null, error: null });

    const { result } = renderHook(() => usePersonnageCreationData());
    const created = await result.current.clonePjWithInventory({
      campaignId: "c-new",
      finalUserId: "u-9",
      finalName: "Elyra",
      source: {
        id: "old-pj",
        image_url: null,
        peuple_id: "peuple1",
        profils_id: "profil1",
        stats: { niveau: 3 },
        pathways: [],
        inventory: {},
      },
    });

    expect(created).toEqual([{ id: "new-pj-1" }]);
    const inventaireInsert = mockState.calls.insert.find((c) => c.table === "pj_inventaire" && Array.isArray(c.payload));
    expect(inventaireInsert).toBeTruthy();
    expect(inventaireInsert?.payload).toEqual([
      { item_type: "armure", item_id: 12, nom_custom: "Armure", pj_id: "new-pj-1" },
    ]);
  });

  it("uploadCompendiumImage upload puis retourne l URL publique", async () => {
    const { result } = renderHook(() => usePersonnageCreationData());
    const file = new File(["img"], "avatar.png", { type: "image/png" });

    const url = await result.current.uploadCompendiumImage("pj", file);

    expect(url).toMatch(/^https:\/\/cdn\.test\/compendium\/pj\//);
    expect(mockState.calls.storageUpload).toHaveLength(1);
    expect(mockState.calls.storageUpload[0].bucket).toBe("compendium");
    expect(mockState.calls.storageUpload[0].options).toEqual({ upsert: true });
    expect(mockState.calls.storagePublicUrl).toHaveLength(1);
  });

  it("insertInventaireRows ne fait rien avec un tableau vide", async () => {
    const { result } = renderHook(() => usePersonnageCreationData());

    await result.current.insertInventaireRows([]);

    expect(mockState.calls.from).not.toContain("pj_inventaire");
  });

  it("fetchFamiliers utilise la bonne colonne pour un owner PNJ", async () => {
    queueResponse("pj_familiers:select", {
      data: [{ id: "f1", pnj_id: "pnj-1" }],
      error: null,
    });

    const { result } = renderHook(() => usePersonnageCreationData());
    const rows = await result.current.fetchFamiliers("pnj", "pnj-1");

    expect(rows).toEqual([{ id: "f1", pnj_id: "pnj-1" }]);
    expect(mockState.calls.eq).toContainEqual({
      table: "pj_familiers",
      column: "pnj_id",
      value: "pnj-1",
      action: "select",
    });
  });

  it("insertFamilier rattache au bon owner type", async () => {
    queueResponse("pj_familiers:insert", { data: null, error: null });

    const { result } = renderHook(() => usePersonnageCreationData());
    await result.current.insertFamilier("pj", "pj-77", { monster_nom: "Loup" });

    expect(mockState.calls.insert).toContainEqual({
      table: "pj_familiers",
      payload: { pj_id: "pj-77", monster_nom: "Loup" },
    });
  });

  it("saveCharacterPathways ecrit dans la bonne table", async () => {
    queueResponse("pnj:update", { data: null, error: null });

    const { result } = renderHook(() => usePersonnageCreationData());
    await result.current.saveCharacterPathways("pnj", "pnj-44", [{ voie_id: "v1", rangs_acquis: [1] }]);

    expect(mockState.calls.update).toContainEqual({
      table: "pnj",
      payload: { pathways: [{ voie_id: "v1", rangs_acquis: [1] }] },
    });
    expect(mockState.calls.eq).toContainEqual({
      table: "pnj",
      column: "id",
      value: "pnj-44",
      action: "update",
    });
  });
});
