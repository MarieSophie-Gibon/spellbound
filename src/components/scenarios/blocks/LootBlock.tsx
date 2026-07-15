import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Package, Search, Plus, Minus, Trash2, Loader2, Sword, Shield, Crosshair, Coins, Backpack, Check } from "lucide-react";
import EquipementWizard from "@/components/compendium/equipement/MagicalItemWizard";
import { usePJs } from "@/hooks/usePJs";

interface LootItem {
    id: string;
    table: string;
    nom: string;
    quantite: number;
    image_url?: string | null;
    prix?: string | null;
    stat?: string | null;
    description?: string | null;
}

export type EquipementType = "arme_contact" | "arme_distance" | "armure" | "equipement";

interface LootBlockProps {
    campaignId: string;
    data: {
        text?: string;
        items?: LootItem[];
    };
    onChange: (newData: Partial<LootBlockProps["data"]>) => void;
}

const TABLE_TO_ITEM_TYPE: Record<string, EquipementType> = {
    equipements: "equipement",
    armes_contact: "arme_contact",
    armes_distance: "arme_distance",
    armures: "armure",
};

const TABLE_LABEL: Record<string, string> = {
    equipements: "Objet",
    armes_contact: "Contact",
    armes_distance: "Distance",
    armures: "Armure",
};

