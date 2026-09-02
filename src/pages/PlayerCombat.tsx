import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { GripVertical, Minus, Plus, Swords } from "lucide-react";
import { useCombatDashboardData } from "@/hooks/scenarios/useCombatDashboardData";
import { useAuthStore } from "@/stores/useAuthStore";
import { CONDITION_OPTIONS, readTokenFaceFromCombatant } from "@/components/scenarios/combat/types";
import { BATTLEMAP_CHANNEL, tokenRingClass, type BattleMapBroadcast } from "@/components/scenarios/combat/BattleMap";
import { CombatantCard } from "@/components/scenarios/combat/CombatantCard";
import type { FogRevealStamp, MapToken, PersistedCombatState } from "@/components/scenarios/combat/types";

interface PlayerCombatProps {
  campaignId: string;
}

type ImgRect = { left: number; top: number; width: number; height: number };

type DragState = {
  combatantId: string;
  ox: number;
  oy: number;
};

type FloatingCardPosition = { x: number; y: number };

// battlemapUrl a sa propre colonne DB : ne jamais le renvoyer dans le blob combat_state.
function omitBattlemapUrl(state: PersistedCombatState): Omit<PersistedCombatState, "battlemapUrl"> {
  const rest: Partial<PersistedCombatState> = { ...state };
  delete rest.battlemapUrl;
  return rest as Omit<PersistedCombatState, "battlemapUrl">;
}

function normalizeCombatState(raw: Partial<PersistedCombatState> | null | undefined): PersistedCombatState {
  return {
    combatants: Array.isArray(raw?.combatants) ? raw.combatants : [],
    activeCombatantId: raw?.activeCombatantId ?? null,
    round: Number.isFinite(Number(raw?.round)) ? Number(raw?.round) : 1,
    battlemapUrl: raw?.battlemapUrl ?? null,
    mapTokens: Array.isArray(raw?.mapTokens) ? raw.mapTokens : [],
    encounters: Array.isArray(raw?.encounters) ? raw.encounters : [],
    fogEnabled: raw?.fogEnabled ?? false,
    fogReveals: Array.isArray(raw?.fogReveals) ? raw.fogReveals : [],
    combatNote: raw?.combatNote ?? "",
    combatNotePosition: raw?.combatNotePosition ?? { x: 32, y: 110 },
    roundTriggers: Array.isArray(raw?.roundTriggers) ? raw.roundTriggers : [],
  };
}

