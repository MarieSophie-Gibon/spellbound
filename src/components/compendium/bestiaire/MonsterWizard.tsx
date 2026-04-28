/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
// import { createPortal } from "react-dom";
import { ModalLayout } from "@/components/ui/ModalLayout";
import { X, ArrowRight, ArrowLeft, Save, Plus, Trash2, ChevronDown, Image as ImageIcon, UploadCloud } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { MonstreStats, MonstreCombat, MonstreAttaque, MonstreCapacite } from "@/types/compendium";

// --- Types ---

interface MonsterWizardProps {
  onClose: () => void;
  onSuccess: () => void;
  campaignId?: string;
  initialData?: InitialMonstreData;
}

export interface InitialMonstreData {
  id: string;
  nom: string;
  nc: string;
  type_creature: string;
  taille: string;
  description: string | null;
  stats: MonstreStats;
  combat: MonstreCombat;
  attaques: MonstreAttaque[];
  capacites: MonstreCapacite[];
  image_url?: string;
  data: Record<string, unknown>;
  campaign_id?: string | null;
}

// --- Constants ---

const TYPES_CREATURE = ["Mort-Vivant", "Animal","Animal Fantastique", "Humanoïde", "Fiélon", "Céleste", "Élémentaire", "Artificiel", "Aberration"];
const TAILLES = ["Infime", "Minuscule", "Petite", "Moyenne", "Grande", "Très Grande", "Gigantesque"];
const NC_PRESETS = ["0", "1/8", "1/4", "1/2", "1", "2", "3", "4", "5", "6", "8", "10", "12", "15", "20"];
const STAT_KEYS = ["for", "agi", "con", "int", "per", "vol", "cha"] as const;
type StatKey = typeof STAT_KEYS[number];
const STAT_LABELS: Record<StatKey, string> = { for: "FOR", agi: "AGI", con: "CON", int: "INT", per: "PER", vol: "VOL", cha: "CHA" };

const DEFAULT_STATS: MonstreStats = {
  agi: { mod: 0, sup: false }, cha: { mod: 0, sup: false }, con: { mod: 0, sup: false },
  for: { mod: 0, sup: false }, int: { mod: 0, sup: false }, per: { mod: 0, sup: false }, vol: { mod: 0, sup: false },
};
const DEFAULT_COMBAT: MonstreCombat = { pv: 10, rd: 0, pv_max: 10, defense: 10, initiative: 10, attaque_magique: null };

function makeEmptyAttaque(): MonstreAttaque {
  return { attaque_base: "", dm: "" };
}
function makeEmptyCapacite(): MonstreCapacite {
  return { nom: "", type: "passif", description: "" };
}

// --- Composant ---

