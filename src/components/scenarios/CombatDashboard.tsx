/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { useCombatDashboardData } from "@/hooks/scenarios/useCombatDashboardData";
import {
  type Combatant,
  type CombatFamilier,
  type ChapitreBlock,
  type EncounterEntry,
  type FogRevealStamp,
  type MapToken,
  type MonsterStatsMap,
  type PersistedCombatState,
  type RoundTriggerEvent,
  type SearchResult,
  clampTokenFace,
  type VoieEntry,
  makeCombatantId,
  toNumber,
} from "./combat/types";
import { CombatTabButton } from "./combat/CombatTabButton";
import { CombatantRow } from "./combat/CombatantRow";
import { CombatantCard } from "./combat/CombatantCard";
import { CombatMenu } from "./combat/CombatMenu";
import { BattleMap } from "./combat/BattleMap";
import { CombatTopActions } from "./combat/CombatTopActions";
import { RoundTriggerPanel } from "./combat/RoundTriggerPanel";
import { CombatTriggerNotification } from "./combat/CombatTriggerNotification";
import { CombatStickyNote } from "./combat/CombatStickyNote";
import { useGrimoirePopup } from "@/contexts/GrimoirePopupContext";
import type { RpgSystem } from "@/lib/types/rpgSystem";

interface CombatDashboardProps {
  chapitreId: string;
  campaignId: string;
  campaignSystem: RpgSystem;
  onBackToScenario?: () => void;
}

type FloatingCardPosition = { x: number; y: number };

const STORAGE_PREFIX = "spellbound:combat-dashboard:";

function getStorageKey(chapitreId: string): string {
  return `${STORAGE_PREFIX}${chapitreId}`;
}

function sortCombatants(combatants: Combatant[]): Combatant[] {
  return [...combatants].sort((a, b) => {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    return a.name.localeCompare(b.name);
  });
}

function normalizeCombatState(
  raw: Partial<PersistedCombatState> | null | undefined,
  fallbackNotePosition: { x: number; y: number }
): PersistedCombatState {
  return {
    combatants: Array.isArray(raw?.combatants) ? raw.combatants : [],
    activeCombatantId: raw?.activeCombatantId ?? null,
    round: toNumber(raw?.round, 1),
    battlemapUrl: raw?.battlemapUrl ?? null,
    mapTokens: raw?.mapTokens ?? [],
    encounters: raw?.encounters ?? [],
    fogEnabled: raw?.fogEnabled ?? false,
    fogReveals: raw?.fogReveals ?? [],
    combatNote: raw?.combatNote ?? "",
    combatNotePosition: raw?.combatNotePosition ?? fallbackNotePosition,
    roundTriggers: raw?.roundTriggers ?? [],
  };
}

