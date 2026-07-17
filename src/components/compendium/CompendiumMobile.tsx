import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Menu, Search } from "lucide-react";
import type { EquipementType } from "@/components/compendium/equipement/MagicalItemWizard";
import type { Equipement, Famille, FamilleArchetype, FamilleVoie, Monstre, Peuple, Section } from "@/types/compendium";

interface CompendiumMobileProps {
  title: string;
  sections: Section[];
  activeSection: Section | null;
  showListInView: boolean;
  readOnly?: boolean;
  peuples: Peuple[];
  famillesArchetypes: FamilleArchetype[];
  profils: Famille[];
  monstres: Monstre[];
  equipements: Equipement[];
  voiesPrestige: FamilleVoie[];
  onSectionChange: (section: Section | null) => void;
  onSelectPeuple: (id: string) => void;
  onSelectFamilleArchetype: (id: string) => void;
  onSelectProfil: (id: string) => void;
  onSelectMonstre: (id: string) => void;
  onSelectEquipementTable: (type: EquipementType) => void;
  onSelectVoiePrestige: (id: string) => void;
  onBackToList: () => void;
  onCreateCurrent: () => void;
  children: React.ReactNode;
}

const EQUIP_TYPES: Array<{ key: EquipementType; label: string }> = [
  { key: "arme_contact", label: "Armes de Contact" },
  { key: "arme_distance", label: "Armes a Distance" },
  { key: "armure", label: "Armures" },
  { key: "equipement", label: "Equipements" },
];

const SECTION_LABELS: Record<Section, string> = {
  peuples: "Peuples",
  familles: "Familles",
  profils: "Profils",
  bestiaire: "Bestiaire",
  objets: "Objets",
  voies_prestige: "Prestige",
};

type MobileListItem = {
  id: string;
  label: string;
  meta?: string;
};

