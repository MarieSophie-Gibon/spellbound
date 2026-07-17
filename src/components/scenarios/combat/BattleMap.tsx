import { memo, useRef, useState, useCallback, useEffect, useMemo } from "react";
import { Brush, Cloud, Eye, EyeOff, ImagePlus, Loader2, Minus, MonitorPlay, Plus, RotateCcw, Trash2, Undo2, X, ZoomIn } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Combatant, EncounterEntry, MapToken } from "./types";
import { CONDITION_OPTIONS } from "./types";

interface BattleMapProps {
  imageUrl: string | null;
  onChange: (url: string | null) => void;
  combatants: Combatant[];
  encounters: EncounterEntry[];
  mapTokens: MapToken[];
  onUpdateTokens: (tokens: MapToken[]) => void;
  activeCombatantId?: string | null;
}

async function uploadBattleMap(file: File): Promise<string | null> {
  const ext = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `battlemaps/${fileName}`;
  const { error } = await supabase.storage.from("wiki-images").upload(filePath, file);
  if (error) { console.error("Erreur upload battlemap :", error.message); return null; }
  const { data } = supabase.storage.from("wiki-images").getPublicUrl(filePath);
  return data.publicUrl;
}

export function tokenRingClass(type: string) {
  if (type === "pj") return "border-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]";
  if (type === "familier") return "border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]";
  if (type === "monster") return "border-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]";
  return "border-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]";
}

export const BATTLEMAP_CHANNEL = "spellbound-battlemap";

export interface FogRevealStamp {
  x: number;
  y: number;
  r: number;
  strokeId?: number;
}

interface FogRevealPath {
  id: number;
  r: number;
  points: Array<{ x: number; y: number }>;
}

export interface BattleMapBroadcast {
  type: "update";
  imageUrl: string | null;
  mapTokens: MapToken[];
  combatants: Combatant[];
  encounters: EncounterEntry[];
  activeCombatantId: string | null;
  tokenSize: number;
  tokenSizePct?: number;
  zoom: number;
  pan: { x: number; y: number };
  fogEnabled: boolean;
  fogReveals: FogRevealStamp[];
  showNameTags?: boolean;
  dragPreviewToken?: { combatantId: string; x: number; y: number } | null;
}

export interface TokenNameTagMetrics {
  fontSize: number;
  offset: number;
  padX: number;
  padY: number;
}

export function getTokenNameTagMetrics(tokenSize: number): TokenNameTagMetrics {
  return {
    fontSize: Math.max(6, tokenSize * 0.16),
    offset: Math.max(4, tokenSize * 0.18),
    padX: Math.max(3, tokenSize * 0.06),
    padY: Math.max(1, tokenSize * 0.02),
  };
}

const FOG_STAMP_LIMIT = 20000;
const FOG_PATH_LIMIT = 2500;

type ImgRect = { left: number; top: number; width: number; height: number };

interface MapTokenMarkerProps {
  token: MapToken;
  combatant: Combatant;
  isActive: boolean;
  tokenSize: number;
  onPointerDown: (e: React.PointerEvent, token: MapToken) => void;
  setTokenEl: (id: string) => (el: HTMLDivElement | null) => void;
}

