import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const CUSTOM_ITEM_VALUE = "custom";
const CUSTOM_ITEM_LABEL = "Objet personnalisé…";

const selectItemClass =
  "!text-white **:!text-white hover:!text-white focus:!text-white data-highlighted:!text-white hover:bg-white/10 focus:bg-white/10 data-highlighted:bg-white/10 data-[state=checked]:!text-white";

interface CompendiumItemSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  items: Array<{ id: string | number; nom: string }>;
  disabled?: boolean;
  className?: string;
}

// Écran tactile : <select> natif. Sur iOS, la liste Radix (longue, dans une
// modale) défilait mal et pouvait sélectionner un objet en fin de défilement ;
// le sélecteur natif d'iOS n'a pas ces problèmes.
function isCoarsePointer() {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
}

/** Liste « Objet du Compendium » des formulaires d'inventaire (ajout / modification). */
export function CompendiumItemSelect({ value, onValueChange, items, disabled, className }: CompendiumItemSelectProps) {
  const [useNative] = useState(isCoarsePointer);

  const triggerClass = cn(
    "w-full h-10.5 bg-[#2C255F]/65 border border-white/20 rounded-lg px-2.5 text-white text-sm disabled:opacity-50",
    className,
  );

  if (useNative) {
    return (
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          disabled={disabled}
          // text-base (16px) : en dessous, Safari iOS zoome sur le champ au toucher.
          className={cn(triggerClass, "appearance-none pr-8 text-base outline-none focus:border-[#E3CCCD]/50")}
          style={{ colorScheme: "dark" }}
        >
          <option value={CUSTOM_ITEM_VALUE}>{CUSTOM_ITEM_LABEL}</option>
          {items.map((item) => (
            <option key={item.id} value={item.id.toString()}>
              {item.nom}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-white/50" />
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn(triggerClass, "focus-visible:ring-0")}>
        <SelectValue placeholder={CUSTOM_ITEM_LABEL} />
      </SelectTrigger>
      {/* popper : la liste s'ouvre sous le champ et défile dans sa propre zone,
          limitée à la hauteur disponible à l'écran (pas de max-h fixe qui contredit Radix). */}
      <SelectContent
        position="popper"
        className="bg-[#2A2458] border border-white/18 text-white rounded-lg z-10000 max-h-[min(18rem,var(--radix-select-content-available-height))]"
      >
        <SelectItem value={CUSTOM_ITEM_VALUE} className={selectItemClass}>
          {CUSTOM_ITEM_LABEL}
        </SelectItem>
        {items.map((item) => (
          <SelectItem key={item.id} value={item.id.toString()} className={selectItemClass}>
            {item.nom}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
