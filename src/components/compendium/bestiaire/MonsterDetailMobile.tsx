import { useState } from "react";
import { Pencil, Trash2, Image as ImageIcon, ChevronDown, Swords, Heart, Shield, Zap } from "lucide-react";
import type { Monstre, MonstreAttaque, MonstreCapacite } from "@/types/compendium";

interface MonsterDetailMobileProps {
    monstre: Monstre;
    isFullscreen: boolean;
    readOnly?: boolean;
    onToggleFullscreen: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const STAT_KEYS = ["for", "agi", "con", "int", "per", "vol", "cha"] as const;
const STAT_LABELS: Record<string, string> = { for: "FOR", agi: "AGI", con: "CON", int: "INT", per: "PER", vol: "VOL", cha: "CHA" };

export function MonsterDetailMobile({ monstre, readOnly, onEdit, onDelete }: MonsterDetailMobileProps) {
    const hasActions = !readOnly;

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">

            {/* Actions */}
            {hasActions && (
                <div className="flex items-center justify-end border-b border-[#E3CCCD]/20 pb-3 mb-3 shrink-0">
                    <div className="flex items-center gap-1 bg-[#1E1941]/80 border border-[#E3CCCD]/20 rounded-full px-2 py-1.5 backdrop-blur-md shadow-xl">
                        <button onClick={onEdit} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={onDelete} className="p-1.5 text-white/60 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded-full transition-colors">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-3 flex-1">

                {/* Carte + stats rapides */}
                <div className="flex gap-3 items-start">
                    <MonstreCard monstre={monstre} />

                    <div className="flex-1 min-h-66 max-h-66 overflow-y-auto border border-dashed border-[#E3CCCD]/25 rounded-2xl p-2 text-[11px] text-white/90 space-y-1.5">
                        <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
                            <div className="flex flex-col gap-1 text-[10px] text-white/90">
                                <span className="uppercase tracking-widest text-[#E3CCCD]/65 line-clamp-1">{monstre.type_creature}</span>
                                <div className="flex items-center gap-2 whitespace-nowrap overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
                                    <span>Taille {monstre.taille}</span>
                                    <span className="text-white/30">•</span>
                                    <span className="font-semibold">NC {monstre.nc}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                            <div className="flex flex-col items-center justify-center gap-0.5 rounded-lg border border-emerald-400/25 bg-emerald-400/8 py-1.5">
                                <Heart className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="font-mono text-[13px] font-bold text-white leading-none">{monstre.combat.pv_max}</span>
                                <span className="text-[8px] uppercase tracking-widest text-white/50">PV</span>
                            </div>
                            <div className="flex flex-col items-center justify-center gap-0.5 rounded-lg border border-[#E3CCCD]/20 bg-white/4 py-1.5">
                                <Shield className="w-3.5 h-3.5 text-sky-400/80" />
                                <span className="font-mono text-[13px] font-bold text-white leading-none">{monstre.combat.defense}</span>
                                <span className="text-[8px] uppercase tracking-widest text-white/50">Def.</span>
                            </div>
                            <div className="flex flex-col items-center justify-center gap-0.5 rounded-lg border border-[#E3CCCD]/20 bg-white/4 py-1.5">
                                <Zap className="w-3.5 h-3.5 text-yellow-400/80" />
                                <span className="font-mono text-[13px] font-bold text-white leading-none">{monstre.combat.initiative}</span>
                                <span className="text-[8px] uppercase tracking-widest text-white/50">Init.</span>
                            </div>
                        </div>

                        <div className="rounded-lg border border-dashed border-[#E3CCCD]/25 px-2 py-2">
                            <p className="text-[8px] uppercase tracking-widest text-[#E3CCCD]/65 mb-1.5">Caractéristiques</p>
                            <div className="grid grid-cols-4 gap-1">
                                {STAT_KEYS.map(k => (
                                    <div key={k} className="bg-white/5 border border-white/10 rounded-lg p-1.5 flex flex-col items-center gap-0.5">
                                        <span className="text-[8px] uppercase tracking-wider text-white/60 font-semibold">{STAT_LABELS[k]}</span>
                                        <span className={`text-[11px] font-semibold leading-none ${monstre.stats[k].mod > 0 ? "text-emerald-400" : monstre.stats[k].mod < 0 ? "text-red-400" : "text-white"}`}>
                                            {monstre.stats[k].mod > 0 ? `+${monstre.stats[k].mod}` : monstre.stats[k].mod}
                                        </span>
                                        {monstre.stats[k].sup && (
                                            <span className="text-[7px] text-amber-400/90 uppercase tracking-wider border border-amber-400/25 rounded px-1">bonus</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>


                    </div>
                </div>

                {/* Description */}
                {monstre.description && (
                    <details className="w-full bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-2xl p-3 text-[13px] font-light text-white/90 leading-relaxed shadow-inner group">
                        <summary className="list-none cursor-pointer select-none flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/90">
                            <span>Description</span>
                            <span className="flex h-6 w-6 items-center justify-center transition-transform duration-200 group-open:rotate-180">
                                <ChevronDown className="h-4 w-4 text-white/95" aria-hidden="true" />
                            </span>
                        </summary>
                        <div className="mt-3 flex gap-4">
                            <div className="shrink-0 mt-0.5"><span className="text-[#E3CCCD]">✧</span></div>
                            <div className="whitespace-pre-wrap">{monstre.description}</div>
                        </div>
                    </details>
                )}

                {/* Attaques */}
                {monstre.attaques.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[9px] uppercase tracking-widest text-[#E3CCCD]/65 px-1">Attaques</p>
                        {monstre.attaques.map((att, i) => (
                            <AttaqueBlock key={i} attaque={att} />
                        ))}
                    </div>
                )}

                {/* Capacités */}
                {monstre.capacites.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[9px] uppercase tracking-widest text-[#E3CCCD]/65 px-1">Capacités Spéciales</p>
                        {monstre.capacites.map((cap, i) => (
                            <CapaciteBlock key={i} capacite={cap} defaultOpen={i === 0} />
                        ))}
                    </div>
                )}

                {monstre.attaques.length === 0 && monstre.capacites.length === 0 && (
                    <div className="bg-[#29206A]/20 border border-[#E3CCCD]/20 rounded-2xl p-6 text-center text-[13px] text-white/30 italic flex flex-col items-center gap-2">
                        <Swords className="w-5 h-5 opacity-30" />
                        Aucune attaque ni capacité définie pour cette créature.
                    </div>
                )}

            </div>
        </div>
    );
}

function AttaqueBlock({ attaque }: { attaque: MonstreAttaque }) {
    return (
        <div className="bg-[#29206A]/20 border border-[#E3CCCD]/20 rounded-2xl px-4 py-3 flex items-center gap-4">
            <Swords className="w-4 h-4 text-[#E3CCCD]/40 shrink-0" />
            <div className="flex-1 min-w-0">
                <span className="text-[13px] text-white/90 font-medium">{attaque.attaque_base || "—"}</span>
            </div>
            {attaque.dm && (
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] uppercase tracking-widest text-white/40">DM</span>
                    <span className="text-[13px] font-mono text-[#E3CCCD]/80 font-semibold">{attaque.dm}</span>
                </div>
            )}
        </div>
    );
}

function CapaciteBlock({ capacite, defaultOpen }: { capacite: MonstreCapacite; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen ?? false);

    const typeColor = capacite.type === "passif"
        ? "text-white/40 border-white/15"
        : capacite.type === "action"
            ? "text-blue-300/70 border-blue-400/30"
            : capacite.type === "action_limitee"
                ? "text-amber-300/70 border-amber-400/30"
                : "text-purple-300/70 border-purple-400/30";

    const typeLabel = capacite.type === "passif" ? "Passif"
        : capacite.type === "action" ? "Action"
            : capacite.type === "action_limitee" ? "Limitée"
                : "Sort";

    return (
        <div className="bg-[#29206A]/20 border border-[#E3CCCD]/20 rounded-2xl overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
            >
                <span className="font-serif text-base text-white truncate">{capacite.nom || "Capacité sans nom"}</span>
                <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md border ${typeColor}`}>
                        {typeLabel}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
                </div>
            </button>

            {open && capacite.description && (
                <div className="px-4 pb-4 border-t border-white/10 pt-3 text-[13px] font-light text-white/80 leading-relaxed">
                    {capacite.description}
                </div>
            )}
        </div>
    );
}

function MonstreCard({ monstre }: { monstre: Monstre }) {
    return (
        <div className="h-66 shrink-0 self-start aspect-290/437 rounded-2xl relative border border-white/10 overflow-hidden">
            {monstre.image_url ? (
                <img src={monstre.image_url} alt={monstre.nom} className="absolute inset-0 w-full h-full object-cover opacity-90" />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <ImageIcon className="w-10 h-10 text-white/10" />
                </div>
            )}
            <div className="absolute inset-0 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to bottom, rgba(102,102,102,0) 0%, rgba(55,42,132,0.72) 47%, rgba(36,27,89,0.79) 63%, rgba(18,13,47,1) 100%)" }}
            />
            <img src="/card-overlay.svg" alt="" className="absolute inset-0 w-full h-full z-20 pointer-events-none opacity-80" />
            <div className="absolute bottom-5 inset-x-0 z-30 pb-3 px-2 text-center">
                <h3 className="font-serif text-sm text-white tracking-widest leading-tight">{monstre.nom}</h3>
            </div>
        </div>
    );
}