const MapTokenMarker = memo(function MapTokenMarker({
  token,
  combatant,
  isActive,
  tokenSize,
  onPointerDown,
  setTokenEl,
}: MapTokenMarkerProps) {
  const activeConditions = CONDITION_OPTIONS.filter((o) => combatant.conditions.includes(o.key));
  const instanceMatch = combatant.name.match(/^(.*?) #(\d+)$/);
  const instanceNum = instanceMatch ? instanceMatch[2] : null;

  return (
    <div
      ref={setTokenEl(token.combatantId)}
      style={{ left: `${token.x}%`, top: `${token.y}%`, transform: "translate(-50%, -50%)", zIndex: 20 }}
      className="absolute group/token select-none touch-none"
      onPointerDown={(e) => onPointerDown(e, token)}
    >
      {isActive && (
        <div className="absolute rounded-full border-2 border-amber-400 animate-ping pointer-events-none opacity-75" style={{ inset: -6, width: tokenSize + 12, height: tokenSize + 12 }} />
      )}
      <div
        className={`relative rounded-full border-2 overflow-hidden ${tokenRingClass(combatant.type)}`}
        style={{ width: tokenSize, height: tokenSize, cursor: "grab" }}
      >
        <img src={combatant.imageUrl || "/default-avatar.png"} alt={combatant.name} className="w-full h-full object-cover pointer-events-none" draggable={false} />
        {activeConditions.length > 0 && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center flex-wrap content-center gap-0.5 pointer-events-none" style={{ padding: tokenSize * 0.08 }}>
            {activeConditions.map((opt) => (
              <span key={opt.key} title={opt.label} style={{ fontSize: tokenSize * 0.28, lineHeight: 1 }}>{opt.icon}</span>
            ))}
          </div>
        )}
      </div>
      {instanceNum && (
        <div className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 rounded-full bg-black/80 border border-white/30 flex items-center justify-center z-30 pointer-events-none">
          <span className="text-[8px] font-bold text-white leading-none">{instanceNum}</span>
        </div>
      )}
    </div>
  );
});

/** Calcule la zone réellement occupée par l'image dans un conteneur object-contain. */
function computeContainRect(containerW: number, containerH: number, nw: number, nh: number): ImgRect {
  const scale = Math.min(containerW / nw, containerH / nh);
  const w = nw * scale, h = nh * scale;
  return { left: (containerW - w) / 2, top: (containerH - h) / 2, width: w, height: h };
}

