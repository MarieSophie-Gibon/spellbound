import { Pencil, Trash2, Image as ImageIcon, ChevronDown, Sword, Target, Shield } from "lucide-react";
import type { Famille, FamilleArchetype, FamilleVoie } from "@/types/compendium";
import { MagicCard } from "@/components/ui/MagicCard";

interface ProfilDetailMobileProps {
  profil: Famille;
  familleArchetype?: FamilleArchetype;
  voies: FamilleVoie[];
  readOnly?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  hasEquipAssoc: boolean;
  equipNoms: {
    arme_contact: string[];
    arme_distance: string[];
    armure: string[];
  };
}

export function ProfilDetailMobile({
  profil,
  familleArchetype,
  voies,
  readOnly,
  onEdit,
  onDelete,
  hasEquipAssoc,
  equipNoms,
}: ProfilDetailMobileProps) {
  const hasActions = !readOnly;

  const quickStats = [
    { label: "Famille", value: profil.famille_nom ?? "" },
    familleArchetype
      ? { label: "PV / niveau", value: `${familleArchetype.pv_niveau}` }
      : null,
    familleArchetype
      ? { label: "De recuperation", value: familleArchetype.de_recuperation }
      : null,
    familleArchetype && familleArchetype.bonus_chance !== 0
      ? {
          label: "Bonus chance",
          value:
            familleArchetype.bonus_chance > 0
              ? `+${familleArchetype.bonus_chance}`
              : `${familleArchetype.bonus_chance}`,
        }
      : null,
  ].filter((item): item is { label: string; value: string } => {
    return !!item && !!item.value && item.value.trim().length > 0;
  });

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
      {hasActions && (
        <div className="flex items-center justify-end border-b border-[#E3CCCD]/20 pb-3 mb-3 shrink-0">
          <div className="flex items-center gap-1 bg-[#1E1941]/80 border border-[#E3CCCD]/20 rounded-full px-2 py-1.5 backdrop-blur-md shadow-xl">
            <button
              onClick={onEdit}
              className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-white/60 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded-full transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3 flex-1">
        <div className="flex gap-3 items-start">
          <div className="h-66 shrink-0 self-start aspect-290/437 rounded-2xl relative border border-white/10 overflow-hidden">
      {profil.image_url ? (
        <MagicCard
          imageUrl={profil.image_url}
          title={profil.nom}
          size="fluid"
          className="w-full! h-full!"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <ImageIcon className="w-10 h-10 text-white/10" />
        </div>
      )}
    </div>

          {quickStats.length > 0 && (
            <div className="flex-1 min-h-[13.6rem] max-h-[13.6rem] overflow-y-auto border border-dashed border-[#E3CCCD]/25 rounded-2xl p-2 text-[11px] text-white/90 space-y-1.5">
              {quickStats.map((item) => (
                <CompactStatRow
                  key={item.label}
                  label={item.label}
                  value={item.value}
                />
              ))}
            </div>
          )}
        </div>

        <details className="w-full bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-2xl p-3 text-[13px] font-light text-white/90 leading-relaxed shadow-inner group">
          <summary className="list-none cursor-pointer select-none flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/90">
            <span>Lore & Description</span>
            <span className="flex h-6 w-6 items-center justify-center origin-center text-white/95 text-sm leading-none transition-transform duration-200 group-open:rotate-180">
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </span>
          </summary>

          <div className="mt-3 flex gap-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            <div className="shrink-0 mt-0.5">
              <span className="text-[#E3CCCD]">✧</span>
            </div>
            <div>
              <div className="whitespace-pre-wrap">
                {profil.description || "Aucune description renseignee."}
              </div>
              {profil.lore && (
                <div className="whitespace-pre-wrap mt-4 pt-4 border-t border-white/10 text-white/70 italic">
                  {profil.lore}
                </div>
              )}
            </div>
          </div>
        </details>

        {(profil.equipement_base || profil.maitrise_equipement || hasEquipAssoc) && (
          <div className="border border-dashed border-[#E3CCCD]/25 rounded-2xl px-4 py-3 text-[12px] text-white/90 space-y-3">
            {profil.equipement_base && (
              <div className="space-y-1">
                <p className="text-[9px] uppercase tracking-widest text-[#E3CCCD]/65">Equipement de base</p>
                <p className="font-light text-white/85 leading-relaxed whitespace-pre-wrap">{profil.equipement_base}</p>
              </div>
            )}

            {profil.maitrise_equipement && (
              <div className="space-y-1 pt-2 border-t border-dashed border-white/10">
                <p className="text-[9px] uppercase tracking-widest text-[#E3CCCD]/65">Maitrise d'equipement</p>
                <p className="font-light text-white/85 leading-relaxed whitespace-pre-wrap">{profil.maitrise_equipement}</p>
              </div>
            )}

            {hasEquipAssoc && (
              <div className="space-y-2 pt-2 border-t border-dashed border-white/10">
                <p className="text-[9px] uppercase tracking-widest text-[#E3CCCD]/65">Equipement associe</p>
                <div className="flex flex-wrap gap-2">
                  {equipNoms.arme_contact.map((nom) => (
                    <span
                      key={`contact-${nom}`}
                      className="inline-flex items-center gap-1.5 text-[11px] text-white/75 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1"
                    >
                      <Sword className="w-3 h-3 text-[#E3CCCD]/50" />
                      {nom}
                    </span>
                  ))}
                  {equipNoms.arme_distance.map((nom) => (
                    <span
                      key={`distance-${nom}`}
                      className="inline-flex items-center gap-1.5 text-[11px] text-white/75 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1"
                    >
                      <Target className="w-3 h-3 text-[#E3CCCD]/50" />
                      {nom}
                    </span>
                  ))}
                  {equipNoms.armure.map((nom) => (
                    <span
                      key={`armure-${nom}`}
                      className="inline-flex items-center gap-1.5 text-[11px] text-white/75 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1"
                    >
                      <Shield className="w-3 h-3 text-[#E3CCCD]/50" />
                      {nom}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          {voies.length === 0 ? (
            <div className="bg-[#29206A]/20 border border-[#E3CCCD]/20 rounded-2xl p-5 text-center text-[13px] text-white/30 italic">
              Aucune voie n'a encore ete definie pour ce profil.
            </div>
          ) : (
            voies.map((voie, i) => (
              <MobileVoieBlock key={voie.id ?? i} voie={voie} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}


function CompactStatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
      <p className="text-[8px] uppercase tracking-widest text-[#E3CCCD]/65 mb-0.5 leading-none">
        {label}
      </p>
      <p className="text-[11px] text-white/90 leading-snug wrap-break-word">
        {value}
      </p>
    </div>
  );
}

function MobileVoieBlock({ voie, defaultOpen }: { voie: FamilleVoie; defaultOpen?: boolean }) {
  return (
    <details
      open={defaultOpen}
      className="bg-[#29206A]/20 border border-[#E3CCCD]/20 rounded-2xl p-4 group"
    >
      <summary className="list-none cursor-pointer select-none flex items-center justify-between gap-3">
        <h4 className="font-serif text-md text-white">{voie.nom}</h4>
        <span className="flex h-6 w-6 items-center justify-center origin-center text-white/95 transition-transform duration-200 group-open:rotate-180">
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </span>
      </summary>

      <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
        {[1, 2, 3, 4, 5].map((rangNum) => {
          const rang = voie.capacites[`rang${rangNum}` as keyof typeof voie.capacites];
          if (!rang?.nom) return null;

          return (
            <div key={rangNum} className="text-[13px]">
              <span className="font-bold text-white">{rangNum}. {rang.nom}</span>
              {rang.type && rang.type !== "passif" && (
                <span className="ml-1.5 text-[9px] uppercase tracking-widest text-[#E3CCCD]/55 border border-[#E3CCCD]/15 rounded-full px-1.5 py-0.5">
                  {rang.type}
                </span>
              )}
              <span className="font-light text-white/80 leading-relaxed">: {rang.description}</span>
            </div>
          );
        })}
      </div>
    </details>
  );
}
