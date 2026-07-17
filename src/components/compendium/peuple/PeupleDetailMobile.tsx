import { Pencil, Trash2, Image as ImageIcon, ChevronDown } from "lucide-react";
import type { Peuple, Voie } from "@/types/compendium";

interface PeupleDetailMobileProps {
  peuple: Peuple;
  voie: Voie | null;
  readOnly?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function PeupleDetailMobile({
  peuple,
  voie,
  readOnly,
  onEdit,
  onDelete,
}: PeupleDetailMobileProps) {
  const hasActions = !readOnly;
  const caracteristiques = peuple.data?.caracteristiques?.trim() ?? "";
  const traitsBase = peuple.data?.traits?.trim() ?? "";
  const quickStats = [
    { label: "Age de depart", value: peuple.data?.age },
    { label: "Esperance de vie", value: peuple.data?.esperance },
    { label: "Taille", value: peuple.data?.taille },
    { label: "Poids", value: peuple.data?.poids },
  ].filter((item) => !!item.value && item.value.trim().length > 0);

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
          <PeupleCard peuple={peuple} />

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

        {!!caracteristiques && (
          <div className="border border-dashed border-[#E3CCCD]/25 rounded-2xl p-3 text-[12px] text-white/90">
            <p className="text-[9px] uppercase tracking-widest text-[#E3CCCD]/65 mb-1">Caracteristiques</p>
            <p className="font-light text-white/85 leading-relaxed whitespace-pre-wrap">{caracteristiques}</p>
          </div>
        )}

        {!!traitsBase && (
          <div className="border border-dashed border-[#E3CCCD]/25 rounded-2xl p-5 text-[13px] text-white/90">
            <div className="space-y-2">
              <p className="text-[9px] uppercase tracking-widest text-[#E3CCCD]/65 mb-1">
                Traits de base
              </p>
              <p className="font-light text-white/85 leading-relaxed whitespace-pre-wrap">
                {traitsBase}
              </p>
            </div>
          </div>
        )}

        <details
          className="w-full bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-2xl p-3 text-[13px] font-light text-white/90 leading-relaxed shadow-inner group"
        >
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
                {peuple.description || "Aucune description renseignee."}
              </div>
              {peuple.lore && (
                <div className="whitespace-pre-wrap mt-4 pt-4 border-t border-white/10 text-white/70 italic">
                  {peuple.lore}
                </div>
              )}
            </div>
          </div>
        </details>

        <div className="bg-[#29206A]/20 border border-[#E3CCCD]/20 rounded-2xl p-6 shadow-inner">
          <h3 className="font-serif text-xl text-white mb-5">
            {voie ? voie.nom : "Voie raciale non definie"}
          </h3>
          {voie ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((rangNum) => {
                const rang =
                  voie.capacites[
                    `rang${rangNum}` as keyof typeof voie.capacites
                  ];
                return (
                  <div key={rangNum} className="text-[13px]">
                    <span className="font-bold text-white">
                      {rangNum}. {rang.nom} :{" "}
                    </span>
                    <span className="font-light text-white/80 leading-relaxed">
                      {rang.description}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm font-light text-white/40 italic">
              Aucune voie n'a ete trouvee pour ce peuple dans la base de
              donnees.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PeupleCard({ peuple }: { peuple: Peuple }) {
  return (
    <div className="w-36 shrink-0 self-start aspect-290/437 rounded-2xl relative border border-white/10 overflow-hidden">
      {peuple.image_url ? (
        <img
          src={peuple.image_url}
          alt={peuple.nom}
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <ImageIcon className="w-10 h-10 text-white/10" />
        </div>
      )}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(102,102,102,0) 0%, rgba(55,42,132,0.72) 47%, rgba(36,27,89,0.79) 63%, rgba(18,13,47,1) 100%)",
        }}
      />
      <img
        src="/card-overlay.svg"
        alt=""
        className="absolute inset-0 w-full h-full z-20 pointer-events-none opacity-80"
      />
      <div className="absolute bottom-5 inset-x-0 z-30 pb-4 text-center">
        <h3 className="font-serif text-base text-white tracking-widest">
          {peuple.nom}
        </h3>
      </div>
    </div>
  );
}

function CompactStatRow({ label, value }: { label: string; value?: string }) {
  if (!value || value.trim().length === 0) return null;

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
