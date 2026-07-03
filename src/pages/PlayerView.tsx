import { useEffect, useRef, useState, useCallback } from "react";
import { BookMarked, Map, Swords, Users } from "lucide-react";
import type { Combatant, EncounterEntry, MapToken } from "@/components/scenarios/combat/types";
import { CONDITION_OPTIONS } from "@/components/scenarios/combat/types";
import { tokenRingClass, BATTLEMAP_CHANNEL, type BattleMapBroadcast, type FogRevealStamp } from "@/components/scenarios/combat/BattleMap";
import { useAuthStore } from "@/stores/useAuthStore";

interface LiveState {
  imageUrl: string | null;
  mapTokens: MapToken[];
  combatants: Combatant[];
  encounters: EncounterEntry[];
  activeCombatantId: string | null;
  tokenSize: number;
  zoom: number;
  pan: { x: number; y: number };
  fogEnabled: boolean;
  fogReveals: FogRevealStamp[];
}

type ImgRect = { left: number; top: number; width: number; height: number };
type Tab = "map" | "combatants" | "encounter";

export function PlayerView() {
  const [state, setState] = useState<LiveState | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("map");
  const channelRef = useRef<BroadcastChannel | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgRect, setImgRect] = useState<ImgRect | null>(null);
  const fogCanvasRef = useRef<HTMLCanvasElement>(null);
  const role = useAuthStore((s) => s.role);
  const isMJ = role === "mj";

  useEffect(() => {
    const ch = new BroadcastChannel(BATTLEMAP_CHANNEL);
    channelRef.current = ch;
    ch.onmessage = (e) => {
      if (e.data?.type !== "update") return;
      const incoming = e.data as BattleMapBroadcast;
      setState({
        imageUrl: incoming.imageUrl,
        mapTokens: incoming.mapTokens,
        combatants: incoming.combatants,
        encounters: incoming.encounters ?? [],
        activeCombatantId: incoming.activeCombatantId,
        tokenSize: incoming.tokenSize,
        zoom: incoming.zoom ?? 1,
        pan: incoming.pan ?? { x: 0, y: 0 },
        fogEnabled: incoming.fogEnabled ?? false,
        fogReveals: incoming.fogReveals ?? [],
      });
    };
    ch.postMessage({ type: "request" });
    return () => ch.close();
  }, []);

  const updateImgRect = useCallback(() => {
    if (!containerRef.current || !imgRef.current) return;
    const { naturalWidth: nw, naturalHeight: nh } = imgRef.current;
    if (!nw || !nh) return;
    // L'image est rendue à h-full (hauteur du conteneur), largeur auto
    const ch = containerRef.current.offsetHeight;
    const cw = containerRef.current.offsetWidth;
    const scale = Math.min(cw / nw, ch / nh);
    const rw = nw * scale, rh = nh * scale;
    setImgRect({ left: (cw - rw) / 2, top: (ch - rh) / 2, width: rw, height: rh });
  }, []);

  // Recalcul au resize et au changement d'image
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(updateImgRect);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [updateImgRect, state?.imageUrl]);

  useEffect(() => {
    const canvas = fogCanvasRef.current;
    const rect = imgRect;
    if (!canvas || !rect) return;
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    if (!state?.fogEnabled) return;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "destination-out";

    for (const stamp of state.fogReveals) {
      ctx.beginPath();
      ctx.arc((stamp.x / 100) * width, (stamp.y / 100) * height, (stamp.r / 100) * Math.min(width, height), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
  }, [imgRect, state?.fogEnabled, state?.fogReveals]);

  const activeCombatant = state?.combatants.find(c => c.id === state.activeCombatantId);
  const visibleCombatants = (state?.combatants ?? []).filter((c) => !c.hidden);

  const renderCombatantsTab = () => {
    if (visibleCombatants.length === 0) {
      return <p className="text-white/30 text-sm italic text-center pt-12">Aucun combattant visible</p>;
    }

    return visibleCombatants.map((c) => {
      const isActive = c.id === state?.activeCombatantId;
      const pct = c.pvMax > 0 ? Math.max(0, Math.min(100, (c.pv / c.pvMax) * 100)) : 0;
      const barColor = pct > 60 ? "bg-emerald-400" : pct > 25 ? "bg-amber-400" : "bg-red-500";
      const activeConditions = CONDITION_OPTIONS.filter((o) => c.conditions.includes(o.key));
      const canSeePv = isMJ || c.type === "pj";

      return (
        <div key={c.id} className={`rounded-xl border p-3 flex items-center gap-3 transition-colors ${isActive ? "border-amber-400/40 bg-amber-400/5" : "border-white/10 bg-white/3"}`}>
          <div className={`w-12 h-12 rounded-full border-2 overflow-hidden shrink-0 ${tokenRingClass(c.type)}`}>
            <img src={c.imageUrl || "/default-avatar.png"} alt={c.name} className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />}
              <span className="text-sm font-medium text-white truncate">{c.name}</span>
              {activeConditions.length > 0 && (
                <span className="flex gap-0.5 ml-auto shrink-0">
                  {activeConditions.slice(0, 4).map((o) => <span key={o.key} title={o.label} className="text-sm">{o.icon}</span>)}
                </span>
              )}
            </div>

            {canSeePv ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[11px] text-white/50 shrink-0 tabular-nums">{c.pv} / {c.pvMax}</span>
              </div>
            ) : (
              <span className="text-[11px] text-white/35 italic">PV cachés</span>
            )}
          </div>
        </div>
      );
    });
  };

  const renderEncounterTab = () => {
    const encounters = state?.encounters ?? [];
    if (encounters.length === 0) {
      return <p className="text-white/30 text-sm italic text-center pt-12">Aucun encounter pour le moment</p>;
    }

    return encounters.map((entry) => (
      <div key={entry.key} className="rounded-xl border border-white/10 bg-white/3 p-3 flex items-center gap-3">
        <div className={`w-12 h-12 rounded-full border-2 overflow-hidden shrink-0 ${tokenRingClass(entry.type)}`}>
          <img src={entry.imageUrl || "/default-avatar.png"} alt={entry.name} className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white font-medium truncate">{entry.name}</p>
          <p className="text-[10px] text-white/35 uppercase tracking-wide">{entry.type === "monster" ? "Monstre" : "PNJ"}</p>
        </div>
        <span className="text-[10px] text-white/30 shrink-0">Rencontré</span>
      </div>
    ));
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col select-none overflow-hidden">
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3 bg-linear-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-amber-400/70" />
          <span className="hidden sm:inline text-[11px] uppercase tracking-widest text-white/30 font-semibold">Spellbound — Vue joueur</span>
        </div>
        {activeCombatant && (
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full border border-amber-400/30">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[12px] text-amber-300 font-medium">{activeCombatant.name}</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <div className={`flex-1 min-h-0 ${activeTab === "map" ? "flex" : "hidden"}`}>
          {state?.imageUrl ? (
            <div ref={containerRef} className="relative flex-1 w-full overflow-hidden flex items-center justify-center">
          <div
            className="absolute inset-0"
            style={{
              transform: `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`,
              transformOrigin: "center",
              willChange: "transform",
            }}
          >
            <img
              ref={imgRef}
              src={state.imageUrl}
              alt="Carte de combat"
              className="h-full w-full object-contain"
              onLoad={updateImgRect}
              draggable={false}
            />

            <div
              className="absolute pointer-events-none"
              style={imgRect ? {
                left: imgRect.left,
                top: imgRect.top,
                width: imgRect.width,
                height: imgRect.height,
              } : { inset: 0 }}
            >
              {state.mapTokens.map(token => {
                const combatant = state.combatants.find(c => c.id === token.combatantId);
                if (!combatant || combatant.hidden) return null;
                const isActive = combatant.id === state.activeCombatantId;
                const sz = state.tokenSize;
                const activeConditions = CONDITION_OPTIONS.filter(o => combatant.conditions.includes(o.key));
                return (
                  <div
                    key={token.combatantId}
                    className="absolute z-10"
                    style={{ left: `${token.x}%`, top: `${token.y}%`, transform: "translate(-50%, -50%)" }}
                  >
                    {isActive && (
                      <div className="absolute rounded-full border-2 border-amber-400 animate-ping opacity-75" style={{ inset: -6, width: sz + 12, height: sz + 12 }} />
                    )}
                    <div
                      className={`relative rounded-full border-2 overflow-hidden ${tokenRingClass(combatant.type)}`}
                      style={{ width: sz, height: sz }}
                    >
                      <img src={combatant.imageUrl || "/default-avatar.png"} alt={combatant.name} className="w-full h-full object-cover" draggable={false} />
                    </div>
                    {activeConditions.length > 0 && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5 pointer-events-none">
                        {activeConditions.slice(0, 3).map(opt => (
                          <span key={opt.key} className="text-base leading-none" title={opt.label}>{opt.icon}</span>
                        ))}
                      </div>
                    )}
                    <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 whitespace-nowrap" style={{ fontSize: Math.max(9, sz * 0.22) }}>
                      <span className="text-white/90 bg-black/80 backdrop-blur px-1.5 py-0.5 rounded block text-center leading-tight">{combatant.name}</span>
                    </div>
                  </div>
                );
              })}

              <canvas
                ref={fogCanvasRef}
                className="absolute inset-0"
                style={{ opacity: 1 }}
              />
            </div>
          </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center">
                  <Swords className="w-8 h-8 text-white/20" />
                </div>
                <div className="absolute inset-0 rounded-full border border-white/5 animate-ping" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-white/40 text-sm font-medium">En attente du Maître de Jeu...</p>
                <p className="text-white/20 text-[11px]">{state === null ? "Connexion à la session en cours" : "Aucune carte chargée pour le moment"}</p>
              </div>
              {state === null && (
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`flex-1 min-h-0 overflow-y-auto px-4 pt-16 pb-4 space-y-3 ${activeTab === "combatants" ? "block" : "hidden"}`}>
          {renderCombatantsTab()}
        </div>

        <div className={`flex-1 min-h-0 overflow-y-auto px-4 pt-16 pb-4 space-y-3 ${activeTab === "encounter" ? "block" : "hidden"}`}>
          {renderEncounterTab()}
        </div>
      </div>

      <div className="shrink-0 flex border-t border-white/10 bg-black/80 backdrop-blur-xl">
        <button onClick={() => setActiveTab("map")} className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${activeTab === "map" ? "text-amber-300" : "text-white/35 hover:text-white/60"}`}>
          <Map className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-wide font-medium">Carte</span>
        </button>
        <button onClick={() => setActiveTab("combatants")} className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${activeTab === "combatants" ? "text-amber-300" : "text-white/35 hover:text-white/60"}`}>
          <Users className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-wide font-medium">Combattants</span>
        </button>
        <button onClick={() => setActiveTab("encounter")} className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${activeTab === "encounter" ? "text-amber-300" : "text-white/35 hover:text-white/60"}`}>
          <BookMarked className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-wide font-medium">Encounter</span>
        </button>
      </div>
    </div>
  );
}