export function LootBlock({ campaignId, data, onChange }: LootBlockProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [wizardType, setWizardType] = useState<EquipementType | null>(null);
    const [assigningItemKey, setAssigningItemKey] = useState<string | null>(null);
    const [assignedKeys, setAssignedKeys] = useState<Set<string>>(new Set());
    const [assigningPjId, setAssigningPjId] = useState<string | null>(null);
    const [assignError, setAssignError] = useState<string | null>(null);
    const assignRef = useRef<HTMLDivElement>(null);

    const { data: pjs } = usePJs(campaignId);

    const items = data.items || [];

    // Hydrate descriptions manquantes pour les items déjà sauvegardés
    useEffect(() => {
        const missingDesc = items.filter(i => i.description === undefined || i.description === null);
        if (missingDesc.length === 0) return;

        const TABLE_SELECT: Record<string, { table: string; select: string; getDesc: (row: any) => string | null }> = {
            equipements:    { table: 'equipements',    select: 'id, data',   getDesc: r => r.data?.description || null },
            armes_contact:  { table: 'armes_contact',  select: 'id, notes',  getDesc: r => r.notes || null },
            armes_distance: { table: 'armes_distance', select: 'id, notes',  getDesc: r => r.notes || null },
            armures:        { table: 'armures',        select: 'id, notes',  getDesc: r => r.notes || null },
        };

        const hydrate = async () => {
            const descMap: Record<string, string | null> = {};
            const byTable = missingDesc.reduce<Record<string, string[]>>((acc, i) => {
                acc[i.table] = [...(acc[i.table] || []), i.id];
                return acc;
            }, {});

            await Promise.all(Object.entries(byTable).map(async ([tbl, ids]) => {
                const cfg = TABLE_SELECT[tbl];
                if (!cfg) return;
                const { data: rows } = await supabase.from(cfg.table).select(cfg.select).in('id', ids);
                (rows || []).forEach((r: any) => { descMap[`${tbl}:${r.id}`] = cfg.getDesc(r); });
            }));

            const updated = items.map(i => {
                const key = `${i.table}:${i.id}`;
                return key in descMap ? { ...i, description: descMap[key] } : i;
            });
            onChange({ items: updated });
        };

        hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const search = async () => {
            setIsSearching(true);
            const q = `%${searchQuery}%`;

            const [eq, ac, ad, ar] = await Promise.all([
                supabase.from('equipements').select('id, nom, image_url, prix, data').or(`campaign_id.is.null,campaign_id.eq.${campaignId}`).ilike('nom', q).limit(5),
                supabase.from('armes_contact').select('id, nom, image_url, prix, notes, dm, type_de_dm').or(`campaign_id.is.null,campaign_id.eq.${campaignId}`).ilike('nom', q).limit(5),
                supabase.from('armes_distance').select('id, nom, image_url, prix, notes, dm, type_de_dm').or(`campaign_id.is.null,campaign_id.eq.${campaignId}`).ilike('nom', q).limit(5),
                supabase.from('armures').select('id, nom, image_url, prix, notes, bonus_def').or(`campaign_id.is.null,campaign_id.eq.${campaignId}`).ilike('nom', q).limit(5),
            ]);

            const combined = [
                ...(eq.data || []).map(i => ({ ...i, table: 'equipements', stat: i.data?.rarete || 'Objet', description: i.data?.description || null })),
                ...(ac.data || []).map(i => ({ ...i, table: 'armes_contact', stat: `${i.dm || ''} ${i.type_de_dm || ''}`.trim(), description: i.notes || null })),
                ...(ad.data || []).map(i => ({ ...i, table: 'armes_distance', stat: `${i.dm || ''} ${i.type_de_dm || ''}`.trim(), description: i.notes || null })),
                ...(ar.data || []).map(i => ({ ...i, table: 'armures', stat: i.bonus_def ? `${i.bonus_def} DEF` : 'Armure', description: i.notes || null })),
            ];

            setSearchResults(combined);
            setIsSearching(false);
        };

        const debounce = setTimeout(search, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery, campaignId]);

    // Close PJ picker on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (assignRef.current && !assignRef.current.contains(e.target as Node)) {
                setAssigningItemKey(null);
            }
        };
        if (assigningItemKey) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [assigningItemKey]);

    const assignToPJ = async (item: LootItem, pjId: string) => {
        const itemType = TABLE_TO_ITEM_TYPE[item.table] ?? "equipement";
        setAssigningPjId(pjId);
        setAssignError(null);
        const { error } = await supabase.from("pj_inventaire").insert({
            pj_id: pjId,
            item_type: itemType,
            item_id: null,
            nom_custom: item.nom,
            description_custom: item.description ?? item.stat ?? "",
            qte: item.quantite,
            is_equipped: false,
        });
        setAssigningPjId(null);
        if (error) {
            setAssignError(error.message);
            return;
        }
        const key = `${item.id}:${item.table}`;
        setAssignedKeys(prev => new Set(prev).add(key));
        setAssigningItemKey(null);
        setTimeout(() => setAssignedKeys(prev => { const s = new Set(prev); s.delete(key); return s; }), 2000);
    };

    const addItem = (item: any) => {
        const existing = items.find(i => i.id === item.id && i.table === item.table);
        if (existing) {
            updateQuantity(existing.id, existing.table, 1);
        } else {
            onChange({
                items: [...items, {
                    id: item.id,
                    table: item.table,
                    nom: item.nom,
                    quantite: 1,
                    image_url: item.image_url,
                    prix: item.prix,
                    stat: item.stat,
                    description: item.description ?? null
                }]
            });
        }
        setSearchQuery("");
        setSearchResults([]);
    };

    const updateQuantity = (id: string, table: string, delta: number) => {
        const newItems = items.map(i => {
            if (i.id === id && i.table === table) {
                return { ...i, quantite: Math.max(1, i.quantite + delta) };
            }
            return i;
        });
        onChange({ items: newItems });
    };

    const removeItem = (id: string, table: string) => {
        onChange({ items: items.filter(i => !(i.id === id && i.table === table)) });
    };

    return (
        <div className="flex flex-col border border-amber-500/20 bg-amber-500/5 rounded-2xl overflow-visible relative pb-3">
            <div className="p-4 md:p-5 flex flex-col gap-4">

                {/* HEADER & CHAMP TEXTE LIBRE */}
                <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-serif text-lg text-amber-100/90 mb-1">Trésor & Butin</h3>
                        <textarea
                            value={data.text || ""}
                            onChange={(e) => onChange({ text: e.target.value })}
                            placeholder="Or, gemmes, objets de quête (ex: 50 PO, 1 rubis...)"
                            className="w-full bg-transparent text-white/80 text-[13px] leading-relaxed outline-none resize-none overflow-hidden min-h-10 placeholder:text-white/20 border-b border-white/10 focus:border-amber-400/40 transition-colors"
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = "auto";
                                target.style.height = `${target.scrollHeight}px`;
                            }}
                        />
                    </div>
                </div>

                {/* LISTE DES OBJETS AJOUTÉS */}
                {items.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-2">
                        {items.map((item, idx) => {
                            const itemKey = `${item.id}:${item.table}`;
                            const isAssigned = assignedKeys.has(itemKey);
                            const isPickerOpen = assigningItemKey === itemKey;
                            return (
                                <div key={idx} className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-xl px-3 py-2 transition-all hover:bg-white/8 hover:border-amber-500/20 group/item">

                                    {/* Miniature */}
                                    <div className="w-9 h-9 rounded-lg bg-black/20 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                                        {item.image_url
                                            ? <img src={item.image_url} alt={item.nom} className="w-full h-full object-cover" />
                                            : <Package className="w-4 h-4 text-white/20" />
                                        }
                                    </div>

                                    {/* Nom + badges */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[13px] text-white/90 font-medium whitespace-pre-wrap wrap-break-word">{item.nom}</span>
                                            <span className="text-[9px] uppercase tracking-widest text-amber-300/50 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
                                                {TABLE_LABEL[item.table] ?? item.table}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                            {item.stat && (
                                                <span className="text-[11px] text-white/45">{item.stat}</span>
                                            )}
                                            {item.prix && (
                                                <span className="flex items-center gap-1 text-[11px] text-amber-200/55">
                                                    <Coins className="w-3 h-3" />{item.prix}
                                                </span>
                                            )}
                                        </div>
                                        {item.description && (
                                            <p className="text-[11px] text-white/35 mt-0.5 leading-relaxed whitespace-pre-wrap wrap-break-word">{item.description}</p>
                                        )}
                                    </div>

                                    {/* Quantité */}
                                    <div className="flex items-center gap-1 bg-white/5 border border-white/8 rounded-lg px-1.5 py-1 shrink-0">
                                        <button onClick={() => updateQuantity(item.id, item.table, -1)} className="p-0.5 text-white/30 hover:text-white rounded hover:bg-white/15 transition-colors">
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="text-[12px] text-amber-200 font-mono w-5 text-center">{item.quantite}</span>
                                        <button onClick={() => updateQuantity(item.id, item.table, 1)} className="p-0.5 text-white/30 hover:text-white rounded hover:bg-white/15 transition-colors">
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>

                                    {/* Attribuer à un PJ */}
                                    <div className="relative shrink-0" ref={isPickerOpen ? assignRef : undefined}>
                                        <button
                                            onClick={() => setAssigningItemKey(isPickerOpen ? null : itemKey)}
                                            title="Attribuer à un PJ"
                                            className={`p-1.5 rounded-lg border transition-all ${isAssigned ? "bg-green-500/20 border-green-500/30 text-green-400" : "bg-white/5 border-white/10 text-white/40 hover:bg-amber-500/15 hover:border-amber-500/30 hover:text-amber-300"}`}
                                        >
                                            {isAssigned ? <Check className="w-3.5 h-3.5" /> : <Backpack className="w-3.5 h-3.5" />}
                                        </button>

                                        {/* PJ picker dropdown */}
                                        {isPickerOpen && pjs && pjs.length > 0 && (
                                            <div className="absolute right-0 top-full mt-1 z-50 bg-[#1b1738] border border-white/15 rounded-xl shadow-2xl overflow-hidden min-w-40">
                                                <div className="px-3 py-1.5 text-[9px] uppercase tracking-widest text-white/30 border-b border-white/5">
                                                    Attribuer à…
                                                </div>
                                                {assignError && (
                                                    <div className="px-3 py-2 text-[10px] text-red-400 bg-red-500/10 border-b border-red-500/20">{assignError}</div>
                                                )}
                                                {pjs.map(pj => (
                                                    <button
                                                        key={pj.id}
                                                        onClick={() => assignToPJ(item, pj.id)}
                                                        disabled={assigningPjId === pj.id}
                                                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-amber-500/10 transition-colors border-b border-white/5 last:border-0 disabled:opacity-50"
                                                    >
                                                        {pj.image_url
                                                            ? <img src={pj.image_url} className="w-6 h-6 rounded-full object-cover border border-white/10 shrink-0" />
                                                            : <div className="w-6 h-6 rounded-full bg-white/10 border border-white/10 shrink-0" />
                                                        }
                                                        <span className="text-[12px] text-white/80 whitespace-pre-wrap wrap-break-word">{pj.name}</span>
                                                        {assigningPjId === pj.id && <Loader2 className="w-3 h-3 animate-spin text-amber-400 ml-auto shrink-0" />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Supprimer */}
                                    <button
                                        onClick={() => removeItem(item.id, item.table)}
                                        className="p-1.5 bg-red-500/5 hover:bg-red-500/20 text-red-400/50 hover:text-red-400 rounded-lg border border-transparent hover:border-red-500/20 transition-all shrink-0 opacity-0 group-hover/item:opacity-100"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* RECHERCHE ET CRÉATION */}
                <div className="flex flex-col gap-2 mt-2 relative">
                    <div className="relative z-20">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Chercher une arme, armure, objet..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-[13px] text-white outline-none focus:border-amber-400/50 focus:bg-white/10 transition-all placeholder:text-white/30"
                        />
                        {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-amber-400/50" />}
                    </div>

                    {/* RÉSULTATS */}
                    {searchQuery && searchResults.length > 0 && (
                        <div className="absolute top-full mt-1 left-0 w-full bg-[#1b1738] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                            {searchResults.map((res, i) => (
                                <button
                                    key={i}
                                    onClick={() => addItem(res)}
                                    className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors flex items-center gap-3 border-b border-white/5 last:border-0"
                                >
                                    <div className="w-7 h-7 rounded bg-black/30 flex items-center justify-center shrink-0 border border-white/5 overflow-hidden">
                                        {res.image_url ? <img src={res.image_url} className="w-full h-full object-cover" /> : <Package className="w-3 h-3 text-white/20" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[12px] text-white/90 font-medium whitespace-pre-wrap wrap-break-word">{res.nom}</div>
                                        <div className="text-[9px] flex items-center gap-2 mt-0.5 whitespace-pre-wrap wrap-break-word">
                                            <span className="uppercase tracking-widest text-amber-200/50">{res.table.replace('_', ' ')}</span>
                                            {res.stat && <span className="text-white/40">{res.stat}</span>}
                                        </div>
                                    </div>
                                    {res.prix && (
                                        <div className="shrink-0 text-[10px] text-amber-200/60 font-mono">
                                            {res.prix}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* BOUTONS CRÉATION */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                        <span className="text-[9px] uppercase tracking-widest text-white/30 w-full flex items-center gap-2 before:h-px before:flex-1 before:bg-white/5 after:h-px after:flex-1 after:bg-white/5">Créer un objet inédit</span>
                        <button onClick={() => setWizardType("equipement")} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-amber-500/15 text-[11px] text-white/60 hover:text-amber-100 transition-all border border-white/5 hover:border-amber-500/30"><Package className="w-3 h-3" /> Objet</button>
                        <button onClick={() => setWizardType("arme_contact")} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-amber-500/15 text-[11px] text-white/60 hover:text-amber-100 transition-all border border-white/5 hover:border-amber-500/30"><Sword className="w-3 h-3" /> Contact</button>
                        <button onClick={() => setWizardType("arme_distance")} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-amber-500/15 text-[11px] text-white/60 hover:text-amber-100 transition-all border border-white/5 hover:border-amber-500/30"><Crosshair className="w-3 h-3" /> Distance</button>
                        <button onClick={() => setWizardType("armure")} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-amber-500/15 text-[11px] text-white/60 hover:text-amber-100 transition-all border border-white/5 hover:border-amber-500/30"><Shield className="w-3 h-3" /> Armure</button>
                    </div>
                </div>
            </div>

            {/* MODALE DE CRÉATION */}
            {wizardType && (
                <div className="fixed inset-0 z-200">
                    <EquipementWizard
                        selectedType={wizardType}
                        campaignId={campaignId}
                        onClose={() => setWizardType(null)}
                        onSuccess={(newItem) => {
                            if (newItem) {
                                const tableMap: Record<string, string> = {
                                    'equipement': 'equipements',
                                    'arme_contact': 'armes_contact',
                                    'arme_distance': 'armes_distance',
                                    'armure': 'armures'
                                };
                                let stat = "Objet";
                                if (wizardType === 'equipement') stat = newItem.data?.rarete || 'Objet';
                                if (wizardType === 'armure') stat = newItem.bonus_def ? `${newItem.bonus_def} DEF` : 'Armure';
                                if (wizardType === 'arme_contact' || wizardType === 'arme_distance') {
                                    stat = `${newItem.dm || ''} ${newItem.type_de_dm || ''}`.trim();
                                }
                                addItem({
                                    id: newItem.id,
                                    table: tableMap[wizardType],
                                    nom: newItem.nom,
                                    image_url: newItem.image_url,
                                    prix: newItem.prix,
                                    stat: stat || undefined
                                });
                            }
                            setWizardType(null);
                        }}
                    />
                </div>
            )}
        </div>
    );
}