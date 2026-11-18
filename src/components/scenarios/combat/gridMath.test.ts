import { describe, expect, it } from "vitest";
import { cellAt, cellCenter, formatGridDistance, gridDistance, gridFromCalibration, snapToCell } from "./gridMath";
import { DEFAULT_GRID, normalizeGrid, resetGrid, type BattleMapGrid } from "./types";

describe("resetGrid", () => {
  it("désactive la grille et remet taille et décalage par défaut, en gardant les préférences", () => {
    const grid: BattleMapGrid = {
      enabled: true, cellSize: 3.2, offsetX: 1.1, offsetY: 0.7, opacity: 0.8, color: "dark", showToPlayers: false,
      snapTokens: false, metersPerCell: 2, diagonalRule: "alternate",
    };
    expect(resetGrid(grid)).toEqual({
      ...DEFAULT_GRID,
      opacity: 0.8,
      color: "dark",
      showToPlayers: false,
      snapTokens: false,
      metersPerCell: 2,
      diagonalRule: "alternate",
    });
  });
});

describe("cases et aimantation", () => {
  // Cases de 10 % de la largeur, décalées de 2 ; image 2:1 (aspect 0,5).
  const grid: BattleMapGrid = { ...DEFAULT_GRID, enabled: true, cellSize: 10, offsetX: 2, offsetY: 2 };
  const aspect = 0.5;

  it("trouve la case d'un point (y converti en unités de largeur)", () => {
    expect(cellAt({ x: 13, y: 30 }, grid, aspect)).toEqual({ col: 1, row: 1 }); // y : 30 % de hauteur = 15 de largeur
    expect(cellAt({ x: 1, y: 1 }, grid, aspect)).toEqual({ col: -1, row: -1 }); // bande partielle avant le décalage
  });

  it("centre d'une case et aimantation", () => {
    expect(cellCenter({ col: 1, row: 1 }, grid, aspect)).toEqual({ x: 17, y: 34 });
    expect(snapToCell({ x: 13, y: 30 }, grid, aspect)).toEqual({ x: 17, y: 34 });
  });

  it("l'aimantation ne sort jamais de l'image", () => {
    const snapped = snapToCell({ x: 1, y: 1 }, grid, aspect);
    expect(snapped.x).toBeGreaterThanOrEqual(0);
    expect(snapped.y).toBeGreaterThanOrEqual(0);
  });
});

describe("gridDistance", () => {
  const o = { col: 0, row: 0 };
  it("lignes droites : identique pour toutes les règles", () => {
    for (const rule of ["one", "alternate", "euclidean"] as const) {
      expect(gridDistance(o, { col: 4, row: 0 }, rule)).toBe(4);
      expect(gridDistance(o, { col: 0, row: -3 }, rule)).toBe(3);
    }
  });
  it("diagonales : 1 case", () => {
    expect(gridDistance(o, { col: 3, row: 3 }, "one")).toBe(3);
    expect(gridDistance(o, { col: 5, row: 2 }, "one")).toBe(5);
  });
  it("diagonales : alternance 1-2-1", () => {
    expect(gridDistance(o, { col: 1, row: 1 }, "alternate")).toBe(1);
    expect(gridDistance(o, { col: 2, row: 2 }, "alternate")).toBe(3);
    expect(gridDistance(o, { col: 3, row: 3 }, "alternate")).toBe(4);
    expect(gridDistance(o, { col: 5, row: 2 }, "alternate")).toBe(6); // 3 droites + 2 diagonales (1 + 2)
  });
  it("diagonales : distance réelle", () => {
    expect(gridDistance(o, { col: 3, row: 4 }, "euclidean")).toBe(5);
    expect(gridDistance(o, { col: 1, row: 1 }, "euclidean")).toBe(1.4);
  });
});

describe("formatGridDistance", () => {
  it("cases et mètres", () => {
    expect(formatGridDistance(1, 1.5)).toBe("1 case · 1,5 m");
    expect(formatGridDistance(4, 1.5)).toBe("4 cases · 6 m");
    expect(formatGridDistance(1.4, 1.5)).toBe("1,4 case · 2,1 m");
  });
});

describe("gridFromCalibration", () => {
  it("déduit taille et décalage d'une case tracée (image carrée)", () => {
    const g = gridFromCalibration({ x: 12, y: 7 }, { x: 17, y: 12 }, 1, 1, 1);
    expect(g?.cellSize).toBeCloseTo(5);
    expect(g?.offsetX).toBeCloseTo(2);
    expect(g?.offsetY).toBeCloseTo(2);
  });

  it("convertit la hauteur en unités de largeur (image 2:1)", () => {
    // Image deux fois plus large que haute : 10 % de hauteur = 5 % de largeur.
    const g = gridFromCalibration({ x: 10, y: 20 }, { x: 15, y: 30 }, 0.5, 1, 1);
    expect(g?.cellSize).toBeCloseTo(5);
    expect(g?.offsetY).toBeCloseTo(0); // 20 % de hauteur = 10 % de largeur = 2 cases pile
  });

  it("divise par le nombre de cases tracées, quel que soit le sens du tracé", () => {
    const g = gridFromCalibration({ x: 40, y: 40 }, { x: 10, y: 20 }, 1, 6, 4);
    expect(g?.cellSize).toBeCloseTo(5);
    expect(g?.offsetX).toBeCloseTo(0);
  });

  it("ignore un tracé trop petit", () => {
    expect(gridFromCalibration({ x: 10, y: 10 }, { x: 10.1, y: 10.1 }, 1, 1, 1)).toBeNull();
  });
});

describe("normalizeGrid", () => {
  it("complète les valeurs manquantes et borne la taille", () => {
    const g = normalizeGrid({ enabled: true, cellSize: 999 });
    expect(g.enabled).toBe(true);
    expect(g.cellSize).toBe(25);
    expect(g.showToPlayers).toBe(true);
  });

  it("ramène le décalage dans une case", () => {
    expect(normalizeGrid({ cellSize: 5, offsetX: 12, offsetY: -1 })).toMatchObject({ offsetX: 2, offsetY: 4 });
  });

  it("accepte une valeur absente ou invalide", () => {
    expect(normalizeGrid(undefined).enabled).toBe(false);
    expect(normalizeGrid("n'importe quoi").cellSize).toBe(5);
  });
});
