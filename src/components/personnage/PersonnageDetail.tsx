/* eslint-disable @typescript-eslint/no-explicit-any */
import { User, Trash2 } from "lucide-react";

const STATS_KEYS = ["FOR", "CON", "AGI", "PER", "CHA", "INT", "VOL"] as const;

interface PersonnageDetailProps {
  pj: {
    id: string;
    name: string;
    image_url: string | null;
    stats: any;
    pathways: any;
    inventory: any;
  } | null;
  onDeleteClick: () => void;
  onCreateClick: () => void;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center">
      <span className="text-[10px] uppercase tracking-widest text-white/35 mb-0.5">{label}</span>
      <span className="text-white/80 text-sm font-mono">{value}</span>
    </div>
  );
}

export function PersonnageDetail({ pj, onDeleteClick }: PersonnageDetailProps) {
  if (!pj) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-10 gap-4">
        <User className="w-12 h-12 text-white/10" />
        <p className="text-white/30 text-sm italic">Sélectionnez un personnage ou créez-en un nouveau.</p>
      </div>
    );
  }

  const caract = pj.stats?.caracteristiques ?? {};
  const derivedRows = [
    { label: "PV",        value: `${pj.stats?.pv ?? "—"} / ${pj.stats?.pv_max ?? "—"}` },
    { label: "DR",        value: pj.stats?.dr_qty != null ? `${pj.stats.dr_qty}${pj.stats.dr_de ?? "d6"}` : "—" },
    { label: "PC",        value: String(pj.stats?.pc ?? "—") },
    { label: "PM",        value: String(pj.stats?.pm ?? "—") },
    { label: "Initiative",value: String(pj.stats?.initiative ?? "—") },
    { label: "Défense",   value: String(pj.stats?.defense ?? "—") },
    { label: "Contact",   value: pj.stats?.att_contact  != null ? `+${pj.stats.att_contact}`  : "—" },
    { label: "Distance",  value: pj.stats?.att_distance != null ? `+${pj.stats.att_distance}` : "—" },
    { label: "Magie",     value: pj.stats?.att_magie    != null ? `+${pj.stats.att_magie}`    : "—" },
  ];

  return (
    <div className="h-full overflow-y-auto px-8 py-8 space-y-8">
      {/* En-tête */}
      <div className="flex items-start gap-6">
        <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/15 bg-white/5 shrink-0 flex items-center justify-center">
          {pj.image_url
            ? <img src={pj.image_url} alt={pj.name} className="w-full h-full object-cover" />
            : <User className="w-10 h-10 text-white/20" />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-2xl text-white tracking-wide">{pj.name}</h2>
          {pj.stats?.sexe && (
            <p className="text-white/50 text-sm mt-1">
              {pj.stats.sexe}{pj.stats.age ? ` · ${pj.stats.age}` : ""}
            </p>
          )}
        </div>
        <button
          onClick={onDeleteClick}
          className="p-2 text-white/20 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Caractéristiques */}
      <div className="space-y-3">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50">Caractéristiques</h3>
        <div className="flex gap-2 flex-wrap">
          {STATS_KEYS.map(s => {
            const v = caract[s] ?? 0;
            return (
              <div key={s} className="flex flex-col items-center px-3 py-2 rounded-xl bg-white/5 border border-white/10 min-w-14">
                <span className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{s}</span>
                <span className="font-mono text-white font-semibold text-sm">{v > 0 ? `+${v}` : `${v}`}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dérivées */}
      <div className="space-y-3">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50">Statistiques Dérivées</h3>
        <div className="grid grid-cols-3 gap-2">
          {derivedRows.map(r => <StatCard key={r.label} label={r.label} value={r.value} />)}
        </div>
      </div>

      {/* Voies */}
      {pj.pathways?.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50">Voies</h3>
          <div className="space-y-2">
            {pj.pathways.map((p: any, i: number) => (
              <div key={i} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[12px] text-white/60">
                  <span className="text-white/40 font-mono text-[11px] mr-2">Voie {i + 1}</span>
                  Rangs acquis : {(p.rangs_acquis ?? []).join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Équipement de base */}
      {pj.inventory?.equipement_base && (
        <div className="space-y-3">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50">Équipement de base</h3>
          <p className="text-[13px] text-white/60 leading-relaxed whitespace-pre-line">{pj.inventory.equipement_base}</p>
        </div>
      )}

      {/* Lore */}
      {(pj.stats?.ideal || pj.stats?.travers || pj.stats?.historique) && (
        <div className="space-y-4">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50">Lore</h3>
          {pj.stats.ideal && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Idéal Héroïque</p>
              <p className="text-[13px] text-white/60 leading-relaxed">{pj.stats.ideal}</p>
            </div>
          )}
          {pj.stats.travers && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Travers</p>
              <p className="text-[13px] text-white/60 leading-relaxed">{pj.stats.travers}</p>
            </div>
          )}
          {pj.stats.historique && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Historique</p>
              <p className="text-[13px] text-white/60 leading-relaxed">{pj.stats.historique}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
