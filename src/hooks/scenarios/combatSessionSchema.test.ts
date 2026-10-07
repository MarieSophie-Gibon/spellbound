import { describe, expect, it } from "vitest";
import { isSafeImageUrl, sanitizeEvent, sanitizeSlice, sanitizeSnapshot } from "@/hooks/scenarios/combatSessionSchema";

const combatant = {
  id: "c1",
  entityId: "e1",
  type: "monster",
  name: "Gobelin",
  imageUrl: "https://example.supabase.co/storage/v1/object/public/img.png",
  initiative: 12,
  pv: 7,
  pvMax: 9,
  defense: 13,
  conditions: ["prone"],
  details: { stats: {} },
};

describe("combatSessionSchema", () => {
  it("accepts well-formed slices", () => {
    expect(sanitizeSlice("combatants", [combatant])).toEqual({ ok: true, value: [combatant] });
    expect(sanitizeSlice("activeCombatantId", null).ok).toBe(true);
    expect(sanitizeSlice("round", 3).ok).toBe(true);
    expect(sanitizeSlice("mapTokens", [{ combatantId: "c1", x: 10, y: 90 }]).ok).toBe(true);
    expect(sanitizeSlice("fogReveals", [{ x: 1, y: 2, r: 5, strokeId: 1 }]).ok).toBe(true);
    expect(sanitizeSlice("roundTriggers", [{ id: "t", label: "Renforts", roundsLeft: 2, createdAt: 1 }]).ok).toBe(true);
    expect(sanitizeSlice("battlemapUrl", "https://cdn.example.com/map.jpg").ok).toBe(true);
    expect(sanitizeSlice("combatants", [{ ...combatant, imageUrl: "", entityId: null, defense: null }]).ok).toBe(true);
  });

  it("rejects malformed or out-of-range slices", () => {
    expect(sanitizeSlice("combatants", [{ ...combatant, type: "dragon" }]).ok).toBe(false);
    expect(sanitizeSlice("combatants", [{ ...combatant, conditions: ["cursed"] }]).ok).toBe(false);
    expect(sanitizeSlice("combatants", [{ ...combatant, pv: "7" }]).ok).toBe(false);
    expect(sanitizeSlice("combatants", [{ ...combatant, imageUrl: "javascript:alert(1)" }]).ok).toBe(false);
    expect(sanitizeSlice("round", 0).ok).toBe(false);
    expect(sanitizeSlice("round", 2.5).ok).toBe(false);
    expect(sanitizeSlice("mapTokens", [{ combatantId: "c1", x: 1e9, y: 0 }]).ok).toBe(false);
    expect(sanitizeSlice("fogEnabled", "true").ok).toBe(false);
    expect(sanitizeSlice("combatNote", "x".repeat(20_001)).ok).toBe(false);
  });

  it("only allows http(s), data:image and site-relative image URLs", () => {
    expect(isSafeImageUrl("https://a.b/c.png")).toBe(true);
    expect(isSafeImageUrl("data:image/png;base64,AAAA")).toBe(true);
    expect(isSafeImageUrl("/images/token.png")).toBe(true);
    expect(isSafeImageUrl("//evil.example/x.png")).toBe(false);
    expect(isSafeImageUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeImageUrl("data:text/html,<script>")).toBe(false);
  });

  it("keeps only known and valid slices of a snapshot", () => {
    expect(sanitizeSnapshot({ round: 2, combatNote: 42, hacked: true })).toEqual({ round: 2 });
    expect(sanitizeSnapshot("nope")).toEqual({});
  });

  it("validates combatant patches and drag previews", () => {
    expect(sanitizeEvent("combatants-patch", { upserts: [combatant] })).toEqual({ ok: true, value: { upserts: [combatant], removed: [] } });
    expect(sanitizeEvent("combatants-patch", { removed: [1] }).ok).toBe(false);
    expect(sanitizeEvent("drag-preview", null)).toEqual({ ok: true, value: null });
    expect(sanitizeEvent("drag-preview", { c1: { x: 5, y: 6 } }).ok).toBe(true);
    expect(sanitizeEvent("drag-preview", { c1: { x: "5", y: 6 } }).ok).toBe(false);
    expect(sanitizeEvent("ping", { id: 1, x: 10, y: 20, extra: "x" })).toEqual({ ok: true, value: { id: 1, x: 10, y: 20 } });
    expect(sanitizeEvent("ping", { id: "1", x: 10, y: 20 }).ok).toBe(false);
    expect(sanitizeEvent("ping", { id: 1, x: 500, y: 20 }).ok).toBe(false);
  });
});
