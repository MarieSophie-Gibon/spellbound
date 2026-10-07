import { act, renderHook } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Handler = (msg: { payload: unknown }) => void;

const mockChannel = vi.hoisted(() => {
  const state = {
    broadcastHandlers: new Map<string, (msg: { payload: unknown }) => void>(),
    presenceSync: null as null | (() => void),
    sent: [] as Array<{ event: string; payload: Record<string, unknown> }>,
    tracked: null as unknown,
    subscribeCb: null as null | ((status: string) => void),
    presence: {} as Record<string, Array<Record<string, unknown>>>,
  };
  const channel = {
    state: "joined",
    on(type: string, filter: { event: string }, cb: Handler & (() => void)) {
      if (type === "broadcast") state.broadcastHandlers.set(filter.event, cb);
      if (type === "presence") state.presenceSync = cb;
      return channel;
    },
    subscribe(cb: (status: string) => void) {
      state.subscribeCb = cb;
      channel.state = "joined";
      cb("SUBSCRIBED");
      return channel;
    },
    send: vi.fn(async (msg: { event: string; payload: Record<string, unknown> }) => {
      state.sent.push({ event: msg.event, payload: msg.payload });
      return "ok";
    }),
    track: vi.fn(async (payload: unknown) => {
      state.tracked = payload;
      return "ok";
    }),
    presenceState: () => state.presence,
  };
  return { state, channel };
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    channel: vi.fn(() => mockChannel.channel),
    removeChannel: vi.fn(async () => "ok"),
    getChannels: vi.fn(() => []),
    realtime: { setAuth: vi.fn(async () => {}) },
  },
}));

import { type CombatSnapshot, useCombatSession, usePublishSlice } from "@/hooks/scenarios/useCombatSession";

function emit(event: string, payload: unknown) {
  const handler = mockChannel.state.broadcastHandlers.get(event) as Handler | undefined;
  act(() => handler?.({ payload }));
}

async function renderSession(overrides: Partial<Parameters<typeof useCombatSession>[0]> = {}) {
  const onRemoteSlice = vi.fn();
  const onRemoteSnapshot = vi.fn();
  const getSnapshot = vi.fn(() => ({ round: 3 }) as CombatSnapshot);
  const hook = renderHook(() =>
    useCombatSession({
      chapitreId: "chap-1",
      enabled: true,
      userId: "user-1",
      name: "MJ",
      role: "MJ",
      getSnapshot,
      onRemoteSlice,
      onRemoteSnapshot,
      ...overrides,
    }),
  );
  // La connexion est différée (minuteur puis promesse) : on la laisse se faire.
  await act(async () => {
    vi.advanceTimersByTime(0);
    for (let i = 0; i < 5; i++) await Promise.resolve();
  });
  return { hook, onRemoteSlice, onRemoteSnapshot, getSnapshot };
}

