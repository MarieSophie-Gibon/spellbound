/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import {
  User, Pencil, Trash2, X, Save, UploadCloud,
  Sword, Target, Shield,
  Heart, RefreshCw, Star, Sparkles, Zap, Swords, Wand2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MagicCard } from "@/components/ui/MagicCard";
import { PvBadge } from "@/components/ui/PvBadge";
import { VoieBlock } from "@/components/ui/VoieBlock";
import { StatRow } from "@/components/ui/StatRow";
import { CombatStatCard } from "@/components/ui/CombatStatCard";
import { EditNumField } from "@/components/ui/EditNumField";

const STATS_KEYS = ["FOR", "CON", "AGI", "PER", "CHA", "INT", "VOL"] as const;
type StatKey = (typeof STATS_KEYS)[number];

const STAT_LABEL: Record<StatKey, string> = {
  FOR: "Force", CON: "Constitution", AGI: "Agilité",
  PER: "Perception", CHA: "Charisme", INT: "Intelligence", VOL: "Volonté",
};

interface VoieDetail {
  id: string;
  nom: string;
  capacites: Record<string, { nom: string; type?: string; description: string }>;
}

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
  onEditSuccess: () => void;
}

export function PersonnageDetail({ pj, onDeleteClick, onEditSuccess }: PersonnageDetailProps) {
  const [voieDetails, setVoieDetails] = useState<VoieDetail[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Edit fields
  const [editName, setEditName] = useState("");
  const [editSexe, setEditSexe] = useState("Masculin");
  const [editAge, setEditAge] = useState("");
  const [editCaract, setEditCaract] = useState<Record<StatKey, number>>(
    () => Object.fromEntries(STATS_KEYS.map(k => [k, 0])) as Record<StatKey, number>
  );
  const [editPv, setEditPv] = useState(0);
  const [editPvMax, setEditPvMax] = useState(0);
  const [editDrQty, setEditDrQty] = useState(0);
  const [editDrDe, setEditDrDe] = useState("d6");
  const [editPc, setEditPc] = useState(0);
  const [editPm, setEditPm] = useState(0);
  const [editInitiative, setEditInitiative] = useState(0);
  const [editDefense, setEditDefense] = useState(0);
  const [editAttContact, setEditAttContact] = useState(0);
  const [editAttDistance, setEditAttDistance] = useState(0);
  const [editAttMagie, setEditAttMagie] = useState(0);
  const [editNiveau, setEditNiveau] = useState(1);
  const [editIdeal, setEditIdeal] = useState("");
  const [editTravers, setEditTravers] = useState("");
  const [editHistorique, setEditHistorique] = useState("");

  // Fetch voies when pj changes
  useEffect(() => {
    if (!pj?.pathways?.length) { setVoieDetails([]); return; }
    const ids = (pj.pathways as any[]).map(p => p.voie_id).filter(Boolean);
    if (!ids.length) return;
    supabase.from("voies").select("id, nom, capacites").in("id", ids)
      .then(({ data }) => { if (data) setVoieDetails(data as VoieDetail[]); });
  }, [pj?.id, pj?.pathways]);

  // Sync edit state whenever selected character changes
  useEffect(() => {
    if (!pj) return;
    setEditName(pj.name);
    setEditSexe(pj.stats?.sexe ?? "Masculin");
    setEditAge(pj.stats?.age ?? "");
    const c = pj.stats?.caracteristiques ?? {};
    setEditCaract(Object.fromEntries(STATS_KEYS.map(k => [k, c[k] ?? 0])) as Record<StatKey, number>);
    setEditPv(pj.stats?.pv ?? 0);
    setEditPvMax(pj.stats?.pv_max ?? 0);
    setEditDrQty(pj.stats?.dr_qty ?? 0);
    setEditDrDe(pj.stats?.dr_de ?? "d6");
    setEditPc(pj.stats?.pc ?? 0);
    setEditPm(pj.stats?.pm ?? 0);
    setEditInitiative(pj.stats?.initiative ?? 0);
    setEditDefense(pj.stats?.defense ?? 0);
    setEditAttContact(pj.stats?.att_contact ?? 0);
    setEditAttDistance(pj.stats?.att_distance ?? 0);
    setEditAttMagie(pj.stats?.att_magie ?? 0);
    setEditNiveau(pj.stats?.niveau ?? 1);
    setEditIdeal(pj.stats?.ideal ?? "");
    setEditTravers(pj.stats?.travers ?? "");
    setEditHistorique(pj.stats?.historique ?? "");
    setImageFile(null);
    setImagePreview(null);
    setIsEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pj?.id]);

  const handleSave = async () => {
    if (!pj) return;
    setIsSaving(true);
    try {
      let imageUrl = pj.image_url;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `pj/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("compendium").upload(path, imageFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("compendium").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
      const { error } = await supabase.from("pj").update({
        name: editName.trim() || pj.name,
        image_url: imageUrl,
        stats: {
          ...pj.stats,
          sexe: editSexe,
          age: editAge.trim() || null,
          caracteristiques: editCaract,
          pv: editPv, pv_max: editPvMax,
          dr_qty: editDrQty, dr_de: editDrDe,
          pc: editPc, pm: editPm,
          initiative: editInitiative, defense: editDefense,
          att_contact: editAttContact, att_distance: editAttDistance, att_magie: editAttMagie,
          niveau: editNiveau,
          ideal: editIdeal, travers: editTravers, historique: editHistorique,
        },
      }).eq("id", pj.id);
      if (error) throw error;
      setIsEditing(false);
      onEditSuccess();
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!pj) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-10 gap-4">
        <User className="w-12 h-12 text-white/10" />
        <p className="text-white/30 text-sm italic">Sélectionnez un personnage ou créez-en un nouveau.</p>
      </div>
    );
  }

  const caract = pj.stats?.caracteristiques ?? {};
  const displayImageUrl = imagePreview ?? pj.image_url;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 p-3 md:p-5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-[#E3CCCD]/20 pb-3 mb-4 shrink-0">
        <div className="flex items-baseline gap-3 min-w-0 flex-1 mr-3">
          {isEditing ? (
            <>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                autoFocus
                className="font-serif text-3xl text-white tracking-wider bg-transparent border-b border-[#E3CCCD]/40 outline-none focus:border-[#E3CCCD]/80 w-full"
              />
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] uppercase tracking-widest text-white/40">Niv.</span>
                <input
                  type="number" min={1} value={editNiveau}
                  onChange={e => setEditNiveau(parseInt(e.target.value) || 1)}
                  className="w-10 text-center font-mono text-sm text-white bg-white/8 border border-white/15 rounded-lg py-0.5 outline-none focus:border-[#E3CCCD]/50"
                />
              </div>
            </>
          ) : (
            <>
              <h1 className="font-serif text-3xl text-white tracking-wider truncate">{pj.name}</h1>
              <span className="text-[11px] uppercase tracking-widest text-[#E3CCCD]/60 border border-[#E3CCCD]/30 rounded-full px-2.5 py-0.5 shrink-0">
                Niv. {pj.stats?.niveau ?? 1}
              </span>
              {(pj.stats?.sexe || pj.stats?.age) && (
                <span className="text-[11px] uppercase tracking-widest text-[#E3CCCD]/50 border border-[#E3CCCD]/20 rounded-full px-2.5 py-0.5 shrink-0">
                  {pj.stats.sexe}{pj.stats.age ? ` · ${pj.stats.age}` : ""}
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-1 bg-[#1E1941]/80 border border-[#E3CCCD]/20 rounded-full px-2 py-1.5 backdrop-blur-md shadow-xl shrink-0">
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
              <button onClick={handleSave} disabled={isSaving} className="p-1.5 text-emerald-400/80 hover:text-emerald-300 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50">
                <Save className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(true)} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={onDeleteClick} className="p-1.5 text-white/60 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10 rounded-full transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4 flex-1">

        {/* CARD + CARACT COLUMN + INFO PANEL */}
        <div className="flex gap-3 items-start">
          {/* MagicCard avatar */}
          <div className="relative shrink-0">
            <MagicCard
              imageUrl={displayImageUrl}
              title={pj.name}
              badge={<PvBadge pvMax={pj.stats?.pv_max} />}
            />
            {isEditing && (
              <label className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 rounded-lg cursor-pointer opacity-0 hover:opacity-100 transition-opacity z-10">
                <UploadCloud className="w-8 h-8 text-white/80" />
                <span className="text-[12px] text-white/70">Changer l'image</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setImageFile(f);
                  const reader = new FileReader();
                  reader.onload = ev => setImagePreview(ev.target?.result as string);
                  reader.readAsDataURL(f);
                }} />
              </label>
            )}
          </div>

          {/* Caractéristiques — colonne alignée sur la card */}
          <div className="w-20 h-95 shrink-0 rounded-lg border border-[#E3CCCD]/15 flex flex-col justify-evenly py-3 px-2"
            style={{ background: "linear-gradient(to bottom, rgba(55,42,132,0.25) 0%, rgba(18,13,47,0.85) 100%)" }}
          >
            {STATS_KEYS.map(stat => {
              const v = isEditing ? editCaract[stat] : (caract[stat] ?? 0);
              return (
                <div key={stat} className="flex flex-col items-center gap-0.5">
                  <span className="text-[9px] uppercase tracking-widest text-[#E3CCCD]/50">{stat}</span>
                  {isEditing ? (
                    <input
                      type="number" value={v}
                      onChange={e => setEditCaract(prev => ({ ...prev, [stat]: parseInt(e.target.value) || 0 }))}
                      className="w-full text-center font-mono text-xs text-white bg-white/8 border border-white/15 rounded py-0.5 outline-none focus:border-[#E3CCCD]/50"
                    />
                  ) : (
                    <span className={`font-mono text-sm font-bold leading-none ${v > 0 ? "text-white" : v < 0 ? "text-red-400/70" : "text-white/25"}`}>
                      {v > 0 ? `+${v}` : `${v}`}
                    </span>
                  )}
                  <span className="text-[8px] text-white/20 text-center leading-tight">{STAT_LABEL[stat]}</span>
                </div>
              );
            })}
          </div>

          {/* Lore / edit panel */}
          <div className="flex-1 min-h-0 self-stretch max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 bg-[#1E1941]/40 border border-[#E3CCCD]/20 rounded-lg p-4 flex flex-col gap-4 shadow-inner">
            {isEditing ? (
              <>
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-widest text-white/35">Sexe</p>
                  <div className="flex gap-2 flex-wrap">
                    {(["Masculin", "Féminin", "Autre"] as const).map(s => (
                      <button key={s} type="button" onClick={() => setEditSexe(s)}
                        className={`px-3 py-1 rounded-full text-[12px] border transition-all ${editSexe === s ? "border-[#E3CCCD]/60 bg-[#E3CCCD]/15 text-[#E3CCCD]" : "border-white/15 text-white/50 hover:border-white/30"}`}
                      >{s}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-white/35">Âge</p>
                  <input value={editAge} onChange={e => setEditAge(e.target.value)}
                    placeholder="ex : 24 ans"
                    className="w-full bg-transparent border-b border-white/20 focus:border-[#E3CCCD]/60 py-1 text-white text-sm outline-none transition-colors placeholder:text-white/25"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-white/35">Idéal Héroïque</p>
                  <textarea value={editIdeal} onChange={e => setEditIdeal(e.target.value)} rows={2}
                    className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-lg p-2 text-white text-[12px] outline-none resize-none leading-relaxed"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-white/35">Travers</p>
                  <textarea value={editTravers} onChange={e => setEditTravers(e.target.value)} rows={2}
                    className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-lg p-2 text-white text-[12px] outline-none resize-none leading-relaxed"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-white/35">Historique</p>
                  <textarea value={editHistorique} onChange={e => setEditHistorique(e.target.value)} rows={3}
                    className="w-full bg-white/5 border border-white/15 focus:border-[#E3CCCD]/50 rounded-lg p-2 text-white text-[12px] outline-none resize-none leading-relaxed"
                  />
                </div>
              </>
            ) : (
              <div className="flex gap-3 text-[13px] font-light text-white/90 leading-relaxed">
                <div className="shrink-0 mt-0.5"><span className="text-[#E3CCCD]">✧</span></div>
                <div className="space-y-3">
                  {pj.stats?.ideal && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Idéal Héroïque</p>
                      <p>{pj.stats.ideal}</p>
                    </div>
                  )}
                  {pj.stats?.travers && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Travers</p>
                      <p className="text-white/70">{pj.stats.travers}</p>
                    </div>
                  )}
                  {pj.stats?.historique && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Historique</p>
                      <p className="text-white/70 italic whitespace-pre-wrap">{pj.stats.historique}</p>
                    </div>
                  )}
                  {!pj.stats?.ideal && !pj.stats?.travers && !pj.stats?.historique && (
                    <p className="text-white/25 italic text-[12px]">Aucun lore renseigné.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RESSOURCES */}
        <div className="border border-dashed border-white/15 rounded-2xl px-5 py-4">
          {isEditing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <EditNumField label="PV actuels" value={editPv} onChange={setEditPv} />
                <EditNumField label="PV max" value={editPvMax} onChange={setEditPvMax} />
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-widest text-white/35">DR</span>
                  <div className="flex items-center gap-1">
                    <input type="number" value={editDrQty} onChange={e => setEditDrQty(parseInt(e.target.value) || 0)}
                      className="w-12 text-center font-mono text-sm text-white bg-white/8 border border-white/15 rounded-lg py-1.5 outline-none focus:border-[#E3CCCD]/50"
                    />
                    <span className="text-white/30 text-xs font-mono">×</span>
                    <input type="text" value={editDrDe} onChange={e => setEditDrDe(e.target.value)}
                      className="flex-1 text-center font-mono text-sm text-white bg-white/8 border border-white/15 rounded-lg py-1.5 outline-none focus:border-[#E3CCCD]/50"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <EditNumField label="Points de Chance" value={editPc} onChange={setEditPc} />
                <EditNumField label="Points de Mana" value={editPm} onChange={setEditPm} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-[13px] text-white/90">
              <StatRow icon={Heart} label="PV" value={`${pj.stats?.pv ?? "—"} / ${pj.stats?.pv_max ?? "—"}`} />
              <StatRow icon={RefreshCw} label="Dé de Récupération" value={pj.stats?.dr_qty != null ? `${pj.stats.dr_qty} × ${pj.stats.dr_de ?? "d6"}` : "—"} />
              <StatRow icon={Star} label="Points de Chance" value={String(pj.stats?.pc ?? "—")} />
              <StatRow icon={Sparkles} label="Points de Mana" value={String(pj.stats?.pm ?? "—")} />
            </div>
          )}
        </div>

        {/* COMBAT */}
        <div className="border border-dashed border-orange-400/20 rounded-2xl px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-orange-400/40 mb-4">Combat</p>
          {isEditing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <EditNumField label="Initiative" value={editInitiative} onChange={setEditInitiative} />
                <EditNumField label="Défense" value={editDefense} onChange={setEditDefense} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <EditNumField label="Att. Contact" value={editAttContact} onChange={setEditAttContact} />
                <EditNumField label="Att. Distance" value={editAttDistance} onChange={setEditAttDistance} />
                <EditNumField label="Att. Magie" value={editAttMagie} onChange={setEditAttMagie} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Initiative + Défense */}
              <div className="grid grid-cols-2 gap-3">
                <CombatStatCard icon={Zap} label="Initiative" value={String(pj.stats?.initiative ?? "—")} color="text-yellow-400/70" border="border-yellow-400/20" />
                <CombatStatCard icon={Shield} label="Défense" value={String(pj.stats?.defense ?? "—")} color="text-sky-400/70" border="border-sky-400/20" />
              </div>
              {/* Attaques sur une ligne */}
              <div className="grid grid-cols-3 gap-3">
                <CombatStatCard icon={Swords} label="Contact" value={pj.stats?.att_contact != null ? `+${pj.stats.att_contact}` : "—"} color="text-orange-400/70" border="border-orange-400/20" />
                <CombatStatCard icon={Target} label="Distance" value={pj.stats?.att_distance != null ? `+${pj.stats.att_distance}` : "—"} color="text-orange-400/70" border="border-orange-400/20" />
                <CombatStatCard icon={Wand2} label="Magie" value={pj.stats?.att_magie != null ? `+${pj.stats.att_magie}` : "—"} color="text-violet-400/70" border="border-violet-400/20" />
              </div>
            </div>
          )}
        </div>

        {/* VOIES */}
        {pj.pathways?.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 mb-1">Voies</p>
            {(pj.pathways as any[]).map((pathway, i) => {
              const voie = voieDetails.find(v => v.id === pathway.voie_id);
              return (
                <VoieBlock
                  key={i}
                  voieNom={voie?.nom ?? `Voie ${i + 1}`}
                  capacites={voie?.capacites}
                  rangsAcquis={pathway.rangs_acquis ?? []}
                  defaultOpen={i === 0}
                />
              );
            })}
          </div>
        )}

        {/* ÉQUIPEMENT */}
        {(pj.inventory?.selected_equipements as any[] | undefined)?.length ? (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Équipement</p>
            <div className="border border-dashed border-white/15 rounded-2xl px-5 py-4">
              <div className="flex flex-wrap gap-2">
                {(pj.inventory.selected_equipements as any[]).map((eq, i) => {
                  const SourceIcon = eq.source === "arme_contact" ? Sword : eq.source === "arme_distance" ? Target : Shield;
                  return (
                    <span key={i} className="inline-flex items-center gap-1.5 text-[11px] text-white/70 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1">
                      <SourceIcon className="w-3 h-3 text-[#E3CCCD]/50" />
                      {eq.nom}
                      {eq.details && <span className="text-white/30"> · {eq.details}</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {/* ÉQUIPEMENT DE BASE (legacy) */}
        {pj.inventory?.equipement_base && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Équipement de base</p>
            <p className="text-[13px] text-white/60 leading-relaxed whitespace-pre-line px-1">{pj.inventory.equipement_base}</p>
          </div>
        )}

      </div>
    </div>
  );
}


