import { describe, expect, it } from "vitest";
import {
  applyFogPatch,
  applyTokensPatch,
  chunkFogForTransfer,
  diffFogStrokes,
  diffTokens,
  stampsToStrokes,
  strokesToStamps,
} from "./sessionPatches";

describe("sessionPatches – tokens", () => {
  it("diffs and applies moved, added and removed tokens", () => {
    const prev = [{ combatantId: "a", x: 1, y: 1 }, { combatantId: "b", x: 2, y: 2 }];
    const next = [{ combatantId: "a", x: 5, y: 1 }, { combatantId: "c", x: 3, y: 3 }];
    const patch = diffTokens(prev, next);
    expect(patch).toEqual({ upserts: [{ combatantId: "a", x: 5, y: 1 }, { combatantId: "c", x: 3, y: 3 }], removed: ["b"] });
    expect(applyTokensPatch(prev, patch)).toEqual(next);
  });

  it("merges two concurrent moves of different tokens", () => {
    const base = [{ combatantId: "a", x: 1, y: 1 }, { combatantId: "b", x: 2, y: 2 }];
    const fromMj = diffTokens(base, [{ combatantId: "a", x: 9, y: 9 }, base[1]]);
    const fromCoMj = diffTokens(base, [base[0], { combatantId: "b", x: 8, y: 8 }]);
    const merged = applyTokensPatch(applyTokensPatch(base, fromMj), fromCoMj);
    expect(merged).toEqual([{ combatantId: "a", x: 9, y: 9 }, { combatantId: "b", x: 8, y: 8 }]);
  });
});

describe("sessionPatches – fog", () => {
  const stamps = [
    { x: 1, y: 1, r: 5, strokeId: 10 },
    { x: 2, y: 2, r: 5, strokeId: 10 },
    { x: 7, y: 7, r: 3, strokeId: 20 },
  ];

  it("round-trips stamps and strokes", () => {
    expect(strokesToStamps(stampsToStrokes(stamps))).toEqual(stamps);
  });

  it("detects extended, new and removed strokes", () => {
    const prev = stampsToStrokes(stamps);
    const next = stampsToStrokes([
      ...stamps.slice(0, 2),
      { x: 3, y: 3, r: 5, strokeId: 10 },
      { x: 9, y: 9, r: 4, strokeId: 30 },
    ]);
    const patch = diffFogStrokes(prev, next);
    expect(patch.upserts.map((s) => s.id)).toEqual([10, 30]);
    expect(patch.removed).toEqual([20]);
  });

  it("merges strokes painted at the same time by two MJ", () => {
    const fromMj = { reset: false, upserts: [{ id: 100, r: 5, points: [{ x: 1, y: 1 }] }], removed: [] };
    const fromCoMj = { reset: false, upserts: [{ id: 200, r: 5, points: [{ x: 2, y: 2 }] }], removed: [] };
    const merged = stampsToStrokes(applyFogPatch(applyFogPatch(stamps, fromMj), fromCoMj));
    expect(merged.map((s) => s.id)).toEqual([10, 20, 100, 200]);
  });

  it("applies a reset", () => {
    expect(applyFogPatch(stamps, { reset: true, upserts: [], removed: [] })).toEqual([]);
  });

  it("chunks the whole fog for a joining session, first chunk resetting", () => {
    const strokes = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      r: 4,
      points: Array.from({ length: 900 }, (_, j) => ({ x: j / 10 + 0.123456, y: 1 })),
    }));
    const chunks = chunkFogForTransfer(strokes, 2000);
    expect(chunks.length).toBe(3);
    expect(chunks.map((c) => c.reset)).toEqual([true, false, false]);
    expect(chunks.flatMap((c) => c.upserts).map((s) => s.id)).toEqual([0, 1, 2, 3, 4]);
    expect(chunks[0].upserts[0].points[0].x).toBe(0.12);
    expect(chunkFogForTransfer([])).toEqual([{ reset: true, upserts: [], removed: [] }]);
  });
});
