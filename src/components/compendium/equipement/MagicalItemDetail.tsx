/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Maximize2,
  Minimize2,
  Pencil,
  Trash2,
  Sword,
  Target,
  Shield,
  Package,
  Coins,
  Dices,
  Swords,
  Sparkles,
} from "lucide-react";
import type { EquipementType } from "@/components/compendium/equipement/MagicalItemWizard";
import { useIsMobile } from "@/hooks/useIsMobile";

type EquipementDetailProps = {
  equipements: any[];
  selectedTable: EquipementType;
  isFullscreen: boolean;
  readOnly?: boolean;
  onToggleFullscreen: () => void;
  onEdit: (equipement: any) => void;
  onDelete: (equipement: any) => void;
};

const TABLE_LABELS: Record<
  EquipementType,
  { label: string; icon: typeof Sword }
> = {
  arme_contact: { label: "Armes de Contact", icon: Sword },
  arme_distance: { label: "Armes à Distance", icon: Target },
  armure: { label: "Armures", icon: Shield },
  equipement: { label: "Équipements", icon: Package },
};

const RARETE_COLORS: Record<string, string> = {
  Commun: "text-white/50 border-white/20",
  "Peu Commun": "text-emerald-400/80 border-emerald-400/30",
  Rare: "text-blue-400/80 border-blue-400/30",
  "Très Rare": "text-purple-400/80 border-purple-400/30",
  Légendaire: "text-amber-400/80 border-amber-400/30",
  Artefact: "text-red-400/80 border-red-400/30",
};

export function EquipementDetail({
  equipements,
  selectedTable,
  isFullscreen,
  readOnly,
  onToggleFullscreen,
  onEdit,
  onDelete,
}: EquipementDetailProps) {
  const isMobile = useIsMobile();
  const { label, icon: Icon } = TABLE_LABELS[selectedTable];

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 p-3 md:p-5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-[#E3CCCD]/20 pb-3 mb-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Icon className="w-5 h-5 text-[#E3CCCD]/60 shrink-0" />
          <h1 className="font-serif text-2xl text-white tracking-wider truncate">
            {label}
          </h1>
          <span className="text-[11px] text-white/40 shrink-0">
            {equipements.length} élément{equipements.length !== 1 ? "s" : ""}
          </span>
        </div>
        {!isMobile && (
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* LIST */}
      {equipements.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
          <Icon className="w-10 h-10 text-[#E3CCCD]/20 mb-3" />
          <p className="text-[13px] text-white/40 italic">
            Aucun élément dans cette catégorie.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {equipements.map((eq) => (
            <EquipementRow
              key={eq.id}
              equipement={eq}
              tableType={selectedTable}
              readOnly={readOnly}
              onEdit={() => onEdit(eq)}
              onDelete={() => onDelete(eq)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EquipementRow({
  equipement,
  tableType,
  readOnly,
  onEdit,
  onDelete,
}: {
  equipement: any;
  tableType: EquipementType;
  readOnly?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const rarete = equipement.data?.rarete;
  const rareteColor = rarete
    ? (RARETE_COLORS[rarete] ?? "text-white/50 border-white/20")
    : null;

  return (
    <div className="group flex items-center gap-3 bg-[#1E1941]/40 hover:bg-[#1E1941]/60 border border-[#E3CCCD]/10 hover:border-[#E3CCCD]/20 rounded-xl px-3 py-2.5 transition-all">
      {/* Thumbnail */}
      <div className="w-15 h-15 rounded-lg shrink-0 overflow-hidden border border-white/10 bg-black/20 flex items-center justify-center">
        {equipement.image_url ? (
          <img
            src={equipement.image_url}
            alt={equipement.nom}
            className="w-full h-full object-cover"
          />
        ) : (
          <Swords className="w-5 h-5 text-white/10" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[13px] text-white font-medium truncate">
              {equipement.nom}
            </span>
            {rareteColor && (
              <span
                className={`flex items-center gap-1 text-[10px] tracking-wider px-1.5 py-0.5 rounded-full border ${rareteColor} shrink-0`}
              >
                <Sparkles className="w-3 h-3" />
                {rarete}
              </span>
            )}
          </div>
          {equipement.prix && (
            <span className="flex items-center gap-1 text-[11px] text-amber-400/70 shrink-0">
              <Coins className="w-4 h-4" />
              {equipement.prix}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/40 mt-0.5">
          {(tableType === "arme_contact" || tableType === "arme_distance") &&
            equipement.dm && (
              <div className="flex items-center gap-5">
                <span className="flex items-center gap-1">
                  <Dices className="w-3 h-3" />
                  DM {equipement.dm}
                </span>
                <span className="flex items-center gap-1">
                  <Sword className="w-3 h-3" />
                  {equipement.type_de_dm}
                </span>
              </div>
            )}
          {tableType === "arme_distance" && equipement.portee && (
            <>
              <span className="text-white/20">·</span>
              <span>Portée {equipement.portee}</span>
            </>
          )}
          {tableType === "armure" && (
            <>
              {equipement.bonus_def && <span>DEF +{equipement.bonus_def}</span>}
              {equipement.agi_max && (
                <>
                  <span className="text-white/20">·</span>
                  <span>AGI max {equipement.agi_max}</span>
                </>
              )}
            </>
          )}
          {equipement.categorie && tableType === "equipement" && (
            <span>{equipement.categorie}</span>
          )}
        </div>
        {(equipement.notes || equipement.data?.description) && (
          <p className="text-[11px] text-white/30 mt-1 truncate italic">
            {equipement.data?.description || equipement.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      {!readOnly && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={onDelete} className="p-1.5 text-white/40 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded-full transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
}
