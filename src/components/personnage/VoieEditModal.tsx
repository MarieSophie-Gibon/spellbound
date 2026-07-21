/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
import { X, Save, RefreshCw, ChevronDown, ChevronUp, Trash2, Check, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface VoieDetail {
  id: string;
  nom: string;
  type: string;
  peuple_id?: string | null;
  profil_id?: string | null;
  famille_id?: string | null;
  description?: string | null;
  capacites: Record<string, { nom?: string; type?: string; description?: string }>;
}

interface ProfileFamilyMeta {
  famille_id: string | null;
  famille_nom: string | null;
  profil_nom: string | null;
}

interface EditablePathway {
  /** voie_id original (pour le calcul de compatibilité) */
  originalVoieId: string;
  /** voie_id actuel (peut changer si remplacement) */
  voie_id: string;
  rangs_acquis: number[];
  isReplacing: boolean;
}

interface VoieEditModalProps {
  pj: { id: string; pathways: any; stats?: any; profil_id?: string | null; profils_id?: string | null };
  type: "pj" | "pnj";
  voieDetails: VoieDetail[];
  allVoies: VoieDetail[];
  onSaved: () => void;
  onClose: () => void;
}

const MAGE_VOIE_ID = "81bff689-433b-4de1-9146-7c70ab428614";
const KNOWN_MAGE_PROFILE_IDS = new Set([
  "baf24636-8c4a-4899-ba60-cc2c57280418", // Forgesort
]);

function getTypeLabel(type: string) {
  const t = type?.toLowerCase();
  if (t === "peuple") return "Peuple";
  if (t === "prestige") return "Prestige";
  return "Profil";
}

function getTypeBadgeClass(type: string) {
  const t = type?.toLowerCase();
  if (t === "peuple") return "bg-amber-400/15 text-amber-300 border-amber-400/30";
  if (t === "prestige") return "bg-violet-400/15 text-violet-300 border-violet-400/30";
  return "bg-sky-400/15 text-sky-300 border-sky-400/30";
}

function getCapaciteName(voie: VoieDetail | undefined, rang: number): string {
  if (!voie) return `Rang ${rang}`;
  const caps = voie.capacites;
  if (!caps) return `Rang ${rang}`;
  const cap = caps[`rang${rang}`];
  return cap?.nom || `Rang ${rang}`;
}

function normalizeText(value: string | null | undefined) {
  return (value || "").toLowerCase();
}

function isMageFamilyName(value: string | null | undefined) {
  const n = normalizeText(value);
  return n.includes("mage");
}

function isMageProfileName(value: string | null | undefined) {
  const n = normalizeText(value);
  return n.includes("forgesort") || n.includes("magicien") || n.includes("sorcier") || n.includes("ensorceleur") || n === "mage";
}

function getRelatedFamilyName(raw: unknown): string | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const first = raw[0] as { nom?: string } | undefined;
    return first?.nom ?? null;
  }
  if (typeof raw === "object") {
    return (raw as { nom?: string }).nom ?? null;
  }
  return null;
}

/** Retourne les voies qui peuvent remplacer la voie d'origine, selon les règles métier. */
function getCompatibleVoies(
  originalVoie: VoieDetail | undefined,
  allVoies: VoieDetail[],
  currentVoieIds: string[],
  replacedVoieId: string,
  profileFamilyById: Record<string, ProfileFamilyMeta>,
): VoieDetail[] {
  if (!originalVoie) return [];

  const originalType = normalizeText(originalVoie.type);
  if (originalType === "peuple") return [];

  const originalFamilyId = originalVoie.profil_id
    ? (profileFamilyById[originalVoie.profil_id]?.famille_id ?? null)
    : (originalVoie.famille_id ?? null);

  return allVoies.filter((v) => {
    if (v.id === originalVoie.id) return false;
    if (v.id === replacedVoieId) return false;

    const candidateType = normalizeText(v.type);
    const sameType = candidateType === originalType;
    const samePeuple = !!originalVoie.peuple_id && v.peuple_id === originalVoie.peuple_id;
    const sameProfil = !!originalVoie.profil_id && v.profil_id === originalVoie.profil_id;

    const candidateFamilyId = v.profil_id
      ? (profileFamilyById[v.profil_id]?.famille_id ?? null)
      : (v.famille_id ?? null);
    const sameFamily = !!originalFamilyId && !!candidateFamilyId && originalFamilyId === candidateFamilyId;

    const passesBaseRule = sameType && (samePeuple || sameProfil || sameFamily);
    if (!passesBaseRule) return false;

    // Pas déjà acquise (sauf celle en cours de remplacement)
    const otherCurrentIds = currentVoieIds.filter((id) => id !== replacedVoieId);
    if (otherCurrentIds.includes(v.id)) return false;
    return true;
  });
}

