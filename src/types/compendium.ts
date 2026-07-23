export interface PeupleData {
  age: string;
  esperance: string;
  taille: string;
  poids: string;
  traits: string;
  caracteristiques: string;
}

export interface Peuple {
  id: string;
  nom: string;
  description: string;
  lore?: string | null;
  data: PeupleData;
  image_url?: string;
}

export interface VoieRangCapacite {
  nom: string;
  type: string;
  description: string;
}

export interface VoieRangBonus {
  titre: string;
  type: string;
  valeur: string;
  condition: string;
}

export interface VoieRangCapaciteDetail {
  titre: string;
  description: string;
}

export interface VoieRangAction {
  titre: string;
  type: "A" | "M" | "L" | "G" | "";
  sort: boolean;
  cout_mana: string;
  dm: string;
  test_oppose: boolean;
  test_type: string;
  resultat_si_reussi: string;
  description: string;
}

export interface VoieRang {
  // Legacy fields kept for backward compatibility with existing JSON payloads.
  titre?: string;
  nom?: string;
  type?: string;
  description?: string;
  bonus?: VoieRangBonus[] | VoieRangBonus | null;
  capacites?: VoieRangCapaciteDetail[] | VoieRangCapaciteDetail | null;
  actions?: VoieRangAction[] | VoieRangAction | null;
  // Transitional fields for intermediate payloads.
  capacite?: VoieRangCapaciteDetail | null;
  action?: VoieRangAction | null;
}

export interface Voie {
  id: string;
  nom: string;
  capacites: {
    rang1: VoieRang;
    rang2: VoieRang;
    rang3: VoieRang;
    rang4: VoieRang;
    rang5: VoieRang;
  };
}

export type Section = 'peuples' | 'familles' | 'profils' | 'bestiaire' | 'objets' | 'voies_prestige';

export interface FamilleArchetype {
  id: string;
  nom: string;
  description: string | null;
  notes: string | null;
  pv_niveau: number;
  de_recuperation: string;
  bonus_chance: number;
  image_url?: string;
  campaign_id: string | null;
  is_custom: boolean;
}

export interface Famille {
  id: string;
  nom: string;
  famille_id: string | null;
  famille_nom?: string;
  description: string | null;
  equipement_base: string | null;
  maitrise_equipement: string | null;
  lore?: string | null;
  is_custom: boolean;
  data: Record<string, unknown>;
  campaign_id: string | null;
  image_url?: string;
}

export interface FamilleVoie {
  id?: string;
  nom: string;
  type: string;
  famille_id?: string | null;
  famille_nom?: string;
  notes?: string | null;
  capacites: {
    rang1: VoieRang;
    rang2: VoieRang;
    rang3: VoieRang;
    rang4: VoieRang;
    rang5: VoieRang;
  };
}

export interface MonstreStats {
  agi: { mod: number; sup: boolean };
  cha: { mod: number; sup: boolean };
  con: { mod: number; sup: boolean };
  for: { mod: number; sup: boolean };
  int: { mod: number; sup: boolean };
  per: { mod: number; sup: boolean };
  vol: { mod: number; sup: boolean };
}

export interface MonstreCombat {
  pv: number;
  rd: number;
  pv_max: number;
  defense: number;
  initiative: number;
  attaque_magique: number | null;
}

export interface MonstreAttaque {
  attaque_base: string;
  dm: string;
}

export interface MonstreCapacite {
  nom: string;
  type: string;
  description: string;
}

export interface Monstre {
  id: string;
  nom: string;
  nc: string;
  type_creature: string;
  taille: string;
  is_custom: boolean;
  description: string | null;
  stats: MonstreStats;
  combat: MonstreCombat;
  attaques: MonstreAttaque[];
  capacites: MonstreCapacite[];
  data: Record<string, unknown>;
  campaign_id: string | null;
  image_url?: string;
}

export interface EquipementPropriete {
  label: string;
  valeur: string;
}

export interface EquipementData {
  rarete?: string;
  description?: string;
  proprietes?: EquipementPropriete[];
  necessite_attunement?: boolean;
}