function BattleMapInner({ imageUrl, onChange, combatants, encounters, mapTokens, onUpdateTokens, activeCombatantId }: BattleMapProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapZoneRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  // Div positionné exactement sur les pixels rendus de l'image (sans les bandes noires)
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tokenElsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  const [uploading, setUploading] = useState(false);
  const dragCountRef = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [playerTabOpen, setPlayerTabOpen] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRafRef = useRef<number | null>(null);
  const pendingPanRef = useRef<{ x: number; y: number } | null>(null);
  const panStartRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const isPanningRef = useRef(false);

  const [tokenSize, setTokenSize] = useState(40);
  const [showNameTags, setShowNameTags] = useState(true);
  const [dragPreviewToken, setDragPreviewToken] = useState<{ combatantId: string; x: number; y: number } | null>(null);
  const [fogEnabled, setFogEnabled] = useState(false);
  const [fogBrushSize, setFogBrushSize] = useState(6);
  const [fogPaths, setFogPaths] = useState<FogRevealPath[]>([]);
  const [isFogEditMode, setIsFogEditMode] = useState(false);
  const fogCanvasRef = useRef<HTMLCanvasElement>(null);
  const isFogPaintingRef = useRef(false);
  const fogPathsRef = useRef<FogRevealPath[]>([]);
  const lastFogPointRef = useRef<{ x: number; y: number; strokeId: number } | null>(null);
  const fogStrokeSeqRef = useRef(0);
  const currentFogStrokeIdRef = useRef<number | null>(null);
  const [fogActionNotice, setFogActionNotice] = useState<string | null>(null);
  const fogNoticeTimerRef = useRef<number | null>(null);

  const fogReveals = useMemo<FogRevealStamp[]>(() => {
    const flat = fogPaths.flatMap((path) =>
      path.points.map((point) => ({
        x: point.x,
        y: point.y,
        r: path.r,
        strokeId: path.id,
      }))
    );
    return flat;
  }, [fogPaths]);

  // Rect en coordonnées locales de innerRef (avant transform)
  const [imgLocalRect, setImgLocalRect] = useState<ImgRect | null>(null);

  const tokenSizePct = useMemo(() => {
    if (!imgLocalRect) return undefined;
    const base = Math.min(imgLocalRect.width, imgLocalRect.height);
    if (!Number.isFinite(base) || base <= 0) return undefined;
    return (tokenSize / base) * 100;
  }, [imgLocalRect, tokenSize]);

  const draggingRef = useRef<{ combatantId: string; ox: number; oy: number } | null>(null);
  const livePosRef = useRef<{ x: number; y: number } | null>(null);
  const [isDraggingToken, setIsDraggingToken] = useState(false);

  // ── Broadcast ────────────────────────────────────────────────────────────────
  const stateRef = useRef<BattleMapBroadcast>({
    type: "update", imageUrl, mapTokens, combatants, encounters, activeCombatantId: activeCombatantId ?? null, tokenSize, tokenSizePct, zoom, pan, fogEnabled, fogReveals, showNameTags, dragPreviewToken,
  });
  useEffect(() => {
    stateRef.current = { type: "update", imageUrl, mapTokens, combatants, encounters, activeCombatantId: activeCombatantId ?? null, tokenSize, tokenSizePct, zoom, pan, fogEnabled, fogReveals, showNameTags, dragPreviewToken };
  }, [imageUrl, mapTokens, combatants, encounters, activeCombatantId, tokenSize, tokenSizePct, zoom, pan, fogEnabled, fogReveals, showNameTags, dragPreviewToken]);

  useEffect(() => {
    fogPathsRef.current = fogPaths;
  }, [fogPaths]);

  const showFogNotice = useCallback((message: string) => {
    setFogActionNotice(message);
    if (fogNoticeTimerRef.current !== null) window.clearTimeout(fogNoticeTimerRef.current);
    fogNoticeTimerRef.current = window.setTimeout(() => {
      setFogActionNotice(null);
      fogNoticeTimerRef.current = null;
    }, 1200);
  }, []);

  useEffect(() => {
    const ch = new BroadcastChannel(BATTLEMAP_CHANNEL);
    channelRef.current = ch;
    ch.onmessage = (e) => { if (e.data?.type === "request") ch.postMessage(stateRef.current); };
    return () => ch.close();
  }, []);

  useEffect(() => {
    channelRef.current?.postMessage({ type: "update", imageUrl, mapTokens, combatants, encounters, activeCombatantId: activeCombatantId ?? null, tokenSize, tokenSizePct, zoom, pan, fogEnabled, fogReveals, showNameTags, dragPreviewToken });
  }, [imageUrl, mapTokens, combatants, encounters, activeCombatantId, tokenSize, tokenSizePct, zoom, pan, fogEnabled, fogReveals, showNameTags, dragPreviewToken]);

  useEffect(() => {
    return () => {
      if (panRafRef.current !== null) cancelAnimationFrame(panRafRef.current);
      if (fogNoticeTimerRef.current !== null) window.clearTimeout(fogNoticeTimerRef.current);
    };
  }, []);

  const combatantsById = useMemo(() => {
    const byId = new Map<string, Combatant>();
    combatants.forEach((c) => byId.set(c.id, c));
    return byId;
  }, [combatants]);

  const placedCombatantIds = useMemo(() => new Set(mapTokens.map((t) => t.combatantId)), [mapTokens]);

  const openPlayerView = () => { window.open("/battlemap", "_blank", "noopener"); setPlayerTabOpen(true); };

  // ── Calcul du rect image-aligné (coordonnées locales innerRef) ───────────────
  const updateImgRect = useCallback(() => {
    if (!innerRef.current || !imgRef.current) return;
    const { naturalWidth: nw, naturalHeight: nh } = imgRef.current;
    if (!nw || !nh) return;
    setImgLocalRect(computeContainRect(innerRef.current.offsetWidth, innerRef.current.offsetHeight, nw, nh));
  }, []);

  useEffect(() => {
    if (!innerRef.current) return;
    const ro = new ResizeObserver(updateImgRect);
    ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, [updateImgRect]);

  // ── Conversion écran → % image ───────────────────────────────────────────────
  // imgContainerRef.getBoundingClientRect() tient compte du zoom/pan CSS
  const screenToMapPct = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const el = imgContainerRef.current ?? innerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: Math.max(1, Math.min(99, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(1, Math.min(99, ((clientY - rect.top) / rect.height) * 100)),
    };
  }, []);

  const clampZoom = (z: number) => Math.min(4, Math.max(0.4, z));

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (!mapZoneRef.current) return;
    const rect = mapZoneRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => {
      const next = clampZoom(prev * delta);
      setPan(p => ({ x: cx + (p.x - cx) * (next / prev), y: cy + (p.y - cy) * (next / prev) }));
      return next;
    });
  }, []);

  const handleBgPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isPanningRef.current = true;
    panStartRef.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [pan]);

  const handleBgPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanningRef.current || !panStartRef.current) return;
    pendingPanRef.current = {
      x: panStartRef.current.px + (e.clientX - panStartRef.current.mx),
      y: panStartRef.current.py + (e.clientY - panStartRef.current.my),
    };

    if (panRafRef.current !== null) return;
    panRafRef.current = requestAnimationFrame(() => {
      panRafRef.current = null;
      if (pendingPanRef.current) setPan(pendingPanRef.current);
    });
  }, []);

  const handleBgPointerUp = useCallback(() => {
    isPanningRef.current = false;
    panStartRef.current = null;
    if (pendingPanRef.current) {
      setPan(pendingPanRef.current);
      pendingPanRef.current = null;
    }
  }, []);
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    const url = await uploadBattleMap(file);
    setUploading(false);
    if (url) { onChange(url); resetView(); }
  };

  const handleMapDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current = 0;
    setIsDragOver(false);
    const raw = e.dataTransfer.getData("text/plain");
    if (raw) {
      try {
        const { combatantId } = JSON.parse(raw) as { combatantId: string };
        if (combatantId) {
          const pos = screenToMapPct(e.clientX, e.clientY);
          if (pos) { onUpdateTokens([...mapTokens.filter(t => t.combatantId !== combatantId), { combatantId, x: pos.x, y: pos.y }]); return; }
        }
      } catch { /* pas un jeton */ }
    }
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const removeToken = useCallback((id: string) => {
    onUpdateTokens(mapTokens.filter((t) => t.combatantId !== id));
  }, [mapTokens, onUpdateTokens]);
  const enterDrag = (e: React.DragEvent) => { e.preventDefault(); dragCountRef.current++; setIsDragOver(true); };
  const leaveDrag = () => { dragCountRef.current--; if (dragCountRef.current <= 0) { dragCountRef.current = 0; setIsDragOver(false); } };

  // ── Drag DOM-direct ──────────────────────────────────────────────────────────
  const commitTokenDrag = useCallback(() => {
    const d = draggingRef.current;
    const pos = livePosRef.current;
    if (d && pos) onUpdateTokens(mapTokens.map(t => t.combatantId === d.combatantId ? { ...t, ...pos } : t));
    setDragPreviewToken(null);
    draggingRef.current = null;
    livePosRef.current = null;
    setIsDraggingToken(false);
  }, [mapTokens, onUpdateTokens]);

  useEffect(() => {
    if (!isDraggingToken) return;
    const onMove = (e: PointerEvent) => {
      const d = draggingRef.current;
      if (!d) return;
      const el = imgContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * 100;
      const py = ((e.clientY - rect.top) / rect.height) * 100;
      const newX = Math.max(1, Math.min(99, px - d.ox));
      const newY = Math.max(1, Math.min(99, py - d.oy));
      livePosRef.current = { x: newX, y: newY };
      setDragPreviewToken({ combatantId: d.combatantId, x: newX, y: newY });
      const tokenEl = tokenElsRef.current.get(d.combatantId);
      if (tokenEl) { tokenEl.style.left = `${newX}%`; tokenEl.style.top = `${newY}%`; }
    };
    const onUp = () => commitTokenDrag();
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
  }, [isDraggingToken, commitTokenDrag]);

  const tokenPointerDown = useCallback((e: React.PointerEvent, token: MapToken) => {
    e.stopPropagation();
    e.preventDefault();
    const pct = screenToMapPct(e.clientX, e.clientY);
    if (!pct) return;
    draggingRef.current = { combatantId: token.combatantId, ox: pct.x - token.x, oy: pct.y - token.y };
    livePosRef.current = { x: token.x, y: token.y };
    setDragPreviewToken({ combatantId: token.combatantId, x: token.x, y: token.y });
    setIsDraggingToken(true);
  }, [screenToMapPct]);

  const setTokenEl = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) tokenElsRef.current.set(id, el); else tokenElsRef.current.delete(id);
  }, []);

  const drawFog = useCallback(() => {
    const canvas = fogCanvasRef.current;
    const host = imgContainerRef.current;
    if (!canvas || !host) return;

    const width = Math.max(1, Math.round(host.clientWidth));
    const height = Math.max(1, Math.round(host.clientHeight));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    if (!fogEnabled) return;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "destination-out";

    for (const path of fogPaths) {
      const radius = (path.r / 100) * Math.min(width, height);
      for (const point of path.points) {
        ctx.beginPath();
        ctx.arc((point.x / 100) * width, (point.y / 100) * height, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalCompositeOperation = "source-over";
  }, [fogEnabled, fogPaths]);

  useEffect(() => {
    drawFog();
  }, [drawFog, imgLocalRect, zoom, pan]);

  const trimFogPaths = useCallback((paths: FogRevealPath[]): FogRevealPath[] => {
    let next = paths;

    if (next.length > FOG_PATH_LIMIT) {
      next = next.slice(next.length - FOG_PATH_LIMIT);
    }

    let pointCount = next.reduce((sum, path) => sum + path.points.length, 0);
    if (pointCount <= FOG_STAMP_LIMIT) return next;

    let removeUntil = 0;
    while (removeUntil < next.length && pointCount > FOG_STAMP_LIMIT) {
      pointCount -= next[removeUntil].points.length;
      removeUntil += 1;
    }

    return removeUntil > 0 ? next.slice(removeUntil) : next;
  }, []);

  const addFogRevealAt = useCallback((clientX: number, clientY: number) => {
    const strokeId = currentFogStrokeIdRef.current;
    if (strokeId === null) return;
    const host = imgContainerRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;

    const last = lastFogPointRef.current;
    const currentPath = fogPathsRef.current.find((path) => path.id === strokeId);
    const activeRadius = currentPath?.r ?? fogBrushSize;
    const minStep = Math.max(0.35, activeRadius * 0.22);
    if (last && last.strokeId === strokeId) {
      const dx = x - last.x;
      const dy = y - last.y;
      const dist = Math.hypot(dx, dy);
      if (dist < minStep) return;
    }

    lastFogPointRef.current = { x, y, strokeId };

    setFogPaths((prev) => {
      const index = prev.findIndex((path) => path.id === strokeId);
      if (index === -1) return prev;

      const updated = [...prev];
      const target = updated[index];
      updated[index] = { ...target, points: [...target.points, { x, y }] };
      return trimFogPaths(updated);
    });
  }, [fogBrushSize, trimFogPaths]);

  const undoLastFogStroke = useCallback(() => {
    const current = fogPathsRef.current;
    if (current.length === 0) return false;
    const next = current.slice(0, -1);
    setFogPaths(next);
    return true;
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isUndo = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z";
      if (!isUndo) return;

      const target = e.target as HTMLElement | null;
      const isTypingTarget = !!target && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      );
      if (isTypingTarget) return;

      e.preventDefault();
      const undone = undoLastFogStroke();
      showFogNotice(undone ? "Trait annulé" : "Rien à annuler");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undoLastFogStroke, showFogNotice]);

  const onFogPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isFogEditMode || !fogEnabled) return;
    e.preventDefault();
    e.stopPropagation();

    const host = imgContainerRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;

    fogStrokeSeqRef.current += 1;
    currentFogStrokeIdRef.current = fogStrokeSeqRef.current;
    setFogPaths((prev) => trimFogPaths([
      ...prev,
      { id: fogStrokeSeqRef.current, r: fogBrushSize, points: [{ x, y }] },
    ]));
    lastFogPointRef.current = { x, y, strokeId: fogStrokeSeqRef.current };
    isFogPaintingRef.current = true;
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
  }, [isFogEditMode, fogEnabled, fogBrushSize, trimFogPaths]);

  const onFogPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isFogPaintingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    addFogRevealAt(e.clientX, e.clientY);
  }, [addFogRevealAt]);

  const onFogPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isFogPaintingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    isFogPaintingRef.current = false;
    currentFogStrokeIdRef.current = null;
    lastFogPointRef.current = null;
    if ((e.currentTarget as HTMLCanvasElement).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    }
  }, []);

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapZoneRef}
        className="absolute inset-0 bottom-18 rounded-xl overflow-hidden bg-black/20"
        style={{ cursor: isDraggingToken ? "grabbing" : "grab" }}
        onWheel={handleWheel}
        onDragEnter={enterDrag}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={leaveDrag}
        onDrop={handleMapDrop}
      >
        {imageUrl ? (
          <>
            {/* Calque transformé */}
            <div
              ref={innerRef}
              className="absolute inset-0"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "center" }}
              onPointerDown={handleBgPointerDown}
              onPointerMove={handleBgPointerMove}
              onPointerUp={handleBgPointerUp}
              onPointerLeave={handleBgPointerUp}
            >
              {/* Image de fond */}
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Carte de combat"
                className="w-full h-full object-contain pointer-events-none select-none"
                onLoad={updateImgRect}
                draggable={false}
              />

              {/* Conteneur de tokens aligné sur les pixels réels de l'image */}
              <div
                ref={imgContainerRef}
                className="absolute"
                style={imgLocalRect ? {
                  left: imgLocalRect.left,
                  top: imgLocalRect.top,
                  width: imgLocalRect.width,
                  height: imgLocalRect.height,
                } : { inset: 0 }}
              >
                <canvas
                  ref={fogCanvasRef}
                  className="absolute inset-0 z-25"
                  style={{ pointerEvents: isFogEditMode && fogEnabled ? "auto" : "none", opacity: 0.5 }}
                  onPointerDown={onFogPointerDown}
                  onPointerMove={onFogPointerMove}
                  onPointerUp={onFogPointerUp}
                  onPointerCancel={onFogPointerUp}
                />
                {mapTokens.map((token) => {
                  const combatant = combatantsById.get(token.combatantId);
                  if (!combatant) return null;
                  const isActive = combatant.id === activeCombatantId;
                  return (
                    <div key={token.combatantId} className={combatant.hidden ? "opacity-40 grayscale" : ""}>
                      <MapTokenMarker
                      key={token.combatantId}
                      token={token}
                      combatant={combatant}
                      isActive={isActive}
                      tokenSize={tokenSize}
                      onPointerDown={tokenPointerDown}
                      onRemove={removeToken}
                      setTokenEl={setTokenEl}
                    />
                    </div>
                  );
                })}
              </div>
            </div>

            {isDragOver && (
              <div className="absolute inset-0 border-2 border-dashed border-white/50 rounded-xl bg-white/5 pointer-events-none flex items-center justify-center z-10">
                <span className="text-white/70 text-sm bg-black/50 px-3 py-1.5 rounded-lg backdrop-blur">Déposer ici</span>
              </div>
            )}

            <div className="absolute top-3 right-3 flex gap-1.5 z-30 pointer-events-auto">
              {fogActionNotice && (
                <div className="absolute -top-10 right-0 px-2 py-1 rounded-md bg-black/80 border border-white/20 text-[10px] uppercase tracking-wide text-white/80 whitespace-nowrap">
                  {fogActionNotice}
                </div>
              )}
              <div className="flex items-center gap-1 rounded-xl bg-black/60 backdrop-blur border border-white/15 p-1">
                <button
                  onClick={() => {
                    setFogEnabled((v) => {
                      const next = !v;
                      if (!next) setIsFogEditMode(false);
                      return next;
                    });
                  }}
                  className={`p-1.5 rounded-lg border transition-colors ${fogEnabled ? "bg-amber-500/25 border-amber-300/40 text-amber-200" : "bg-transparent border-white/10 text-white/60 hover:text-white"}`}
                  title="Activer/Désactiver le brouillard"
                >
                  <Cloud className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsFogEditMode((v) => !v)}
                  disabled={!fogEnabled}
                  className={`p-1.5 rounded-lg border transition-colors ${isFogEditMode ? "bg-cyan-500/25 border-cyan-300/40 text-cyan-200" : "bg-transparent border-white/10 text-white/60 hover:text-white"} ${!fogEnabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  title="Mode pinceau"
                >
                  <Brush className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const undone = undoLastFogStroke();
                    showFogNotice(undone ? "Trait annulé" : "Rien à annuler");
                  }}
                  disabled={!fogEnabled}
                  className={`p-1.5 rounded-lg border transition-colors ${!fogEnabled ? "opacity-40 cursor-not-allowed" : "bg-transparent border-white/10 text-white/60 hover:text-white"}`}
                  title="Annuler le dernier trait (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setFogPaths([]);
                    showFogNotice("Brouillard réinitialisé");
                  }}
                  disabled={!fogEnabled}
                  className={`p-1.5 rounded-lg border transition-colors ${!fogEnabled ? "opacity-40 cursor-not-allowed" : "bg-transparent border-white/10 text-white/60 hover:text-white"}`}
                  title="Réinitialiser le brouillard"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={openPlayerView}
                className={`p-1.5 rounded-lg backdrop-blur border transition-colors ${playerTabOpen ? "bg-emerald-500/30 border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/40" : "bg-black/60 border-white/20 text-white/70 hover:text-white"}`}
                title="Ouvrir la vue joueur"
              >
                <MonitorPlay className="w-4 h-4" />
              </button>
              <button onClick={() => inputRef.current?.click()} className="p-1.5 rounded-lg bg-black/60 backdrop-blur text-white/70 hover:text-white border border-white/20 transition-colors" title="Remplacer la carte"><ImagePlus className="w-4 h-4" /></button>
              <button onClick={() => onChange(null)} className="p-1.5 rounded-lg bg-black/60 backdrop-blur text-white/70 hover:text-red-300 border border-white/20 transition-colors" title="Supprimer la carte"><Trash2 className="w-4 h-4" /></button>
            </div>

            <div className="absolute bottom-3 left-3 flex items-center gap-1 z-30 pointer-events-auto">
              <button onClick={() => setZoom(z => clampZoom(z * 0.8))} className="p-1 rounded bg-black/60 backdrop-blur text-white/60 hover:text-white border border-white/15 transition-colors"><Minus className="w-3 h-3" /></button>
              <button onClick={resetView} className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur text-[9px] text-white/60 hover:text-white border border-white/15 transition-colors min-w-8 text-center" title="Réinitialiser la vue">{Math.round(zoom * 100)}%</button>
              <button onClick={() => setZoom(z => clampZoom(z * 1.25))} className="p-1 rounded bg-black/60 backdrop-blur text-white/60 hover:text-white border border-white/15 transition-colors"><Plus className="w-3 h-3" /></button>
            </div>
          </>
        ) : (
          <div
            onClick={() => !uploading && inputRef.current?.click()}
            onPointerDown={(e) => e.stopPropagation()}
            className={`w-full h-full rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-4 group ${isDragOver ? "border-white/60 bg-white/10" : "border-white/15 bg-white/3 hover:bg-white/6 hover:border-white/30"}`}
          >
            {uploading ? (
              <><Loader2 className="w-8 h-8 text-white/40 animate-spin" /><span className="text-[12px] text-white/40">Upload en cours...</span></>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  <ImagePlus className="w-7 h-7 text-white/30 group-hover:text-white/55 transition-colors" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-[13px] text-white/50 group-hover:text-white/70 font-medium">Carte de combat</p>
                  <p className="text-[11px] text-white/25 group-hover:text-white/40">Cliquer ou glisser une image</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 inset-x-0 h-16 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-4 flex items-center gap-3 overflow-x-auto scrollbar-none">
        <span className="text-[9px] uppercase tracking-widest text-white/30 font-semibold shrink-0 pr-3 border-r border-white/10">Jetons</span>
        {combatants.length === 0 ? (
          <p className="text-[11px] text-white/25 italic flex-1">Aucun combattant dans l'arène</p>
        ) : combatants.map((combatant) => {
          const isPlaced = placedCombatantIds.has(combatant.id);
          const isActive = combatant.id === activeCombatantId;
          return (
            <div
              key={combatant.id}
              draggable={!isPlaced && !!imageUrl}
              onDragStart={(e) => { e.dataTransfer.setData("text/plain", JSON.stringify({ combatantId: combatant.id })); e.dataTransfer.effectAllowed = "move"; }}
              onClick={() => { if (isPlaced) removeToken(combatant.id); }}
              className={`relative shrink-0 group/tt select-none ${
                isPlaced
                  ? "cursor-pointer"
                  : imageUrl ? "cursor-grab active:cursor-grabbing" : "opacity-40 cursor-not-allowed"
              }`}
              title={isPlaced ? `Retirer ${combatant.name} de la carte` : combatant.name}
            >
              <div className={`relative w-9 h-9 rounded-full border-2 overflow-hidden transition-transform group-hover/tt:scale-110 ${tokenRingClass(combatant.type)} ${isPlaced ? "opacity-60" : ""}`}>
                <img src={combatant.imageUrl || "/default-avatar.png"} alt={combatant.name} className="w-full h-full object-cover pointer-events-none" />
                {isPlaced && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/tt:opacity-100 transition-opacity">
                    <X className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              {(() => { const m = combatant.name.match(/^(.*?) #(\d+)$/); return m ? (
                <div className="absolute top-0 left-0 w-4 h-4 rounded-full bg-black/70 border border-white/25 flex items-center justify-center z-10">
                  <span className="text-[7px] font-bold text-white/80 leading-none">{m[2]}</span>
                </div>
              ) : null; })()}
              {isPlaced && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black flex items-center justify-center">
                  <span className="text-[6px] text-black font-bold leading-none">✓</span>
                </div>
              )}
              {isActive && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-black animate-pulse" />}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover/tt:opacity-100 transition-opacity whitespace-nowrap z-50">
                <span className="text-[9px] text-white bg-black/80 backdrop-blur px-1.5 py-0.5 rounded">{combatant.name}</span>
              </div>
            </div>
          );
        })}
        {imageUrl && (
          <>
            <div className="shrink-0 h-8 w-px bg-white/10 ml-auto" />
            <div className="shrink-0 flex items-center gap-2 pl-2">
              <ZoomIn className="w-3.5 h-3.5 text-white/30 shrink-0" />
              <input type="range" min={12} max={72} step={2} value={tokenSize} onChange={(e) => setTokenSize(Number(e.target.value))} className="w-20 accent-white/60 cursor-pointer" title="Taille des jetons" />
              <span className="text-[9px] text-white/30 w-6 text-right">{tokenSize}</span>
            </div>
            <div className="shrink-0 flex items-center gap-2 pl-2">
              <span className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">Fog</span>
              <input
                type="range"
                min={2}
                max={16}
                step={1}
                value={fogBrushSize}
                onChange={(e) => setFogBrushSize(Number(e.target.value))}
                className="w-20 accent-amber-300/80 cursor-pointer"
                title="Taille du pinceau de brouillard"
                disabled={!fogEnabled}
              />
              <span className="text-[9px] text-white/30 w-6 text-right">{fogBrushSize}</span>
            </div>
          </>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleFile(file); e.target.value = ""; }}
      />
    </div>
  );
}

function areBattleMapPropsEqual(prev: BattleMapProps, next: BattleMapProps): boolean {
  return (
    prev.imageUrl === next.imageUrl &&
    prev.onChange === next.onChange &&
    prev.combatants === next.combatants &&
    prev.encounters === next.encounters &&
    prev.mapTokens === next.mapTokens &&
    prev.onUpdateTokens === next.onUpdateTokens &&
    prev.activeCombatantId === next.activeCombatantId
  );
}

export const BattleMap = memo(BattleMapInner, areBattleMapPropsEqual);
