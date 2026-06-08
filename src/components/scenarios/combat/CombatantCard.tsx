import { useState } from "react";
import { ChevronDown, Crosshair, Minus, Plus, Shield, Swords, Wand2, Zap, Heart, X } from "lucide-react";
import { MagicCard } from "@/components/ui/MagicCard";
import { CONDITION_OPTIONS, STAT_ORDER, toNumber } from "./types";
import type { Combatant, ConditionKey, MonsterStatsMap, VoieEntry } from "./types";

interface CombatantCardProps {
    combatant: Combatant;
    onUpdatePv: (newPv: number) => void;
    onToggleCondition: (cond: ConditionKey) => void;
}

function signedNum(n: number) {
    return n >= 0 ? `+${n}` : String(n);
}

function VoieAccordion({ voie, expanded, onToggle }: { voie: VoieEntry; expanded: boolean; onToggle: () => void }) {
    return (
        <div className="bg-white/6 rounded-lg border border-white/10 overflow-hidden">
            <button onClick={onToggle} className="w-full flex items-center justify-between px-2.5 py-2 text-left hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-semibold text-white truncate">{voie.nom}</span>
                    <div className="flex gap-0.5 shrink-0">
                        {[...voie.rangsAcquis].sort((a, b) => a - b).map((r) => (
                            <span key={r} className="w-4 h-4 rounded-full bg-[#E3CCCD]/15 border border-[#E3CCCD]/30 flex items-center justify-center text-[8px] text-[#E3CCCD]/80 font-bold">{r}</span>
                        ))}
                    </div>
                </div>
                <ChevronDown className={`w-3 h-3 text-white/30 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
            {expanded && (
                <div className="px-2.5 pb-2 border-t border-white/8 pt-2 space-y-1.5">
                    {[1, 2, 3, 4, 5].map((rang) => {
                        const cap = voie.capacites[`rang${rang}`];
                        if (!cap?.nom) return null;
                        const acquired = voie.rangsAcquis.includes(rang);
                        return (
                            <div key={rang} className={`text-[10px] ${acquired ? "" : "opacity-30"}`}>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-white">{rang}. {cap.nom}</span>
                                    {cap.type && cap.type !== "passif" && (
                                        <span className="text-[8px] uppercase tracking-wider text-[#E3CCCD]/50 border border-[#E3CCCD]/15 rounded px-1 py-0.5">{cap.type}</span>
                                    )}
                                    {acquired && <span className="ml-auto text-[8px] text-emerald-400/70">✓</span>}
                                </div>
                                <p className="text-white/55 leading-relaxed mt-0.5 line-clamp-3">{cap.description}</p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export function CombatantCard({ combatant, onUpdatePv, onToggleCondition }: CombatantCardProps) {
    const [expandedVoie, setExpandedVoie] = useState<string | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [pvDelta, setPvDelta] = useState<string>("1");

    const ribbonShape = "polygon(0 0, 100% 0, 100% 75%, 50% 100%, 0 75%)";
    const isPJ = combatant.type === "pj";
    const pj = combatant.pjStats;
    const caract = pj?.caracteristiques ?? {};

    const quickStats = isPJ
        ? [
            { icon: <Zap className="w-3 h-3" />, value: String(combatant.initiative ?? pj?.initiative ?? 0), label: "Initiative" },
            { icon: <Shield className="w-3 h-3" />, value: String(combatant.defense ?? 0), label: "Défense" },
            { icon: <Swords className="w-3 h-3" />, value: signedNum(pj?.att_contact ?? 0), label: "Corps" },
            { icon: <Crosshair className="w-3 h-3" />, value: signedNum(pj?.att_distance ?? 0), label: "Distance" },
            { icon: <Wand2 className="w-3 h-3" />, value: signedNum(pj?.att_magie ?? 0), label: "Magie" },
        ]
        : [
            { icon: <Zap className="w-3 h-3" />, value: String(combatant.details?.combat?.initiative ?? combatant.initiative ?? 0), label: "Initiative" },
            { icon: <Shield className="w-3 h-3" />, value: String(combatant.defense ?? 0), label: "Défense" },
        ];

    const attacks = combatant.details?.attaques?.length
        ? combatant.details.attaques
        : [{ attaque_base: "Attaque standard", dm: undefined }];

    const isMonster = combatant.type === "monster";

    return (
        <div className="animate-in fade-in duration-200 relative">
            {/* Aura colorée : rouge pour monstres, neutre pour PJ/PNJ */}
            {isMonster && (
                <div className="absolute -inset-2 rounded-3xl pointer-events-none z-0" style={{ background: "radial-gradient(ellipse at center, rgba(220,38,38,0.18) 0%, transparent 70%)" }} />
            )}
            <div
                onClick={() => setEditOpen(true)}
                className={`relative flex rounded-2xl backdrop-blur-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] cursor-pointer ${
                    isMonster ? "border border-red-500/30" : "border border-white/15"
                }`}
                style={{ background: isMonster
                    ? "linear-gradient(135deg, rgba(220,38,38,0.10) 0%, rgba(255,255,255,0.03) 100%)"
                    : "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)"
                }}
            >
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent pointer-events-none z-0" />
                <div className="absolute inset-1.5 border border-white/8 pointer-events-none z-0" style={{ borderRadius: "calc(1rem - 4px)" }} />

                {/* COL 1 : MagicCard */}
                <div className="relative z-10 p-3 shrink-0" onClick={() => setEditOpen((v) => !v)}>
                    <MagicCard
                        size="compact"
                        title={combatant.name}
                        imageUrl={combatant.imageUrl || "/default-avatar.png"}
                        badge={
                            <div className="inline-flex flex-col drop-shadow-md">
                                <div className="bg-white/80 px-px pb-px pt-0" style={{ clipPath: ribbonShape }}>
                                    <div className="flex flex-col items-center bg-linear-to-b from-[#151B45] to-[#4456AA] w-6 pt-3 pb-1" style={{ clipPath: ribbonShape }}>
                                        <span className="text-[#E8D4D4] text-xs font-bold leading-none mt-1">{combatant.pv}</span>
                                        {combatant.pvMax && (
                                            <span className="text-[#E8D4D4]/45 text-[7px] leading-none mt-0.5">{combatant.pvMax}</span>
                                        )}
                                        <Heart className="w-4 h-4 text-[#E8D4D4] fill-[#E8D4D4] mt-1.5" strokeWidth={1.5} />
                                    </div>
                                </div>
                            </div>
                        }
                    />

                    {/* Tiroir PV + États */}
                    {editOpen && (
                        <div
                            className="absolute inset-x-0 bottom-0 rounded-b-xl z-50 flex flex-col animate-in slide-in-from-bottom-2 duration-200 overflow-hidden"
                            style={{ background: "linear-gradient(135deg, rgba(55,72,175,0.97), rgba(40,52,140,0.98))" }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Délimiteur haut */}
                            <div className="h-px bg-[#E3CCCD]/30" />

                            <div className="px-3 py-2.5 flex flex-col gap-2">
                                {/* Bouton fermer */}
                                <button
                                    onClick={() => setEditOpen(false)}
                                    className="absolute top-2 right-2 text-white/60 hover:text-white transition-colors"
                                ><X className="w-3 h-3" /></button>

                                {/* PV */}
                                <div className="space-y-1 pr-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-base font-bold text-white">{combatant.pv}</span>
                                        <span className="text-[9px] text-white/70">/ {combatant.pvMax} PV</span>
                                    </div>
                                    <div className="h-0.5 rounded-full overflow-hidden bg-white/20">
                                        <div className="h-full rounded-full transition-all duration-500" style={{
                                            width: `${combatant.pvMax > 0 ? Math.max(0, Math.min(100, (combatant.pv / combatant.pvMax) * 100)) : 0}%`,
                                            background: combatant.pv / combatant.pvMax > 0.5
                                                ? "#34d399"
                                                : combatant.pv / combatant.pvMax > 0.25
                                                ? "#f59e0b"
                                                : "#f87171",
                                        }} />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => onUpdatePv(Math.max(0, combatant.pv - Math.max(1, toNumber(pvDelta, 1))))}
                                            className="flex-1 flex items-center justify-center gap-0.5 py-0.5 rounded text-[9px] text-rose-200 border border-rose-200/40 hover:bg-rose-200/15 transition-colors"
                                        ><Minus className="w-2 h-2" /> Blessure</button>
                                        <input
                                            type="number" min={1} value={pvDelta}
                                            onChange={(e) => setPvDelta(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-7 bg-white/15 border border-white/30 rounded text-center text-[10px] text-white font-bold outline-none py-0.5"
                                        />
                                        <button
                                            onClick={() => onUpdatePv(Math.min(combatant.pvMax, combatant.pv + Math.max(1, toNumber(pvDelta, 1))))}
                                            className="flex-1 flex items-center justify-center gap-0.5 py-0.5 rounded text-[9px] text-emerald-200 border border-emerald-200/40 hover:bg-emerald-200/15 transition-colors"
                                        ><Plus className="w-2 h-2" /> Soin</button>
                                    </div>
                                </div>

                                {/* Délimiteur */}
                                <div className="h-px bg-white/20" />

                                {/* États */}
                                <div className="grid grid-cols-2 gap-0.5">
                                    {CONDITION_OPTIONS.map((opt) => {
                                        const active = combatant.conditions.includes(opt.key);
                                        return (
                                            <button
                                                key={opt.key}
                                                onClick={() => onToggleCondition(opt.key)}
                                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium transition-all ${
                                                    active
                                                        ? `${opt.bg} text-white`
                                                        : "text-white/65 hover:text-white"
                                                }`}
                                            >
                                                <span>{opt.icon}</span><span>{opt.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-px self-stretch bg-[#E3CCCD]/12 relative z-10" />

                {/* COL 2 : Stats combat */}
                <div className="relative z-10 flex flex-col justify-between py-3 px-2 shrink-0 w-15 self-stretch">
                    <div className="flex flex-col justify-around flex-1">
                        {quickStats.map((stat, i) => (
                            <div key={i} className="flex items-center justify-between gap-1 px-0.5" title={stat.label}>
                                <span className="text-white/35">{stat.icon}</span>
                                <span className="text-[10px] text-[#E3CCCD] font-bold">{stat.value}</span>
                            </div>
                        ))}
                    </div>
                    <div className="h-px bg-white/10 my-1" />
                    <div className="flex flex-col justify-around flex-1">
                        {STAT_ORDER.map((statKey) => {
                            let displayVal: string;
                            if (isPJ) {
                                const raw = caract[statKey];
                                displayVal = raw !== undefined ? String(raw) : "-";
                            } else {
                                const statsMap = combatant.details?.stats as MonsterStatsMap | undefined;
                                const statVal = statsMap?.[statKey] ?? statsMap?.[statKey.toLowerCase()];
                                const mod = statVal ? toNumber(statVal.mod, 0) : null;
                                displayVal = mod !== null ? signedNum(mod) : "-";
                            }
                            return (
                                <div key={statKey} className="flex items-center justify-between gap-1 px-0.5">
                                    <span className="text-[8px] text-white/35 font-medium tracking-wider">{statKey}</span>
                                    <span className="text-[10px] text-[#E3CCCD] font-bold">{displayVal}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="w-px self-stretch bg-[#E3CCCD]/12 relative z-10" />

                {/* COL 3 : Nom + onglets + contenu */}
                <div className="relative z-10 flex flex-col p-3 w-64 gap-2 self-start">
                    {!isPJ && !isMonster && (
                        <div className="flex items-start justify-between gap-2">
                            <span className="font-serif text-sm text-[#E3CCCD] font-semibold leading-tight truncate flex-1">{combatant.name}</span>
                            <span className="text-[9px] uppercase tracking-[0.15em] text-white/40 border border-white/15 rounded px-1.5 py-0.5 shrink-0">PNJ</span>
                        </div>
                    )}

                    {isPJ ? (
                        <div className="overflow-y-auto space-y-1.5 scrollbar-none max-h-72">
                            {(() => {
                                const acquired = combatant.voies?.flatMap((voie) =>
                                    voie.rangsAcquis.map((r) => {
                                        const cap = voie.capacites[`rang${r}`];
                                        return cap ? { voieNom: voie.nom, rang: r, ...cap } : null;
                                    }).filter(Boolean)
                                ) ?? [];
                                return acquired.length
                                    ? acquired.map((cap, idx) => cap && (
                                        <div key={idx} className="bg-white/6 rounded-lg px-2.5 py-2 border border-white/10">
                                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                                <span className="text-xs font-semibold text-white">{cap.nom}</span>
                                                {cap.type && cap.type !== "passif" && (
                                                    <span className="text-[8px] uppercase tracking-wider text-[#E3CCCD]/50 border border-[#E3CCCD]/15 rounded px-1 py-0.5">{cap.type}</span>
                                                )}
                                                <span className="ml-auto text-[8px] text-white/30">{cap.voieNom} · R{cap.rang}</span>
                                            </div>
                                            <p className="text-[10px] text-white/55 leading-relaxed line-clamp-3">{cap.description}</p>
                                        </div>
                                    ))
                                    : <p className="text-[10px] text-white/30 italic">Aucune capacité acquise.</p>;
                            })()}
                        </div>
                    ) : isMonster ? (
                        <div className="overflow-y-auto space-y-1.5 scrollbar-none max-h-72">
                            {attacks.map((atk, idx) => (
                                <div key={idx} className="bg-red-950/30 rounded-lg px-2.5 py-2 flex items-center justify-between border border-red-500/20">
                                    <div className="text-white flex-1 min-w-0 pr-2">
                                        <div className="text-xs font-semibold truncate">{atk.attaque_base || "Attaque"}</div>
                                        {atk.dm && <div className="text-[10px] text-white/45 truncate">{atk.dm}</div>}
                                    </div>
                                    <div className="px-1.5 py-0.5 rounded border border-red-400/20 text-[8px] text-red-300/60 tracking-wider uppercase shrink-0">action</div>
                                </div>
                            ))}
                            {combatant.details?.capacites?.length ? (
                                <>
                                    <div className="h-px bg-red-500/15 my-1" />
                                    {combatant.details.capacites.map((cap, idx) => (
                                        <div key={idx} className="bg-white/5 rounded-lg px-2.5 py-2 border border-white/10">
                                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                                <span className="text-xs font-semibold text-white truncate">{cap.nom}</span>
                                                {cap.type && <span className="text-[8px] uppercase tracking-wider text-white/45 border border-white/15 rounded px-1 py-0.5 shrink-0">{cap.type}</span>}
                                            </div>
                                            {cap.description && <p className="text-[10px] text-white/50 leading-relaxed line-clamp-2">{cap.description}</p>}
                                        </div>
                                    ))}
                                </>
                            ) : null}
                        </div>
                    ) : (
                        <div className="overflow-y-auto space-y-1.5 scrollbar-none max-h-72">
                            {attacks.map((atk, idx) => (
                                <div key={idx} className="bg-white/6 rounded-lg px-2.5 py-2 flex items-center justify-between border border-white/10">
                                    <div className="text-white flex-1 min-w-0 pr-2">
                                        <div className="text-xs font-semibold truncate">{atk.attaque_base || "Attaque"}</div>
                                        {atk.dm && <div className="text-[10px] text-white/45 truncate">{atk.dm}</div>}
                                    </div>
                                    <div className="px-1.5 py-0.5 rounded border border-white/15 text-[8px] text-white/55 tracking-wider uppercase shrink-0">action</div>
                                </div>
                            ))}
                            {combatant.voies?.length ? (
                                <>
                                    <div className="h-px bg-white/10 my-1" />
                                    {combatant.voies.map((voie: VoieEntry) => (
                                        <VoieAccordion key={voie.id} voie={voie} expanded={expandedVoie === voie.id} onToggle={() => setExpandedVoie(expandedVoie === voie.id ? null : voie.id)} />
                                    ))}
                                </>
                            ) : null}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