export default function VoieEditModal({
  pj,
  type,
  voieDetails,
  allVoies,
  onSaved,
  onClose,
}: VoieEditModalProps) {
  const [editablePathways, setEditablePathways] = useState<EditablePathway[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({});
  const [expandedRankDescriptions, setExpandedRankDescriptions] = useState<Record<string, boolean>>({});
  const [profileFamilyById, setProfileFamilyById] = useState<Record<string, ProfileFamilyMeta>>({});

  // Fusionne voieDetails passées en props + allVoies pour avoir toutes les infos
  const allVoiesMap = useMemo(() => {
    const map = new Map<string, VoieDetail>();
    allVoies.forEach((v) => map.set(v.id, v));
    voieDetails.forEach((v) => map.set(v.id, v));
    return map;
  }, [allVoies, voieDetails]);

  const characterProfileIds = useMemo(() => {
    const profileIds = new Set<string>();

    const candidates = [
      pj.stats?.profil_id,
      pj.stats?.profils_id,
      pj.profil_id,
      pj.profils_id,
    ];

    candidates.forEach((id) => {
      if (typeof id === "string" && id) profileIds.add(id);
    });

    ((pj.pathways as any[]) || []).forEach((p) => {
      const voie = allVoiesMap.get(p.voie_id);
      if (voie?.profil_id) profileIds.add(voie.profil_id);
    });

    return Array.from(profileIds);
  }, [allVoiesMap, pj.pathways, pj.profil_id, pj.profils_id, pj.stats?.profil_id, pj.stats?.profils_id]);

  const characterFamilyIds = useMemo(() => {
    const ids = new Set<string>();

    characterProfileIds.forEach((profileId) => {
      const familyId = profileFamilyById[profileId]?.famille_id;
      if (familyId) {
        ids.add(familyId);
      }
    });

    return Array.from(ids);
  }, [characterProfileIds, profileFamilyById]);

  const mageFamilyIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(profileFamilyById).forEach((meta) => {
      if (!meta.famille_id) return;
      if (isMageFamilyName(meta.famille_nom) || isMageProfileName(meta.profil_nom)) {
        ids.add(meta.famille_id);
      }
    });
    return Array.from(ids);
  }, [profileFamilyById]);

  const hasMageFamilyProfile = useMemo(() => {
    if (characterFamilyIds.some((id) => mageFamilyIds.includes(id))) return true;
    // Fallback si la famille est absente sur certaines lignes mais le profil est explicite.
    for (const profileId of characterProfileIds) {
      if (KNOWN_MAGE_PROFILE_IDS.has(profileId)) return true;
      if (isMageProfileName(profileFamilyById[profileId]?.profil_nom)) return true;
    }
    return false;
  }, [characterFamilyIds, characterProfileIds, mageFamilyIds, profileFamilyById]);

  const mageVoie = useMemo(() => {
    return (
      // Priorite: vraie voie rattachee au peuple Mage.
      allVoies.find((v) => v.peuple_id === MAGE_VOIE_ID) ||
      allVoies.find((v) => v.id === MAGE_VOIE_ID) ||
      allVoies.find(
        (v) =>
          normalizeText(v.nom).includes("mage") &&
          (v.type || "").toLowerCase() === "peuple",
      ) ||
      allVoies.find((v) => normalizeText(v.nom) === "mage") ||
      null
    );
  }, [allVoies]);

  const canAddMageVoie = useMemo(() => {
    if (!hasMageFamilyProfile || !mageVoie) return false;
    const currentIds = new Set(editablePathways.map((p) => p.voie_id));
    return !currentIds.has(mageVoie.id);
  }, [editablePathways, hasMageFamilyProfile, mageVoie]);

  useEffect(() => {
    supabase
      .from("profils")
      .select("id, nom, famille_id, familles(nom)")
      .then(({ data }) => {
        if (!data) return;
        const next: Record<string, ProfileFamilyMeta> = {};
        (data as Array<any>).forEach((p) => {
          next[p.id] = {
            famille_id: p.famille_id ?? null,
            famille_nom: getRelatedFamilyName(p.familles),
            profil_nom: p.nom ?? null,
          };
        });
        setProfileFamilyById(next);
      });
  }, []);

  useEffect(() => {
    const initial: EditablePathway[] = ((pj.pathways as any[]) || []).map((p) => ({
      originalVoieId: p.voie_id,
      voie_id: p.voie_id,
      rangs_acquis: [...(p.rangs_acquis || [])].sort((a, b) => a - b),
      isReplacing: false,
    }));
    setEditablePathways(initial);
  }, [pj.pathways]);

  const currentVoieIds = editablePathways.map((p) => p.voie_id);

  const toggleRang = (idx: number, rang: number) => {
    setEditablePathways((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        const has = p.rangs_acquis.includes(rang);
        const next = has
          ? p.rangs_acquis.filter((r) => r !== rang)
          : [...p.rangs_acquis, rang].sort((a, b) => a - b);
        return { ...p, rangs_acquis: next };
      }),
    );
  };

  const toggleReplacing = (idx: number) => {
    setEditablePathways((prev) =>
      prev.map((p, i) =>
        i === idx ? { ...p, isReplacing: !p.isReplacing } : { ...p, isReplacing: false },
      ),
    );
    setSearchQueries((prev) => ({ ...prev, [idx]: "" }));
  };

  const toggleRankDescription = (idx: number, rang: number) => {
    const key = `${idx}-${rang}`;
    setExpandedRankDescriptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const replaceVoie = (idx: number, newVoieId: string) => {
    setEditablePathways((prev) =>
      prev.map((p, i) =>
        i === idx
          ? { ...p, voie_id: newVoieId, rangs_acquis: [1], isReplacing: false }
          : p,
      ),
    );
    setSearchQueries((prev) => ({ ...prev, [idx]: "" }));
  };

  const addMageVoie = () => {
    if (!mageVoie) return;
    setEditablePathways((prev) => {
      if (prev.some((p) => p.voie_id === mageVoie.id)) return prev;

      const mageEntry: EditablePathway = {
        originalVoieId: mageVoie.id,
        voie_id: mageVoie.id,
        rangs_acquis: [1],
        isReplacing: false,
      };

      const peupleIndex = prev.findIndex((p) => {
        const pVoie = allVoiesMap.get(p.voie_id);
        return (pVoie?.type || "").toLowerCase() === "peuple";
      });

      if (peupleIndex === -1) return [...prev, mageEntry];

      const next = [...prev];
      next.splice(peupleIndex + 1, 0, mageEntry);
      return next;
    });
  };

  const removePathway = (idx: number) => {
    setEditablePathways((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedPathways = editablePathways
        .filter((p) => p.rangs_acquis.length > 0)
        .map((p) => ({ voie_id: p.voie_id, rangs_acquis: p.rangs_acquis }));

      const table = type === "pnj" ? "pnj" : "pj";
      const { error } = await supabase
        .from(table)
        .update({ pathways: updatedPathways })
        .eq("id", pj.id);

      if (error) throw error;
      onSaved();
      onClose();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = useMemo(() => {
    const original = (pj.pathways as any[]) || [];
    if (editablePathways.length !== original.length) return true;
    return editablePathways.some((ep, i) => {
      const orig = original[i];
      if (!orig) return true;
      if (ep.voie_id !== orig.voie_id) return true;
      const origRangs = [...(orig.rangs_acquis || [])].sort((a, b) => a - b).join(",");
      const editRangs = [...ep.rangs_acquis].sort((a, b) => a - b).join(",");
      return origRangs !== editRangs;
    });
  }, [editablePathways, pj.pathways]);

  return (
    <div className="fixed inset-0 z-9999 bg-linear-to-b from-[#3A2F72]/90 to-[#201A47]/88 backdrop-blur-lg flex flex-col animate-in fade-in">
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/16 bg-white/8 shrink-0">
        <div>
          <h3 className="font-serif text-xl text-white tracking-wider flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#E3CCCD]" />
            Modifier les Voies
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-white/45 hover:text-white transition-colors bg-white/7 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Liste des voies ── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 p-4 space-y-3">
        {editablePathways.length === 0 && (
          <p className="text-center text-white/30 italic text-sm py-12">
            Aucune voie acquise.
          </p>
        )}

        {editablePathways.map((ep, idx) => {
          const voie = allVoiesMap.get(ep.voie_id);
          const originalVoie = allVoiesMap.get(ep.originalVoieId);
          const allRangsInVoie = voie?.capacites
            ? Object.keys(voie.capacites)
                .map((k) => {
                  const m = k.match(/rang(\d+)/);
                  return m ? parseInt(m[1], 10) : null;
                })
                .filter((r): r is number => r !== null)
                .sort((a, b) => a - b)
            : ep.rangs_acquis;

          const compatibleVoies = getCompatibleVoies(
            originalVoie,
            allVoies,
            currentVoieIds,
            ep.voie_id,
            profileFamilyById,
          );

          const query = searchQueries[idx] || "";
          const filteredCompat = compatibleVoies
            .filter((v) => v.nom.toLowerCase().includes(query.toLowerCase()))
            .sort((a, b) => {
              const aProfile = normalizeText(a.profil_id ? profileFamilyById[a.profil_id]?.profil_nom : null) || "zzz";
              const bProfile = normalizeText(b.profil_id ? profileFamilyById[b.profil_id]?.profil_nom : null) || "zzz";
              if (aProfile !== bProfile) return aProfile.localeCompare(bProfile, "fr");
              return a.nom.localeCompare(b.nom, "fr");
            });

          const groupedCompat = filteredCompat.reduce<Record<string, VoieDetail[]>>((acc, v) => {
            const profileName = v.profil_id
              ? (profileFamilyById[v.profil_id]?.profil_nom || "Sans profil")
              : "Sans profil";
            if (!acc[profileName]) acc[profileName] = [];
            acc[profileName].push(v);
            return acc;
          }, {});

          const isReplaced = ep.voie_id !== ep.originalVoieId;
          const isPeupleCard = (voie?.type || "").toLowerCase() === "peuple";
          const voieDisplayName = voie?.nom || (mageVoie?.id === ep.voie_id ? mageVoie.nom : ep.voie_id);

          return (
            <div
              key={idx}
              className={`rounded-xl border overflow-hidden transition-all ${
                isReplaced
                    ? "border-amber-400/40 bg-amber-400/10"
                  : ep.rangs_acquis.length === 0
                    ? "border-red-400/36 bg-red-400/10"
                    : "border-[#E3CCCD]/28 bg-white/10"
              }`}
            >
              {/* En-tête de la voie */}
              <div className="flex items-center justify-between px-3 py-2.5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded border ${getTypeBadgeClass(voie?.type ?? "profil")}`}
                  >
                    {getTypeLabel(voie?.type ?? "profil")}
                  </span>
                  <span className="font-serif text-white text-sm font-semibold truncate">
                    {voieDisplayName}
                  </span>
                  {isReplaced && (
                    <span className="text-[9px] text-amber-300/70 italic shrink-0">
                      (remplacée)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Bouton Remplacer — uniquement si des voies compatibles existent */}
                  {compatibleVoies.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleReplacing(idx)}
                      className={`flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded-lg border transition-colors ${
                        ep.isReplacing
                          ? "border-amber-400/50 bg-amber-400/20 text-amber-300"
                            : "border-[#E3CCCD]/28 text-white/60 hover:text-white/90 hover:bg-white/8"
                      }`}
                    >
                      <RefreshCw className="w-3 h-3" />
                      Remplacer
                      {ep.isReplacing ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  )}
                  {/* Bouton supprimer toute la voie */}
                  <button
                    type="button"
                    onClick={() => removePathway(idx)}
                    className="p-1.5 text-red-400/50 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="Supprimer cette voie"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sélecteur de remplacement */}
              {ep.isReplacing && (
                <div className="px-3 pb-3 border-t border-amber-400/20 pt-2.5">
                  <p className="text-[9px] uppercase tracking-widest text-amber-300/70 mb-2">
                    Choisir la voie de remplacement (rang 1 seulement)
                  </p>
                  <input
                    type="text"
                    placeholder="Rechercher une voie..."
                    value={query}
                    onChange={(e) =>
                      setSearchQueries((prev) => ({ ...prev, [idx]: e.target.value }))
                    }
                    className="w-full bg-white/10 border border-white/24 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-amber-400/50 mb-2 placeholder:text-white/45"
                  />
                  <div className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 space-y-1">
                    {filteredCompat.length === 0 && (
                      <p className="text-white/30 text-xs italic py-2 text-center">
                        Aucune voie compatible trouvée.
                      </p>
                    )}
                    {Object.entries(groupedCompat).map(([profileName, voies]) => (
                      <div key={profileName} className="space-y-1">
                        <p className="text-[9px] uppercase tracking-widest text-white/45 px-1 pt-1">
                          {profileName}
                        </p>
                        {voies.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => replaceVoie(idx, v.id)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-white/18 hover:border-amber-400/40 hover:bg-amber-400/12 text-left transition-colors"
                          >
                            <span className="text-white/80 text-xs font-medium">{v.nom}</span>
                            <Check className="w-3.5 h-3.5 text-amber-400/60 shrink-0" />
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rangs */}
              {!ep.isReplacing && (
                <div className="px-3 pb-3 pt-1 space-y-1 border-t border-white/8">
                  {allRangsInVoie.map((rang) => {
                    const acquired = ep.rangs_acquis.includes(rang);
                    const capName = getCapaciteName(voie, rang);
                    const capDescription = voie?.capacites?.[`rang${rang}`]?.description || "";
                    const rankDescKey = `${idx}-${rang}`;
                    const isRankDescriptionExpanded = !!expandedRankDescriptions[rankDescKey];
                    return (
                      <div key={rang} className="space-y-1">
                        <div className="flex items-stretch gap-1">
                          <button
                            type="button"
                            onClick={() => toggleRang(idx, rang)}
                            className={`flex-1 flex items-center gap-3 px-2 py-1.5 rounded-lg border transition-all text-left ${
                              acquired
                                ? "border-emerald-400/30 bg-emerald-400/12 hover:bg-emerald-400/9 hover:border-red-400/28"
                                : "border-white/12 bg-white/6 hover:border-emerald-400/20 hover:bg-emerald-400/8 opacity-75"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                acquired
                                  ? "border-emerald-400/60 bg-emerald-400/25"
                                  : "border-white/20 bg-white/5"
                              }`}
                            >
                              {acquired && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                            </div>
                            <span className="text-[10px] text-white/55 font-mono shrink-0 w-10">
                              Rang {rang}
                            </span>
                            <span
                              className={`text-xs truncate ${acquired ? "text-white/90" : "text-white/45"}`}
                            >
                              {capName}
                            </span>

                          </button>

                          {!!capDescription && (
                            <button
                              type="button"
                              onClick={() => toggleRankDescription(idx, rang)}
                              className="px-2 rounded-lg border border-white/18 bg-white/8 text-white/60 hover:text-white/90 hover:bg-white/14 transition-colors"
                              title="Voir la description de ce rang"
                            >
                              {isRankDescriptionExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>

                        {!!capDescription && isRankDescriptionExpanded && (
                          <div className="rounded-md border border-white/18 bg-white/10 px-2 py-1.5">
                            <p className="text-[11px] text-white/78 leading-relaxed">{capDescription}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {ep.rangs_acquis.length === 0 && (
                    <p className="text-red-400/60 text-[10px] italic px-2 py-1">
                      ⚠ Aucun rang — cette voie sera supprimée à la sauvegarde.
                    </p>
                  )}

                  {isPeupleCard && canAddMageVoie && mageVoie && (
                    <div className="pt-1.5">
                      <button
                        type="button"
                        onClick={addMageVoie}
                        className="w-full flex items-center justify-center gap-1.5 rounded-md border border-violet-400/25 bg-violet-500/6 text-violet-200/70 px-2 py-1.5 text-[10px] uppercase tracking-wider font-semibold hover:bg-violet-500/12 hover:text-violet-100 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Ajouter voie du Mage
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Pied de page ── */}
      <div className="shrink-0 border-t border-white/16 bg-white/8 px-5 py-4 flex items-center justify-center gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-white/22 text-white/70 text-xs font-semibold hover:bg-white/10 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-400/40 bg-emerald-400/20 text-emerald-100 text-xs font-bold tracking-widest hover:bg-emerald-400/30 transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
}
