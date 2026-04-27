/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { UserPlus, User, Trash2, Loader2 } from "lucide-react";
import { BookLayout } from "@/components/layout/BookLayout";
import { supabase } from "@/lib/supabase";
import { PJWizard } from "@/components/compendium/PJWizard";
import { DeleteConfirmModal } from "@/components/compendium/DeleteConfirmModal";

interface PersonnagesProps {
  campaignId: string;
  onBack: () => void;
}

interface PJ {
  id: string;
  name: string;
  image_url: string | null;
  stats: any;
  pathways: any;
  inventory: any;
}

export function Personnages({ campaignId, onBack }: PersonnagesProps) {
  const [pjs, setPjs] = useState<PJ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPjs = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("pj")
      .select("id, name, image_url, stats, pathways, inventory")
      .eq("campaign_id", campaignId)
      .order("name");
    if (data) setPjs(data);
    setIsLoading(false);
  }, [campaignId]);

  useEffect(() => {
    fetchPjs();
  }, [fetchPjs]);

  const selectedPJ = pjs.find(p => p.id === selectedId) ?? null;

  const handleDelete = async () => {
    if (!selectedId) return;
    setIsDeleting(true);
    await supabase.from("pj").delete().eq("id", selectedId);
    setSelectedId(null);
    setShowDeleteConfirm(false);
    setIsDeleting(false);
    fetchPjs();
  };

  // ── Sidebar ────────────────────────────────
  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-4 border-b border-[#E3CCCD]/15">
        <h3 className="font-serif text-lg text-white/90 tracking-wide">Personnages</h3>
        <p className="text-[11px] text-white/40 mt-0.5">Joueurs de la campagne</p>
      </div>

      <div className="flex-1 overflow-y-auto py-3 scrollbar-thin scrollbar-thumb-white/10">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-white/30" />
          </div>
        ) : pjs.length === 0 ? (
          <p className="text-[12px] text-white/25 italic text-center py-10 px-4">
            Aucun personnage. Créez-en un !
          </p>
        ) : (
          pjs.map(pj => (
            <button
              key={pj.id}
              onClick={() => setSelectedId(pj.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/5 ${selectedId === pj.id ? "bg-[#E3CCCD]/10 border-r-2 border-[#E3CCCD]/50" : ""}`}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/15 bg-white/5 flex items-center justify-center">
                {pj.image_url
                  ? <img src={pj.image_url} alt={pj.name} className="w-full h-full object-cover" />
                  : <User className="w-4 h-4 text-white/30" />}
              </div>
              <div className="min-w-0">
                <p className={`text-[13px] font-medium truncate ${selectedId === pj.id ? "text-[#E3CCCD]" : "text-white/70"}`}>
                  {pj.name}
                </p>
                {pj.stats?.sexe && (
                  <p className="text-[11px] text-white/35 truncate">{pj.stats.sexe}{pj.stats.age ? ` · ${pj.stats.age}` : ""}</p>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      <div className="p-4 border-t border-[#E3CCCD]/15">
        <button
          onClick={() => setShowWizard(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#E3CCCD]/10 border border-[#E3CCCD]/25 text-[#E3CCCD]/80 hover:bg-[#E3CCCD]/18 hover:text-[#E3CCCD] transition-all text-[12px]"
        >
          <UserPlus className="w-4 h-4" />
          Nouveau personnage
        </button>
      </div>
    </div>
  );

  // ── Fiche PJ ───────────────────────────────
  const renderStats = (stats: any) => {
    const STATS = ["FOR", "CON", "AGI", "PER", "CHA", "INT", "VOL"] as const;
    const caract = stats?.caracteristiques ?? {};
    return (
      <div className="flex gap-2 flex-wrap">
        {STATS.map(s => {
          const v = caract[s] ?? 0;
          return (
            <div key={s} className="flex flex-col items-center px-3 py-2 rounded-xl bg-white/5 border border-white/10 min-w-14">
              <span className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{s}</span>
              <span className="font-mono text-white font-semibold text-sm">{v > 0 ? `+${v}` : `${v}`}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDerived = (stats: any) => {
    const rows = [
      { label: "PV", value: `${stats?.pv ?? "—"} / ${stats?.pv_max ?? "—"}` },
      { label: "DR", value: stats?.dr_qty != null ? `${stats.dr_qty}${stats.dr_de ?? "d6"}` : "—" },
      { label: "PC", value: stats?.pc ?? "—" },
      { label: "PM", value: stats?.pm ?? "—" },
      { label: "Initiative", value: stats?.initiative ?? "—" },
      { label: "Défense", value: stats?.defense ?? "—" },
      { label: "Contact", value: stats?.att_contact != null ? `+${stats.att_contact}` : "—" },
      { label: "Distance", value: stats?.att_distance != null ? `+${stats.att_distance}` : "—" },
      { label: "Magie", value: stats?.att_magie != null ? `+${stats.att_magie}` : "—" },
    ];
    return (
      <div className="grid grid-cols-3 gap-2">
        {rows.map(r => (
          <div key={r.label} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-widest text-white/35 mb-0.5">{r.label}</span>
            <span className="text-white/80 text-sm font-mono">{String(r.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  const content = selectedPJ ? (
    <div className="h-full overflow-y-auto px-8 py-8 space-y-8">
      {/* En-tête */}
      <div className="flex items-start gap-6">
        <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/15 bg-white/5 shrink-0 flex items-center justify-center">
          {selectedPJ.image_url
            ? <img src={selectedPJ.image_url} alt={selectedPJ.name} className="w-full h-full object-cover" />
            : <User className="w-10 h-10 text-white/20" />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-2xl text-white tracking-wide">{selectedPJ.name}</h2>
          {selectedPJ.stats?.sexe && (
            <p className="text-white/50 text-sm mt-1">{selectedPJ.stats.sexe}{selectedPJ.stats.age ? ` · ${selectedPJ.stats.age}` : ""}</p>
          )}
        </div>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-2 text-white/20 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Caractéristiques */}
      <div className="space-y-3">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50">Caractéristiques</h3>
        {renderStats(selectedPJ.stats)}
      </div>

      {/* Dérivées */}
      <div className="space-y-3">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50">Statistiques Dérivées</h3>
        {renderDerived(selectedPJ.stats)}
      </div>

      {/* Voies */}
      {selectedPJ.pathways?.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50">Voies</h3>
          <div className="space-y-2">
            {selectedPJ.pathways.map((p: any, i: number) => (
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
      {selectedPJ.inventory?.equipement_base && (
        <div className="space-y-3">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50">Équipement de base</h3>
          <p className="text-[13px] text-white/60 leading-relaxed whitespace-pre-line">{selectedPJ.inventory.equipement_base}</p>
        </div>
      )}

      {/* Lore */}
      {(selectedPJ.stats?.ideal || selectedPJ.stats?.travers || selectedPJ.stats?.historique) && (
        <div className="space-y-4">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50">Lore</h3>
          {selectedPJ.stats.ideal && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Idéal Héroïque</p>
              <p className="text-[13px] text-white/60 leading-relaxed">{selectedPJ.stats.ideal}</p>
            </div>
          )}
          {selectedPJ.stats.travers && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Travers</p>
              <p className="text-[13px] text-white/60 leading-relaxed">{selectedPJ.stats.travers}</p>
            </div>
          )}
          {selectedPJ.stats.historique && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Historique</p>
              <p className="text-[13px] text-white/60 leading-relaxed">{selectedPJ.stats.historique}</p>
            </div>
          )}
        </div>
      )}
    </div>
  ) : (
    <div className="h-full flex flex-col items-center justify-center text-center px-10 gap-4">
      <User className="w-12 h-12 text-white/10" />
      <p className="text-white/30 text-sm italic">Sélectionnez un personnage ou créez-en un nouveau.</p>
      <button
        onClick={() => setShowWizard(true)}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E3CCCD]/10 border border-[#E3CCCD]/25 text-[#E3CCCD]/70 hover:bg-[#E3CCCD]/18 hover:text-[#E3CCCD] transition-all text-[13px] mt-2"
      >
        <UserPlus className="w-4 h-4" />
        Créer un personnage
      </button>
    </div>
  );

  return (
    <>
      <BookLayout spineTitle="Personnages" sidebar={sidebar}>
        {content}
      </BookLayout>

      {showWizard && (
        <PJWizard
          campaignId={campaignId}
          onClose={() => setShowWizard(false)}
          onSuccess={() => { fetchPjs(); setShowWizard(false); }}
        />
      )}

      {showDeleteConfirm && selectedPJ && (
        <DeleteConfirmModal
          name={selectedPJ.name}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}