describe("useCombatSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockChannel.state.broadcastHandlers.clear();
    mockChannel.state.sent.length = 0;
    mockChannel.state.presence = {};
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not open a channel for a mount that is immediately unmounted (StrictMode)", async () => {
    const { supabase } = await import("@/lib/supabase");
    const channelSpy = vi.mocked(supabase.channel);
    channelSpy.mockClear();
    const hook = renderHook(() =>
      useCombatSession({
        chapitreId: "chap-1", enabled: true, userId: "u", name: "MJ", role: "MJ",
        getSnapshot: () => ({}), onRemoteSlice: vi.fn(), onRemoteSnapshot: vi.fn(),
      }),
    );
    hook.unmount();
    await act(async () => {
      vi.advanceTimersByTime(0);
      for (let i = 0; i < 5; i++) await Promise.resolve();
    });
    expect(channelSpy).not.toHaveBeenCalled();
  });

  it("asks peers for the current state on join and ignores publishes until synced", async () => {
    const { hook } = await renderSession();

    expect(mockChannel.state.sent[0]).toMatchObject({ event: "sync-request" });
    expect(hook.result.current.status).toBe("syncing");

    act(() => hook.result.current.publishSlice("round", 2));
    expect(mockChannel.state.sent.filter((m) => m.event === "slice")).toHaveLength(0);
  });

  it("becomes ready alone after the sync timeout, then publishes slices", async () => {
    const { hook } = await renderSession();

    act(() => { vi.advanceTimersByTime(1600); });
    expect(hook.result.current.isReady).toBe(true);

    act(() => hook.result.current.publishSlice("round", 2));
    expect(mockChannel.state.sent.at(-1)).toMatchObject({ event: "slice", payload: { slice: "round", value: 2 } });
  });

  it("applies a snapshot addressed to it and becomes ready", async () => {
    const { hook, onRemoteSnapshot } = await renderSession();
    const me = mockChannel.state.sent[0].payload.from as string;

    emit("sync-snapshot", { from: "other", to: "someone-else", snapshot: { round: 9 } });
    expect(onRemoteSnapshot).not.toHaveBeenCalled();

    emit("sync-snapshot", { from: "other", to: me, snapshot: { round: 4 } });
    expect(onRemoteSnapshot).toHaveBeenCalledWith({ round: 4 });
    expect(hook.result.current.isReady).toBe(true);
  });

  it("forwards remote slices from other clients only", async () => {
    const { onRemoteSlice } = await renderSession();
    const me = mockChannel.state.sent[0].payload.from as string;

    emit("slice", { from: me, slice: "round", value: 5 });
    expect(onRemoteSlice).not.toHaveBeenCalled();

    emit("slice", { from: "other", slice: "round", value: 5 });
    expect(onRemoteSlice).toHaveBeenCalledWith("round", 5);
  });

  it("answers sync requests only once synced itself", async () => {
    const { hook, getSnapshot } = await renderSession();

    emit("sync-request", { from: "late" });
    expect(mockChannel.state.sent.some((m) => m.event === "sync-snapshot")).toBe(false);

    act(() => { vi.advanceTimersByTime(1600); });
    expect(hook.result.current.isReady).toBe(true);

    emit("sync-request", { from: "late" });
    expect(getSnapshot).toHaveBeenCalled();
    expect(mockChannel.state.sent.at(-1)).toMatchObject({
      event: "sync-snapshot",
      payload: { to: "late", snapshot: { round: 3 } },
    });
  });
});

describe("useCombatSession events", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockChannel.state.broadcastHandlers.clear();
    mockChannel.state.sent.length = 0;
    mockChannel.state.presence = {};
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("publishes and receives events such as combatant patches", async () => {
    const onRemoteEvent = vi.fn();
    const { hook } = await renderSession({ onRemoteEvent });
    const me = mockChannel.state.sent[0].payload.from as string;
    act(() => { vi.advanceTimersByTime(1600); });

    act(() => hook.result.current.publishEvent("drag-preview", { a: { x: 1, y: 2 } }));
    expect(mockChannel.state.sent.at(-1)).toMatchObject({ event: "event", payload: { event: "drag-preview", data: { a: { x: 1, y: 2 } } } });

    emit("event", { from: me, event: "combatants-patch", data: {} });
    expect(onRemoteEvent).not.toHaveBeenCalled();

    emit("event", { from: "other", event: "combatants-patch", data: { removed: ["x"] } });
    expect(onRemoteEvent).toHaveBeenCalledWith("combatants-patch", { upserts: [], removed: ["x"] });

    emit("event", { from: "other", event: "combatants-patch", data: { removed: [42] } });
    expect(onRemoteEvent).toHaveBeenCalledTimes(1);

    emit("event", { from: "other", event: "ping", data: { id: 5, x: 30, y: 40 } });
    expect(onRemoteEvent).toHaveBeenLastCalledWith("ping", { id: 5, x: 30, y: 40 });
  });
});

