import { describe, expect, it } from "vitest";
import { gridFromCalibration } from "./gridMath";
import { DEFAULT_GRID, normalizeGrid, resetGrid } from "./types";

describe("resetGrid", () => {
  it("désactive la grille et remet taille et décalage par défaut, en gardant l'apparence", () => {
    const grid = { enabled: true, cellSize: 3.2, offsetX: 1.1, offsetY: 0.7, opacity: 0.8, color: "dark" as const, showToPlayers: false };
    expect(resetGrid(grid)).toEqual({
      ...DEFAULT_GRID,
      opacity: 0.8,
      color: "dark",
      showToPlayers: false,
    });
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
