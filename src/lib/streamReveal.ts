// Révélations sur l'écran streaming (/battlemap) : un PNJ, un monstre, un groupe,
// un lieu ou une image, mis en scène par-dessus la battlemap.
//
// Tout passe par un BroadcastChannel du navigateur : aucune écriture en base.
// L'écran streaming fait foi pour la révélation en cours : il diffuse son état
// à chaque changement et sur demande, et chaque onglet MJ s'aligne dessus.

export const STREAM_REVEAL_CHANNEL = "spellbound-stream-reveal";

export type StreamRevealKind = "npc" | "monster" | "location" | "image";

export interface StreamRevealCard {
  name: string;
  imageUrl: string | null;
  /** Plusieurs exemplaires du même monstre dans un groupe (« ×3 »). */
  count?: number;
  /** PNJ ou monstre (silhouette affichée quand il n'y a pas d'image). */
  kind?: "npc" | "monster";
}

/** Une révélation de personnages est « npc » si elle ne contient que des PNJ. */
export function characterRevealKind(cards: StreamRevealCard[]): "npc" | "monster" {
  return cards.length > 0 && cards.every((c) => c.kind === "npc") ? "npc" : "monster";
}

export interface StreamReveal {
  /** Change à chaque nouvelle révélation : l'animation d'entrée est rejouée. */
  id: string;
  /** Ce qui a été révélé (bloc, rencontre) : permet d'afficher le bouton comme actif. */
  source: string;
  kind: StreamRevealKind;
  cards: StreamRevealCard[];
  /** PNJ / monstres : nom remplacé par « ??? » tant que le MJ ne le dévoile pas. */
  nameHidden: boolean;
}

export type StreamRevealMessage =
  // MJ -> écran
  | { type: "show"; reveal: StreamReveal }
  | { type: "clear" }
  | { type: "query" }
  // écran -> MJ
  | { type: "state"; reveal: StreamReveal | null }
  | { type: "closed" };

export const STREAM_SCREEN_PATH = "/battlemap";

export function isCharacterReveal(kind: StreamRevealKind) {
  return kind === "npc" || kind === "monster";
}

export function createReveal(
  source: string,
  kind: StreamRevealKind,
  cards: StreamRevealCard[],
  nameHidden = false,
): StreamReveal {
  return { id: crypto.randomUUID(), source, kind, cards, nameHidden: nameHidden && isCharacterReveal(kind) };
}

/** Données minimales d'un bloc de chapitre (voir ChapitreEditor). */
interface RevealableBlock {
  id: string;
  type: string;
  data?: Record<string, unknown> | null;
}

function str(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Ce qu'un bloc peut montrer aux joueurs, ou null s'il n'a rien à montrer :
 * PNJ / ennemi (nom, image facultative), lieu et image (image obligatoire).
 */
export function revealCardsFromBlock(
  block: RevealableBlock,
): { kind: StreamRevealKind; cards: StreamRevealCard[] } | null {
  const data = block.data ?? {};
  switch (block.type) {
    case "npc": {
      const name = str(data.nom);
      return name ? { kind: "npc", cards: [{ name, imageUrl: str(data.imageUrl), kind: "npc" }] } : null;
    }
    case "enemy": {
      const name = str(data.nom);
      if (!name) return null;
      const kind = data.entityType === "npc" ? "npc" : "monster";
      return { kind, cards: [{ name, imageUrl: str(data.imageUrl), kind }] };
    }
    case "location": {
      const imageUrl = str(data.imageUrl);
      return imageUrl ? { kind: "location", cards: [{ name: str(data.title) ?? "", imageUrl }] } : null;
    }
    case "image": {
      const imageUrl = str(data.url);
      return imageUrl ? { kind: "image", cards: [{ name: str(data.caption) ?? "", imageUrl }] } : null;
    }
    default:
      return null;
  }
}

// « Gobelin 2 » -> « Gobelin » : les exemplaires numérotés d'un même monstre.
function baseName(name: string) {
  return name.replace(/\s+\d+$/, "").trim() || name;
}

/**
 * Regroupe les combattants visibles (monstres et PNJ, pas les PJ ni les familiers
 * ni les combattants cachés) : un même monstre présent plusieurs fois donne une
 * seule carte « ×N ». La clé sert aux cases à cocher du choix des révélés.
 */
export function candidatesFromCombatants(
  combatants: Array<{ type: string; name: string; imageUrl?: string; entityId?: string; hidden?: boolean }>,
): Array<{ key: string; card: StreamRevealCard }> {
  const groups = new Map<string, StreamRevealCard>();
  for (const c of combatants) {
    if (c.hidden || (c.type !== "monster" && c.type !== "npc")) continue;
    const name = baseName(c.name);
    const key = c.entityId ?? `${c.type}:${name}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count = (existing.count ?? 1) + 1;
      if (!existing.imageUrl && c.imageUrl) existing.imageUrl = c.imageUrl;
    } else {
      groups.set(key, { name, imageUrl: c.imageUrl ?? null, count: 1, kind: c.type === "npc" ? "npc" : "monster" });
    }
  }
  return [...groups.entries()].map(([key, card]) => ({ key, card }));
}

export function cardsFromCombatants(combatants: Parameters<typeof candidatesFromCombatants>[0]): StreamRevealCard[] {
  return candidatesFromCombatants(combatants).map((c) => c.card);
}

/**
 * Candidats d'un chapitre : tous les blocs PNJ / ennemis, un même personnage
 * (même nom et même image) n'apparaissant qu'une fois.
 */
export function candidatesFromBlocks(
  blocks: RevealableBlock[],
  /** Bloc cliqué : son candidat est renvoyé dans `selectedKey`, même s'il est un doublon. */
  clickedBlockId?: string,
): { candidates: Array<{ key: string; card: StreamRevealCard }>; selectedKey: string | null } {
  const keyByIdentity = new Map<string, string>();
  const candidates: Array<{ key: string; card: StreamRevealCard }> = [];
  let selectedKey: string | null = null;
  for (const block of blocks) {
    const revealable = revealCardsFromBlock(block);
    if (!revealable || !isCharacterReveal(revealable.kind)) continue;
    const card = revealable.cards[0];
    const identity = `${card.name.toLowerCase()}|${card.imageUrl ?? ""}`;
    let key = keyByIdentity.get(identity);
    if (!key) {
      key = block.id;
      keyByIdentity.set(identity, key);
      candidates.push({ key, card });
    }
    if (block.id === clickedBlockId) selectedKey = key;
  }
  return { candidates, selectedKey };
}
