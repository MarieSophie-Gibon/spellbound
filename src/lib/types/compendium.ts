/* eslint-disable @typescript-eslint/no-explicit-any */

export type Sexe = "Masculin" | "Féminin" | "Autre";

export type StatKey = "FOR" | "CON" | "AGI" | "PER" | "CHA" | "INT" | "VOL";

export type StatsMap = Record<StatKey, number>;

export interface PeupleRef {
  id: string;
  nom: string;
  description: string;
  caracteristiques: string;
  voie_id: string | null;
  voie?: { id: string; nom: string; capacites: any };
  demi_elf: boolean;
  image_url?: string;
  data?: any;
}

export interface FamilleRef {
  id: string;
  nom: string;
  groupe: string;
  description: string | null;
  pv_niveau: number;
  de_recuperation: string;
  bonus_chance: number;
  equipement_base: string | null;
  maitrise_equipement: string | null;
  image_url?: string;
  voies?: Array<{ id: string; nom: string; capacites: any }>;
  equipement_associe?: {
    arme_contact?: string[];
    arme_distance?: string[];
    armure?: string[];
  } | null;
}

export interface EquipItem {
  id: string;
  nom: string;
  source: "arme_contact" | "arme_distance" | "armure";
  details?: string;
}
