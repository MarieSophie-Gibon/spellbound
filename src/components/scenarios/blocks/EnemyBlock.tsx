import { useState, useEffect, useRef } from "react";
import { Swords, Search, Target, ShieldAlert, X, PlusCircle, Ghost, Users, UploadCloud } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MagicCard } from "@/components/ui/MagicCard";
import { PNJWizard } from "@/components/personnage/PNJWizard";
import { MonsterWizard } from "@/components/compendium/bestiaire/MonsterWizard";
import type { PersistedCombatState, RoundTriggerEvent } from "../combat/types";

function createEmptyCombatPrep(): PersistedCombatState {
    return {
        combatants: [],
        activeCombatantId: null,
        round: 1,
        battlemapUrl: null,
        mapTokens: [],
        encounters: [],
        combatNote: "",
        combatNotePosition: { x: 32, y: 110 },
        roundTriggers: [],
    };
}

interface EnemyBlockProps {
    blockId?: string;
    campaignId: string;
    data: {
        entityId?: string;
        entityType?: 'monster' | 'npc';
        nom?: string;
        imageUrl?: string;
        combatEngaged?: boolean;
        comportement?: string;
        notes?: string;
        combatPrep?: PersistedCombatState;
    };
    onChange: (newData: Partial<EnemyBlockProps["data"]>) => void;
    isEditing?: boolean;
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

export function EnemyBlock({ blockId, campaignId, data, onChange, isEditing = true, onOpenCombatDashboard }: EnemyBlockProps) {
    const [searchType, setSearchType] = useState<'monster' | 'npc'>('monster');
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

    const [showDropdown, setShowDropdown] = useState(false);
    const [showNpcWizard, setShowNpcWizard] = useState(false);
    const [showMonsterWizard, setShowMonsterWizard] = useState(false);
    const [monsterDetails, setMonsterDetails] = useState<MonsterDetails | null>(null);
    const [newRoundTriggerText, setNewRoundTriggerText] = useState("");
    const [newRoundTriggerRounds, setNewRoundTriggerRounds] = useState("1");
    const [uploadingBattlemap, setUploadingBattlemap] = useState(false);
    const battlemapInputRef = useRef<HTMLInputElement>(null);

    const hasValidCampaignId = isValidUuid(campaignId);

    const combatPrep = data.combatPrep ?? createEmptyCombatPrep();

    const updateCombatPrep = (
        patch: Partial<PersistedCombatState> | ((prev: PersistedCombatState) => PersistedCombatState)
    ) => {
        const next = typeof patch === "function" ? patch(combatPrep) : { ...combatPrep, ...patch };
        onChange({ combatPrep: next });
    };

    const addRoundTrigger = () => {
        if (!isEditing) return;
        const label = newRoundTriggerText.trim();
        if (!label) return;
        const rounds = Math.max(1, Number.isFinite(Number(newRoundTriggerRounds)) ? Number(newRoundTriggerRounds) : 1);
        const newTrigger: RoundTriggerEvent = {
            id: crypto.randomUUID(),
            label,
            roundsLeft: rounds,
            createdAt: Date.now(),
        };
        updateCombatPrep((prev) => ({
            ...prev,
            roundTriggers: [...(prev.roundTriggers ?? []), newTrigger],
        }));
        setNewRoundTriggerText("");
        setNewRoundTriggerRounds("1");
    };

    const handleBattlemapUpload = async (file: File) => {
        if (!isEditing) return;
        setUploadingBattlemap(true);
        try {
            const ext = file.name.split(".").pop() || "png";
            const fileName = `${crypto.randomUUID()}.${ext}`;
            const filePath = `battlemaps/${fileName}`;
            const { error } = await supabase.storage.from("wiki-images").upload(filePath, file);
            if (error) throw error;
            const { data: publicData } = supabase.storage.from("wiki-images").getPublicUrl(filePath);
            updateCombatPrep({ battlemapUrl: publicData.publicUrl });
        } catch (err) {
            console.error("Erreur upload battlemap :", err);
        } finally {
            setUploadingBattlemap(false);
        }
    };

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
                                            <div className="text-sm font-medium text-white whitespace-pre-wrap wrap-break-word">{entity.name}</div>
                                            {searchType === 'monster' && (entity.type_creature || entity.nc) && (
                                                <div className="text-[11px] text-white/45 whitespace-pre-wrap wrap-break-word">
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
        <div className="border border-red-500/20 bg-red-500/5 rounded-2xl overflow-hidden shadow-lg relative group/block">

            {/* Bouton Reset */}
            <button
                onClick={() => onChange({ entityId: undefined, entityType: undefined, nom: undefined, imageUrl: undefined, combatEngaged: undefined, comportement: undefined, notes: undefined })}
                className="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-red-500/80 text-white rounded-lg opacity-0 group-hover/block:opacity-100 transition-all z-10"
                title="Changer d'ennemi"
            >
                <X className="w-4 h-4" />
            </button>

            <div className="flex">
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

                        <div className="shrink-0 flex items-center gap-2 pointer-events-auto">
                            <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-red-500/35 bg-black/30 text-[11px] text-red-200/90 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={!!data.combatEngaged}
                                    onChange={(e) => onChange({ combatEngaged: e.target.checked })}
                                    className="accent-red-500"
                                />
                                Engagé
                            </label>

                            <button
                                onClick={() => {
                                    if (!data.combatEngaged) {
                                        onChange({ combatEngaged: true });
                                    }
                                    onOpenCombatDashboard?.();
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-red-500/40 bg-black/30 text-red-300 hover:bg-red-500/25 hover:border-red-400/60 hover:text-red-200 text-[11px] font-medium transition-all active:scale-95"
                                title="Ouvrir le dashboard de combat"
                            >
                                <Swords className="w-3.5 h-3.5" />
                                Combat
                            </button>
                        </div>
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
                            <h4 className="text-[11px] uppercase tracking-widest text-red-300/80 mb-1.5 font-medium">Contexte de la rencontre</h4>
                            <textarea
                                value={data.comportement || ""}
                                onChange={(e) => onChange({ comportement: e.target.value })}
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

            {isEditing && (
                <div className="border-t border-red-500/15 p-4 md:p-5">
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                            <Swords className="w-4 h-4 text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-[11px] uppercase tracking-widest text-red-300/80 mb-1.5 font-medium">Préparation combat</h4>

                            <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/25 px-2 py-1 text-[10px] text-white/55">
                                <span className="uppercase tracking-widest text-white/35">debug</span>
                                <span className="font-mono text-white/70">block {blockId ? blockId.slice(0, 8) : "unknown"}</span>
                                <span>•</span>
                                <span>{(combatPrep.roundTriggers ?? []).length} event{(combatPrep.roundTriggers ?? []).length > 1 ? "s" : ""}</span>
                            </div>

                            <div className="space-y-3 rounded-xl border border-red-500/20 bg-black/25 p-3">
                                <div>
                                    <label className="mb-1 block text-[10px] uppercase tracking-widest text-red-200/70">Battlemap</label>
                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
                                        <input
                                            type="text"
                                            value={combatPrep.battlemapUrl ?? ""}
                                            onChange={(e) => updateCombatPrep({ battlemapUrl: e.target.value || null })}
                                            placeholder="https://... ou utilisez Upload"
                                            className="h-9 w-full rounded-lg border border-red-500/25 bg-black/30 px-3 text-sm text-white/90 outline-none transition-colors placeholder:text-white/35 focus:border-red-400/45"
                                            disabled={!isEditing}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => battlemapInputRef.current?.click()}
                                            disabled={!isEditing || uploadingBattlemap}
                                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-500/35 bg-red-500/10 px-3 text-[11px] text-red-200/90 transition-colors hover:bg-red-500/18 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <UploadCloud className="h-3.5 w-3.5" />
                                            {uploadingBattlemap ? "Upload..." : "Upload"}
                                        </button>
                                        <input
                                            ref={battlemapInputRef}
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) void handleBattlemapUpload(file);
                                                e.currentTarget.value = "";
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block text-[10px] uppercase tracking-widest text-red-200/70">Note de combat</label>
                                    <textarea
                                        value={combatPrep.combatNote ?? ""}
                                        onChange={(e) => updateCombatPrep({ combatNote: e.target.value })}
                                        placeholder="Objectifs, renforts, effets de terrain, rappels..."
                                        className="min-h-24 w-full resize-y rounded-lg border border-red-500/25 bg-black/30 px-3 py-2 text-sm text-white/85 outline-none transition-colors placeholder:text-white/35 focus:border-red-400/45"
                                        disabled={!isEditing}
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-[10px] uppercase tracking-widest text-red-200/70">Évènements (round)</label>
                                    {isEditing && (
                                        <div className="mb-2 grid grid-cols-[64px_1fr_auto] gap-2">
                                            <input
                                                type="number"
                                                min={1}
                                                value={newRoundTriggerRounds}
                                                onChange={(e) => setNewRoundTriggerRounds(e.target.value)}
                                                className="h-8 rounded-lg border border-red-500/25 bg-black/30 px-2 text-xs text-white/90 outline-none focus:border-red-400/45"
                                                placeholder="R"
                                            />
                                            <input
                                                type="text"
                                                value={newRoundTriggerText}
                                                onChange={(e) => setNewRoundTriggerText(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === "Enter") addRoundTrigger(); }}
                                                className="h-8 rounded-lg border border-red-500/25 bg-black/30 px-3 text-sm text-white/90 outline-none placeholder:text-white/35 focus:border-red-400/45"
                                                placeholder="Texte de l'évènement"
                                            />
                                            <button
                                                type="button"
                                                onClick={addRoundTrigger}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/35 bg-red-500/10 text-red-200/90 transition-colors hover:bg-red-500/18"
                                                aria-label="Ajouter un évènement"
                                            >
                                                <PlusCircle className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        {(combatPrep.roundTriggers ?? []).length === 0 && (
                                            <p className="py-1 text-[11px] italic text-white/35">Aucun évènement programmé.</p>
                                        )}
                                        {(combatPrep.roundTriggers ?? [])
                                            .slice()
                                            .sort((a, b) => a.roundsLeft - b.roundsLeft || a.createdAt - b.createdAt)
                                            .map((event) => (
                                                <div key={event.id} className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-2 py-1.5">
                                                    <span className="inline-flex h-6 min-w-12 items-center justify-center rounded-md border border-red-500/35 bg-black/30 px-1 text-[11px] text-red-100/85">
                                                        R-{event.roundsLeft}
                                                    </span>
                                                    <p className="flex-1 text-xs text-white/90 whitespace-pre-wrap wrap-break-word">{event.label}</p>
                                                    {isEditing && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                updateCombatPrep((prev) => ({
                                                                    ...prev,
                                                                    roundTriggers: (prev.roundTriggers ?? []).filter((t) => t.id !== event.id),
                                                                }))
                                                            }
                                                            className="text-white/40 transition-colors hover:text-red-300"
                                                            title="Supprimer"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}