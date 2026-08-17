import { ChevronDown, Copy, Trash2 } from "lucide-react";
import { ThemedSelect } from "@/components/ui/ThemedSelect";
import type { RangsState, VoieRang } from "@/types/compendium";
import { RANG_ACTION_TYPES } from "@/types/compendium";
import { hasRangItemContent, type RangSection } from "@/lib/rangEditor";

interface RangEditorCardProps {
  rangKey: keyof RangsState;
  rangNum: number;
  rangData: VoieRang;
  isEditing: boolean;
  newItemKeys: Set<string>;
  openRangItems: Set<string>;
  onToggleRangItem: (ikey: string) => void;
  onUpdateRangTitle: (value: string) => void;
  onUpdateRangItem: (section: RangSection, itemIdx: number, field: string, value: string | boolean) => void;
  onDuplicateRangItem: (section: RangSection, itemIdx: number) => void;
  onRemoveRangItem: (section: RangSection, itemIdx: number) => void;
  onAddRangItem: (section: RangSection) => void;
  makeItemKey?: (section: RangSection, itemIdx: number) => string;
  bonusValuePlaceholder?: string;
}

export function RangEditorCard({
  rangKey,
  rangNum,
  rangData,
  isEditing,
  newItemKeys,
  openRangItems,
  onToggleRangItem,
  onUpdateRangTitle,
  onUpdateRangItem,
  onDuplicateRangItem,
  onRemoveRangItem,
  onAddRangItem,
  makeItemKey,
  bonusValuePlaceholder = "Valeur (ex: +1)",
}: RangEditorCardProps) {
  const keyFactory = makeItemKey ?? ((section: RangSection, itemIdx: number) => `${rangKey}-${section}-${itemIdx}`);

  const bonuses = Array.isArray(rangData.bonus) ? rangData.bonus : [];
  const capacites = Array.isArray(rangData.capacites) ? rangData.capacites : [];
  const actions = Array.isArray(rangData.actions) ? rangData.actions : [];
  const familiers = Array.isArray(rangData.familiers) ? rangData.familiers : [];
  const legacies = Array.isArray(rangData.legacies) ? rangData.legacies : [];

  const showItems = isEditing
    ? [...bonuses, ...capacites, ...actions, ...familiers, ...legacies].some((item) => hasRangItemContent(item)) || newItemKeys.size > 0
    : bonuses.length > 0 || capacites.length > 0 || actions.length > 0 || familiers.length > 0 || legacies.length > 0;

  const isItemOpen = (ikey: string) => (isEditing ? !openRangItems.has(ikey) : openRangItems.has(ikey));

  return (
    <div className="rounded-xl border border-white/8 overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2.5 bg-black/10">
        <span className="w-5 h-5 rounded-full border border-white/25 flex items-center justify-center text-[11px] text-white/50 font-medium shrink-0">{rangNum}</span>
        <input
          type="text"
          value={rangData.titre || ""}
          onChange={(e) => onUpdateRangTitle(e.target.value)}
          placeholder={`Rang ${rangNum}`}
          className="flex-1 bg-transparent outline-none text-white text-sm placeholder:text-white/25 border-b border-transparent focus:border-white/20 py-0.5 transition-colors"
        />
      </div>

      {showItems && (
        <div className="px-3 pt-1 pb-0.5 space-y-1">
          {bonuses.map((bonus, idx) => {
            if (isEditing && !hasRangItemContent(bonus) && !newItemKeys.has(keyFactory("bonus", idx))) return null;
            const ikey = keyFactory("bonus", idx);
            const open = isItemOpen(ikey);
            return (
              <div key={ikey} className="rounded border border-white/8 overflow-hidden">
                <div className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-white/3 transition-colors" onClick={() => onToggleRangItem(ikey)}>
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-900/25 text-amber-300/60 shrink-0">bonus</span>
                  <span className="flex-1 text-[12px] text-white/75 truncate">{bonus.titre || <span className="text-white/25 italic">sans titre</span>}</span>
                  <button type="button" title="Dupliquer" onClick={(e) => { e.stopPropagation(); onDuplicateRangItem("bonus", idx); }} className="p-1 text-white/20 hover:text-white/60 transition-colors"><Copy className="w-3 h-3" /></button>
                  <button type="button" title="Supprimer" onClick={(e) => { e.stopPropagation(); onRemoveRangItem("bonus", idx); }} className="p-1 text-white/20 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                  <ChevronDown className={`w-3 h-3 text-white/25 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
                </div>
                {open && (
                  <div className="px-2.5 pb-2.5 pt-2 space-y-2 border-t border-white/6 bg-black/10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      <input type="text" value={bonus.titre || ""} onChange={(e) => onUpdateRangItem("bonus", idx, "titre", e.target.value)} placeholder="Titre du bonus" className="bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                      <input type="text" value={bonus.type || ""} onChange={(e) => onUpdateRangItem("bonus", idx, "type", e.target.value)} placeholder="Type de bonus" className="bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                      <input type="text" value={bonus.valeur || ""} onChange={(e) => onUpdateRangItem("bonus", idx, "valeur", e.target.value)} placeholder={bonusValuePlaceholder} className="bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                    </div>
                    <textarea value={bonus.condition || ""} onChange={(e) => onUpdateRangItem("bonus", idx, "condition", e.target.value)} placeholder="Description / condition (optionnel)" className="w-full h-14 bg-transparent border-b border-white/20 focus:border-white/35 py-1.5 text-white/85 text-[13px] outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35" />
                  </div>
                )}
              </div>
            );
          })}

          {capacites.map((capacite, idx) => {
            if (isEditing && !hasRangItemContent(capacite) && !newItemKeys.has(keyFactory("capacites", idx))) return null;
            const ikey = keyFactory("capacites", idx);
            const open = isItemOpen(ikey);
            return (
              <div key={ikey} className="rounded border border-white/8 overflow-hidden">
                <div className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-white/3 transition-colors" onClick={() => onToggleRangItem(ikey)}>
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-900/25 text-blue-300/60 shrink-0">cap.</span>
                  <span className="flex-1 text-[12px] text-white/75 truncate">{capacite.titre || <span className="text-white/25 italic">sans titre</span>}</span>
                  <button type="button" title="Dupliquer" onClick={(e) => { e.stopPropagation(); onDuplicateRangItem("capacites", idx); }} className="p-1 text-white/20 hover:text-white/60 transition-colors"><Copy className="w-3 h-3" /></button>
                  <button type="button" title="Supprimer" onClick={(e) => { e.stopPropagation(); onRemoveRangItem("capacites", idx); }} className="p-1 text-white/20 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                  <ChevronDown className={`w-3 h-3 text-white/25 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
                </div>
                {open && (
                  <div className="px-2.5 pb-2.5 pt-2 space-y-2 border-t border-white/6 bg-black/10">
                    <input type="text" value={capacite.titre || ""} onChange={(e) => onUpdateRangItem("capacites", idx, "titre", e.target.value)} placeholder="Titre de la capacité" className="w-full bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                    <textarea value={capacite.description || ""} onChange={(e) => onUpdateRangItem("capacites", idx, "description", e.target.value)} placeholder="Description de la capacité" className="w-full h-14 bg-transparent border-b border-white/20 focus:border-white/35 py-1.5 text-white/85 text-[13px] outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35" />
                  </div>
                )}
              </div>
            );
          })}

          {actions.map((action, idx) => {
            if (isEditing && !hasRangItemContent(action) && !newItemKeys.has(keyFactory("actions", idx))) return null;
            const ikey = keyFactory("actions", idx);
            const open = isItemOpen(ikey);
            return (
              <div key={ikey} className="rounded border border-white/8 overflow-hidden">
                <div className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-white/3 transition-colors" onClick={() => onToggleRangItem(ikey)}>
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-900/25 text-emerald-300/60 shrink-0">action</span>
                  <span className="flex-1 text-[12px] text-white/75 truncate">{action.titre || <span className="text-white/25 italic">sans titre</span>}</span>
                  <button type="button" title="Dupliquer" onClick={(e) => { e.stopPropagation(); onDuplicateRangItem("actions", idx); }} className="p-1 text-white/20 hover:text-white/60 transition-colors"><Copy className="w-3 h-3" /></button>
                  <button type="button" title="Supprimer" onClick={(e) => { e.stopPropagation(); onRemoveRangItem("actions", idx); }} className="p-1 text-white/20 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                  <ChevronDown className={`w-3 h-3 text-white/25 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
                </div>
                {open && (
                  <div className="px-2.5 pb-2.5 pt-2 space-y-2 border-t border-white/6 bg-black/10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      <input type="text" value={action.titre || ""} onChange={(e) => onUpdateRangItem("actions", idx, "titre", e.target.value)} placeholder="Titre de l'action" className="bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                      <ThemedSelect value={action.type || ""} onValueChange={(value) => onUpdateRangItem("actions", idx, "type", value || "")} options={[...RANG_ACTION_TYPES]} placeholder="Type (A/M/L/G)" />
                      <input type="text" value={action.dm || ""} onChange={(e) => onUpdateRangItem("actions", idx, "dm", e.target.value)} placeholder="DM" className="bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      <label className="flex items-center gap-2 text-[12px] text-white/75">
                        <input type="checkbox" checked={!!action.sort} onChange={(e) => onUpdateRangItem("actions", idx, "sort", e.target.checked)} className="accent-indigo-500 w-4 h-4 rounded" />
                        Sort
                      </label>
                      <input type="text" value={action.cout_mana || ""} onChange={(e) => onUpdateRangItem("actions", idx, "cout_mana", e.target.value)} placeholder="Coût en PM" disabled={!action.sort} className="bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35 disabled:opacity-40" />
                    </div>
                    <label className="flex items-center gap-2 text-[12px] text-white/75">
                      <input type="checkbox" checked={!!action.test_oppose} onChange={(e) => onUpdateRangItem("actions", idx, "test_oppose", e.target.checked)} className="accent-indigo-500 w-4 h-4 rounded" />
                      Test opposé
                    </label>
                    {action.test_oppose && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        <input type="text" value={action.test_type || ""} onChange={(e) => onUpdateRangItem("actions", idx, "test_type", e.target.value)} placeholder="Type de test" className="bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                        <input type="text" value={action.resultat_si_reussi || ""} onChange={(e) => onUpdateRangItem("actions", idx, "resultat_si_reussi", e.target.value)} placeholder="Résultat si réussi" className="bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                      </div>
                    )}
                    <textarea value={action.description || ""} onChange={(e) => onUpdateRangItem("actions", idx, "description", e.target.value)} placeholder="Description de l'action" className="w-full h-14 bg-transparent border-b border-white/20 focus:border-white/35 py-1.5 text-white/85 text-[13px] outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35" />
                  </div>
                )}
              </div>
            );
          })}

          {familiers.map((familier, idx) => {
            if (isEditing && !hasRangItemContent(familier) && !newItemKeys.has(keyFactory("familiers", idx))) return null;
            const ikey = keyFactory("familiers", idx);
            const open = isItemOpen(ikey);
            return (
              <div key={ikey} className="rounded border border-white/8 overflow-hidden">
                <div className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-white/3 transition-colors" onClick={() => onToggleRangItem(ikey)}>
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-900/25 text-teal-300/60 shrink-0">familier</span>
                  <span className="flex-1 text-[12px] text-white/75 truncate">{familier.titre || <span className="text-white/25 italic">sans titre</span>}</span>
                  <button type="button" title="Dupliquer" onClick={(e) => { e.stopPropagation(); onDuplicateRangItem("familiers", idx); }} className="p-1 text-white/20 hover:text-white/60 transition-colors"><Copy className="w-3 h-3" /></button>
                  <button type="button" title="Supprimer" onClick={(e) => { e.stopPropagation(); onRemoveRangItem("familiers", idx); }} className="p-1 text-white/20 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                  <ChevronDown className={`w-3 h-3 text-white/25 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
                </div>
                {open && (
                  <div className="px-2.5 pb-2.5 pt-2 space-y-2 border-t border-white/6 bg-black/10">
                    <input type="text" value={familier.titre || ""} onChange={(e) => onUpdateRangItem("familiers", idx, "titre", e.target.value)} placeholder="Nom du familier / capacité" className="w-full bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                    <textarea value={familier.description || ""} onChange={(e) => onUpdateRangItem("familiers", idx, "description", e.target.value)} placeholder="Description" className="w-full h-14 bg-transparent border-b border-white/20 focus:border-white/35 py-1.5 text-white/85 text-[13px] outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35" />
                  </div>
                )}
              </div>
            );
          })}

          {legacies.map((legacy, idx) => {
            if (isEditing && !hasRangItemContent(legacy) && !newItemKeys.has(keyFactory("legacies", idx))) return null;
            const ikey = keyFactory("legacies", idx);
            const open = isItemOpen(ikey);
            return (
              <div key={ikey} className="rounded border border-white/8 overflow-hidden">
                <div className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-white/3 transition-colors" onClick={() => onToggleRangItem(ikey)}>
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-900/25 text-purple-300/60 shrink-0">legacy</span>
                  <span className="flex-1 text-[12px] text-white/75 truncate">{legacy.titre || <span className="text-white/25 italic">sans titre</span>}</span>
                  <button type="button" title="Dupliquer" onClick={(e) => { e.stopPropagation(); onDuplicateRangItem("legacies", idx); }} className="p-1 text-white/20 hover:text-white/60 transition-colors"><Copy className="w-3 h-3" /></button>
                  <button type="button" title="Supprimer" onClick={(e) => { e.stopPropagation(); onRemoveRangItem("legacies", idx); }} className="p-1 text-white/20 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                  <ChevronDown className={`w-3 h-3 text-white/25 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
                </div>
                {open && (
                  <div className="px-2.5 pb-2.5 pt-2 space-y-2 border-t border-white/6 bg-black/10">
                    <input type="text" value={legacy.titre || ""} onChange={(e) => onUpdateRangItem("legacies", idx, "titre", e.target.value)} placeholder="Source (voie / rang)" className="w-full bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/35" />
                    <textarea value={legacy.description || ""} onChange={(e) => onUpdateRangItem("legacies", idx, "description", e.target.value)} placeholder="Capacité acquise" className="w-full h-14 bg-transparent border-b border-white/20 focus:border-white/35 py-1.5 text-white/85 text-[13px] outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="px-3 pb-2.5 pt-1.5 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onAddRangItem("bonus")} className="text-[11px] px-2 py-0.5 rounded border border-white/15 text-white/40 hover:text-amber-300/70 hover:border-amber-900/40 transition-colors">+ Bonus</button>
        <button type="button" onClick={() => onAddRangItem("capacites")} className="text-[11px] px-2 py-0.5 rounded border border-white/15 text-white/40 hover:text-blue-300/70 hover:border-blue-900/40 transition-colors">+ Capacité</button>
        <button type="button" onClick={() => onAddRangItem("actions")} className="text-[11px] px-2 py-0.5 rounded border border-white/15 text-white/40 hover:text-emerald-300/70 hover:border-emerald-900/40 transition-colors">+ Action</button>
        <button type="button" onClick={() => onAddRangItem("familiers")} className="text-[11px] px-2 py-0.5 rounded border border-white/15 text-white/40 hover:text-teal-300/70 hover:border-teal-900/40 transition-colors">+ Familier</button>
        <button type="button" onClick={() => onAddRangItem("legacies")} className="text-[11px] px-2 py-0.5 rounded border border-white/15 text-white/40 hover:text-purple-300/70 hover:border-purple-900/40 transition-colors">+ Legacy</button>
      </div>
    </div>
  );
}
