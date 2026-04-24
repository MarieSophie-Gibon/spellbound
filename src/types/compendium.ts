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
