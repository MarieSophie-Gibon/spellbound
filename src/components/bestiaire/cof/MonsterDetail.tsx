import { Maximize2, Minimize2, Pencil, Trash2, Swords, Shield, Zap, Heart, Sparkles, Eye, EyeOff } from "lucide-react";
import type { Monstre, MonstreAttaque, MonstreCapacite } from "@/types/compendium";
import { useIsMobile } from "@/hooks/shared/useIsMobile";
import { MagicCard } from "@/components/ui/MagicCard";

interface MonsterDetailProps {
    monstre: Monstre;
    isFullscreen: boolean;
    readOnly?: boolean;
    /** true = le viewer est le MJ propriétaire de la campagne */
    isOwner?: boolean;
    /** IDs des monstres déjà révélés aux joueurs (seulement si isOwner) */
    revealedMonstreIds?: Set<string>;
    /** Callback pour basculer la visibilité (seulement si isOwner) */
    onToggleReveal?: (monstreId: string, isCurrentlyRevealed: boolean) => void;
    onToggleFullscreen: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const STAT_KEYS = ["for", "agi", "con", "int", "per", "vol", "cha"] as const;
const STAT_LABELS: Record<string, string> = { for: "FOR", agi: "AGI", con: "CON", int: "INT", per: "PER", vol: "VOL", cha: "CHA" };

export function MonsterDetail({ monstre, isFullscreen, readOnly, isOwner, revealedMonstreIds, onToggleReveal, onToggleFullscreen, onEdit, onDelete }: MonsterDetailProps) {
    const isMobile = useIsMobile();
    const hasActions = !isMobile || !readOnly;
    const isRevealed = revealedMonstreIds?.has(monstre.id) ?? false;
    // Le toggle n'est visible que pour un monstre de campagne (campaign_id non null)
    const showRevealToggle = isOwner && !!monstre.campaign_id && !!onToggleReveal;

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">

            {/* HEADER */}
            <div className="shrink-0 px-4 md:px-6 pt-4 pb-3 border-b border-[#E3CCCD]/15"
                style={{ background: "linear-gradient(to bottom, rgba(30,25,65,0.6) 0%, transparent 100%)" }}>
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-baseline gap-3 min-w-0">
                        <h1 className="font-serif text-2xl md:text-3xl text-white tracking-wider truncate">{monstre.nom}</h1>
                        <span className="text-[11px] uppercase tracking-widest text-[#E3CCCD]/50 border border-[#E3CCCD]/20 rounded-full px-2.5 py-0.5 shrink-0">
                            {monstre.type_creature}
                        </span>
                    </div>
                    {hasActions && (
                        <div className="flex items-center gap-1 bg-[#1E1941]/80 border border-[#E3CCCD]/20 rounded-full px-2 py-1.5 backdrop-blur-md shadow-xl shrink-0">
                            {!isMobile && (
                                <button onClick={onToggleFullscreen} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                            )}
                            {showRevealToggle && (
                                <>
                                    {!isMobile && <div className="w-px h-4 bg-white/20 mx-1" />}
                                    <button
                                        onClick={() => onToggleReveal!(monstre.id, isRevealed)}
                                        title={isRevealed ? "Masquer aux joueurs" : "Révéler aux joueurs"}
                                        className={`p-1.5 rounded-full transition-colors ${
                                            isRevealed
                                                ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                                                : "text-white/40 hover:text-white hover:bg-white/10"
                                        }`}
                                    >
                                        {isRevealed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </button>
                                </>
                            )}
                            {!readOnly && (
                                <>
                                    {!isMobile && <div className="w-px h-4 bg-white/20 mx-1" />}
                                    <button onClick={onEdit} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={onDelete} className="p-1.5 text-white/60 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded-full transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* BODY */}
            <div className="flex-1 p-3 md:p-5 space-y-4">

                {/* TOP ROW : image card + stat sidebar + combat panel */}
                <div className="flex flex-col md:flex-row gap-3 md:items-stretch">

                    {/* Image card */}
                    <div className="shrink-0 mx-auto md:mx-0">
                        <MonstreCard monstre={monstre} />
                    </div>

                    {/* Stat sidebar */}
                    {/* <div
                        className="w-full md:w-20 shrink-0 rounded-lg border border-[#E3CCCD]/15 flex md:flex-col flex-row justify-evenly py-3 px-2 flex-wrap"
                        style={{ background: "linear-gradient(to bottom, rgba(55,42,132,0.25) 0%, rgba(18,13,47,0.85) 100%)" }}
                    >
                        {STAT_KEYS.map(k => {
                            const mod = monstre.stats[k].mod;
                            return (
                                <div key={k} className="flex flex-col items-center gap-0.5 min-w-10 md:min-w-0">
                                    <span className="text-[9px] uppercase tracking-widest text-[#E3CCCD]/50">{STAT_LABELS[k]}</span>
                                    <span className={`font-mono text-sm font-bold leading-none ${mod > 0 ? "text-emerald-400" : mod < 0 ? "text-red-400/70" : "text-white/25"}`}>
                                        {mod > 0 ? `+${mod}` : mod}
                                    </span>
                                    {monstre.stats[k].sup && (
                                        <span className="text-[8px] font-bold text-amber-400 border border-amber-400/40 rounded px-0.5 leading-tight">◈</span>
                                    )}
                                </div>
                            );
                        })}
                    </div> */}

                    {/* Right column : combat + ressources */}
                    <div className="flex-1 flex flex-col gap-3 min-w-0">
                        {/* Combat + Ressources fusionnés */}
                        <div
                            className="flex-1 border border-[#E3CCCD]/20 rounded-lg p-4 flex flex-col shadow-inner justify-center"
                            style={{ background: "linear-gradient(to right, rgba(30,25,65,0.45) 0%, rgba(6,78,59,0.18) 100%)" }}
                        >
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 flex items-center gap-1.5 mb-2">
                                <Swords className="w-3.5 h-3.5" /> Combat & Ressources
                            </p>
                            <div className="flex flex-col gap-2">
                                {/* Ligne 1 : NC, Taille, Catégorie */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-[#E3CCCD]/15 bg-white/3 px-3 py-2">
                                        <span className="text-[9px] uppercase tracking-widest text-[#E3CCCD]/50">NC</span>
                                        <span className="font-mono text-sm font-bold text-white/80">{monstre.nc}</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-[#E3CCCD]/15 bg-white/3 px-3 py-2">
                                        <span className="text-[9px] uppercase tracking-widest text-[#E3CCCD]/50">Taille</span>
                                        <span className="font-mono text-sm font-bold text-white/80">{monstre.taille}</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-[#E3CCCD]/15 bg-white/3 px-3 py-2">
                                        <span className="text-[9px] uppercase tracking-widest text-[#E3CCCD]/50">Catégorie</span>
                                        <span className="text-[11px] font-medium text-white/80 text-center leading-tight line-clamp-1">{monstre.type_creature}</span>
                                    </div>
                                </div>
                                {/* Ligne 2 : PV Max, Initiative, Défense (+ Att. Magie et RD si présents) */}
                                <div className="grid grid-cols-3 gap-2">
                                    <CombatStatCard icon={Heart} label="PV Max" value={String(monstre.combat.pv_max)} color="text-emerald-400/70" border="border-emerald-400/20" />
                                    <CombatStatCard icon={Zap} label="Initiative" value={String(monstre.combat.initiative)} color="text-yellow-400/70" border="border-yellow-400/20" />
                                    <CombatStatCard icon={Shield} label="Défense" value={String(monstre.combat.defense)} color="text-sky-400/70" border="border-sky-400/20" />
                                    {monstre.combat.attaque_magique !== null && (
                                        <CombatStatCard icon={Sparkles} label="Att. Magie" value={monstre.combat.attaque_magique >= 0 ? `+${monstre.combat.attaque_magique}` : String(monstre.combat.attaque_magique)} color="text-violet-400/70" border="border-violet-400/20" />
                                    )}
                                    {monstre.combat.rd > 0 && (
                                        <CombatStatCard icon={Shield} label="Réd. Dégâts" value={String(monstre.combat.rd)} color="text-emerald-400/70" border="border-emerald-400/20" />
                                    )}
                                </div>
                                {/* Ligne 3 : Caractéristiques */}
                                <div className="border-t border-white/10 pt-2 mt-1">
                                    <div className="grid grid-cols-7 gap-1.5">
                                        {STAT_KEYS.map(k => {
                                            const mod = monstre.stats[k].mod;
                                            return (
                                                <div key={k} className="flex flex-col items-center gap-0.5 rounded-lg border border-white/10 bg-white/4 py-1.5">
                                                    <span className="text-[8px] uppercase tracking-widest text-[#E3CCCD]/50">{STAT_LABELS[k]}</span>
                                                    <span className={`font-mono text-[12px] font-bold leading-none ${mod > 0 ? "text-emerald-400" : mod < 0 ? "text-red-400/70" : "text-white/25"}`}>
                                                        {mod > 0 ? `+${mod}` : mod}
                                                    </span>
                                                    {monstre.stats[k].sup && (
                                                        <span className="text-[7px] font-bold text-amber-400 border border-amber-400/40 rounded px-0.5 leading-tight">◈</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* DESCRIPTION */}
                {monstre.description && (
                    <div className="rounded-lg border border-[#E3CCCD]/20 bg-[#1E1941]/40 p-4 shadow-inner">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 mb-2">Description</p>
                        <p className="text-[13px] font-light text-white/80 leading-relaxed whitespace-pre-wrap">{monstre.description}</p>
                    </div>
                )}

                {/* ATTAQUES */}
                {monstre.attaques.length > 0 && (
                    <div className="rounded-lg border border-[#E3CCCD]/20 bg-white/3 p-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 flex items-center gap-1.5 mb-3">
                            <Swords className="w-3.5 h-3.5" /> Attaques
                        </p>
                        <div className="space-y-2">
                            {monstre.attaques.map((att, i) => (
                                <AttaqueBlock key={i} attaque={att} />
                            ))}
                        </div>
                    </div>
                )}

                {/* CAPACITÉS SPÉCIALES */}
                {monstre.capacites.length > 0 && (
                    <div className="rounded-lg border border-violet-400/20 bg-violet-400/5 p-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-violet-400/60 flex items-center gap-1.5 mb-3">
                            <Sparkles className="w-3.5 h-3.5" /> Capacités spéciales
                        </p>
                        <div className="space-y-2">
                            {monstre.capacites.map((cap, i) => (
                                <CapaciteBlock key={i} capacite={cap} />
                            ))}
                        </div>
                    </div>
                )}

                {monstre.attaques.length === 0 && monstre.capacites.length === 0 && (
                    <div className="rounded-lg border border-[#E3CCCD]/15 bg-white/2 p-6 text-center text-[13px] text-white/30 italic flex flex-col items-center gap-2">
                        <Swords className="w-5 h-5 opacity-30" />
                        Aucune attaque ni capacité définie pour cette créature.
                    </div>
                )}

            </div>
        </div>
    );
}

function CombatStatCard({ icon: Icon, label, value, color, border }: { icon: React.ElementType; label: string; value: string; color: string; border: string }) {
    return (
        <div className={`flex flex-col items-center justify-center gap-1 rounded-lg border ${border} bg-white/3 px-3 py-2`}>
            <Icon className={`w-3.5 h-3.5 ${color}`} />
            <span className={`font-mono text-base font-bold leading-none ${color}`}>{value}</span>
            <span className="text-[9px] uppercase tracking-widest text-white/40">{label}</span>
        </div>
    );
}

function AttaqueBlock({ attaque }: { attaque: MonstreAttaque }) {
    return (
        <div className="rounded-lg border border-white/10 bg-white/4 px-3 py-2">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-[13px] text-white">{attaque.attaque_base || "—"}</span>
                {attaque.dm && (
                    <span className="text-[12px] font-mono font-bold text-white bg-red-500/70 border border-red-400 rounded px-1.5 py-0.5 shadow-sm">{attaque.dm}</span>
                )}
            </div>
        </div>
    );
}

function CapaciteBlock({ capacite }: { capacite: MonstreCapacite }) {
    const typeColor =
        capacite.type === "passif" ? "text-white/50 border-white/20" :
        capacite.type === "action" ? "text-blue-300/70 border-blue-400/30" :
        capacite.type === "action_limitee" ? "text-amber-300/70 border-amber-400/30" :
        "text-purple-300/70 border-purple-400/30";

    const typeLabel =
        capacite.type === "passif" ? "Passif" :
        capacite.type === "action" ? "Action" :
        capacite.type === "action_limitee" ? "Lim." :
        "Sort";

    return (
        <div className="rounded-lg border border-violet-400/15 bg-violet-400/5 px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1">
                <p className="font-serif text-[14px] text-violet-200 flex-1">{capacite.nom || "Capacité sans nom"}</p>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${typeColor} shrink-0`}>
                    {typeLabel}
                </span>
            </div>
            {capacite.description && (
                <p className="text-[12px] text-violet-100/60 leading-relaxed">{capacite.description}</p>
            )}
        </div>
    );
}

function MonstreCard({ monstre }: { monstre: Monstre }) {
    return (
        <MagicCard
            imageUrl={monstre.image_url ?? null}
            title={monstre.nom}
            size="compact"
            className="!w-44"
            badge={
                <span className="text-[10px] uppercase tracking-widest text-[#E3CCCD]/80 border border-[#E3CCCD]/35 rounded-full px-2 py-0.5 bg-[#1E1941]/70 backdrop-blur">
                    NC {monstre.nc}
                </span>
            }
        />
    );
}