describe("useCombatSession security and robustness", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockChannel.state.broadcastHandlers.clear();
    mockChannel.state.sent.length = 0;
    mockChannel.state.presence = {};
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("joins the channel as private after refreshing realtime auth", async () => {
    const { supabase } = await import("@/lib/supabase");
    vi.mocked(supabase.channel).mockClear();
    await renderSession();
    expect(supabase.realtime.setAuth).toHaveBeenCalled();
    expect(vi.mocked(supabase.channel).mock.calls[0][1]).toMatchObject({ config: { private: true } });
  });

  it("ignores invalid slices and keeps only valid slices of a snapshot", async () => {
    const { onRemoteSlice, onRemoteSnapshot } = await renderSession();
    const me = mockChannel.state.sent[0].payload.from as string;

    emit("slice", { from: "other", slice: "round", value: "boom" });
    emit("slice", { from: "other", slice: "battlemapUrl", value: "javascript:alert(1)" });
    emit("slice", { from: "other", slice: "unknown", value: 1 });
    expect(onRemoteSlice).not.toHaveBeenCalled();

    emit("sync-snapshot", { from: "other", to: me, snapshot: { round: 2, mapTokens: "nope", combatNote: "ok" } });
    expect(onRemoteSnapshot).toHaveBeenCalledWith({ round: 2, combatNote: "ok" });
  });

  it("asks again for the current state after a reconnection and accepts it", async () => {
    const { hook, onRemoteSnapshot } = await renderSession();
    const me = mockChannel.state.sent[0].payload.from as string;
    act(() => { vi.advanceTimersByTime(1600); });
    expect(hook.result.current.isReady).toBe(true);

    // Une session prête ignore un état complet non sollicité…
    emit("sync-snapshot", { from: "other", to: me, snapshot: { round: 7 } });
    expect(onRemoteSnapshot).not.toHaveBeenCalled();

    // …mais après une coupure, elle redemande l'état et l'accepte.
    act(() => mockChannel.state.subscribeCb?.("CHANNEL_ERROR"));
    expect(hook.result.current.status).toBe("error");
    mockChannel.state.sent.length = 0;
    act(() => mockChannel.state.subscribeCb?.("SUBSCRIBED"));
    expect(mockChannel.state.sent[0]).toMatchObject({ event: "sync-request" });

    // Pendant sa resynchronisation, elle ne répond pas aux demandes des autres.
    emit("sync-request", { from: "late" });
    expect(mockChannel.state.sent.some((m) => m.event === "sync-snapshot")).toBe(false);

    emit("sync-snapshot", { from: "other", to: me, snapshot: { round: 8 } });
    expect(onRemoteSnapshot).toHaveBeenCalledWith({ round: 8 });
    expect(hook.result.current.status).toBe("ready");
  });

  it("queues changes made during an outage, then reapplies and sends them after the resync", async () => {
    const onRemoteEvent = vi.fn();
    const { hook, onRemoteSlice } = await renderSession({ onRemoteEvent });
    const me = mockChannel.state.sent[0].payload.from as string;
    act(() => { vi.advanceTimersByTime(1600); });

    // Coupure : le canal n'est plus rejoint.
    mockChannel.channel.state = "errored";
    act(() => mockChannel.state.subscribeCb?.("CHANNEL_ERROR"));
    mockChannel.state.sent.length = 0;
    act(() => {
      hook.result.current.publishSlice("round", 4);
      hook.result.current.publishSlice("round", 5);
      hook.result.current.publishEvent("tokens-patch", { upserts: [{ combatantId: "a", x: 1, y: 2 }], removed: [] });
      hook.result.current.publishEvent("drag-preview", { a: { x: 1, y: 2 } });
    });
    expect(mockChannel.state.sent).toHaveLength(0);

    // Reconnexion : demande d'état, puis l'état reçu est appliqué avant les modifications mises de côté.
    act(() => mockChannel.state.subscribeCb?.("SUBSCRIBED"));
    expect(mockChannel.state.sent.map((m) => m.event)).toEqual(["sync-request"]);
    emit("sync-snapshot", { from: "other", to: me, snapshot: { round: 9 } });

    expect(onRemoteSlice).toHaveBeenCalledWith("round", 5);
    expect(onRemoteEvent).toHaveBeenCalledWith("tokens-patch", { upserts: [{ combatantId: "a", x: 1, y: 2 }], removed: [] });
    expect(mockChannel.state.sent.map((m) => m.event)).toEqual(["sync-request", "slice", "event"]);
    expect(mockChannel.state.sent[1].payload).toMatchObject({ slice: "round", value: 5 });
  });

  it("sends follow-up messages only to the joining session, after the snapshot", async () => {
    const getSnapshotFollowUps = () => [{ event: "fog-patch" as const, data: { reset: true, upserts: [], removed: [] } }];
    await renderSession({ getSnapshotFollowUps });
    act(() => { vi.advanceTimersByTime(1600); });
    mockChannel.state.sent.length = 0;

    emit("sync-request", { from: "late" });
    expect(mockChannel.state.sent.map((m) => m.event)).toEqual(["sync-snapshot", "event"]);
    expect(mockChannel.state.sent[1].payload).toMatchObject({ to: "late", event: "fog-patch" });
  });

  it("ignores events addressed to another session", async () => {
    const onRemoteEvent = vi.fn();
    const { hook } = await renderSession({ onRemoteEvent });
    const me = mockChannel.state.sent[0].payload.from as string;
    act(() => { vi.advanceTimersByTime(1600); });
    expect(hook.result.current.isReady).toBe(true);

    const data = { reset: true, upserts: [], removed: [] };
    emit("event", { from: "other", to: "someone-else", event: "fog-patch", data });
    expect(onRemoteEvent).not.toHaveBeenCalled();
    emit("event", { from: "other", to: me, event: "fog-patch", data });
    expect(onRemoteEvent).toHaveBeenCalledWith("fog-patch", data);
  });

  it("shows the role of other sessions and who is acting", async () => {
    const { hook } = await renderSession();
    act(() => { vi.advanceTimersByTime(1600); });
    mockChannel.state.presence = {
      other: [{ clientId: "other", userId: "u2", name: "Alex", role: "co-MJ", joinedAt: 1, presence_ref: "a" }],
    };
    act(() => mockChannel.state.presenceSync?.());
    expect(hook.result.current.peers[0]).toMatchObject({ name: "Alex", role: "co-MJ", active: false });

    emit("slice", { from: "other", slice: "round", value: 2 });
    act(() => { vi.advanceTimersByTime(500); });
    expect(hook.result.current.peers[0].active).toBe(true);

    act(() => { vi.advanceTimersByTime(2500); });
    expect(hook.result.current.peers[0].active).toBe(false);
  });

  it("elects the earliest session present as the only database writer", async () => {
    const { hook } = await renderSession();
    act(() => { vi.advanceTimersByTime(1600); });
    expect(hook.result.current.isPrimaryWriter).toBe(true);

    const tracked = mockChannel.state.tracked as { joinedAt: number };
    mockChannel.state.presence = {
      older: [{ clientId: "older", userId: "u2", name: "Co-MJ", joinedAt: tracked.joinedAt - 1000, presence_ref: "a" }],
    };
    act(() => mockChannel.state.presenceSync?.());
    expect(hook.result.current.peers.map((p) => p.name)).toEqual(["Co-MJ"]);
    expect(hook.result.current.isPrimaryWriter).toBe(false);

    mockChannel.state.presence = {
      newer: [{ clientId: "newer", userId: "u2", name: "Co-MJ", joinedAt: tracked.joinedAt + 1000, presence_ref: "b" }],
    };
    act(() => mockChannel.state.presenceSync?.());
    expect(hook.result.current.isPrimaryWriter).toBe(true);
  });
});

describe("usePublishSlice", () => {
  it("publishes local changes but not values just applied from the network", () => {
    const publish = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }: { value: unknown }) => {
        const remoteRef = useRef<CombatSnapshot>({});
        usePublishSlice("combatants", value, publish, remoteRef);
        return remoteRef;
      },
      { initialProps: { value: [] as unknown } },
    );
    expect(publish).not.toHaveBeenCalled();

    const local = [{ id: "a" }];
    rerender({ value: local });
    expect(publish).toHaveBeenCalledWith("combatants", local);

    const remote = [{ id: "b" }];
    result.current.current.combatants = remote;
    rerender({ value: remote });
    expect(publish).toHaveBeenCalledTimes(1);
    expect("combatants" in result.current.current).toBe(false);
  });
});
