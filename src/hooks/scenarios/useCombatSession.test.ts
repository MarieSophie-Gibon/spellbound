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
  };
  const channel = {
    on(type: string, filter: { event: string }, cb: Handler & (() => void)) {
      if (type === "broadcast") state.broadcastHandlers.set(filter.event, cb);
      if (type === "presence") state.presenceSync = cb;
      return channel;
    },
    subscribe(cb: (status: string) => void) {
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
    presenceState: () => ({}),
  };
  return { state, channel };
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    channel: vi.fn(() => mockChannel.channel),
    removeChannel: vi.fn(async () => "ok"),
  },
}));

import { type CombatSnapshot, useCombatSession, usePublishSlice } from "@/hooks/scenarios/useCombatSession";

function emit(event: string, payload: unknown) {
  const handler = mockChannel.state.broadcastHandlers.get(event) as Handler | undefined;
  act(() => handler?.({ payload }));
}

function renderSession(overrides: Partial<Parameters<typeof useCombatSession>[0]> = {}) {
  const onRemoteSlice = vi.fn();
  const onRemoteSnapshot = vi.fn();
  const getSnapshot = vi.fn(() => ({ round: 3 }) as CombatSnapshot);
  const hook = renderHook(() =>
    useCombatSession({
      chapitreId: "chap-1",
      enabled: true,
      userId: "user-1",
      name: "MJ",
      getSnapshot,
      onRemoteSlice,
      onRemoteSnapshot,
      ...overrides,
    }),
  );
  return { hook, onRemoteSlice, onRemoteSnapshot, getSnapshot };
}

describe("useCombatSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockChannel.state.broadcastHandlers.clear();
    mockChannel.state.sent.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks peers for the current state on join and ignores publishes until synced", () => {
    const { hook } = renderSession();

    expect(mockChannel.state.sent[0]).toMatchObject({ event: "sync-request" });
    expect(hook.result.current.status).toBe("syncing");

    act(() => hook.result.current.publishSlice("round", 2));
    expect(mockChannel.state.sent.filter((m) => m.event === "slice")).toHaveLength(0);
  });

  it("becomes ready alone after the sync timeout, then publishes slices", () => {
    const { hook } = renderSession();

    act(() => { vi.advanceTimersByTime(1600); });
    expect(hook.result.current.isReady).toBe(true);

    act(() => hook.result.current.publishSlice("round", 2));
    expect(mockChannel.state.sent.at(-1)).toMatchObject({ event: "slice", payload: { slice: "round", value: 2 } });
  });

  it("applies a snapshot addressed to it and becomes ready", () => {
    const { hook, onRemoteSnapshot } = renderSession();
    const me = mockChannel.state.sent[0].payload.from as string;

    emit("sync-snapshot", { from: "other", to: "someone-else", snapshot: { round: 9 } });
    expect(onRemoteSnapshot).not.toHaveBeenCalled();

    emit("sync-snapshot", { from: "other", to: me, snapshot: { round: 4 } });
    expect(onRemoteSnapshot).toHaveBeenCalledWith({ round: 4 });
    expect(hook.result.current.isReady).toBe(true);
  });

  it("forwards remote slices from other clients only", () => {
    const { onRemoteSlice } = renderSession();
    const me = mockChannel.state.sent[0].payload.from as string;

    emit("slice", { from: me, slice: "round", value: 5 });
    expect(onRemoteSlice).not.toHaveBeenCalled();

    emit("slice", { from: "other", slice: "round", value: 5 });
    expect(onRemoteSlice).toHaveBeenCalledWith("round", 5);
  });

  it("answers sync requests only from clients that joined later", () => {
    const { hook, getSnapshot } = renderSession();
    act(() => { vi.advanceTimersByTime(1600); });
    expect(hook.result.current.isReady).toBe(true);

    emit("sync-request", { from: "early", joinedAt: 0 });
    expect(mockChannel.state.sent.some((m) => m.event === "sync-snapshot")).toBe(false);

    emit("sync-request", { from: "late", joinedAt: Date.now() + 10_000 });
    expect(getSnapshot).toHaveBeenCalled();
    expect(mockChannel.state.sent.at(-1)).toMatchObject({
      event: "sync-snapshot",
      payload: { to: "late", snapshot: { round: 3 } },
    });
  });
});

describe("usePublishSlice", () => {
  it("publishes local changes but not values just applied from the network", () => {
    const publish = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }: { value: unknown }) => {
        const remoteRef = useRef<CombatSnapshot>({});
        usePublishSlice("combatants", value, true, publish, remoteRef);
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