export function MonsterWizard({ onClose, onSuccess, campaignId, initialData }: MonsterWizardProps) {
  const isEditing = !!initialData;
  const [isPrivate, setIsPrivate] = useState(true);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 – Identité
  const [nom, setNom] = useState(initialData?.nom ?? "");
  const [nc, setNc] = useState(initialData?.nc ?? "1");
  const [typeCreature, setTypeCreature] = useState(initialData?.type_creature ?? "Vivant");
  const [taille, setTaille] = useState(initialData?.taille ?? "Moyenne");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url ?? null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Step 2 – Stats & Combat
  const [stats, setStats] = useState<MonstreStats>(
    initialData?.stats ? structuredClone(initialData.stats) : structuredClone(DEFAULT_STATS)
  );
  const [combat, setCombat] = useState<MonstreCombat>(
    initialData?.combat ? { ...initialData.combat } : { ...DEFAULT_COMBAT }
  );

  const updateStat = (key: StatKey, field: "mod" | "sup", value: number | boolean) => {
    setStats(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  // Step 3 – Attaques
  const [attaques, setAttaques] = useState<MonstreAttaque[]>(
    initialData?.attaques?.length ? structuredClone(initialData.attaques) : []
  );

  // Step 4 – Capacités
  const [capacites, setCapacites] = useState<MonstreCapacite[]>(
    initialData?.capacites?.length ? structuredClone(initialData.capacites) : []
  );
  const [expandedCapacite, setExpandedCapacite] = useState<number>(-1);

  // --- Submit ---
  const handleSubmit = async () => {
    if (!nom.trim()) return alert("Le nom est obligatoire.");
    if (!nc.trim()) return alert("Le NC est obligatoire.");
    setIsSubmitting(true);
    try {
      let uploadedImageUrl: string | undefined = initialData?.image_url;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `bestiaire/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("compendium").upload(path, imageFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("compendium").getPublicUrl(path);
        uploadedImageUrl = urlData.publicUrl;
      }

      const publicMode = campaignId && !isPrivate;
      const payload = {
        nom: nom.trim(),
        nc: nc.trim(),
        type_creature: typeCreature,
        taille,
        description: description.trim() || null,
        stats,
        combat: { ...combat, pv: combat.pv_max },
        attaques,
        capacites,
        image_url: uploadedImageUrl ?? null,
        campaign_id: publicMode ? null : (campaignId || null),
        is_custom: !!(campaignId && isPrivate),
      };

      if (isEditing && initialData) {
        const { error } = await supabase.from("bestiaire").update(payload).eq("id", initialData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bestiaire").insert(payload);
        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      alert("Erreur lors de la sauvegarde : " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const STEPS = [
    { num: 1, label: "Identité" },
    { num: 2, label: "Stats" },
    { num: 3, label: "Attaques" },
    { num: 4, label: "Capacités" },
  ];

  return (
    <ModalLayout>
      {/* HEADER */}
      <div className="relative z-10 shrink-0 px-8 pt-7 pb-6 border-b border-white/8 bg-black/10">
          <div className="flex items-center justify-between mb-7">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#E3CCCD]/50 mb-1">
                {campaignId ? "Compendium Custom" : "Compendium Global"}
              </p>
              <h2 className="font-serif text-2xl text-white tracking-wide">
                {isEditing ? "Modifier la Créature" : "Nouvelle Créature"}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 text-white/30 hover:text-white/70 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* PRIVÉ/PUBLIC (création ou édition campagne uniquement) */}
          {campaignId && (!isEditing || (isEditing && initialData?.campaign_id === campaignId)) && (
            <div className="mb-4 flex items-center gap-2">
              <input
                id="monster-private"
                type="checkbox"
                checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)}
                className="accent-indigo-500 w-4 h-4 rounded"
              />
              <label htmlFor="monster-private" className="text-xs text-white/70 select-none cursor-pointer">
                Privé à cette campagne
              </label>
            </div>
          )}
          {/* Steps */}
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-center">
                <button
                  onClick={() => { if (s.num < step || (s.num === step + 1 && nom && nc)) setStep(s.num); }}
                  className={`flex items-center gap-2.5 transition-colors ${step === s.num ? "text-[#E3CCCD]" : step > s.num ? "text-white/60 hover:text-white/80" : "text-white/20 cursor-default"}`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all ${step === s.num ? "border-[#E3CCCD] bg-[#E3CCCD]/15 text-[#E3CCCD]" : step > s.num ? "border-white/30 bg-white/10 text-white/50" : "border-white/15 text-white/20"}`}>
                    {s.num}
                  </span>
                  <span className="text-[11px] uppercase tracking-widest font-medium hidden sm:block">{s.label}</span>
                </button>
                {i < 3 && <div className={`w-8 h-px mx-3 transition-colors ${step > s.num ? "bg-white/30" : "bg-white/10"}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div className="relative z-10 flex-1 overflow-y-auto px-8 py-7 scrollbar-thin scrollbar-thumb-white/8">

          {/* STEP 1 – Identité */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Nom *</label>
                <input
                  type="text" value={nom} onChange={(e) => setNom(e.target.value)} autoFocus
                  placeholder="ex: Loup-garou, Dragon rouge, Gobelin..."
                  className="w-full bg-transparent border-b border-white/30 focus:border-[#E3CCCD]/80 py-2.5 text-white text-lg outline-none transition-colors placeholder:text-white/35"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Niveau de Challenge (NC) *</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {NC_PRESETS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setNc(n)}
                      className={`px-3 py-1.5 rounded-lg border text-[12px] font-mono transition-all ${nc === n ? "border-[#E3CCCD]/60 bg-[#E3CCCD]/10 text-[#E3CCCD]" : "border-white/20 text-white/50 hover:text-white/80 hover:border-white/40"}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <input
                  type="text" value={nc} onChange={(e) => setNc(e.target.value)}
                  placeholder="Ou saisissez un NC personnalisé..."
                  className="w-full bg-transparent border-b border-white/20 focus:border-white/40 py-2 text-white/80 text-sm outline-none transition-colors placeholder:text-white/25 mt-2"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Type de Créature</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {TYPES_CREATURE.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTypeCreature(t)}
                      className={`px-3.5 py-1.5 rounded-full border text-[12px] transition-all ${typeCreature === t ? "border-[#E3CCCD]/60 bg-[#E3CCCD]/10 text-[#E3CCCD]" : "border-white/20 text-white/50 hover:text-white/80 hover:border-white/40"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Taille</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {TAILLES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTaille(t)}
                      className={`px-3.5 py-1.5 rounded-full border text-[12px] transition-all ${taille === t ? "border-[#E3CCCD]/60 bg-[#E3CCCD]/10 text-[#E3CCCD]" : "border-white/20 text-white/50 hover:text-white/80 hover:border-white/40"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Description</label>
                <textarea
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Apparence, comportement, lore..."
                  className="w-full h-32 bg-white/5 border border-white/20 focus:border-white/35 rounded-xl p-4 text-white text-sm outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-white/40">Illustration</label>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                    {imagePreview
                      ? <img src={imagePreview} alt="Aperçu" className="w-full h-full object-cover" />
                      : <ImageIcon className="w-5 h-5 text-white/20" />
                    }
                  </div>
                  <label className="cursor-pointer flex items-center gap-2 px-3.5 py-2 border border-white/25 hover:border-white/50 rounded-lg text-white/70 hover:text-white text-[12px] transition-colors">
                    <UploadCloud className="w-3.5 h-3.5" />
                    Parcourir
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                  {imageFile && (
                    <button onClick={() => { setImageFile(null); setImagePreview(null); }} className="text-[11px] text-white/50 hover:text-red-400 transition-colors">
                      Retirer
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 – Stats & Combat */}
          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 fade-in">
              {/* Caractéristiques */}
              <div>
                <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/60 mb-1">Caractéristiques</h3>
                <p className="text-[11px] text-white/40 italic mb-4">Le modificateur est appliqué directement aux jets. "SUP" active la supériorité.</p>
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
                  {STAT_KEYS.map((key) => (
                    <div key={key} className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col items-center gap-2">
                      <span className="text-[10px] uppercase tracking-[0.12em] text-white/50 font-semibold">{STAT_LABELS[key]}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateStat(key, "mod", stats[key].mod - 1)}
                          className="w-5 h-5 rounded border border-white/20 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center text-sm leading-none transition-colors"
                        >−</button>
                        <span className={`text-base font-semibold w-7 text-center ${stats[key].mod > 0 ? "text-emerald-400" : stats[key].mod < 0 ? "text-red-400" : "text-white"}`}>
                          {stats[key].mod > 0 ? `+${stats[key].mod}` : stats[key].mod}
                        </span>
                        <button
                          onClick={() => updateStat(key, "mod", stats[key].mod + 1)}
                          className="w-5 h-5 rounded border border-white/20 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center text-sm leading-none transition-colors"
                        >+</button>
                      </div>
                      <button
                        onClick={() => updateStat(key, "sup", !stats[key].sup)}
                        className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider transition-all ${stats[key].sup ? "border-amber-400/50 bg-amber-400/15 text-amber-400" : "border-white/15 text-white/25 hover:text-white/50 hover:border-white/30"}`}
                      >
                        SUP
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats de Combat */}
              <div>
                <h3 className="text-[10px] uppercase tracking-[0.15em] text-white/60 mb-4">Stats de Combat</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  {/* PV Max */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Points de Vie Max</label>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setCombat(p => { const v = Math.max(1, p.pv_max - 1); return { ...p, pv_max: v, pv: v }; })} className="w-7 h-7 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center text-lg leading-none transition-colors">−</button>
                      <span className="text-white text-xl font-semibold w-10 text-center">{combat.pv_max}</span>
                      <button onClick={() => setCombat(p => { const v = p.pv_max + 1; return { ...p, pv_max: v, pv: v }; })} className="w-7 h-7 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center text-lg leading-none transition-colors">+</button>
                    </div>
                  </div>

                  {/* Défense */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Défense</label>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setCombat(p => ({ ...p, defense: Math.max(1, p.defense - 1) }))} className="w-7 h-7 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center text-lg leading-none transition-colors">−</button>
                      <span className="text-white text-xl font-semibold w-10 text-center">{combat.defense}</span>
                      <button onClick={() => setCombat(p => ({ ...p, defense: p.defense + 1 }))} className="w-7 h-7 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center text-lg leading-none transition-colors">+</button>
                    </div>
                  </div>

                  {/* Initiative */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Initiative</label>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setCombat(p => ({ ...p, initiative: Math.max(0, p.initiative - 1) }))} className="w-7 h-7 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center text-lg leading-none transition-colors">−</button>
                      <span className="text-white text-xl font-semibold w-10 text-center">{combat.initiative}</span>
                      <button onClick={() => setCombat(p => ({ ...p, initiative: p.initiative + 1 }))} className="w-7 h-7 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center text-lg leading-none transition-colors">+</button>
                    </div>
                  </div>

                  {/* RD */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Réduction de Dégâts (RD)</label>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setCombat(p => ({ ...p, rd: Math.max(0, p.rd - 1) }))} className="w-7 h-7 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center text-lg leading-none transition-colors">−</button>
                      <span className="text-white text-xl font-semibold w-10 text-center">{combat.rd}</span>
                      <button onClick={() => setCombat(p => ({ ...p, rd: p.rd + 1 }))} className="w-7 h-7 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center text-lg leading-none transition-colors">+</button>
                    </div>
                  </div>

                  {/* Attaque Magique */}
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] uppercase tracking-[0.15em] text-white/60">Attaque Magique</label>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setCombat(p => ({ ...p, attaque_magique: p.attaque_magique !== null ? p.attaque_magique - 1 : null }))} disabled={combat.attaque_magique === null} className="w-7 h-7 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center text-lg leading-none transition-colors disabled:opacity-30">−</button>
                        <span className={`text-xl font-semibold w-10 text-center ${combat.attaque_magique === null ? "text-white/25" : combat.attaque_magique >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {combat.attaque_magique === null ? "—" : combat.attaque_magique >= 0 ? `+${combat.attaque_magique}` : combat.attaque_magique}
                        </span>
                        <button onClick={() => setCombat(p => ({ ...p, attaque_magique: p.attaque_magique !== null ? p.attaque_magique + 1 : null }))} disabled={combat.attaque_magique === null} className="w-7 h-7 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center text-lg leading-none transition-colors disabled:opacity-30">+</button>
                      </div>
                      <button
                        onClick={() => setCombat(p => ({ ...p, attaque_magique: p.attaque_magique === null ? 0 : null }))}
                        className={`px-3 py-1.5 rounded-lg border text-[12px] transition-all ${combat.attaque_magique !== null ? "border-[#E3CCCD]/50 bg-[#E3CCCD]/10 text-[#E3CCCD]" : "border-white/20 text-white/50 hover:border-white/40 hover:text-white/80"}`}
                      >
                        {combat.attaque_magique !== null ? "Activée" : "Activer"}
                      </button>
                    </div>
                    <p className="text-[11px] text-white/40 italic">Bonus aux jets d'attaque magique, si applicable.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 – Attaques */}
          {step === 3 && (
            <div className="space-y-3 animate-in slide-in-from-right-4 fade-in">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-white/50 italic">
                  {attaques.length === 0 ? "Aucune attaque — optionnel." : `${attaques.length} attaque${attaques.length > 1 ? "s" : ""}.`}
                </p>
                <button
                  onClick={() => { setAttaques(p => [...p, makeEmptyAttaque()]); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-white/20 hover:border-[#E3CCCD]/40 text-white/60 hover:text-white text-[12px] rounded-lg transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter une attaque
                </button>
              </div>

              {attaques.length === 0 && (
                <div className="text-center py-12 text-white/25 text-[13px] border border-white/10 rounded-xl border-dashed">
                  Pas d'attaque pour cette créature
                </div>
              )}

              {attaques.map((att, i) => (
                <div key={i} className="border border-white/10 rounded-xl bg-white/3 px-4 py-4 flex items-center gap-6">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.15em] text-white/50">Attaque de base</label>
                    <input
                      type="text" value={att.attaque_base}
                      onChange={(e) => setAttaques(p => p.map((a, j) => j === i ? { ...a, attaque_base: e.target.value } : a))}
                      placeholder="ex: Hâche +5, Griffes +3..."
                      className="w-full bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white text-sm outline-none transition-colors placeholder:text-white/30"
                    />
                  </div>
                  <div className="w-32 space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.15em] text-white/50">DM</label>
                    <input
                      type="text" value={att.dm}
                      onChange={(e) => setAttaques(p => p.map((a, j) => j === i ? { ...a, dm: e.target.value } : a))}
                      placeholder="1D8+3"
                      className="w-full bg-transparent border-b border-white/25 focus:border-[#E3CCCD]/80 py-1.5 text-white font-mono text-sm outline-none transition-colors placeholder:text-white/30"
                    />
                  </div>
                  <button onClick={() => setAttaques(p => p.filter((_, j) => j !== i))} className="p-1.5 text-white/30 hover:text-red-400 transition-colors shrink-0 mt-4">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* STEP 4 – Capacités */}
          {step === 4 && (
            <div className="space-y-3 animate-in slide-in-from-right-4 fade-in">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-white/50 italic">
                  {capacites.length === 0 ? "Aucune capacité — optionnel." : `${capacites.length} capacité${capacites.length > 1 ? "s" : ""}.`}
                </p>
                <button
                  onClick={() => { setCapacites(p => [...p, makeEmptyCapacite()]); setExpandedCapacite(capacites.length); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-white/20 hover:border-[#E3CCCD]/40 text-white/60 hover:text-white text-[12px] rounded-lg transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter une capacité
                </button>
              </div>

              {capacites.length === 0 && (
                <div className="text-center py-12 text-white/25 text-[13px] border border-white/10 rounded-xl border-dashed">
                  Pas de capacité spéciale pour cette créature
                </div>
              )}

              {capacites.map((cap, i) => (
                <div key={i} className="border border-white/10 rounded-xl overflow-hidden bg-white/3">
                  <div className="flex items-center gap-3 px-4 py-3 bg-black/10">
                    <button onClick={() => setExpandedCapacite(expandedCapacite === i ? -1 : i)} className="flex-1 flex items-center gap-3 text-left">
                      <ChevronDown className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${expandedCapacite === i ? "rotate-180" : ""}`} />
                      <input
                        type="text" value={cap.nom}
                        onChange={(e) => { e.stopPropagation(); setCapacites(p => p.map((c, j) => j === i ? { ...c, nom: e.target.value } : c)); }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder={`Capacité ${i + 1}...`}
                        className="flex-1 bg-transparent outline-none text-white text-[14px] font-medium placeholder:text-white/30"
                      />
                    </button>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 ${cap.type === "passif" ? "text-white/40 border-white/15" : cap.type === "action" ? "text-blue-300/70 border-blue-400/30" : cap.type === "action_limitee" ? "text-amber-300/70 border-amber-400/30" : "text-purple-300/70 border-purple-400/30"}`}>
                      {cap.type === "passif" ? "Passif" : cap.type === "action" ? "Action" : cap.type === "action_limitee" ? "Lim." : "Sort"}
                    </span>
                    <button onClick={() => { setCapacites(p => p.filter((_, j) => j !== i)); setExpandedCapacite(-1); }} className="p-1 text-white/30 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {expandedCapacite === i && (
                    <div className="px-4 pb-4 pt-2 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-[0.15em] text-white/50">Type</label>
                        <div className="flex flex-wrap gap-2">
                          {(["passif", "action", "action_limitee", "sort"] as const).map((t) => (
                            <button
                              key={t}
                              onClick={() => setCapacites(p => p.map((c, j) => j === i ? { ...c, type: t } : c))}
                              className={`px-3 py-1.5 rounded-lg border text-[12px] transition-all ${cap.type === t ? "border-[#E3CCCD]/60 bg-[#E3CCCD]/10 text-[#E3CCCD]" : "border-white/20 text-white/50 hover:text-white/80 hover:border-white/40"}`}
                            >
                              {t === "passif" ? "Passif" : t === "action" ? "Action" : t === "action_limitee" ? "Action Limitée" : "Sort"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-[0.15em] text-white/50">Description</label>
                        <textarea
                          value={cap.description}
                          onChange={(e) => setCapacites(p => p.map((c, j) => j === i ? { ...c, description: e.target.value } : c))}
                          placeholder="Description de la capacité, effets mécaniques..."
                          className="w-full h-28 bg-white/5 border border-white/20 focus:border-white/35 rounded-xl p-4 text-white text-sm outline-none transition-colors resize-none leading-relaxed placeholder:text-white/35"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="relative z-10 shrink-0 px-8 py-5 border-t border-white/8 bg-black/10 flex justify-between items-center">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="flex items-center gap-2 text-white/55 hover:text-white transition-colors text-[13px]">
              <ArrowLeft className="w-3.5 h-3.5" /> Précédent
            </button>
          ) : <div />}

          {step < 4 ? (
            <button
              onClick={() => {
                if (step === 1 && !nom.trim()) return alert("Le nom de la créature est requis.");
                if (step === 1 && !nc.trim()) return alert("Le NC est requis.");
                setStep(step + 1);
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1a4a2a]/60 hover:bg-[#1a4a2a]/80 border border-[#E3CCCD]/25 hover:border-[#E3CCCD]/50 rounded-xl text-white text-[13px] transition-all active:scale-95"
            >
              Suivant <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#E3CCCD]/10 hover:bg-[#E3CCCD]/20 border border-[#E3CCCD]/40 hover:border-[#E3CCCD]/70 rounded-xl text-[#E3CCCD] text-[13px] transition-all active:scale-95 disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" />
              {isSubmitting ? "Sauvegarde..." : isEditing ? "Enregistrer les modifications" : "Enregistrer la Créature"}
            </button>
          )}
        </div>
    </ModalLayout>
  );
}