export function CombatDashboard({ chapitreId, campaignId, campaignSystem, onBackToScenario }: CombatDashboardProps) {
  const combatData = useCombatDashboardData();
  const { openPopup } = useGrimoirePopup();
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [activeCombatantId, setActiveCombatantId] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [selectedCombatantId, setSelectedCombatantId] = useState<string | null>(null);

  const [battlemapUrl, setBattlemapUrl] = useState<string | null>(null);
  const [mapTokens, setMapTokens] = useState<MapToken[]>([]);
  const [encounters, setEncounters] = useState<EncounterEntry[]>([]);
  const [fogEnabled, setFogEnabled] = useState(false);
  const [fogReveals, setFogReveals] = useState<FogRevealStamp[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchType, setSearchType] = useState<"monster" | "npc">("monster");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [, setLoadingSearch] = useState(false);
  const [importingCompany, setImportingCompany] = useState(false);
  const [importingEngaged, setImportingEngaged] = useState(false);
  const [familierResults, setFamilierResults] = useState<Array<{ id: string; name: string; image_url: string | null; pv_max: number; pv: number; owner: string; data: Record<string, unknown> | null }>>([]);
  const [cardPositions, setCardPositions] = useState<Record<string, FloatingCardPosition>>({});
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const cardDragRef = useRef<{ combatantId: string; offsetX: number; offsetY: number } | null>(null);

  const [combatNote, setCombatNote] = useState("");
  const [isNoteVisible, setIsNoteVisible] = useState(false);
  const [notePosition, setNotePosition] = useState<FloatingCardPosition>({ x: 32, y: 110 });
  const [isDraggingNote, setIsDraggingNote] = useState(false);
  const noteRef = useRef<HTMLDivElement>(null);
  const noteDragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  const [isTriggerPanelOpen, setIsTriggerPanelOpen] = useState(false);
  const [roundTriggers, setRoundTriggers] = useState<RoundTriggerEvent[]>([]);
  const [newTriggerRounds, setNewTriggerRounds] = useState("1");
  const [newTriggerText, setNewTriggerText] = useState("");
  const [firedTriggerMessage, setFiredTriggerMessage] = useState<string | null>(null);

  const [isHydrated, setIsHydrated] = useState(false);
  const hasAutoImportedRef = useRef(false);
  const latestPayloadRef = useRef<PersistedCombatState | null>(null);

  // Drag-and-drop manual ordering
  const [manualOrder, setManualOrder] = useState<string[] | null>(null);
  const currentOrderRef = useRef<string[]>([]);

  const orderedCombatants = useMemo(() => {
    let result: Combatant[];
    if (manualOrder) {
      const byId = new Map(combatants.map((c) => [c.id, c]));
      const ordered = manualOrder.map((id) => byId.get(id)).filter(Boolean) as Combatant[];
      const inOrder = new Set(manualOrder);
      const rest = combatants.filter((c) => !inOrder.has(c.id));
      result = [...ordered, ...rest];
    } else {
      result = sortCombatants(combatants);
    }
    currentOrderRef.current = result.map((c) => c.id);
    return result;
  }, [combatants, manualOrder]);
  const selectedCombatant = useMemo(
    () => orderedCombatants.find((c) => c.id === selectedCombatantId) ?? null,
    [orderedCombatants, selectedCombatantId]
  );

  const getDefaultCardPosition = (): FloatingCardPosition => {
    if (typeof window === "undefined") return { x: 960, y: 170 };
    return {
      x: Math.max(16, window.innerWidth - 460),
      y: Math.max(80, Math.round(window.innerHeight * 0.12)),
    };
  };

  const getDefaultNotePosition = (): FloatingCardPosition => {
    if (typeof window === "undefined") return { x: 24, y: 110 };
    return {
      x: Math.max(16, Math.round(window.innerWidth * 0.08)),
      y: 110,
    };
  };

  useEffect(() => {
    if (!selectedCombatantId) return;
    setCardPositions((prev) => {
      if (prev[selectedCombatantId]) return prev;
      return { ...prev, [selectedCombatantId]: getDefaultCardPosition() };
    });
  }, [selectedCombatantId]);

  useEffect(() => {
    if (!selectedCombatantId) return;

    const clampSelectedCard = () => {
      const cardRect = cardRef.current?.getBoundingClientRect();
      if (!cardRect) return;

      setCardPositions((prev) => {
        const current = prev[selectedCombatantId] ?? getDefaultCardPosition();

        const minX = 8;
        const minY = 8;
        const maxX = Math.max(minX, window.innerWidth - cardRect.width - 8);
        const maxY = Math.max(minY, window.innerHeight - cardRect.height - 8);

        const x = Math.max(minX, Math.min(maxX, current.x));
        const y = Math.max(minY, Math.min(maxY, current.y));

        if (x === current.x && y === current.y) return prev;
        return { ...prev, [selectedCombatantId]: { x, y } };
      });
    };

    const frame = requestAnimationFrame(clampSelectedCard);
    window.addEventListener("resize", clampSelectedCard);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", clampSelectedCard);
    };
  }, [selectedCombatantId, selectedCombatant]);

  useEffect(() => {
    if (!draggingCardId) return;

    const onMove = (e: PointerEvent) => {
      const drag = cardDragRef.current;
      const cardRect = cardRef.current?.getBoundingClientRect();
      if (!drag || !cardRect) return;

      const minX = 8;
      const minY = 8;
      const maxX = Math.max(minX, window.innerWidth - cardRect.width - 8);
      const maxY = Math.max(minY, window.innerHeight - cardRect.height - 8);

      const x = Math.max(minX, Math.min(maxX, e.clientX - drag.offsetX));
      const y = Math.max(minY, Math.min(maxY, e.clientY - drag.offsetY));

      setCardPositions((prev) => ({ ...prev, [drag.combatantId]: { x, y } }));
    };

    const stopDrag = () => {
      setDraggingCardId(null);
      cardDragRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };
  }, [draggingCardId]);

  useEffect(() => {
    if (!isDraggingNote) return;

    const onMove = (e: PointerEvent) => {
      const drag = noteDragRef.current;
      const noteRect = noteRef.current?.getBoundingClientRect();
      if (!drag || !noteRect) return;

      const minX = 8;
      const minY = 8;
      const maxX = Math.max(minX, window.innerWidth - noteRect.width - 8);
      const maxY = Math.max(minY, window.innerHeight - noteRect.height - 8);

      const x = Math.max(minX, Math.min(maxX, e.clientX - drag.offsetX));
      const y = Math.max(minY, Math.min(maxY, e.clientY - drag.offsetY));

      setNotePosition({ x, y });
    };

    const stopDrag = () => {
      setIsDraggingNote(false);
      noteDragRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };
  }, [isDraggingNote]);

  useEffect(() => {
    const clampNote = () => {
      const noteRect = noteRef.current?.getBoundingClientRect();
      if (!noteRect) return;

      setNotePosition((prev) => {
        const minX = 8;
        const minY = 8;
        const maxX = Math.max(minX, window.innerWidth - noteRect.width - 8);
        const maxY = Math.max(minY, window.innerHeight - noteRect.height - 8);

        const x = Math.max(minX, Math.min(maxX, prev.x));
        const y = Math.max(minY, Math.min(maxY, prev.y));
        if (x === prev.x && y === prev.y) return prev;
        return { x, y };
      });
    };

    const frame = requestAnimationFrame(clampNote);
    window.addEventListener("resize", clampNote);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", clampNote);
    };
  }, [isNoteVisible]);

  const startCardDrag = (e: React.PointerEvent, combatantId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    cardDragRef.current = {
      combatantId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    setDraggingCardId(combatantId);
  };

  // --- Bootstrap (Supabase → localStorage) ---
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const chapterData = await combatData.fetchChapitreCombatAndContent(chapitreId);
        const dbStateRaw = (chapterData?.combat_state ?? null) as Partial<PersistedCombatState> | null;

        if (dbStateRaw && typeof dbStateRaw === "object") {
          const normalized = normalizeCombatState(dbStateRaw, getDefaultNotePosition());
          setCombatants(normalized.combatants);
          setActiveCombatantId(normalized.activeCombatantId);
          setRound(normalized.round);
          setBattlemapUrl(normalized.battlemapUrl ?? null);
          setMapTokens(normalized.mapTokens ?? []);
          setEncounters(normalized.encounters ?? []);
          setFogEnabled(normalized.fogEnabled ?? false);
          setFogReveals(normalized.fogReveals ?? []);
          setCombatNote(normalized.combatNote ?? "");
          setNotePosition(normalized.combatNotePosition ?? getDefaultNotePosition());
          setRoundTriggers(normalized.roundTriggers ?? []);
          setIsHydrated(true);
          return;
        }
      } catch (error) {
        console.error("CombatDashboard bootstrap error:", error);
      }

      const raw = localStorage.getItem(getStorageKey(chapitreId));
      if (!raw) { setIsHydrated(true); return; }

      try {
        const parsed = JSON.parse(raw) as PersistedCombatState;
        if (!parsed || typeof parsed !== "object") { setIsHydrated(true); return; }
        const normalized = normalizeCombatState(parsed, getDefaultNotePosition());
        setCombatants(normalized.combatants);
        setActiveCombatantId(normalized.activeCombatantId);
        setRound(normalized.round);
        setBattlemapUrl(normalized.battlemapUrl ?? null);
        setMapTokens(normalized.mapTokens ?? []);
        setEncounters(normalized.encounters ?? []);
        setFogEnabled(normalized.fogEnabled ?? false);
        setFogReveals(normalized.fogReveals ?? []);
        setCombatNote(normalized.combatNote ?? "");
        setNotePosition(normalized.combatNotePosition ?? getDefaultNotePosition());
        setRoundTriggers(normalized.roundTriggers ?? []);
      } catch { /* ignore */ } finally { setIsHydrated(true); }
    };
    void bootstrap();
  }, [chapitreId, combatData]);

  useEffect(() => {
    const unsubscribe = combatData.subscribeChapitreCombatState(chapitreId, (incomingRaw) => {
      if (!incomingRaw || typeof incomingRaw !== "object") return;

      const normalized = normalizeCombatState(
        incomingRaw as Partial<PersistedCombatState>,
        { x: 32, y: 110 },
      );

      const incomingSig = JSON.stringify(normalized);
      const localSig = latestPayloadRef.current ? JSON.stringify(latestPayloadRef.current) : null;
      if (localSig && localSig === incomingSig) return;

      setCombatants(normalized.combatants);
      setActiveCombatantId(normalized.activeCombatantId);
      setRound(normalized.round);
      setBattlemapUrl(normalized.battlemapUrl ?? null);
      setMapTokens(normalized.mapTokens ?? []);
      setEncounters(normalized.encounters ?? []);
      setFogEnabled(normalized.fogEnabled ?? false);
      setFogReveals(normalized.fogReveals ?? []);
      setCombatNote(normalized.combatNote ?? "");
      setNotePosition(normalized.combatNotePosition ?? { x: 32, y: 110 });
      setRoundTriggers(normalized.roundTriggers ?? []);
      latestPayloadRef.current = normalized;
    });

    return unsubscribe;
  }, [chapitreId, combatData]);

  const persistCombatState = useCallback(async (payload: PersistedCombatState) => {
    await combatData.updateChapitreCombatState(chapitreId, payload);
  }, [chapitreId, combatData]);

  // --- Persist ---
  useEffect(() => {
    if (!isHydrated) return;
    const payload: PersistedCombatState = {
      combatants,
      activeCombatantId,
      round,
      battlemapUrl,
      mapTokens,
      encounters,
      fogEnabled,
      fogReveals,
      combatNote,
      combatNotePosition: notePosition,
      roundTriggers,
    };
    latestPayloadRef.current = payload;
    localStorage.setItem(getStorageKey(chapitreId), JSON.stringify(payload));
    const timer = setTimeout(() => {
      void persistCombatState(payload);
    }, 400);
    return () => clearTimeout(timer);
  }, [chapitreId, combatants, activeCombatantId, round, battlemapUrl, mapTokens, encounters, fogEnabled, fogReveals, isHydrated, combatNote, notePosition, roundTriggers, persistCombatState]);

  useEffect(() => {
    return () => {
      if (!isHydrated) return;
      const payload = latestPayloadRef.current;
      if (!payload) return;
      void persistCombatState(payload);
    };
  }, [isHydrated, persistCombatState]);

  // --- Encounter tracking (monstres/PNJ effectivement rencontrés) ---
  useEffect(() => {
    if (!isHydrated) return;

    setEncounters((prev) => {
      const known = new Map(prev.map((e) => [e.key, e]));
      let changed = false;

      for (const c of combatants) {
        if (c.type !== "monster" && c.type !== "npc") continue;
        const key = `${c.type}:${c.entityId ?? c.id}`;
        if (known.has(key)) continue;

        known.set(key, {
          key,
          entityId: c.entityId,
          type: c.type,
          name: c.name,
          imageUrl: c.imageUrl,
          firstSeenAt: Date.now(),
        });
        changed = true;
      }

      if (!changed) return prev;
      return [...known.values()].sort((a, b) => b.firstSeenAt - a.firstSeenAt);
    });
  }, [combatants, isHydrated]);

  // --- Guard: combatant actif doit toujours exister, et on démarre par le premier ---
  useEffect(() => {
    if (orderedCombatants.length === 0) { setActiveCombatantId(null); return; }
    const stillExists = orderedCombatants.some((c) => c.id === activeCombatantId);
    if (!stillExists || activeCombatantId === null) setActiveCombatantId(orderedCombatants[0].id);
  }, [orderedCombatants, activeCombatantId]);

  // --- Recherche debounced ---
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        if (searchType === "monster") {
          const data = await combatData.searchMonsters(campaignId, searchTerm);
          setSearchResults((data ?? []).map((m) => ({
            id: m.id, name: m.nom, image_url: m.image_url, type: "monster" as const,
            combat: m.combat, stats: m.stats, attaques: m.attaques, capacites: m.capacites,
          })));
        } else {
          const data = await combatData.searchNpcs(campaignId, searchTerm);
          setSearchResults((data ?? []).map((npc) => ({
            id: npc.id, name: npc.name, image_url: npc.image_url, type: "npc" as const, stats: npc.stats, pathways: npc.pathways,
          })));
        }
      } finally { setLoadingSearch(false); }
    }, searchTerm.trim() ? 250 : 0);
    return () => clearTimeout(timer);
  }, [searchType, searchTerm, campaignId, combatData]);

  // --- Helpers ---
  // const upsertCombatants = useCallback((newEntries: Combatant[]) => {
  //   if (newEntries.length === 0) return;
  //   setCombatants((prev) => {
  //     const existingKeys = new Set(prev.map((c) => `${c.type}:${c.entityId ?? c.id}`));
  //     const unique = newEntries.filter((c) => !existingKeys.has(`${c.type}:${c.entityId ?? c.id}`));
  //     return unique.length > 0 ? [...prev, ...unique] : prev;
  //   });
  //   setIsMenuOpen(false);
  // }, []);

  // --- Hydratation : re-fetch TOUJOURS les stats fraîches des PJs depuis la DB ---
  useEffect(() => {
    if (!isHydrated) return;

    const allPJs = combatants.filter((c) => c.type === "pj" && c.entityId);
    const allNPCs = combatants.filter((c) => c.type === "npc" && c.entityId);

    if (allPJs.length === 0 && allNPCs.length === 0) return;

    const run = async () => {
      if (allPJs.length > 0) {
        const ids = allPJs.map((c) => c.entityId!);
        const [data, pjFamData] = await Promise.all([
          combatData.fetchPjRows(ids),
          combatData.fetchPjFamiliers(ids),
        ]);
        const famsByPJ = new Map<string, CombatFamilier[]>();
        for (const f of pjFamData ?? []) {
          const list = famsByPJ.get(f.pj_id) ?? [];
          list.push({ id: f.id, name: f.custom_name || f.monster_nom, image_url: f.monster_image_url, pv: f.pv, pv_max: f.pv_max, data: f.data ?? null });
          famsByPJ.set(f.pj_id, list);
        }
        if (data?.length) {
          const voiesPerPJ = await Promise.all(data.map((r) => fetchVoiesForPathways(r.pathways)));
          setCombatants((prev) =>
            prev.map((c) => {
              if (c.type !== "pj") return c;
              const idx = data.findIndex((d) => d.id === c.entityId);
              if (idx < 0) return c;
              const row = data[idx];
              return {
                ...c,
                defense: toNumber(row.stats?.defense, 0),
                initiative: toNumber(row.stats?.initiative, c.initiative),
                pvMax: toNumber(row.stats?.pv_max ?? row.stats?.pv, c.pvMax),
                pjStats: buildPJStats(row),
                voies: voiesPerPJ[idx],
                familiers: famsByPJ.get(row.id) ?? [],
                ...getTokenFaceFromStats(row.stats),
              };
            })
          );
        }
      }
      if (allNPCs.length > 0) {
        const ids = allNPCs.map((c) => c.entityId!);
        const [data, npcFamData] = await Promise.all([
          combatData.fetchPnjRows(ids),
          combatData.fetchPnjFamiliers(ids),
        ]);
        const famsByNPC = new Map<string, CombatFamilier[]>();
        for (const f of npcFamData ?? []) {
          const list = famsByNPC.get(f.pnj_id) ?? [];
          list.push({ id: f.id, name: f.custom_name || f.monster_nom, image_url: f.monster_image_url, pv: f.pv, pv_max: f.pv_max, data: f.data ?? null });
          famsByNPC.set(f.pnj_id, list);
        }
        if (data?.length) {
          const voiesPerNPC = await Promise.all(data.map((r) => fetchVoiesForPathways(r.pathways)));
          setCombatants((prev) =>
            prev.map((c) => {
              if (c.type !== "npc") return c;
              const idx = data.findIndex((d) => d.id === c.entityId);
              if (idx < 0) return c;
              return {
                ...c,
                voies: voiesPerNPC[idx],
                pjStats: buildPJStats(data[idx]),
                familiers: famsByNPC.get(data[idx].id) ?? [],
                ...getTokenFaceFromStats(data[idx].stats),
              };
            })
          );
        }
      }
    };

    void run().then(() => {
      // Après hydratation, repart du premier combatant (initiative la plus haute)
      setActiveCombatantId(null);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]);

  // Fetch voies depuis les pathways [{ voie_id, rangs_acquis }]
  const fetchVoiesForPathways = useCallback(async (pathways: Array<{ voie_id: string; rangs_acquis?: number[] }> | null): Promise<VoieEntry[]> => {
    if (!pathways?.length) return [];
    const ids = pathways.map((p) => p.voie_id).filter(Boolean);
    if (!ids.length) return [];
    const data = await combatData.fetchVoiesByIds(ids);
    if (!data) return [];
    return data.map((v) => ({
      id: v.id,
      nom: v.nom,
      type: v.type,
      capacites: (v.capacites as VoieEntry["capacites"]) ?? {},
      rangsAcquis: pathways
        .filter((p) => p.voie_id === v.id)
        .flatMap((p) => p.rangs_acquis ?? [])
        .filter((r) => r > 0),
    }));
  }, [combatData]);

  const importEngagedEnemies = useCallback(async () => {
    setImportingEngaged(true);
    try {
      const blocks = (await combatData.fetchChapitreContent(chapitreId)) as ChapitreBlock[];

      const monsterIds = new Set<string>();
      const npcIds = new Set<string>();

      // 1. On liste tous les monstres/PNJs DÉJÀ PRÉSENTS dans le dashboard
      combatants.forEach(c => {
        if (c.entityId) {
          if (c.type === "monster") monsterIds.add(c.entityId);
          if (c.type === "npc") npcIds.add(c.entityId);
        }
      });

      // 2. On ajoute ceux issus des blocs marqués comme "engagés"
      blocks.forEach(b => {
        if (b.type === "enemy" && b.data?.combatEngaged && b.data?.entityId) {
          if (b.data.entityType === "monster") monsterIds.add(b.data.entityId);
          if (b.data.entityType === "npc") npcIds.add(b.data.entityId);
        }
      });

      // 3. Fetch groupé des données fraîches (évite le spam N+1 requêtes)
      const [monsterRows, npcRows] = await Promise.all([
        monsterIds.size > 0 
          ? combatData.fetchBestiaireByIds(Array.from(monsterIds))
          : Promise.resolve([]),
        npcIds.size > 0 
          ? combatData.fetchNpcsByIds(Array.from(npcIds))
          : Promise.resolve([])
      ]);

      const monstersMap = new Map((monsterRows ?? []).map(m => [m.id, m]));
      const npcsMap = new Map((npcRows ?? []).map(n => [n.id, n]));

      const npcsVoies = new Map<string, VoieEntry[]>();
      if (npcRows && npcRows.length > 0) {
        await Promise.all(npcRows.map(async (n) => {
          npcsVoies.set(n.id, await fetchVoiesForPathways(n.pathways));
        }));
      }

      setCombatants((prev) => {
        const next = [...prev];
        const existingKeys = new Set<string>();

        // 4. MISE À JOUR des existants avec les nouvelles stats du bestiaire
        for (let i = 0; i < next.length; i++) {
          const c = next[i];
          if (!c.entityId) continue;
          
          existingKeys.add(`${c.type}:${c.entityId}`);

          const m = monstersMap.get(c.entityId);
          const n = npcsMap.get(c.entityId);

          if (c.type === "monster" && m) {
            const pvMax = toNumber(m.combat?.pv_max ?? m.combat?.pv, c.pvMax);
            next[i] = {
              ...c,
              imageUrl: m.image_url ?? c.imageUrl,
              pvMax,
              defense: toNumber(m.combat?.defense, c.defense),
              // On conserve 'c.pv' et 'c.initiative' pour ne pas ruiner le combat en cours
              details: { stats: m.stats, combat: m.combat, attaques: m.attaques, capacites: m.capacites },
              ...getTokenFaceFromStats(m.stats),
            };
          } else if (c.type === "npc" && n) {
            const pvMax = toNumber(n.stats?.pv_max ?? n.stats?.pv, c.pvMax);
            next[i] = {
              ...c,
              imageUrl: n.image_url ?? c.imageUrl,
              pvMax,
              defense: toNumber(n.stats?.defense, c.defense),
              pjStats: buildPJStats({ stats: n.stats }),
              voies: npcsVoies.get(n.id) ?? c.voies,
              ...getTokenFaceFromStats(n.stats),
            };
          }
        }

        // 5. AJOUT des nouveaux issus des blocs qui n'étaient pas encore dans le dashboard
        for (const b of blocks) {
          if (b.type !== "enemy" || !b.data?.combatEngaged || !b.data?.entityId) continue;
          
          const eId = b.data.entityId;
          const type = b.data.entityType;
          const key = `${type}:${eId}`;

          if (existingKeys.has(key)) continue;

          const m = monstersMap.get(eId);
          const n = npcsMap.get(eId);

          if (type === "monster" && m) {
            const pvMax = toNumber(m.combat?.pv_max ?? m.combat?.pv, 10);
            next.push({
              id: makeCombatantId(), entityId: m.id, type: "monster", name: m.nom,
              imageUrl: m.image_url ?? b.data.imageUrl, initiative: toNumber(m.combat?.initiative, 0),
              pv: pvMax, pvMax, defense: toNumber(m.combat?.defense, 0), conditions: [],
              tactics: b.data.comportement, notes: b.data.notes,
              details: { stats: m.stats, combat: m.combat, attaques: m.attaques, capacites: m.capacites },
              ...getTokenFaceFromStats(m.stats),
            });
            existingKeys.add(key);
          } else if (type === "npc" && n) {
            const pvMax = toNumber(n.stats?.pv_max ?? n.stats?.pv, 10);
            next.push({
              id: makeCombatantId(), entityId: n.id, type: "npc", name: n.name,
              imageUrl: n.image_url ?? b.data.imageUrl, initiative: toNumber(n.stats?.initiative, 0),
              pv: pvMax, pvMax, defense: toNumber(n.stats?.defense, 0), conditions: [],
              tactics: b.data.comportement, notes: b.data.notes,
              pjStats: buildPJStats({ stats: n.stats }), voies: npcsVoies.get(n.id) ?? [],
              ...getTokenFaceFromStats(n.stats),
            });
            existingKeys.add(key);
          }
        }

        return next;
      });

    } catch (err) {
      console.error("Error importing/refreshing engaged enemies", err);
    } finally {
      setImportingEngaged(false);
    }
  }, [chapitreId, combatData, fetchVoiesForPathways, combatants]);

  function getTokenFaceFromStats(stats: any): { tokenFaceZoom: number; tokenFaceOffsetX: number; tokenFaceOffsetY: number } {
    const nested = stats?.token_face ?? null;
    const normalized = clampTokenFace({
      zoom: stats?.token_face_zoom ?? nested?.zoom,
      offsetX: stats?.token_face_offset_x ?? nested?.offsetX,
      offsetY: stats?.token_face_offset_y ?? nested?.offsetY,
    });

    return {
      tokenFaceZoom: normalized.zoom,
      tokenFaceOffsetX: normalized.offsetX,
      tokenFaceOffsetY: normalized.offsetY,
    };
  }

  function buildPJStats(pjRow: { stats: any }) {
    return {
      caracteristiques: pjRow.stats?.caracteristiques ?? {},
      initiative: toNumber(pjRow.stats?.initiative, 0),
      att_contact: toNumber(pjRow.stats?.att_contact, 0),
      att_distance: toNumber(pjRow.stats?.att_distance, 0),
      att_magie: toNumber(pjRow.stats?.att_magie, 0),
      pm: toNumber(pjRow.stats?.pm, 0),
      pm_max: toNumber(pjRow.stats?.pm_max ?? pjRow.stats?.pm, 0),
      pc: toNumber(pjRow.stats?.pc, 0),
      dr_qty: toNumber(pjRow.stats?.dr_qty, 0),
      dr_de: pjRow.stats?.dr_de ?? "d6",
      niveau: toNumber(pjRow.stats?.niveau, 1),
      is_combatant: pjRow.stats?.is_combatant === true,
      combat_stats_mode: pjRow.stats?.combat_stats_mode as "simple" | "extended" | undefined,
      attaques: Array.isArray(pjRow.stats?.attaques) ? pjRow.stats.attaques : [],
      capacites_speciales: Array.isArray(pjRow.stats?.capacites_speciales) ? pjRow.stats.capacites_speciales : [],
    };
  }

  // ── Fetch familiers de la campagne ────────────────────────────────────────
  const fetchFamiliersForMenu = async () => {
    const [pjs, pnjs] = await Promise.all([
      combatData.fetchCampaignPjsNames(campaignId),
      combatData.fetchCampaignPnjsNames(campaignId),
    ]);
    const pjIds = (pjs ?? []).map((p) => (p as { id: string }).id);
    const pnjIds = (pnjs ?? []).map((p) => (p as { id: string }).id);
    const pjMap = new Map((pjs ?? []).map((p) => [(p as { id: string; name: string }).id, (p as { id: string; name: string }).name]));
    const pnjMap = new Map((pnjs ?? []).map((p) => [(p as { id: string; name: string }).id, (p as { id: string; name: string }).name]));

    const results: typeof familierResults = [];

    if (pjIds.length > 0) {
      const fams = await combatData.fetchFamiliersByPjIds(pjIds);
      for (const f of fams ?? []) {
        results.push({ id: f.id, name: f.custom_name || f.monster_nom, image_url: f.monster_image_url, pv_max: f.pv_max, pv: f.pv, owner: pjMap.get(f.pj_id) ?? "PJ", data: f.data });
      }
    }
    if (pnjIds.length > 0) {
      const fams = await combatData.fetchFamiliersByPnjIds(pnjIds);
      for (const f of fams ?? []) {
        results.push({ id: f.id, name: f.custom_name || f.monster_nom, image_url: f.monster_image_url, pv_max: f.pv_max, pv: f.pv, owner: pnjMap.get(f.pnj_id) ?? "PNJ", data: f.data });
      }
    }
    setFamilierResults(results);
  };

  const addFamilierToCombat = (f: typeof familierResults[number]) => {
    const d = f.data as any;
    const pvMax = f.pv_max;
    const tokenFace = getTokenFaceFromStats(d?.stats ?? d ?? null);
    const newEntry: Combatant = {
      id: makeCombatantId(),
      entityId: f.id,
      type: "familier",
      name: f.name,
      imageUrl: f.image_url ?? undefined,
      initiative: toNumber(d?.combat?.initiative, 0),
      pv: f.pv,
      pvMax,
      defense: toNumber(d?.combat?.defense, 0),
      conditions: [],
      details: {
        stats: d?.stats ?? undefined,
        combat: d?.combat ?? undefined,
        attaques: d?.attaques ?? [],
        capacites: d?.capacites ?? [],
      },
      ...tokenFace,
    };
    setCombatants((prev) => [...prev, newEntry]);
    setIsMenuOpen(false);
  };

  const importCompany = useCallback(async () => {
    setImportingCompany(true);
    try {
      const rows = await combatData.fetchCampaignPjs(campaignId);
      // Fetch toutes les voies en parallèle
      const voiesPerPJ = await Promise.all(
        rows.map((pj) => fetchVoiesForPathways(pj.pathways))
      );

      setCombatants((prev) => {
        const result = [...prev];
        rows.forEach((pj, i) => {
          const pvMax = toNumber(pj.stats?.pv_max ?? pj.stats?.pv, 10);
          const voies = voiesPerPJ[i];
          const existingIdx = result.findIndex(
            (c) => c.type === "pj" && c.entityId === pj.id
          );
          if (existingIdx >= 0) {
            result[existingIdx] = {
              ...result[existingIdx],
              name: pj.name,
              imageUrl: pj.image_url ?? result[existingIdx].imageUrl,
              pvMax,
              defense: toNumber(pj.stats?.defense, 0),
              pjStats: buildPJStats(pj),
              voies,
              ...getTokenFaceFromStats(pj.stats),
            };
          } else {
            result.push({
              id: makeCombatantId(),
              entityId: pj.id,
              type: "pj" as const,
              name: pj.name,
              imageUrl: pj.image_url,
              initiative: toNumber(pj.stats?.initiative, 0),
              pv: pvMax, pvMax,
              defense: toNumber(pj.stats?.defense, 0),
              conditions: [],
              pjStats: buildPJStats(pj),
              voies,
              ...getTokenFaceFromStats(pj.stats),
            });
          }
        });
        return result;
      });
      setIsMenuOpen(false);
    } catch (err) { console.error("Error importing company", err); }
    finally { setImportingCompany(false); }
  }, [campaignId, combatData, fetchVoiesForPathways]);

  // --- Auto-import au premier chargement ---
  useEffect(() => {
    if (!isHydrated || hasAutoImportedRef.current) return;
    if (combatants.length > 0) {
      hasAutoImportedRef.current = true;
      return;
    }
    hasAutoImportedRef.current = true;
    void (async () => {
      await importCompany();
      await importEngagedEnemies();
    })();
  }, [isHydrated, combatants.length, importCompany, importEngagedEnemies]);

  const addEnemyFromSearch = async (result: SearchResult) => {
    const pvMax = toNumber(result.combat?.pv_max ?? result.combat?.pv ?? result.stats?.pv_max ?? result.stats?.pv, 10);
    const voies = result.type === "npc" ? await fetchVoiesForPathways(result.pathways ?? null) : undefined;
    const tokenFace = getTokenFaceFromStats(result.stats);
    const newEntry: Combatant = {
      id: makeCombatantId(), entityId: result.id, type: result.type, name: result.name,
      imageUrl: result.image_url ?? undefined,
      initiative: toNumber(result.combat?.initiative ?? result.stats?.initiative, 0),
      pv: pvMax, pvMax, defense: toNumber(result.combat?.defense ?? result.stats?.defense, 0),
      conditions: [],
      details: result.type === "monster" ? { stats: (result.stats as MonsterStatsMap) ?? undefined, combat: result.combat, attaques: result.attaques, capacites: result.capacites } : undefined,
      pjStats: result.type === "npc" ? buildPJStats({ stats: result.stats }) : undefined,
      voies,
      ...tokenFace,
    };
    // On ajoute directement sans dédupliquer sur entityId : plusieurs instances du même monstre sont autorisées
    // Numérotation automatique quand plusieurs exemplaires de la même espèce sont présents
    setCombatants((prev) => {
      const baseName = result.name;
      const siblings = prev.filter((c) => c.entityId === result.id && c.type === result.type);
      if (siblings.length === 0) {
        return [...prev, newEntry];
      }
      if (siblings.length === 1) {
        // Passer le premier exemplaire en #1
        const updated = prev.map((c) =>
          c.id === siblings[0].id ? { ...c, name: `${baseName} #1` } : c
        );
        return [...updated, { ...newEntry, name: `${baseName} #2` }];
      }
      // Trouver le prochain numéro disponible
      const usedNums = siblings
        .map((c) => c.name.match(/ #(\d+)$/)?.[1])
        .filter(Boolean)
        .map(Number);
      const next = usedNums.length > 0 ? Math.max(...usedNums) + 1 : siblings.length + 1;
      return [...prev, { ...newEntry, name: `${baseName} #${next}` }];
    });
    // On garde le menu ouvert pour permettre l'ajout en chaîne (monstres et PNJ).
  };

  const removeCombatant = (id: string) => {
    setCombatants((prev) => prev.filter((c) => c.id !== id));
    if (selectedCombatantId === id) setSelectedCombatantId(null);
    if (activeCombatantId === id) {
      const remaining = orderedCombatants.filter((c) => c.id !== id);
      setActiveCombatantId(remaining[0]?.id ?? null);
    }
  };

  const nextTurn = () => {
    if (orderedCombatants.length === 0) return;
    const idx = orderedCombatants.findIndex((c) => c.id === activeCombatantId);
    const next = (idx === -1 ? 0 : idx) + 1;
    if (next >= orderedCombatants.length) {
      setActiveCombatantId(orderedCombatants[0].id);
      setRound((r) => r + 1);
      setRoundTriggers((prev) => {
        const newlyFired: RoundTriggerEvent[] = [];
        const nextTriggers = prev.map((event) => {
          const updatedRounds = Math.max(0, event.roundsLeft - 1);
          const isNowFired = updatedRounds <= 0;
          if (isNowFired && !event.hasFired) {
            newlyFired.push(event);
          }
          return {
            ...event,
            roundsLeft: updatedRounds,
            hasFired: event.hasFired || isNowFired,
          };
        });

        if (newlyFired.length > 0) {
          const text = newlyFired.map((event) => `• ${event.label}`).join("\n");
          setFiredTriggerMessage(text);
        }

        return nextTriggers;
      });
    } else {
      setActiveCombatantId(orderedCombatants[next].id);
    }
  };

  const addRoundTrigger = () => {
    const label = newTriggerText.trim();
    if (!label) return;

    const rounds = Math.max(1, toNumber(newTriggerRounds, 1));
    setRoundTriggers((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label,
        roundsLeft: rounds,
        createdAt: Date.now(),
        hasFired: false,
      },
    ]);
    setNewTriggerText("");
    setNewTriggerRounds("1");
  };

  const startNoteDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = noteRef.current?.getBoundingClientRect();
    if (!rect) return;
    noteDragRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    setIsDraggingNote(true);
  };

  // ---------------------------------------------------------------- ORDER

  const moveBy = (id: string, delta: -1 | 1) => {
    const order = currentOrderRef.current;
    const idx = order.indexOf(id);
    if (idx === -1) return;
    const next = [...order];
    const swapIdx = idx + delta;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setManualOrder(next);
  };

  const combatantCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of combatants) {
      if (c.entityId) counts[c.entityId] = (counts[c.entityId] ?? 0) + 1;
    }
    return counts;
  }, [combatants]);

  // ---------------------------------------------------------------- RENDER

  const selectedCardPosition = selectedCombatant
    ? (cardPositions[selectedCombatant.id] ?? getDefaultCardPosition())
    : null;

  return (
    <div className="relative w-full h-full overflow-hidden font-sans bg-transparent">

      {/* Bouton Menu MJ (gauche) */}
      <CombatTabButton
        onClick={() => { setIsMenuOpen(true); void fetchFamiliersForMenu(); }}
        label="Menu MJ"
        aria-label="Ouvrir le menu MJ"
        className="absolute top-0 left-4 z-40"
      />

      {/* Boutons droite */}
      <CombatTopActions
        onOpenGrimoire={() => openPopup({ system: campaignSystem, campaignId })}
        onToggleNote={() => setIsNoteVisible((prev) => !prev)}
        onToggleEvents={() => setIsTriggerPanelOpen((prev) => !prev)}
        onBackToScenario={onBackToScenario}
        onNextTurn={nextTurn}
        hasCombatants={orderedCombatants.length > 0}
      />

      <RoundTriggerPanel
        isOpen={isTriggerPanelOpen}
        newTriggerRounds={newTriggerRounds}
        newTriggerText={newTriggerText}
        roundTriggers={roundTriggers}
        onClose={() => setIsTriggerPanelOpen(false)}
        onAddTrigger={addRoundTrigger}
        onChangeRounds={setNewTriggerRounds}
        onChangeText={setNewTriggerText}
        onRemoveTrigger={(id) => setRoundTriggers((prev) => prev.filter((t) => t.id !== id))}
      />

      <CombatTriggerNotification
        message={firedTriggerMessage}
        onClose={() => setFiredTriggerMessage(null)}
      />

      {/* Menu MJ flottant */}
      <CombatMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        importingCompany={importingCompany}
        importingEngaged={importingEngaged}
        onImportCompany={importCompany}
        onImportEngaged={importEngagedEnemies}
        searchType={searchType}
        searchTerm={searchTerm}
        searchResults={searchResults}
        onSetSearchType={setSearchType}
        onSetSearchTerm={setSearchTerm}
        onAddFromSearch={addEnemyFromSearch}
        familierResults={familierResults}
        onAddFamilier={addFamilierToCombat}
        combatantCounts={combatantCounts}
      />

      {/* Message si arène vide */}
      {orderedCombatants.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-white/40 italic">Utilisez le menu en haut à gauche pour peupler l'arène.</p>
        </div>
      )}

      {/* BattleMap — remplit tout l'espace entre la timeline et le bord droit */}
      <div className="absolute top-14 bottom-0 left-88 right-4 z-0 overflow-hidden py-2 pr-2">
        {isHydrated ? (
          <BattleMap
            imageUrl={battlemapUrl}
            onChange={(url) => {
              setBattlemapUrl(url);
              if (url) {
                setFogEnabled(true);
                setFogReveals([]);
              } else {
                setFogEnabled(false);
                setFogReveals([]);
              }
            }}
            combatants={orderedCombatants}
            encounters={encounters}
            mapTokens={mapTokens}
            onUpdateTokens={setMapTokens}
            activeCombatantId={activeCombatantId}
            fogEnabled={fogEnabled}
            fogReveals={fogReveals}
            onFogEnabledChange={setFogEnabled}
            onFogRevealsChange={setFogReveals}
          />
        ) : (
          <div className="h-full w-full rounded-xl border border-white/12 bg-black/20 flex items-center justify-center">
            <p className="text-white/40 text-sm">Chargement de la battlemap...</p>
          </div>
        )}
      </div>

      {/* Timeline gauche */}
      {orderedCombatants.length > 0 && (
        <div className="absolute left-6 top-14 bottom-0 w-80 flex flex-col gap-1 overflow-y-auto overflow-x-clip z-10 scrollbar-none pt-20 pb-4">
          {orderedCombatants.map((combatant, idx) => (
            <CombatantRow
              key={combatant.id}
              combatant={combatant}
              isActive={combatant.id === activeCombatantId}
              isSelected={combatant.id === selectedCombatantId}
              canMoveUp={idx > 0}
              canMoveDown={idx < orderedCombatants.length - 1}
              onSelect={() => setSelectedCombatantId(combatant.id)}
              onRemove={() => removeCombatant(combatant.id)}
              onMoveUp={() => moveBy(combatant.id, -1)}
              onMoveDown={() => moveBy(combatant.id, 1)}
              onToggleHidden={() => setCombatants((prev) => prev.map((c) => c.id === combatant.id ? { ...c, hidden: !c.hidden } : c))}
            />
          ))}
        </div>
      )}

      {/* Carte de détail */}
      {selectedCombatant && selectedCardPosition && (
        <div
          ref={cardRef}
          className="fixed z-50 pointer-events-auto"
          style={{ left: selectedCardPosition.x, top: selectedCardPosition.y }}
        >
          <div
            onPointerDown={(e) => startCardDrag(e, selectedCombatant.id)}
            className={`absolute -top-2 -left-2 z-20 w-6 h-6 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white/60 select-none touch-none transition-colors hover:text-white hover:bg-black/90 ${draggingCardId === selectedCombatant.id ? "cursor-grabbing" : "cursor-grab"}`}
            title="Déplacer la fiche"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <div>
            <CombatantCard
              combatant={selectedCombatant}
              onClose={() => setSelectedCombatantId(null)}
              onUpdatePv={(newPv) =>
                setCombatants((prev) =>
                  prev.map((c) => c.id === selectedCombatant.id ? { ...c, pv: newPv } : c)
                )
              }
              onToggleCondition={(cond) =>
                setCombatants((prev) =>
                  prev.map((c) => {
                    if (c.id !== selectedCombatant.id) return c;
                    const has = c.conditions.includes(cond);
                    return { ...c, conditions: has ? c.conditions.filter((x) => x !== cond) : [...c.conditions, cond] };
                  })
                )
              }
              onSummonFamilier={(f) => {
                const d = f.data as any;
                const newEntry: Combatant = {
                  id: makeCombatantId(), entityId: f.id, type: "familier", name: f.name,
                  imageUrl: f.image_url ?? undefined,
                  initiative: toNumber(d?.combat?.initiative, 0),
                  pv: f.pv, pvMax: f.pv_max,
                  defense: toNumber(d?.combat?.defense, 0),
                  conditions: [],
                  details: { stats: d?.stats, combat: d?.combat, attaques: d?.attaques ?? [], capacites: d?.capacites ?? [] },
                };
                setCombatants((prev) => [...prev, newEntry]);
              }}
            />
          </div>
        </div>
      )}

      <CombatStickyNote
        isVisible={isNoteVisible}
        isDragging={isDraggingNote}
        note={combatNote}
        position={notePosition}
        noteRef={noteRef}
        onPointerDown={startNoteDrag}
        onChangeNote={setCombatNote}
        onClose={() => setIsNoteVisible(false)}
      />

    </div>
  );
}

