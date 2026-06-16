import { useState } from "react";
import { Maximize2, Minimize2, Pencil, Trash2, Image as ImageIcon, ChevronDown, Swords } from "lucide-react";
import type { Monstre, MonstreAttaque, MonstreCapacite } from "@/types/compendium";

interface MonsterDetailProps {
    monstre: Monstre;
    isFullscreen: boolean;
    readOnly?: boolean;
    onToggleFullscreen: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const STAT_KEYS = ["for", "agi", "con", "int", "per", "vol", "cha"] as const;
const STAT_LABELS: Record<string, string> = { for: "FOR", agi: "AGI", con: "CON", int: "INT", per: "PER", vol: "VOL", cha: "CHA" };

export function MonsterDetail({ monstre, isFullscreen, readOnly, onToggleFullscreen, onEdit, onDelete }: MonsterDetailProps) {
    return (
        <div className="flex-1 flex flex-col h-full min-h-0 p-3 md:p-5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">

            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-[#E3CCCD]/20 pb-3 mb-3 shrink-0">
                <div className="flex items-baseline gap-3 min-w-0">
                    <h1 className="font-serif text-3xl text-white tracking-wider truncate">{monstre.nom}</h1>
                    <span className="text-[11px] uppercase tracking-widest text-[#E3CCCD]/50 border border-[#E3CCCD]/20 rounded-full px-2.5 py-0.5 shrink-0">
                        {monstre.type_creature}
                    </span>
                </div>
                <div className="flex items-center gap-1 bg-[#1E1941]/80 border border-[#E3CCCD]/20 rounded-full px-2 py-1.5 backdrop-blur-md shadow-xl shrink-0">
                    <button onClick={onToggleFullscreen} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    {!readOnly && <button onClick={onEdit} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"><Pencil className="w-4 h-4" /></button>}
                    {!readOnly && <button onClick={onDelete} className="p-1.5 text-white/60 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded-full transition-colors"><Trash2 className="w-4 h-4" /></button>}
                </div>
            </div>

            <div className="space-y-3 flex-1">

                {/* IMAGE + DESCRIPTION (taille + NC) */}
                <div className="flex gap-3 items-stretch">
                    <MonstreCard monstre={monstre} />
                    <div className="flex-1 min-h-0 max-h-66.25 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-2xl p-3 flex flex-col gap-3 shadow-inner">
                        <div className="flex gap-3 text-[12px]">
                            <span className="text-[#E3CCCD]/50 font-semibold uppercase tracking-widest">Taille</span>
                            <span className="text-white/70">{monstre.taille}</span>
                            <span className="text-white/20">·</span>
                            <span className="text-[#E3CCCD]/50 font-semibold uppercase tracking-widest">NC</span>
                            <span className="text-white/70">{monstre.nc}</span>
                            {monstre.combat.attaque_magique !== null && (
                                <>
                                    <span className="text-white/20">·</span>
                                    <span className="text-[#E3CCCD]/50 font-semibold uppercase tracking-widest">Att. Mag.</span>
                                    <span className="text-white/70">{monstre.combat.attaque_magique >= 0 ? `+${monstre.combat.attaque_magique}` : monstre.combat.attaque_magique}</span>
                                </>
                            )}
                        </div>
                        <div className="border-t border-white/10 pt-3 flex gap-4 text-[13px] font-light text-white/90 leading-relaxed">
                            <div className="shrink-0 mt-0.5"><span className="text-[#E3CCCD]">✧</span></div>
                            <div className="whitespace-pre-wrap">{monstre.description || <span className="italic text-white/40">Créature de type <strong className="not-italic text-white/70">{monstre.type_creature}</strong>, taille <strong className="not-italic text-white/70">{monstre.taille}</strong>.</span>}</div>
                        </div>
                    </div>
                </div>

                {/* CARACTÉRISTIQUES */}
                <div className="border border-dashed border-[#E3CCCD]/25 rounded-2xl px-5 py-4">
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-4">
                        {STAT_KEYS.map(k => (
                            <div key={k} className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex flex-col items-center gap-1">
                                <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">{STAT_LABELS[k]}</span>
                                <span className={`text-lg font-semibold ${monstre.stats[k].mod > 0 ? "text-emerald-400" : monstre.stats[k].mod < 0 ? "text-red-400" : "text-white"}`}>
                                    {monstre.stats[k].mod > 0 ? `+${monstre.stats[k].mod}` : monstre.stats[k].mod}
                                </span>
                                {monstre.stats[k].sup && (
                                    <span className="text-[9px] text-amber-400/70 uppercase tracking-wider border border-amber-400/25 rounded px-1">SUP</span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Stats de combat */}
                    <div className="flex justify-between gap-x-8 gap-y-2 text-[13px] text-white/90 pt-3 border-t border-dashed border-white/10">
                        <StatRow label="Points de Vie" value={String(monstre.combat.pv_max)} />
                        <StatRow label="Défense" value={String(monstre.combat.defense)} />
                        <StatRow label="Initiative" value={String(monstre.combat.initiative)} />
                        {monstre.combat.rd > 0 && <StatRow label="Réd. Dégâts" value={String(monstre.combat.rd)} />}
                    </div>
                </div>

                {/* ATTAQUES */}
                {monstre.attaques.length > 0 && (
                    <div className="space-y-2">
                        <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/40 px-1">Attaques</h2>
                        {monstre.attaques.map((att, i) => (
                            <AttaqueBlock key={i} attaque={att} />
                        ))}
                    </div>
                )}

                {/* CAPACITÉS */}
                {monstre.capacites.length > 0 && (
                    <div className="space-y-2">
                        <h2 className="text-[10px] uppercase tracking-[0.2em] text-white/40 px-1">Capacités Spéciales</h2>
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
        <div className="bg-[#29206A]/20 border border-[#E3CCCD]/20 rounded-2xl px-5 py-3.5 flex items-center gap-6">
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
            : capacite.type === "action_limitee" ? "Lim."
                : "Sort";

    return (
        <div className="bg-[#29206A]/20 border border-[#E3CCCD]/20 rounded-2xl overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-white/5 transition-colors"
            >
                <span className="font-serif text-base text-white truncate">{capacite.nom || "Capacité sans nom"}</span>
                <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${typeColor}`}>
                        {typeLabel}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
                </div>
            </button>

            {open && capacite.description && (
                <div className="px-5 pb-4 border-t border-white/10 pt-3 text-[13px] font-light text-white/80 leading-relaxed">
                    {capacite.description}
                </div>
            )}
        </div>
    );
}

function MonstreCard({ monstre }: { monstre: Monstre }) {
    return (
        <div className="w-44 shrink-0 self-start aspect-290/437 rounded-2xl relative border border-white/10 overflow-hidden">
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
                <div className="text-[10px] uppercase tracking-widest text-[#E3CCCD]/60 mb-0.5">NC {monstre.nc}</div>
                <h3 className="font-serif text-sm text-white tracking-widest leading-tight">{monstre.nom}</h3>
            </div>
        </div>
    );
}

function StatRow({ label, value }: { label: string; value?: string }) {
    return (
        <div className="flex gap-2">
            <span className="font-bold text-white/90">• {label} :</span>
            <span className="font-light text-white/70">{value || "N/A"}</span>
        </div>
    );
}
