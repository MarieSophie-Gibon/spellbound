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
  data: PeupleData;
  image_url?: string;
}

export interface VoieRangCapacite {
  nom: string;
  type: string;
  description: string;
}

export interface Voie {
  id: string;
  nom: string;
  capacites: {
    rang1: VoieRangCapacite;
    rang2: VoieRangCapacite;
    rang3: VoieRangCapacite;
    rang4: VoieRangCapacite;
    rang5: VoieRangCapacite;
  };
}

export type Section = 'peuples' | 'familles' | 'bestiaire' | 'objets';

export interface Famille {
  id: string;
  nom: string;
  groupe: string;
  description: string | null;
  pv_niveau: number;
  de_recuperation: string;
  bonus_chance: number;
  equipement_base: string | null;
  maitrise_equipement: string | null;
  is_custom: boolean;
  data: Record<string, unknown>;
  campaign_id: string | null;
  image_url?: string;
}

export interface FamilleVoie {
  id?: string;
  nom: string;
  type: string;
  capacites: {
    rang1: VoieRangCapacite;
    rang2: VoieRangCapacite;
    rang3: VoieRangCapacite;
    rang4: VoieRangCapacite;
    rang5: VoieRangCapacite;
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
  stats: MonstreStats;
  combat: MonstreCombat;
  attaques: MonstreAttaque[];
  capacites: MonstreCapacite[];
  data: Record<string, unknown>;
  campaign_id: string | null;
  image_url?: string;
}