export interface Equipement {
  id: string;
  nom: string;
  categorie: string;
  prix: string | null;
  is_custom: boolean;
  data: EquipementData;
  image_url?: string;
  table_source: "arme_contact" | "arme_distance" | "armure" | "equipement";
  // Arme fields
  dm?: string;
  type_de_dm?: string;
  notes?: string;
  portee?: string;
  // Armure fields
  bonus_def?: string;
  agi_max?: string;
  campaign_id?: string | null;
}

export const TYPE_OPTIONS = ["Action d'attaque", "Action limitée", "Action de mouvement", "Action Gratuite", "Bonus de caractéristique", "Autre"];
export const RANG_ACTION_TYPES = ["A", "M", "L", "G"] as const;
export const RANG_BONUS_TYPES = ["caractéristique", "compétence", "DEF", "PV", "initiative", "attaque", "autre"] as const;

export interface VoiePrestigeWizardProps {
  onClose: () => void;
  onSuccess: () => void;
  campaignId?: string;
  initialData?: FamilleVoie;
  familles: { id: string; nom: string }[];
}

export type RangsState = {
  rang1: VoieRang;
  rang2: VoieRang;
  rang3: VoieRang;
  rang4: VoieRang;
  rang5: VoieRang;
};

export const EMPTY_RANGS: RangsState = {
  rang1: {
    titre: "",
    nom: "",
    type: "",
    description: "",
    bonus: [{ titre: "", type: "", valeur: "", condition: "" }],
    capacites: [{ titre: "", description: "" }],
    actions: [{
      titre: "",
      type: "",
      sort: false,
      cout_mana: "",
      dm: "",
      test_oppose: false,
      test_type: "",
      resultat_si_reussi: "",
      description: "",
    }],
  },
  rang2: {
    titre: "",
    nom: "",
    type: "",
    description: "",
    bonus: [{ titre: "", type: "", valeur: "", condition: "" }],
    capacites: [{ titre: "", description: "" }],
    actions: [{
      titre: "",
      type: "",
      sort: false,
      cout_mana: "",
      dm: "",
      test_oppose: false,
      test_type: "",
      resultat_si_reussi: "",
      description: "",
    }],
  },
  rang3: {
    titre: "",
    nom: "",
    type: "",
    description: "",
    bonus: [{ titre: "", type: "", valeur: "", condition: "" }],
    capacites: [{ titre: "", description: "" }],
    actions: [{
      titre: "",
      type: "",
      sort: false,
      cout_mana: "",
      dm: "",
      test_oppose: false,
      test_type: "",
      resultat_si_reussi: "",
      description: "",
    }],
  },
  rang4: {
    titre: "",
    nom: "",
    type: "",
    description: "",
    bonus: [{ titre: "", type: "", valeur: "", condition: "" }],
    capacites: [{ titre: "", description: "" }],
    actions: [{
      titre: "",
      type: "",
      sort: false,
      cout_mana: "",
      dm: "",
      test_oppose: false,
      test_type: "",
      resultat_si_reussi: "",
      description: "",
    }],
  },
  rang5: {
    titre: "",
    nom: "",
    type: "",
    description: "",
    bonus: [{ titre: "", type: "", valeur: "", condition: "" }],
    capacites: [{ titre: "", description: "" }],
    actions: [{
      titre: "",
      type: "",
      sort: false,
      cout_mana: "",
      dm: "",
      test_oppose: false,
      test_type: "",
      resultat_si_reussi: "",
      description: "",
    }],
  },
};

export interface FamilleWizardProps {
  onClose: () => void;
  onSuccess: () => void;
  campaignId?: string;
  initialData?: Partial<FamilleArchetype> & { id?: string; nom?: string };
}

export interface ProfilWizardProps {
  onClose: () => void;
  onSuccess: () => void;
  campaignId?: string;
  initialData?: InitialProfilData;
  famillesArchetypes: FamilleArchetype[];
}

export interface InitialProfilData {
  id: string;
  nom: string;
  famille_id: string | null;
  description: string | null;
  equipement_base: string | null;
  maitrise_equipement: string | null;
  lore?: string | null;
  campaign_id?: string | null;
  image_url?: string;
  data: Record<string, unknown>;
  voies: FamilleVoie[];
}
