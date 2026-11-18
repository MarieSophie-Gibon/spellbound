import { describe, expect, it } from "vitest";
import {
  candidatesFromBlocks,
  cardsFromCombatants,
  characterRevealKind,
  createReveal,
  revealCardsFromBlock,
} from "@/lib/streamReveal";

describe("cardsFromCombatants", () => {
  it("regroupe les exemplaires d'un même monstre et ignore PJ, familiers et cachés", () => {
    const cards = cardsFromCombatants([
      { type: "monster", name: "Gobelin 1", entityId: "gob", imageUrl: "gob.png" },
      { type: "monster", name: "Gobelin 2", entityId: "gob" },
      { type: "monster", name: "Gobelin 3", entityId: "gob" },
      { type: "npc", name: "Sorcière", entityId: "sor" },
      { type: "monster", name: "Ogre", entityId: "ogre", hidden: true },
      { type: "pj", name: "Aria" },
      { type: "familier", name: "Corbeau" },
    ]);
    expect(cards).toEqual([
      { name: "Gobelin", imageUrl: "gob.png", count: 3, kind: "monster" },
      { name: "Sorcière", imageUrl: null, count: 1, kind: "npc" },
    ]);
  });

  it("regroupe par nom quand il n'y a pas d'entité source", () => {
    const cards = cardsFromCombatants([
      { type: "monster", name: "Loup 1" },
      { type: "monster", name: "Loup 2", imageUrl: "loup.png" },
    ]);
    expect(cards).toEqual([{ name: "Loup", imageUrl: "loup.png", count: 2, kind: "monster" }]);
  });
});

describe("candidatesFromBlocks", () => {
  const blocks = [
    { id: "a", type: "npc", data: { nom: "Ysolde", imageUrl: "y.png" } },
    { id: "b", type: "location", data: { title: "Myrlune", imageUrl: "m.png" } },
    { id: "c", type: "enemy", data: { nom: "Liche" } },
    { id: "d", type: "npc", data: { nom: "ysolde", imageUrl: "y.png" } },
    { id: "e", type: "npc", data: {} },
  ];

  it("ne garde que les PNJ / ennemis nommés, sans doublon", () => {
    const { candidates } = candidatesFromBlocks(blocks);
    expect(candidates.map((c) => c.key)).toEqual(["a", "c"]);
  });

  it("le bloc cliqué est pré-sélectionné, même quand c'est un doublon", () => {
    expect(candidatesFromBlocks(blocks, "c").selectedKey).toBe("c");
    expect(candidatesFromBlocks(blocks, "d").selectedKey).toBe("a");
  });
});

describe("characterRevealKind", () => {
  it("npc seulement si toutes les cartes sont des PNJ", () => {
    expect(characterRevealKind([{ name: "A", imageUrl: null, kind: "npc" }])).toBe("npc");
    expect(
      characterRevealKind([
        { name: "A", imageUrl: null, kind: "npc" },
        { name: "B", imageUrl: null, kind: "monster" },
      ]),
    ).toBe("monster");
  });
});

describe("revealCardsFromBlock", () => {
  it("PNJ et ennemi : nom requis, image facultative", () => {
    expect(revealCardsFromBlock({ id: "1", type: "npc", data: {} })).toBeNull();
    expect(revealCardsFromBlock({ id: "1", type: "npc", data: { nom: "Ysolde" } })).toEqual({
      kind: "npc",
      cards: [{ name: "Ysolde", imageUrl: null, kind: "npc" }],
    });
    expect(revealCardsFromBlock({ id: "2", type: "enemy", data: { nom: "Liche", imageUrl: "l.png" } })?.kind).toBe("monster");
    expect(revealCardsFromBlock({ id: "3", type: "enemy", data: { nom: "Brigand", entityType: "npc" } })?.kind).toBe("npc");
  });

  it("lieu et image : image requise, titre ou légende facultatifs", () => {
    expect(revealCardsFromBlock({ id: "1", type: "location", data: { title: "Myrlune" } })).toBeNull();
    expect(revealCardsFromBlock({ id: "1", type: "location", data: { title: "Myrlune", imageUrl: "m.png" } })).toEqual({
      kind: "location",
      cards: [{ name: "Myrlune", imageUrl: "m.png" }],
    });
    expect(revealCardsFromBlock({ id: "2", type: "image", data: { url: "i.png" } })).toEqual({
      kind: "image",
      cards: [{ name: "", imageUrl: "i.png" }],
    });
  });

  it("les autres blocs ne se révèlent pas", () => {
    expect(revealCardsFromBlock({ id: "1", type: "text", data: { text: "..." } })).toBeNull();
  });
});

describe("createReveal", () => {
  it("le nom masqué ne s'applique qu'aux PNJ et monstres", () => {
    expect(createReveal("s", "monster", [], true).nameHidden).toBe(true);
    expect(createReveal("s", "location", [], true).nameHidden).toBe(false);
  });
});
