import { describe, expect, it } from "vitest";
import { angleDiff, coneTip, directionFromMove, parseVisionMeters, visibleCellKeys } from "./visionMath";
import { DEFAULT_GRID, mergeVision, normalizeVision, type BattleMapGrid, type VisionState } from "./types";

// Image carrée, cases de 10 % : grille 10 × 10, centres à 5, 15, 25…
const grid: BattleMapGrid = { ...DEFAULT_GRID, enabled: true, cellSize: 10, offsetX: 0, offsetY: 0 };
const center = { x: 55, y: 55 }; // case (5,5)

describe("angleDiff", () => {
  it("écart le plus court, en tenant compte du tour complet", () => {
    expect(angleDiff(10, 350)).toBe(20);
    expect(angleDiff(-90, 270)).toBe(0);
    expect(angleDiff(0, 180)).toBe(180);
  });
});

describe("visibleCellKeys", () => {
  it("cône vers la droite : cases devant, pas derrière", () => {
    const keys = visibleCellKeys(center, { range: 3, angle: 90, direction: 0 }, grid, 1);
    expect(keys).toContain("8,5"); // 3 cases devant
    expect(keys).not.toContain("9,5"); // hors portée
    expect(keys).not.toContain("2,5"); // derrière
    expect(keys).not.toContain("5,8"); // sur le côté, hors de l'ouverture
  });

  it("la case du PJ et ses voisines restent visibles, même dans son dos", () => {
    const keys = visibleCellKeys(center, { range: 3, angle: 60, direction: 0 }, grid, 1);
    expect(keys).toEqual(expect.arrayContaining(["5,5", "4,5", "4,4", "5,6"]));
  });

  it("360° : disque complet, borné à l'image", () => {
    const keys = visibleCellKeys({ x: 5, y: 5 }, { range: 2, angle: 360, direction: 0 }, grid, 1);
    expect(keys).toEqual(expect.arrayContaining(["0,0", "2,0", "0,2"]));
    expect(keys.some((k) => k.startsWith("-"))).toBe(false);
  });
});

describe("orientation", () => {
  it("d'après un déplacement (y converti avec l'aspect)", () => {
    expect(directionFromMove({ x: 10, y: 10 }, { x: 20, y: 10 }, 1)).toBe(0);
    expect(directionFromMove({ x: 10, y: 10 }, { x: 10, y: 30 }, 0.5)).toBe(90);
    expect(directionFromMove({ x: 10, y: 10 }, { x: 10.1, y: 10 }, 1)).toBeNull();
  });

  it("bout du cône", () => {
    const tip = coneTip(center, { range: 3, angle: 90, direction: 90 }, grid, 1);
    expect(tip.x).toBeCloseTo(55);
    expect(tip.y).toBeCloseTo(85);
  });
});

describe("parseVisionMeters", () => {
  it("lit la portée dans les traits du peuple", () => {
    expect(parseVisionMeters("Vision dans le noir à 20m, résistance au poison")).toBe(20);
    expect(parseVisionMeters("Nyctalope. Vision nocturne 12,5 m")).toBe(12.5);
    expect(parseVisionMeters("Résistance à la magie")).toBeNull();
    expect(parseVisionMeters(null)).toBeNull();
  });
});

describe("normalizeVision / mergeVision", () => {
  it("borne les réglages et ignore les cases invalides", () => {
    const v = normalizeVision({ enabled: true, tokens: { a: { range: 999, angle: 5, direction: 450 } }, explored: ["1,2", "x", "1,2"] });
    expect(v.tokens.a).toEqual({ range: 60, angle: 10, direction: 90 });
    expect(v.explored).toEqual(["1,2"]);
  });

  const base: VisionState = { enabled: true, tokens: {}, explored: ["0,0"], exploredResetAt: 5 };

  it("additionne les cases vues des deux MJ", () => {
    expect(mergeVision(base, { ...base, explored: ["1,1"] }).explored.sort()).toEqual(["0,0", "1,1"]);
  });

  it("un oubli plus récent fait foi", () => {
    expect(mergeVision(base, { ...base, explored: [], exploredResetAt: 9 }).explored).toEqual([]);
    expect(mergeVision({ ...base, exploredResetAt: 9 }, { ...base, explored: ["7,7"], exploredResetAt: 5 }).explored).toEqual(["0,0"]);
  });
});