export function PlayerCombat({ campaignId }: PlayerCombatProps) {
  const combatData = useCombatDashboardData();
  const [searchParams] = useSearchParams();
  const chapitreId = searchParams.get("chapitreId") ?? "";
  const debugAll = searchParams.get("debugAll") === "1";

  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;

  const [combatState, setCombatState] = useState<PersistedCombatState | null>(null);
  const stateRef = useRef<PersistedCombatState | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [smoothedTokenPositions, setSmoothedTokenPositions] = useState<Record<string, { x: number; y: number }>>({});
  const smoothRafRef = useRef<number | null>(null);
  const previewRafRef = useRef<number | null>(null);
  const pendingPreviewRef = useRef<{
    state: PersistedCombatState;
    preview: { combatantId: string; x: number; y: number } | null;
  } | null>(null);

  const [ownPjIds, setOwnPjIds] = useState<Set<string>>(new Set());
  const [ownFamilierIds, setOwnFamilierIds] = useState<Set<string>>(new Set());
  const [isCampaignOwner, setIsCampaignOwner] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapZoneRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const imageZoneRef = useRef<HTMLDivElement>(null);
  const fogCanvasRef = useRef<HTMLCanvasElement>(null);
  const [imgRect, setImgRect] = useState<ImgRect | null>(null);

  const dragRef = useRef<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const [dragPreviewToken, setDragPreviewToken] = useState<{ combatantId: string; x: number; y: number } | null>(null);
  const [selectedCombatantId, setSelectedCombatantId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [tokenSize, setTokenSize] = useState(40);
  const [tokenSizePct, setTokenSizePct] = useState<number | undefined>(undefined);

  const [cardPosition, setCardPosition] = useState<FloatingCardPosition>({ x: 0, y: 0 });
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const cardDragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  const updateImgRect = useCallback(() => {
    if (!containerRef.current || !imgRef.current) return;
    const { naturalWidth: nw, naturalHeight: nh } = imgRef.current;
    if (!nw || !nh) return;
    const cw = containerRef.current.offsetWidth;
    const ch = containerRef.current.offsetHeight;
    const scale = Math.min(cw / nw, ch / nh);
    const rw = nw * scale;
    const rh = nh * scale;
    setImgRect({ left: (cw - rw) / 2, top: (ch - rh) / 2, width: rw, height: rh });
  }, []);

  const clampZoom = (z: number) => Math.min(3.5, Math.max(0.5, z));

  const playerTokenSize = useMemo(() => {
    if (imgRect && tokenSizePct !== undefined) {
      const base = Math.min(imgRect.width, imgRect.height);
      if (Number.isFinite(base) && base > 0) {
        return Math.max(8, Math.round((tokenSizePct / 100) * base));
      }
    }
    return tokenSize;
  }, [imgRect, tokenSize, tokenSizePct]);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const getDefaultCardPosition = useCallback((): FloatingCardPosition => {
    if (typeof window === "undefined") return { x: 960, y: 170 };
    return {
      x: Math.max(16, window.innerWidth - 460),
      y: Math.max(80, Math.round(window.innerHeight * 0.12)),
    };
  }, []);

  const screenToMapPct = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const zone = imageZoneRef.current;
    if (!zone) return null;
    const rect = zone.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x: Math.max(1, Math.min(99, x)), y: Math.max(1, Math.min(99, y)) };
  }, []);

  const ownCombatantIds = useMemo(() => {
    const ids = new Set<string>();
    if (!combatState) return ids;

    if (debugAll || isCampaignOwner) {
      for (const c of combatState.combatants) ids.add(c.id);
      return ids;
    }

    for (const c of combatState.combatants) {
      if (!c.entityId) continue;
      if (c.type === "pj" && ownPjIds.has(c.entityId)) ids.add(c.id);
      if (c.type === "familier" && ownFamilierIds.has(c.entityId)) ids.add(c.id);
    }

    return ids;
  }, [combatState, ownPjIds, ownFamilierIds, debugAll, isCampaignOwner]);

  const effectiveCampaignId = campaignId;

  const ownCombatants = useMemo(() => {
    if (!combatState) return [];
    return combatState.combatants.filter((c) => ownCombatantIds.has(c.id));
  }, [combatState, ownCombatantIds]);

  const targetTokenPositions = useMemo(() => {
    const targets: Record<string, { x: number; y: number }> = {};
    if (!combatState) return targets;

    for (const token of combatState.mapTokens ?? []) {
      const preview = dragPreviewToken?.combatantId === token.combatantId ? dragPreviewToken : null;
      targets[token.combatantId] = {
        x: preview?.x ?? token.x,
        y: preview?.y ?? token.y,
      };
    }

    return targets;
  }, [combatState, dragPreviewToken]);

  const selectedCombatant = useMemo(() => {
    if (!selectedCombatantId) return null;
    return ownCombatants.find((c) => c.id === selectedCombatantId) ?? null;
  }, [ownCombatants, selectedCombatantId]);

  const persistMapTokens = useCallback(async (tokens: MapToken[]) => {
    if (!chapitreId) return;
    const current = stateRef.current;
    if (!current) return;
    const payload: PersistedCombatState = { ...current, mapTokens: tokens };
    stateRef.current = payload;
    setCombatState(payload);
    try {
      // battlemapUrl a sa propre colonne : ne jamais le réécrire ici sous peine
      // d'écraser la carte avec une copie locale obsolète.
      const payloadForDb = omitBattlemapUrl(payload);
      await combatData.updateChapitreCombatState(chapitreId, payloadForDb);
      setSaveError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de synchroniser les déplacements";
      setSaveError(message);
    }
  }, [chapitreId, combatData]);

  const commitCombatState = useCallback(async (updater: (prev: PersistedCombatState) => PersistedCombatState) => {
    if (!chapitreId) return;
    const current = stateRef.current;
    if (!current) return;
    const next = updater(current);
    stateRef.current = next;
    setCombatState(next);
    try {
      const payloadForDb = omitBattlemapUrl(next);
      await combatData.updateChapitreCombatState(chapitreId, payloadForDb);
      setSaveError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de synchroniser l'action";
      setSaveError(message);
    }
  }, [chapitreId, combatData]);

  const broadcastDragPreview = useCallback((
    state: PersistedCombatState,
    preview: { combatantId: string; x: number; y: number } | null,
  ) => {
    channelRef.current?.postMessage({
      type: "update",
      imageUrl: state.battlemapUrl ?? null,
      mapTokens: state.mapTokens ?? [],
      combatants: state.combatants,
      encounters: state.encounters ?? [],
      activeCombatantId: state.activeCombatantId,
      tokenSize,
      tokenSizePct,
      zoom,
      pan,
      fogEnabled: state.fogEnabled ?? false,
      fogReveals: (state.fogReveals ?? []) as FogRevealStamp[],
      showNameTags: true,
      dragPreviewToken: preview,
    } as BattleMapBroadcast);
  }, [pan, tokenSize, tokenSizePct, zoom]);

  const scheduleBroadcastDragPreview = useCallback((
    state: PersistedCombatState,
    preview: { combatantId: string; x: number; y: number } | null,
  ) => {
    pendingPreviewRef.current = { state, preview };
    if (previewRafRef.current !== null) return;

    previewRafRef.current = requestAnimationFrame(() => {
      previewRafRef.current = null;
      const pending = pendingPreviewRef.current;
      if (!pending) return;
      pendingPreviewRef.current = null;
      broadcastDragPreview(pending.state, pending.preview);
    });
  }, [broadcastDragPreview]);

  useEffect(() => {
    if (!chapitreId) return;

    let isCancelled = false;

    const bootstrap = async () => {
      const data = await combatData.fetchChapitreCombatAndContent(chapitreId);
      const normalized = normalizeCombatState(data?.combat_state as Partial<PersistedCombatState> | null);
      normalized.battlemapUrl = (data as { battlemap_url?: string | null } | null)?.battlemap_url ?? null;
      if (isCancelled) return;
      stateRef.current = normalized;
      setCombatState(normalized);
    };

    void bootstrap();

    const unsubscribe = combatData.subscribeChapitreCombatState(chapitreId, (incoming, incomingBattlemapUrl) => {
      if (isDraggingRef.current) return;

      // Toujours appliqué, indépendamment du reste de l'état de combat.
      setCombatState((prev) => {
        const base = prev ?? stateRef.current;
        if (!base) return prev;
        const next = { ...base, battlemapUrl: incomingBattlemapUrl };
        stateRef.current = next;
        return next;
      });

      if (!incoming || typeof incoming !== "object") return;
      const normalized = normalizeCombatState(incoming as Partial<PersistedCombatState>);
      normalized.battlemapUrl = incomingBattlemapUrl;
      const incomingSig = JSON.stringify(normalized);
      const currentSig = stateRef.current ? JSON.stringify(stateRef.current) : null;
      if (currentSig && currentSig === incomingSig) return;
      stateRef.current = normalized;
      setCombatState(normalized);
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [chapitreId, combatData]);

  // Fallback same-browser sync:
  // allows the player dashboard to receive map/token updates directly from the MJ tab
  // even if DB realtime/persistence is delayed.
  useEffect(() => {
    const channel = new BroadcastChannel(BATTLEMAP_CHANNEL);
    channelRef.current = channel;

    channel.onmessage = (event) => {
      if (isDraggingRef.current) return;
      if (event.data?.type !== "update") return;
      const incoming = event.data as BattleMapBroadcast;
      setTokenSize(incoming.tokenSize ?? 40);
      setTokenSizePct(incoming.tokenSizePct);
      setDragPreviewToken(incoming.dragPreviewToken ?? null);

      // During remote drag, render only the lightweight preview token position.
      // Rebuilding the full combat state each frame causes visible snapping.
      if (incoming.dragPreviewToken) return;

      setCombatState((prev) => {
        const base = prev ?? normalizeCombatState(null);
        const next: PersistedCombatState = {
          ...base,
          battlemapUrl: incoming.imageUrl,
          mapTokens: incoming.mapTokens ?? base.mapTokens,
          combatants: incoming.combatants ?? base.combatants,
          encounters: incoming.encounters ?? base.encounters,
          fogEnabled: incoming.fogEnabled ?? base.fogEnabled ?? false,
          fogReveals: incoming.fogReveals ?? base.fogReveals ?? [],
          activeCombatantId: incoming.activeCombatantId ?? base.activeCombatantId,
        };
        stateRef.current = next;
        return next;
      });
    };

    channel.postMessage({ type: "request" });

    return () => {
      channelRef.current = null;
      channel.close();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewRafRef.current !== null) cancelAnimationFrame(previewRafRef.current);
      previewRafRef.current = null;
      pendingPreviewRef.current = null;
      if (smoothRafRef.current !== null) cancelAnimationFrame(smoothRafRef.current);
      smoothRafRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!combatState) return;

    const animate = () => {
      let shouldContinue = false;

      setSmoothedTokenPositions((prev) => {
        const next: Record<string, { x: number; y: number }> = {};

        for (const [combatantId, target] of Object.entries(targetTokenPositions)) {
          const current = prev[combatantId] ?? target;
          const dx = target.x - current.x;
          const dy = target.y - current.y;
          const nx = Math.abs(dx) < 0.02 ? target.x : current.x + dx * 0.35;
          const ny = Math.abs(dy) < 0.02 ? target.y : current.y + dy * 0.35;
          if (Math.abs(target.x - nx) >= 0.02 || Math.abs(target.y - ny) >= 0.02) {
            shouldContinue = true;
          }
          next[combatantId] = { x: nx, y: ny };
        }

        return next;
      });

      if (shouldContinue) {
        smoothRafRef.current = requestAnimationFrame(animate);
      } else {
        smoothRafRef.current = null;
      }
    };

    if (smoothRafRef.current !== null) {
      cancelAnimationFrame(smoothRafRef.current);
    }
    smoothRafRef.current = requestAnimationFrame(animate);

    return () => {
      if (smoothRafRef.current !== null) {
        cancelAnimationFrame(smoothRafRef.current);
        smoothRafRef.current = null;
      }
    };
  }, [combatState, targetTokenPositions]);

  useEffect(() => {
    if (!effectiveCampaignId || !userId) return;

    let isCancelled = false;

    const loadOwnership = async () => {
      const [pjIds, ownerId] = await Promise.all([
        combatData.fetchOwnPjIds(effectiveCampaignId, userId),
        combatData.fetchCampaignOwnerId(effectiveCampaignId),
      ]);
      const familierIds = await combatData.fetchOwnFamilierIdsByPjIds(pjIds);
      if (isCancelled) return;
      setOwnPjIds(new Set(pjIds));
      setOwnFamilierIds(new Set(familierIds));
      setIsCampaignOwner(Boolean(ownerId) && ownerId === userId);
    };

    void loadOwnership();

    return () => {
      isCancelled = true;
    };
  }, [effectiveCampaignId, userId, combatData]);

  useEffect(() => {
    if (!imgRect) return;
    const canvas = fogCanvasRef.current;
    const zone = imageZoneRef.current;
    if (!canvas || !zone) return;

    const width = Math.max(1, Math.round(zone.clientWidth));
    const height = Math.max(1, Math.round(zone.clientHeight));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (!combatState?.fogEnabled) return;
    const reveals = (combatState.fogReveals ?? []) as FogRevealStamp[];

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "destination-out";

    for (const stamp of reveals) {
      const radius = (stamp.r / 100) * Math.min(width, height);
      ctx.beginPath();
      ctx.arc((stamp.x / 100) * width, (stamp.y / 100) * height, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
  }, [combatState?.fogEnabled, combatState?.fogReveals, imgRect]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(updateImgRect);
    ro.observe(containerRef.current);
    window.addEventListener("resize", updateImgRect);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateImgRect);
    };
  }, [updateImgRect]);

  useEffect(() => {
    if (!selectedCombatant) return;

    const clampCard = () => {
      const cardRect = cardRef.current?.getBoundingClientRect();
      if (!cardRect) return;
      setCardPosition((prev) => {
        const current = prev.x === 0 && prev.y === 0 ? getDefaultCardPosition() : prev;
        const minX = 8;
        const minY = 8;
        const maxX = Math.max(minX, window.innerWidth - cardRect.width - 8);
        const maxY = Math.max(minY, window.innerHeight - cardRect.height - 8);
        const x = Math.max(minX, Math.min(maxX, current.x));
        const y = Math.max(minY, Math.min(maxY, current.y));
        if (x === current.x && y === current.y) return current;
        return { x, y };
      });
    };

    const frame = requestAnimationFrame(clampCard);
    window.addEventListener("resize", clampCard);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", clampCard);
    };
  }, [selectedCombatant, getDefaultCardPosition]);

  useEffect(() => {
    if (!isDraggingCard) return;

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
      setCardPosition({ x, y });
    };

    const onUp = () => {
      setIsDraggingCard(false);
      cardDragRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDraggingCard]);

  const startCardDrag = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    cardDragRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    setIsDraggingCard(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    isDraggingRef.current = true;

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const pos = screenToMapPct(e.clientX, e.clientY);
      if (!pos) return;
      const nx = Math.max(1, Math.min(99, pos.x - drag.ox));
      const ny = Math.max(1, Math.min(99, pos.y - drag.oy));
      const preview = { combatantId: drag.combatantId, x: nx, y: ny };
      setDragPreviewToken(preview);

      const current = stateRef.current;
      if (current) scheduleBroadcastDragPreview(current, preview);
    };

    const onUp = () => {
      const current = stateRef.current;
      if (current) {
        const drag = dragRef.current;
        const preview = dragPreviewToken;
        const finalTokens = drag && preview
          ? (current.mapTokens ?? []).map((t) =>
              t.combatantId === drag.combatantId ? { ...t, x: preview.x, y: preview.y } : t,
            )
          : (current.mapTokens ?? []);

        const finalState: PersistedCombatState = {
          ...current,
          mapTokens: finalTokens,
        };
        stateRef.current = finalState;
        setCombatState(finalState);
        setDragPreviewToken(null);

        if (previewRafRef.current !== null) {
          cancelAnimationFrame(previewRafRef.current);
          previewRafRef.current = null;
          pendingPreviewRef.current = null;
        }
        broadcastDragPreview(finalState, null);
        void persistMapTokens(finalTokens);
      }
      dragRef.current = null;
      setIsDragging(false);
      isDraggingRef.current = false;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      isDraggingRef.current = false;
    };
  }, [broadcastDragPreview, dragPreviewToken, isDragging, persistMapTokens, scheduleBroadcastDragPreview, screenToMapPct]);

  const onTokenPointerDown = useCallback((e: React.PointerEvent, token: MapToken) => {
    if (!ownCombatantIds.has(token.combatantId)) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const pos = screenToMapPct(e.clientX, e.clientY);
    if (!pos) return;
    dragRef.current = {
      combatantId: token.combatantId,
      ox: pos.x - token.x,
      oy: pos.y - token.y,
    };
    setDragPreviewToken({ combatantId: token.combatantId, x: token.x, y: token.y });
    setIsDragging(true);
  }, [ownCombatantIds, screenToMapPct]);

  const onMapWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (!mapZoneRef.current) return;
    const rect = mapZoneRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => {
      const next = clampZoom(prev * factor);
      setPan((p) => ({
        x: cx + (p.x - cx) * (next / prev),
        y: cy + (p.y - cy) * (next / prev),
      }));
      return next;
    });
  }, []);

  const onMapPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startPan = { ...pan };
    const startMouse = { x: e.clientX, y: e.clientY };

    const onMove = (ev: PointerEvent) => {
      setPan({
        x: startPan.x + (ev.clientX - startMouse.x),
        y: startPan.y + (ev.clientY - startMouse.y),
      });
    };

    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  }, [pan]);

  if (!chapitreId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-white/45 text-sm">Aucun chapitre de combat sélectionné.</p>
      </div>
    );
  }

  if (!combatState) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-white/45 text-sm">Chargement du combat...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-3 md:p-4">
      <div className="h-full w-full flex min-h-0 gap-3 md:gap-4">
      <div
        ref={mapZoneRef}
        className="flex-1 min-h-0 relative overflow-hidden rounded-2xl border border-white/12 bg-black/25"
        onWheel={onMapWheel}
      >
        {combatState.battlemapUrl ? (
          <>
            <div
              className="absolute inset-0"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center",
              }}
              onPointerDown={onMapPointerDown}
              onDragStart={(e) => e.preventDefault()}
            >
              <div ref={containerRef} className="absolute inset-0">
                <img
                  ref={imgRef}
                  src={combatState.battlemapUrl}
                  alt="Carte de combat"
                  className="absolute inset-0 w-full h-full object-contain"
                  onLoad={updateImgRect}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                />
                {imgRect && (
                  <div
                    ref={imageZoneRef}
                    className="absolute"
                    style={{ left: imgRect.left, top: imgRect.top, width: imgRect.width, height: imgRect.height }}
                  >
                    {(combatState.mapTokens ?? []).map((token) => {
                      const combatant = combatState.combatants.find((c) => c.id === token.combatantId);
                      if (!combatant || combatant.hidden) return null;
                      const target = targetTokenPositions[token.combatantId] ?? { x: token.x, y: token.y };
                      const smoothed = smoothedTokenPositions[token.combatantId] ?? target;
                      const isMine = ownCombatantIds.has(token.combatantId);
                      const isActive = combatState.activeCombatantId === combatant.id;
                      const activeConditions = CONDITION_OPTIONS.filter((o) => combatant.conditions.includes(o.key));
                      const tokenFace = readTokenFaceFromCombatant(combatant);

                      return (
                        <div
                          key={token.combatantId}
                          className={`absolute select-none touch-none ${isMine ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed"}`}
                          style={{ left: `${smoothed.x}%`, top: `${smoothed.y}%`, transform: "translate(-50%, -50%)" }}
                          onPointerDown={(e) => onTokenPointerDown(e, token)}
                          onDragStart={(e) => e.preventDefault()}
                        >
                          {isActive && (
                            <div
                              className="absolute rounded-full border-2 border-amber-400 animate-ping opacity-70"
                              style={{ inset: -6, width: playerTokenSize + 12, height: playerTokenSize + 12 }}
                            />
                          )}
                          <div
                            className={`relative rounded-full border-2 overflow-hidden ${tokenRingClass(combatant.type)}`}
                            style={{ width: playerTokenSize, height: playerTokenSize }}
                          >
                            <img
                              src={combatant.imageUrl || "/default-avatar.png"}
                              alt={combatant.name}
                              className="w-full h-full object-contain"
                              style={{ transform: `translate(${tokenFace.offsetX}%, ${tokenFace.offsetY}%) scale(${tokenFace.zoom})` }}
                              draggable={false}
                              onDragStart={(e) => e.preventDefault()}
                            />
                            {activeConditions.length > 0 && (
                              <div className="absolute inset-0 bg-black/70 flex items-center justify-center flex-wrap content-center gap-0.5 pointer-events-none" style={{ padding: Math.max(3, playerTokenSize * 0.08) }}>
                                {activeConditions.map((opt) => (
                                  <span key={opt.key} title={opt.label} style={{ fontSize: Math.max(8, playerTokenSize * 0.28), lineHeight: 1 }}>{opt.icon}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <canvas ref={fogCanvasRef} className="absolute inset-0 pointer-events-none z-10" style={{ opacity: combatState.fogEnabled ? 1 : 0 }} />
                  </div>
                )}
              </div>
            </div>

            <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1 rounded-lg border border-white/15 bg-black/55 backdrop-blur px-1.5 py-1">
              <button
                onClick={() => setZoom((z) => clampZoom(z * 0.85))}
                className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Zoom -"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={resetView}
                className="px-2 py-1 rounded text-[10px] text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Réinitialiser la vue"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={() => setZoom((z) => clampZoom(z * 1.15))}
                className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Zoom +"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-white/40 text-sm">Le MJ n'a pas encore chargé de carte de combat.</p>
          </div>
        )}
      </div>

      <aside className="w-72 shrink-0 flex flex-col gap-3 min-h-0">
        <div className="rounded-xl border border-white/12 bg-[#1C1740]/55 backdrop-blur-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Swords className="w-4 h-4 text-cyan-300/80" />
            <h2 className="text-[11px] uppercase tracking-widest text-cyan-200/80 font-semibold">Dashboard joueur</h2>
          </div>
          <p className="text-[11px] text-white/60 leading-relaxed">Tu peux déplacer uniquement ton PJ et tes familiers. Les mouvements sont synchronisés en direct.</p>
          {!effectiveCampaignId && (
            <p className="mt-2 text-[10px] text-amber-200/85 border border-amber-300/30 bg-amber-300/10 rounded px-2 py-1">
              Campagne non résolue dans cet onglet: contrôle des jetons indisponible.
            </p>
          )}
          {debugAll && (
            <p className="mt-2 text-[10px] text-amber-200/85 border border-amber-300/30 bg-amber-300/10 rounded px-2 py-1">
              Mode debug actif: tous les jetons sont contrôlables (test local).
            </p>
          )}
          {!debugAll && isCampaignOwner && (
            <p className="mt-2 text-[10px] text-cyan-100/90 border border-cyan-300/30 bg-cyan-300/10 rounded px-2 py-1">
              Mode propriétaire actif: tous les jetons sont contrôlables sur cette vue (test MJ local).
            </p>
          )}
          {saveError && (
            <p className="mt-2 text-[10px] text-rose-200/90 border border-rose-300/30 bg-rose-300/10 rounded px-2 py-1">
              {saveError}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-white/12 bg-[#1C1740]/45 backdrop-blur-lg p-3 flex-1 min-h-0">
          <p className="text-[10px] uppercase tracking-widest text-white/45 mb-2">Mes jetons</p>
          <div className="space-y-2 overflow-y-auto max-h-full pr-1">
            {ownCombatants.length === 0 && (
              <p className="text-[11px] italic text-white/35">Aucun jeton contrôlable dans ce combat.</p>
            )}
            {ownCombatants.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
                {(() => {
                  const tokenFace = readTokenFaceFromCombatant(c);
                  return (
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-white/20 shrink-0">
                      <img
                        src={c.imageUrl || "/default-avatar.png"}
                        alt={c.name}
                        className="w-full h-full object-contain"
                        style={{ transform: `translate(${tokenFace.offsetX}%, ${tokenFace.offsetY}%) scale(${tokenFace.zoom})` }}
                      />
                    </div>
                  );
                })()}
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-white/85 truncate">{c.name}</p>
                  <p className="text-[10px] text-white/45">{c.pv}/{c.pvMax} PV</p>
                </div>
                <button
                  onClick={() => {
                    setCardPosition((prev) => (prev.x === 0 && prev.y === 0 ? getDefaultCardPosition() : prev));
                    setSelectedCombatantId(c.id);
                  }}
                  className="text-[10px] text-cyan-200/90 border border-cyan-300/35 rounded px-1.5 py-0.5 hover:bg-cyan-300/10 transition-colors"
                >
                  Fiche
                </button>
              </div>
            ))}
          </div>
        </div>

      </aside>

      {/* Fiche volante (style MJ) */}
      {selectedCombatant && (
        <div
          ref={cardRef}
          className="fixed z-50 pointer-events-auto"
          style={{
            left: (cardPosition.x === 0 && cardPosition.y === 0) ? getDefaultCardPosition().x : cardPosition.x,
            top: (cardPosition.x === 0 && cardPosition.y === 0) ? getDefaultCardPosition().y : cardPosition.y,
          }}
        >
          <div
            onPointerDown={startCardDrag}
            className={`absolute -top-2 -left-2 z-20 w-6 h-6 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white/60 select-none touch-none transition-colors hover:text-white hover:bg-black/90 ${isDraggingCard ? "cursor-grabbing" : "cursor-grab"}`}
            title="Déplacer la fiche"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <CombatantCard
            combatant={selectedCombatant}
            onClose={() => setSelectedCombatantId(null)}
            onUpdatePv={(newPv) => {
              void commitCombatState((prev) => ({
                ...prev,
                combatants: prev.combatants.map((c) => c.id === selectedCombatant.id ? { ...c, pv: newPv } : c),
              }));
            }}
            onToggleCondition={(cond) => {
              void commitCombatState((prev) => ({
                ...prev,
                combatants: prev.combatants.map((c) => {
                  if (c.id !== selectedCombatant.id) return c;
                  const has = c.conditions.includes(cond);
                  return { ...c, conditions: has ? c.conditions.filter((x) => x !== cond) : [...c.conditions, cond] };
                }),
              }));
            }}
          />
        </div>
      )}
      </div>
    </div>
  );
}