function SmoothPanel({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-70"}`}>
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

export function CompendiumMobile({
  title,
  sections,
  activeSection,
  showListInView,
  readOnly,
  peuples,
  famillesArchetypes,
  profils,
  monstres,
  equipements,
  voiesPrestige,
  onSectionChange,
  onSelectPeuple,
  onSelectFamilleArchetype,
  onSelectProfil,
  onSelectMonstre,
  onSelectEquipementTable,
  onSelectVoiePrestige,
  onBackToList,
  onCreateCurrent,
  children,
}: CompendiumMobileProps) {
  const [query, setQuery] = useState("");
  const [openSection, setOpenSection] = useState<Section | null>(null);
  const [openProfilGroups, setOpenProfilGroups] = useState<Set<string>>(new Set());
  const [openVoiesGroups, setOpenVoiesGroups] = useState<Set<string>>(new Set());
  const wasListInView = useRef(showListInView);
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    if (showListInView && !wasListInView.current) {
      setOpenSection(null);
      setOpenProfilGroups(new Set());
      setOpenVoiesGroups(new Set());
      onSectionChange(null);
    }
    wasListInView.current = showListInView;
  }, [showListInView, onSectionChange]);

  const toggleProfilGroup = (groupName: string) => {
    setOpenProfilGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  const toggleVoiesGroup = (groupName: string) => {
    setOpenVoiesGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  const itemsBySection = useMemo<Record<Section, MobileListItem[]>>(() => {
    const byQuery = (value: string) => !normalizedQuery || value.toLowerCase().includes(normalizedQuery);

    const peuplesItems = peuples
      .filter((p) => byQuery(p.nom))
      .map((p) => ({ id: p.id, label: p.nom }));

    const famillesItems = famillesArchetypes
      .filter((f) => byQuery(f.nom))
      .map((f) => ({ id: f.id, label: f.nom }));

    const profilsItems = profils
      .filter((p) => byQuery(p.nom) || byQuery(p.famille_nom ?? ""))
      .map((p) => ({ id: p.id, label: p.nom, meta: p.famille_nom ?? undefined }));

    const bestiaireItems = monstres
      .filter((m) => byQuery(m.nom) || byQuery(m.type_creature ?? ""))
      .map((m) => ({ id: m.id, label: m.nom, meta: `NC ${m.nc}` }));

    const equipItems = EQUIP_TYPES.map((t) => {
      const count = equipements.filter((e) => e.table_source === t.key).length;
      return { id: t.key, label: t.label, meta: `${count}` };
    });

    const voiesItems = voiesPrestige
      .filter((v) => byQuery(v.nom) || byQuery(v.famille_nom ?? ""))
      .map((v) => ({ id: v.id ?? v.nom, label: v.nom, meta: v.famille_nom ?? undefined }));

    return {
      peuples: peuplesItems,
      familles: famillesItems,
      profils: profilsItems,
      bestiaire: bestiaireItems,
      objets: equipItems,
      voies_prestige: voiesItems,
    };
  }, [peuples, famillesArchetypes, profils, monstres, equipements, voiesPrestige, normalizedQuery]);

  const profilsByGroup = useMemo(() => {
    const byQuery = (value: string) => !normalizedQuery || value.toLowerCase().includes(normalizedQuery);
    const filteredProfils = profils.filter((p) => byQuery(p.nom) || byQuery(p.famille_nom ?? ""));

    const grouped = filteredProfils.reduce<Record<string, Famille[]>>((acc, profil) => {
      const groupName = profil.famille_nom || "Sans famille";
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(profil);
      return acc;
    }, {});

    return Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b))
      .map((groupName) => ({
        groupName,
        profils: grouped[groupName].sort((a, b) => a.nom.localeCompare(b.nom)),
      }));
  }, [profils, normalizedQuery]);

  const voiesByGroup = useMemo(() => {
    const byQuery = (value: string) => !normalizedQuery || value.toLowerCase().includes(normalizedQuery);
    const filteredVoies = voiesPrestige.filter((v) => byQuery(v.nom) || byQuery(v.famille_nom ?? ""));

    const grouped = filteredVoies.reduce<Record<string, FamilleVoie[]>>((acc, voie) => {
      const groupName = voie.famille_nom || "Sans famille";
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(voie);
      return acc;
    }, {});

    return Object.keys(grouped)
      .sort((a, b) => a.localeCompare(b))
      .map((groupName) => ({
        groupName,
        voies: grouped[groupName].sort((a, b) => a.nom.localeCompare(b.nom)),
      }));
  }, [voiesPrestige, normalizedQuery]);

  const selectItemForSection = (section: Section, id: string) => {
    if (section === "peuples") onSelectPeuple(id);
    if (section === "familles") onSelectFamilleArchetype(id);
    if (section === "profils") onSelectProfil(id);
    if (section === "bestiaire") onSelectMonstre(id);
    if (section === "objets") onSelectEquipementTable(id as EquipementType);
    if (section === "voies_prestige") onSelectVoiePrestige(id);
  };

  return (
    <div className="lg:hidden flex-1 min-h-0 flex flex-col">
      <div className="sticky top-0 z-20 px-3 pt-3 pb-2 bg-linear-to-b from-[#100c2f]/95 via-[#100c2f]/85 to-transparent backdrop-blur-sm">
        <div className="relative h-11 rounded-xl border border-[#E3CCCD]/20 bg-[#1E1941]/72 backdrop-blur-xl px-2.5 flex items-center justify-between shadow-[0_12px_28px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="absolute inset-1 border border-[#E3CCCD]/14 rounded-[10px] pointer-events-none" />
          <div className="w-8" />

          <h2 className="relative z-10 font-serif text-base text-white tracking-[0.12em] uppercase">{title}</h2>

          {!showListInView ? (
            <button
              type="button"
              onClick={onBackToList}
              className="relative z-10 h-8 px-2.5 text-[#E3CCCD] hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
              aria-label="Ouvrir le sommaire"
            >
              <Menu className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden px-2 pb-2">
        <div className="relative h-full rounded-xl border border-[#E3CCCD]/18 bg-[#1E1941]/35 backdrop-blur-xl overflow-hidden">
          <div className="absolute inset-1 border border-[#E3CCCD]/12 rounded-[10px] pointer-events-none" />
          {showListInView ? (
            <div className="absolute inset-0 flex min-h-0 flex-col">
              <div className="px-4 pt-4 pb-3 border-b border-[#E3CCCD]/14 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/35" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher"
                    className="w-full h-9 rounded-lg border border-[#E3CCCD]/20 bg-white/8 pl-9 pr-3 text-[12px] text-white placeholder:text-white/45 outline-none focus:border-[#E3CCCD]/55"
                  />
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 pt-3 space-y-2 scrollbar-thin scrollbar-thumb-white/20">
                {sections.map((section) => {
                  const isOpen = openSection === section;
                  const items = itemsBySection[section];

                  return (
                    <div key={section} className="rounded-xl border border-[#E3CCCD]/16 bg-white/6 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          const nextSection = isOpen ? null : section;
                          setOpenSection(nextSection);
                          onSectionChange(nextSection);
                        }}
                        className={`w-full px-3 py-2.5 text-left flex items-center justify-between transition-colors ${
                          isOpen ? "bg-[#29206A]/45 text-[#E3CCCD]" : "text-white/68 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span className="text-[12px] font-medium truncate pr-2">{SECTION_LABELS[section]}</span>
                        <span className="flex items-center gap-2 shrink-0">
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </span>
                      </button>

                      <SmoothPanel open={isOpen}>
                        <div className="px-2 pb-2 space-y-1">
                          {section === "profils" ? (
                            profilsByGroup.length === 0 ? (
                              <div className="px-3 py-2 text-[11px] text-white/40 italic">Aucun element dans cette categorie.</div>
                            ) : (
                              profilsByGroup.map(({ groupName, profils }) => {
                                const isGroupOpen = openProfilGroups.has(groupName);

                                return (
                                  <div key={groupName} className="overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => toggleProfilGroup(groupName)}
                                      className="w-full px-2.5 py-1.5 text-left flex items-center justify-between text-[11px] font-medium text-white/55 hover:text-white/85 transition-colors"
                                    >
                                      <span className="truncate pr-2">{groupName}</span>
                                      <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${isGroupOpen ? "rotate-180" : ""}`} />
                                    </button>

                                    <SmoothPanel open={isGroupOpen}>
                                      <div className="mt-0.5 mb-1 ml-2 border-l border-white/10 pl-2 space-y-0.5">
                                        {profils.map((profil) => (
                                          <button
                                            key={profil.id}
                                            type="button"
                                            onClick={() => {
                                              onSelectProfil(profil.id);
                                            }}
                                            className="w-full text-left rounded-lg px-2.5 py-1.5 text-[12px] font-light text-white/65 hover:bg-white/6 hover:text-white transition-colors"
                                          >
                                            <span className="block leading-snug line-clamp-2">{profil.nom}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </SmoothPanel>
                                  </div>
                                );
                              })
                            )
                          ) : section === "voies_prestige" ? (
                            voiesByGroup.length === 0 ? (
                              <div className="px-3 py-2 text-[11px] text-white/40 italic">Aucun element dans cette categorie.</div>
                            ) : (
                              voiesByGroup.map(({ groupName, voies }) => {
                                const isGroupOpen = openVoiesGroups.has(groupName);

                                return (
                                  <div key={groupName} className="overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => toggleVoiesGroup(groupName)}
                                      className="w-full px-2.5 py-1.5 text-left flex items-center justify-between text-[11px] font-medium text-white/55 hover:text-white/85 transition-colors"
                                    >
                                      <span className="truncate pr-2">{groupName}</span>
                                      <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${isGroupOpen ? "rotate-180" : ""}`} />
                                    </button>

                                    <SmoothPanel open={isGroupOpen}>
                                      <div className="mt-0.5 mb-1 ml-2 border-l border-white/10 pl-2 space-y-0.5">
                                        {voies.map((voie) => (
                                          <button
                                            key={voie.id ?? voie.nom}
                                            type="button"
                                            onClick={() => {
                                              onSelectVoiePrestige(voie.id ?? voie.nom);
                                            }}
                                            className="w-full text-left rounded-lg px-2.5 py-1.5 text-[12px] font-light text-white/65 hover:bg-white/6 hover:text-white transition-colors"
                                          >
                                            <span className="block leading-snug line-clamp-2">{voie.nom}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </SmoothPanel>
                                  </div>
                                );
                              })
                            )
                          ) : (
                            items.length === 0 ? (
                              <div className="px-3 py-2 text-[11px] text-white/40 italic">Aucun element dans cette categorie.</div>
                            ) : (
                              items.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    selectItemForSection(section, item.id);
                                  }}
                                  className="w-full text-left rounded-xl px-3 py-2.5 bg-white/4 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white transition-colors"
                                >
                                  <span className="block text-[12px] leading-snug line-clamp-2">{item.label}</span>
                                  {item.meta && <span className="block text-[10px] text-white/40 mt-1">{item.meta}</span>}
                                </button>
                              ))
                            )
                          )}
                        </div>
                      </SmoothPanel>
                    </div>
                  );
                })}
              </div>

              {!readOnly && openSection && (
                <div className="px-4 pb-4">
                  <button
                    type="button"
                    onClick={onCreateCurrent}
                    className="w-full h-10 rounded-xl border border-[#E3CCCD]/35 bg-[#29206A]/55 text-white text-[12px] font-medium hover:bg-[#29206A]/70 transition-colors"
                  >
                    Ajouter
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-0">{children}</div>
          )}
        </div>
      </div>
    </div>
  );
}
