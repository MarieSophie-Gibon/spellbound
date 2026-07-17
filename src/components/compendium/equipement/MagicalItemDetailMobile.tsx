import {
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
import type { Equipement } from "@/types/compendium";

type EquipementDetailMobileProps = {
  equipements: Equipement[];
  selectedTable: EquipementType;
  readOnly?: boolean;
  onEdit: (equipement: Equipement) => void;
  onDelete: (equipement: Equipement) => void;
};

const TABLE_LABELS: Record<
  EquipementType,
  { label: string; icon: typeof Sword }
> = {
  arme_contact: { label: "Armes de Contact", icon: Sword },
  arme_distance: { label: "Armes a Distance", icon: Target },
  armure: { label: "Armures", icon: Shield },
  equipement: { label: "Equipements", icon: Package },
};

const RARETE_COLORS: Record<string, string> = {
  Commun: "text-white/50 border-white/20",
  "Peu Commun": "text-emerald-400/80 border-emerald-400/30",
  Rare: "text-blue-400/80 border-blue-400/30",
  "Tres Rare": "text-purple-400/80 border-purple-400/30",
  Legendaire: "text-amber-400/80 border-amber-400/30",
  Artefact: "text-red-400/80 border-red-400/30",
};

export function EquipementDetailMobile({
  equipements,
  selectedTable,
  readOnly,
  onEdit,
  onDelete,
}: EquipementDetailMobileProps) {
  const { label, icon: Icon } = TABLE_LABELS[selectedTable];

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
      <div className="flex items-center gap-3 border-b border-[#E3CCCD]/20 pb-3 mb-3 shrink-0">
        <Icon className="w-5 h-5 text-[#E3CCCD]/60 shrink-0" />
        <h1 className="font-serif text-xl text-white tracking-wider">{label}</h1>
      </div>

      {equipements.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
          <Icon className="w-10 h-10 text-[#E3CCCD]/20 mb-3" />
          <p className="text-[13px] text-white/40 italic">
            Aucun element dans cette categorie.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {equipements.map((eq) => (
            <EquipementMobileCard
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

function EquipementMobileCard({
  equipement,
  tableType,
  readOnly,
  onEdit,
  onDelete,
}: {
  equipement: Equipement;
  tableType: EquipementType;
  readOnly?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const rarete = equipement.data?.rarete;
  const rareteColor = rarete
    ? (RARETE_COLORS[rarete] ?? "text-white/50 border-white/20")
    : null;

  const description = equipement.data?.description?.trim() ?? "";
  const notes = equipement.notes?.trim() ?? "";

  return (
    <div className="bg-[#1E1941]/40 border border-[#E3CCCD]/15 rounded-xl p-3 space-y-2.5">
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-lg shrink-0 overflow-hidden border border-white/10 bg-black/20 flex items-center justify-center">
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

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[13px] text-white font-medium leading-snug wrap-break-word">
                {equipement.nom}
              </p>
              <div className="flex items-center flex-wrap gap-1.5 mt-1">
                {rareteColor && (
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] tracking-wider px-1.5 py-0.5 rounded-full border ${rareteColor}`}
                  >
                    <Sparkles className="w-3 h-3" />
                    {rarete}
                  </span>
                )}
                {equipement.prix && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-400/75">
                    <Coins className="w-3.5 h-3.5" />
                    {equipement.prix}
                  </span>
                )}
              </div>
            </div>

            {!readOnly && (
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={onEdit}
                  className="p-1.5 text-white/45 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-1.5 text-white/45 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded-full transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/45 mt-2">
            {(tableType === "arme_contact" || tableType === "arme_distance") &&
              equipement.dm && (
                <span className="inline-flex items-center gap-1">
                  <Dices className="w-3 h-3" />
                  DM {equipement.dm}
                </span>
              )}
            {(tableType === "arme_contact" || tableType === "arme_distance") &&
              equipement.type_de_dm && (
                <span className="inline-flex items-center gap-1">
                  <Sword className="w-3 h-3" />
                  {equipement.type_de_dm}
                </span>
              )}
            {tableType === "arme_distance" && equipement.portee && (
              <span>Portee {equipement.portee}</span>
            )}
            {tableType === "armure" && equipement.bonus_def && (
              <span>DEF +{equipement.bonus_def}</span>
            )}
            {tableType === "armure" && equipement.agi_max && (
              <span>AGI max {equipement.agi_max}</span>
            )}
            {equipement.categorie && tableType === "equipement" && (
              <span>{equipement.categorie}</span>
            )}
          </div>
        </div>
      </div>

      {(description || notes) && (
        <div className="border border-dashed border-[#E3CCCD]/20 rounded-lg px-3 py-2.5 space-y-2 text-[12px] text-white/85">
          {!!description && (
            <div className="space-y-1">
              <p className="font-light leading-relaxed whitespace-pre-wrap">
                {description}
              </p>
            </div>
          )}

          {!!notes && (
            <div>
              <p className="text-[9px] uppercase tracking-widest text-[#E3CCCD]/65">
                Notes
              </p>
              <p className="font-light leading-relaxed whitespace-pre-wrap italic text-white/75">
                {notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
