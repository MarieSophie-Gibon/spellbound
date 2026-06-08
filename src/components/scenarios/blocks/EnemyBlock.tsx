import { useState, useEffect } from "react";
import { Swords, Search, Target, ShieldAlert, X, PlusCircle, Ghost, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MagicCard } from "@/components/ui/MagicCard";
import { PNJWizard } from "@/components/personnage/PNJWizard";
import { MonsterWizard } from "@/components/compendium/bestiaire/MonsterWizard";

interface EnemyBlockProps {
    campaignId: string;
    data: {
        entityId?: string;
        entityType?: 'monster' | 'npc';
        nom?: string;
        imageUrl?: string;
        combatEngaged?: boolean;
        comportement?: string;
        notes?: string;
    };
    onChange: (newData: Partial<EnemyBlockProps["data"]>) => void;
    onOpenCombatDashboard?: () => void;
}

interface SearchResult {
    id: string;
    name: string;
    image_url: string | null;
    type_creature?: string | null;
    nc?: string | null;
}

interface MonsterDetails {
    stats?: Record<string, { mod?: number; sup?: boolean }> | null;
    combat?: {
        pv?: number;
        pv_max?: number;
        defense?: number;
        initiative?: number;
    } | null;
    attaques?: Array<{ attaque_base?: string; dm?: string }> | null;
    capacites?: Array<{ nom?: string; type?: string; description?: string }> | null;
}

function isValidUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function EnemyBlock({ campaignId, data, onChange, onOpenCombatDashboard }: EnemyBlockProps) {
    const [searchType, setSearchType] = useState<'monster' | 'npc'>('monster');
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

    const [showDropdown, setShowDropdown] = useState(false);
    const [showNpcWizard, setShowNpcWizard] = useState(false);
    const [showMonsterWizard, setShowMonsterWizard] = useState(false);
    const [monsterDetails, setMonsterDetails] = useState<MonsterDetails | null>(null);

    const hasValidCampaignId = isValidUuid(campaignId);

    // Recherche dans la base de données (Monstres ou PNJs)
    useEffect(() => {
        if (data.nom || showNpcWizard || showMonsterWizard || !hasValidCampaignId) {
            return;
        }

        const fetchResults = async () => {
            if (searchType === 'monster') {
                let query = supabase
                    .from('bestiaire')
                    .select('id, nom, image_url, type_creature, nc')
                    .order('nom')
                    .or(`campaign_id.eq.${campaignId},campaign_id.is.null`);

                if (searchTerm) {
                    query = query.ilike('nom', `%${searchTerm}%`);
                }

                const { data: results, error } = await query;
                if (!error && results) {
                    setSearchResults(
                        results.map((monster) => ({
                            id: monster.id,
                            name: monster.nom,
                            image_url: monster.image_url,
                            type_creature: monster.type_creature,
                            nc: monster.nc,
                        }))
                    );
                }
                return;
            }

            let query = supabase
                .from('pnj')
                .select('id, name, image_url')
                .eq('campaign_id', campaignId)
                .order('name')
                .limit(5);

            if (searchTerm) {
                query = query.ilike('name', `%${searchTerm}%`);
            }

            const { data: results, error } = await query;
            if (!error && results) {
                setSearchResults(results);
            }
        };

        const debounce = setTimeout(fetchResults, 300);
        return () => clearTimeout(debounce);
    }, [searchTerm, searchType, data.nom, showNpcWizard, showMonsterWizard, campaignId, hasValidCampaignId]);

    const visibleResults = (data.nom || showNpcWizard || showMonsterWizard || !hasValidCampaignId) ? [] : searchResults;

    useEffect(() => {
        if (data.entityType !== 'monster' || !data.entityId) {
            setMonsterDetails(null);
            return;
        }

        const fetchMonsterDetails = async () => {
            const { data: details, error } = await supabase
                .from('bestiaire')
                .select('stats, combat, attaques, capacites')
                .eq('id', data.entityId)
                .single();

            if (!error && details) {
                setMonsterDetails(details as MonsterDetails);
            }
        };

        void fetchMonsterDetails();
    }, [data.entityType, data.entityId]);

    const statOrder = ['FOR', 'CON', 'AGI', 'PER', 'INT', 'VOL', 'CHA'];
    const statRows = statOrder
        .map((key) => {
            const stat = monsterDetails?.stats?.[key];
            if (!stat) return null;
            const bonus = stat.sup ? '+' : '';
            return `${key} ${bonus}${stat.mod ?? 0}`;
        })
        .filter(Boolean) as string[];
    const pbValue = monsterDetails?.combat?.pv_max ?? monsterDetails?.combat?.pv;

    // 1. ÉTAT VIDE : Interface de recherche ou de création
    if (!data.nom) {
        return (
            <>
                <div className="flex flex-col border border-red-500/20 bg-red-500/5 rounded-2xl overflow-visible shadow-lg p-4 md:p-5">
                    <div className="flex items-center gap-2 text-red-400 mb-4">
                        <Swords className="w-5 h-5" />
                        <span className="text-[13px] uppercase tracking-widest font-bold">Rencontre Hostile</span>
                    </div>

                    {/* Toggle Type d'Ennemi */}
                    {!showMonsterWizard && (
                        <div className="flex p-1 bg-black/40 rounded-lg border border-red-500/10 w-fit mb-4">
                            <button
                                onClick={() => { setSearchType('monster'); setSearchTerm(''); }}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[12px] font-medium transition-all ${searchType === 'monster'
                                        ? 'bg-red-500/20 text-red-400 shadow-sm'
                                        : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                                    }`}
                            >
                                <Ghost className="w-3.5 h-3.5" /> Monstre
                            </button>
                            <button
                                onClick={() => { setSearchType('npc'); setSearchTerm(''); }}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[12px] font-medium transition-all ${searchType === 'npc'
                                        ? 'bg-red-500/20 text-red-400 shadow-sm'
                                        : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                                    }`}
                            >
                                <Users className="w-3.5 h-3.5" /> PNJ
                            </button>
                        </div>
                    )}

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400/50" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => setShowDropdown(true)}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                            placeholder={`Rechercher un ${searchType === 'monster' ? 'monstre' : 'PNJ'}...`}
                            className="w-full bg-black/20 border border-red-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-red-400/50 transition-colors"
                        />

                        {/* Résultats de recherche */}
                        {showDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1E1941] border border-red-500/30 rounded-xl shadow-xl overflow-hidden max-h-72 overflow-y-auto z-20">
                                {visibleResults.map(entity => (
                                    <button
                                        key={entity.id}
                                        onClick={() => onChange({ entityId: entity.id, entityType: searchType, nom: entity.name, imageUrl: entity.image_url ?? undefined })}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-red-500/10 transition-colors text-left border-b border-white/5 last:border-0"
                                    >
                                        <img src={entity.image_url || '/default-avatar.png'} alt={entity.name} className="w-8 h-8 rounded-full object-cover border border-red-500/30 bg-black/50" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-white truncate">{entity.name}</div>
                                            {searchType === 'monster' && (entity.type_creature || entity.nc) && (
                                                <div className="text-[11px] text-white/45 truncate">
                                                    {entity.type_creature || 'Créature'}
                                                    {entity.nc ? ` • NC ${entity.nc}` : ''}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}

                                {/* Option Création via Wizard */}
                                <button
                                    onClick={() => searchType === 'npc' ? setShowNpcWizard(true) : setShowMonsterWizard(true)}
                                    disabled={!hasValidCampaignId}
                                    className="w-full flex items-center gap-2 p-3 text-sm text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-colors bg-black/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <PlusCircle className="w-4 h-4" />
                                    {hasValidCampaignId
                                        ? `Créer un nouveau ${searchType === 'monster' ? 'monstre' : 'PNJ'}`
                                        : "Campagne invalide (création désactivée)"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Wizard PNJ en modale si sélectionné */}
                {showNpcWizard && (
                    <PNJWizard
                        campaignId={campaignId}
                        onClose={() => setShowNpcWizard(false)}
                        onSuccess={(pnj) => {
                            if (pnj) {
                                onChange({ entityId: pnj.id, entityType: 'npc', nom: pnj.name, imageUrl: pnj.image_url ?? undefined });
                            }
                            setShowNpcWizard(false);
                        }}
                    />
                )}

                {/* Wizard Monstre en modale si sélectionné */}
                {showMonsterWizard && (
                    <MonsterWizard
                        campaignId={campaignId}
                        onClose={() => setShowMonsterWizard(false)}
                        onSuccess={(monster) => {
                            if (monster) {
                                onChange({
                                    entityId: monster.id,
                                    entityType: 'monster',
                                    nom: monster.nom,
                                    imageUrl: monster.image_url ?? undefined,
                                });
                            }
                            setShowMonsterWizard(false);
                            setSearchTerm("");
                        }}
                    />
                )}
            </>
        );
    }

    // 2. ÉTAT REMPLI : Le bloc est configuré
    return (
        <div className="flex border border-red-500/20 bg-red-500/5 rounded-2xl overflow-hidden shadow-lg relative group/block">

            {/* Bouton Reset */}
            <button
                onClick={() => onChange({ entityId: undefined, entityType: undefined, nom: undefined, imageUrl: undefined, combatEngaged: undefined, comportement: undefined, notes: undefined })}
                className="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-red-500/80 text-white rounded-lg opacity-0 group-hover/block:opacity-100 transition-all z-10"
                title="Changer d'ennemi"
            >
                <X className="w-4 h-4" />
            </button>

            {/* GAUCHE : MagicCard avatar */}
            <div className="shrink-0 p-4">
                <MagicCard
                    imageUrl={data.imageUrl}
                    title={data.nom}
                />
            </div>

            {/* DROITE : Header + zones de texte */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Header */}
                <div className="p-4 md:p-5 border-b border-red-500/10">
                    <div className="flex items-start justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-red-400/80 font-bold">
                            {data.entityType === 'monster' ? <Ghost className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                            {data.entityType === 'monster' ? "Monstre" : "PNJ Hostile"}
                        </span>

                        <button
                            onClick={() => {
                                if (!data.combatEngaged) {
                                    onChange({ combatEngaged: true });
                                }
                                onOpenCombatDashboard?.();
                            }}
                            className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors ${data.combatEngaged
                                ? 'bg-red-500/30 border-red-400/50 text-red-100'
                                : 'bg-black/30 border-red-500/30 text-red-300 hover:bg-red-500/15'
                                }`}
                            title="Ouvrir le dashboard de combat"
                        >
                            <Swords className="w-3.5 h-3.5" />
                            {data.combatEngaged ? 'En combat' : 'Combat'}
                        </button>
                    </div>
                    <h3 className="text-lg font-serif text-white tracking-wide mt-1">{data.nom}</h3>
                </div>

                {/* Zones de texte */}
                <div className="p-4 md:p-5 flex flex-col gap-4">

                    {/* Tactique / Comportement */}
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                            <Target className="w-4 h-4 text-red-400" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-[11px] uppercase tracking-widest text-red-300/80 mb-1.5 font-medium">Tactique de combat</h4>
                            <textarea
                                value={data.comportement || ""}
                                onChange={(e) => onChange({ comportement: e.target.value })}
                                placeholder="Comment attaque-t-il ? Qui cible-t-il en priorité ? Fuit-il ?"
                                className="w-full bg-transparent text-white/80 text-[13px] leading-relaxed outline-none resize-none overflow-hidden min-h-10 placeholder:text-white/20 focus:bg-white/5 p-2 -ml-2 rounded-lg transition-colors"
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = "auto";
                                    target.style.height = `${target.scrollHeight}px`;
                                }}
                            />
                        </div>
                    </div>

                    <div className="w-full h-px bg-red-500/10" />

                    {/* Statistiques / Notes */}
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            <ShieldAlert className="w-4 h-4 text-white/50" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-[11px] uppercase tracking-widest text-white/50 mb-1.5">Rappels & Stats clés</h4>
                            {data.entityType === 'monster' && monsterDetails && (
                                <div className="mb-3 p-2.5 rounded-lg border border-white/10 bg-black/25 text-[12px] text-white/75 space-y-2">
                                    {(pbValue !== undefined || monsterDetails.combat?.defense !== undefined || monsterDetails.combat?.initiative !== undefined) && (
                                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-white/80">
                                            {pbValue !== undefined && <span><span className="text-white/45">PV</span> {pbValue}</span>}
                                            {monsterDetails.combat?.defense !== undefined && <span><span className="text-white/45">DEF</span> {monsterDetails.combat.defense}</span>}
                                            {monsterDetails.combat?.initiative !== undefined && <span><span className="text-white/45">INIT</span> {monsterDetails.combat.initiative}</span>}
                                        </div>
                                    )}

                                    {statRows.length > 0 && (
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wider text-white/45 mb-1">Caractéristiques</div>
                                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                                                {statRows.map((row) => (
                                                    <span key={row}>{row}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {monsterDetails.attaques && monsterDetails.attaques.length > 0 && (
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wider text-white/45 mb-1">Attaques</div>
                                            <div className="space-y-0.5">
                                                {monsterDetails.attaques.map((attaque, index) => (
                                                    <div key={`${attaque.attaque_base ?? 'attaque'}-${index}`} className="text-white/75">
                                                        {attaque.attaque_base ?? 'Attaque'}
                                                        {attaque.dm ? ` - DM ${attaque.dm}` : ''}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {monsterDetails.capacites && monsterDetails.capacites.length > 0 && (
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wider text-white/45 mb-1">Capacités spéciales</div>
                                            <div className="space-y-0.5">
                                                {monsterDetails.capacites.map((capacite, index) => (
                                                    <div key={`${capacite.nom ?? 'capacite'}-${index}`} className="text-white/75">
                                                        {capacite.nom ?? 'Capacité'}
                                                        {capacite.type ? ` (${capacite.type})` : ''}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}