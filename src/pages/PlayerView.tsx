import { useEffect, useRef, useState, useCallback } from "react";
import { Swords } from "lucide-react";
import type { Combatant, MapToken } from "@/components/scenarios/combat/types";
import { CONDITION_OPTIONS } from "@/components/scenarios/combat/types";
import { tokenRingClass, BATTLEMAP_CHANNEL } from "@/components/scenarios/combat/BattleMap";

interface LiveState {
  imageUrl: string | null;
  mapTokens: MapToken[];
  combatants: Combatant[];
  activeCombatantId: string | null;
  tokenSize: number;
}

type ImgRect = { left: number; top: number; width: number; height: number };

export function PlayerView() {
  const [state, setState] = useState<LiveState | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgRect, setImgRect] = useState<ImgRect | null>(null);

  useEffect(() => {
    const ch = new BroadcastChannel(BATTLEMAP_CHANNEL);
    channelRef.current = ch;
    ch.onmessage = (e) => { if (e.data?.type === "update") setState(e.data as LiveState); };
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

  const activeCombatant = state?.combatants.find(c => c.id === state.activeCombatantId);

  return (
    <div className="fixed inset-0 bg-black flex flex-col select-none overflow-hidden">
      {/* Barre de statut */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-6 py-3 bg-linear-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-amber-400/70" />
          <span className="text-[11px] uppercase tracking-widest text-white/30 font-semibold">Spellbound — Vue joueur</span>
        </div>
        {activeCombatant && (
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full border border-amber-400/30">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[12px] text-amber-300 font-medium">{activeCombatant.name}</span>
          </div>
        )}
      </div>

      {state?.imageUrl ? (
        <div ref={containerRef} className="relative flex-1 w-full overflow-hidden flex items-center justify-center">
          <img
            ref={imgRef}
            src={state.imageUrl}
            alt="Carte de combat"
            className="h-full w-auto max-h-screen object-contain"
            onLoad={updateImgRect}
            draggable={false}
          />

          {/* Conteneur de tokens aligné sur les pixels réels de l'image */}
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
              if (!combatant) return null;
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
                  {/* Bulles de conditions */}
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
  );
}
