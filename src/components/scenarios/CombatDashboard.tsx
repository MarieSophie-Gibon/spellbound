import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, GripVertical, RefreshCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  type Combatant,
  type ChapitreBlock,
  type EncounterEntry,
  type MapToken,
  type MonsterStatsMap,
  type PersistedCombatState,
  type SearchResult,
  type VoieEntry,
  makeCombatantId,
  toNumber,
} from "./combat/types";
import { CombatTabButton } from "./combat/CombatTabButton";
import { CombatantRow } from "./combat/CombatantRow";
import { CombatantCard } from "./combat/CombatantCard";
import { CombatMenu } from "./combat/CombatMenu";
import { BattleMap } from "./combat/BattleMap";
import { useGrimoirePopup } from "@/contexts/GrimoirePopupContext";

interface CombatDashboardProps {
  chapitreId: string;
  campaignId: string;
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

export function CombatDashboard({ chapitreId, campaignId, onBackToScenario }: CombatDashboardProps) {
  const { openPopup } = useGrimoirePopup();
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [activeCombatantId, setActiveCombatantId] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [selectedCombatantId, setSelectedCombatantId] = useState<string | null>(null);

  const [battlemapUrl, setBattlemapUrl] = useState<string | null>(null);
  const [mapTokens, setMapTokens] = useState<MapToken[]>([]);
  const [encounters, setEncounters] = useState<EncounterEntry[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchType, setSearchType] = useState<"monster" | "npc">("monster");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [, setLoadingSearch] = useState(false);
  const [importingCompany, setImportingCompany] = useState(false);
  const [importingEngaged, setImportingEngaged] = useState(false);
  const [cardPositions, setCardPositions] = useState<Record<string, FloatingCardPosition>>({});
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const cardDragRef = useRef<{ combatantId: string; offsetX: number; offsetY: number } | null>(null);

  const [isHydrated, setIsHydrated] = useState(false);
  const hasAutoImportedRef = useRef(false);

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
      const { data: chapterData } = await supabase
        .from("chapitres")
        .select("combat_state")
        .eq("id", chapitreId)
        .single();

      const dbState = (chapterData?.combat_state ?? null) as PersistedCombatState | null;
      if (dbState && Array.isArray(dbState.combatants)) {
        setCombatants(dbState.combatants);
        setActiveCombatantId(dbState.activeCombatantId ?? null);
        setRound(toNumber(dbState.round, 1));
        setBattlemapUrl(dbState.battlemapUrl ?? null);
        setMapTokens(dbState.mapTokens ?? []);
        setEncounters(dbState.encounters ?? []);
        setIsHydrated(true);
        return;
      }

      const raw = localStorage.getItem(getStorageKey(chapitreId));
      if (!raw) { setIsHydrated(true); return; }

      try {
        const parsed = JSON.parse(raw) as PersistedCombatState;
        if (!parsed || !Array.isArray(parsed.combatants)) { setIsHydrated(true); return; }
        setCombatants(parsed.combatants);
        setActiveCombatantId(parsed.activeCombatantId ?? null);
        setRound(toNumber(parsed.round, 1));
        setBattlemapUrl(parsed.battlemapUrl ?? null);
        setMapTokens(parsed.mapTokens ?? []);
        setEncounters(parsed.encounters ?? []);
      } catch { /* ignore */ } finally { setIsHydrated(true); }
    };
    void bootstrap();
  }, [chapitreId]);

  // --- Persist ---
  useEffect(() => {
    if (!isHydrated) return;
    const payload: PersistedCombatState = { combatants, activeCombatantId, round, battlemapUrl, mapTokens, encounters };
    localStorage.setItem(getStorageKey(chapitreId), JSON.stringify(payload));
    const timer = setTimeout(() => {
      void supabase.from("chapitres").update({ combat_state: payload }).eq("id", chapitreId);
    }, 400);
    return () => clearTimeout(timer);
  }, [chapitreId, combatants, activeCombatantId, round, battlemapUrl, mapTokens, encounters, isHydrated]);

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
          let query = supabase
            .from("bestiaire")
            .select("id, nom, image_url, combat, stats, attaques, capacites")
            .or(`campaign_id.eq.${campaignId},campaign_id.is.null`)
            .order("nom")
            .limit(100);
          if (searchTerm.trim()) query = query.ilike("nom", `%${searchTerm}%`);
          const { data } = await query;
          setSearchResults((data ?? []).map((m) => ({
            id: m.id, name: m.nom, image_url: m.image_url, type: "monster" as const,
            combat: m.combat, stats: m.stats, attaques: m.attaques, capacites: m.capacites,
          })));
        } else {
          let query = supabase
            .from("pnj")
            .select("id, name, image_url, stats")
            .eq("campaign_id", campaignId)
            .order("name")
            .limit(20);
          if (searchTerm.trim()) query = query.ilike("name", `%${searchTerm}%`);
          const { data } = await query;
          setSearchResults((data ?? []).map((npc) => ({
            id: npc.id, name: npc.name, image_url: npc.image_url, type: "npc" as const, stats: npc.stats,
          })));
        }
      } finally { setLoadingSearch(false); }
    }, searchTerm.trim() ? 250 : 0);
    return () => clearTimeout(timer);
  }, [searchType, searchTerm, campaignId]);

  // --- Helpers ---
  const upsertCombatants = (newEntries: Combatant[]) => {
    if (newEntries.length === 0) return;
    setCombatants((prev) => {
      const existingKeys = new Set(prev.map((c) => `${c.type}:${c.entityId ?? c.id}`));
      const unique = newEntries.filter((c) => !existingKeys.has(`${c.type}:${c.entityId ?? c.id}`));
      return unique.length > 0 ? [...prev, ...unique] : prev;
    });
    setIsMenuOpen(false);
  };

  // --- Auto-import au premier chargement ---
  useEffect(() => {
    if (!isHydrated || hasAutoImportedRef.current) return;
    if (combatants.length > 0) { hasAutoImportedRef.current = true; return; }
    hasAutoImportedRef.current = true;
    void (async () => { await importCompany(); await importEngagedEnemies(); })();
  }, [isHydrated, combatants.length]);

  // --- Hydratation : re-fetch TOUJOURS les stats fraîches des PJs depuis la DB ---
  useEffect(() => {
    if (!isHydrated) return;

    const allPJs = combatants.filter((c) => c.type === "pj" && c.entityId);
    const npcsMissing = combatants.filter((c) => c.type === "npc" && !c.voies && c.entityId);

    if (allPJs.length === 0 && npcsMissing.length === 0) return;

    const run = async () => {
      if (allPJs.length > 0) {
        const ids = allPJs.map((c) => c.entityId!);
        const { data } = await supabase.from("pj").select("id, stats, pathways").in("id", ids);
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
                // Stats de combat toujours fraîches depuis la DB (defense + initiative)
                defense: toNumber(row.stats?.defense, 0),
                initiative: toNumber(row.stats?.initiative, c.initiative),
                pvMax: toNumber(row.stats?.pv_max ?? row.stats?.pv, c.pvMax),
                pjStats: buildPJStats(row),
                voies: voiesPerPJ[idx],
              };
            })
          );
        }
      }
      if (npcsMissing.length > 0) {
        const ids = npcsMissing.map((c) => c.entityId!);
        const { data } = await supabase.from("pnj").select("id, pathways").in("id", ids);
        if (data?.length) {
          const voiesPerNPC = await Promise.all(data.map((r) => fetchVoiesForPathways(r.pathways)));
          setCombatants((prev) =>
            prev.map((c) => {
              if (c.type !== "npc" || c.voies) return c;
              const idx = data.findIndex((d) => d.id === c.entityId);
              if (idx < 0) return c;
              return { ...c, voies: voiesPerNPC[idx] };
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

  const importEngagedEnemies = async () => {
    setImportingEngaged(true);
    try {
      const { data, error } = await supabase.from("chapitres").select("content").eq("id", chapitreId).single();
      if (error) throw error;
      const blocks = (data?.content ?? []) as ChapitreBlock[];
      const created: Combatant[] = [];
      for (const block of blocks.filter((b) => b.type === "enemy" && !!b.data?.combatEngaged && !!b.data?.entityId)) {
        if (!block.data?.entityId || !block.data.entityType) continue;
        if (block.data.entityType === "monster") {
          const { data: monster } = await supabase.from("bestiaire").select("id, nom, image_url, combat, stats, attaques, capacites").eq("id", block.data.entityId).single();
          if (!monster) continue;
          const pvMax = toNumber(monster.combat?.pv_max ?? monster.combat?.pv, 10);
          created.push({ id: makeCombatantId(), entityId: monster.id, type: "monster", name: monster.nom, imageUrl: monster.image_url ?? block.data.imageUrl, initiative: toNumber(monster.combat?.initiative, 0), pv: pvMax, pvMax, defense: toNumber(monster.combat?.defense, 0), conditions: [], tactics: block.data.comportement, notes: block.data.notes, details: { stats: monster.stats, combat: monster.combat, attaques: monster.attaques, capacites: monster.capacites } });
        } else {
          const { data: npc } = await supabase.from("pnj").select("id, name, image_url, stats, pathways").eq("id", block.data.entityId).single();
          if (!npc) continue;
          const pvMax = toNumber(npc.stats?.pv_max ?? npc.stats?.pv, 10);
          const voies = await fetchVoiesForPathways(npc.pathways);
          created.push({ id: makeCombatantId(), entityId: npc.id, type: "npc", name: npc.name, imageUrl: npc.image_url ?? block.data.imageUrl, initiative: toNumber(npc.stats?.initiative, 0), pv: pvMax, pvMax, defense: toNumber(npc.stats?.defense, 0), conditions: [], tactics: block.data.comportement, notes: block.data.notes, voies });
        }
      }
      upsertCombatants(created);
    } catch (err) { console.error("Error importing engaged enemies", err); }
    finally { setImportingEngaged(false); }
  };

  // Fetch voies depuis les pathways [{ voie_id, rangs_acquis }]
  const fetchVoiesForPathways = async (pathways: Array<{ voie_id: string; rangs_acquis?: number[] }> | null): Promise<VoieEntry[]> => {
    if (!pathways?.length) return [];
    const ids = pathways.map((p) => p.voie_id).filter(Boolean);
    if (!ids.length) return [];
    const { data } = await supabase
      .from("voies")
      .select("id, nom, type, capacites")
      .in("id", ids);
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
  };

  const buildPJStats = (pjRow: { stats: any }) => ({
    caracteristiques: pjRow.stats?.caracteristiques ?? {},
    initiative:   toNumber(pjRow.stats?.initiative, 0),
    att_contact:  toNumber(pjRow.stats?.att_contact, 0),
    att_distance: toNumber(pjRow.stats?.att_distance, 0),
    att_magie:    toNumber(pjRow.stats?.att_magie, 0),
    pm:           toNumber(pjRow.stats?.pm, 0),
    pm_max:       toNumber(pjRow.stats?.pm_max ?? pjRow.stats?.pm, 0),
    pc:           toNumber(pjRow.stats?.pc, 0),
    dr_qty:       toNumber(pjRow.stats?.dr_qty, 0),
    dr_de:        pjRow.stats?.dr_de ?? "d6",
    niveau:       toNumber(pjRow.stats?.niveau, 1),
  });

  const importCompany = async () => {
    setImportingCompany(true);
    try {
      const { data, error } = await supabase
        .from("pj")
        .select("id, name, image_url, stats, pathways")
        .eq("campaign_id", campaignId)
        .order("name");
      if (error) throw error;

      const rows = data ?? [];
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
            });
          }
        });
        return result;
      });
      setIsMenuOpen(false);
    } catch (err) { console.error("Error importing company", err); }
    finally { setImportingCompany(false); }
  };

  const addEnemyFromSearch = (result: SearchResult) => {
    const pvMax = toNumber(result.combat?.pv_max ?? result.combat?.pv ?? result.stats?.pv_max ?? result.stats?.pv, 10);
    const newEntry: Combatant = {
      id: makeCombatantId(), entityId: result.id, type: result.type, name: result.name,
      imageUrl: result.image_url ?? undefined,
      initiative: toNumber(result.combat?.initiative ?? result.stats?.initiative, 0),
      pv: pvMax, pvMax, defense: toNumber(result.combat?.defense ?? result.stats?.defense, 0),
      conditions: [],
      details: result.type === "monster" ? { stats: (result.stats as MonsterStatsMap) ?? undefined, combat: result.combat, attaques: result.attaques, capacites: result.capacites } : undefined,
    };
    // On ajoute directement sans dédupliquer sur entityId : plusieurs instances du même monstre sont autorisées
    setCombatants((prev) => [...prev, newEntry]);
    setIsMenuOpen(false);
    setSearchTerm("");
    setSearchResults([]);
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
    } else {
      setActiveCombatantId(orderedCombatants[next].id);
    }
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

  // ---------------------------------------------------------------- RENDER

  const selectedCardPosition = selectedCombatant
    ? (cardPositions[selectedCombatant.id] ?? getDefaultCardPosition())
    : null;

  return (
    <div className="relative w-full h-full overflow-hidden font-sans bg-transparent">

      {/* Bouton Menu MJ (gauche) */}
      <CombatTabButton
        onClick={() => setIsMenuOpen(true)}
        label="Menu MJ"
        aria-label="Ouvrir le menu MJ"
        className="absolute top-0 left-4 z-40"
      />

      {/* Boutons droite */}
      <div className="absolute top-0 right-4 z-40 flex items-center gap-1.5">
        <CombatTabButton
          onClick={() => openPopup()}
          icon={<BookOpen className="w-3 h-3 text-indigo-200" />}
          label="Grimoire"
          aria-label="Ouvrir le grimoire"
          className="px-3.5"
        />
        {onBackToScenario && (
          <CombatTabButton
            onClick={onBackToScenario}
            icon={<ArrowLeft className="w-3 h-3 text-indigo-200" />}
            label="Retour"
            aria-label="Retour au scénario"
            className="px-3.5"
          />
        )}
        {orderedCombatants.length > 0 && (
          <CombatTabButton
            onClick={nextTurn}
            icon={<RefreshCcw className="w-3 h-3 text-indigo-200 group-hover:rotate-180 transition-transform duration-300" />}
            label="Fin du Tour"
            className="px-4"
          />
        )}
      </div>

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
      />

      {/* Message si arène vide */}
      {orderedCombatants.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-white/40 italic">Utilisez le menu en haut à gauche pour peupler l'arène.</p>
        </div>
      )}

      {/* BattleMap — remplit tout l'espace entre la timeline et le bord droit */}
      <div className="absolute top-14 bottom-0 left-88 right-4 z-0 overflow-hidden py-2 pr-2">
        <BattleMap
          imageUrl={battlemapUrl}
          onChange={setBattlemapUrl}
          combatants={orderedCombatants}
          encounters={encounters}
          mapTokens={mapTokens}
          onUpdateTokens={setMapTokens}
          activeCombatantId={activeCombatantId}
        />
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
            className={`mb-1.5 ml-auto w-fit rounded-full border border-white/10 bg-black/35 p-1 text-white/35 select-none touch-none transition-colors hover:text-white/55 hover:border-white/20 ${draggingCardId === selectedCombatant.id ? "cursor-grabbing" : "cursor-grab"}`}
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
            />
          </div>
        </div>
      )}

    </div>
  );
}

