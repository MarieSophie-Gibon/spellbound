-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.pj (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  campaign_id uuid,
  player_id uuid,
  name text NOT NULL,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  pathways jsonb NOT NULL DEFAULT '[]'::jsonb,
  inventory jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  image_url text,
  bourse_pa integer NOT NULL DEFAULT 0,
  bourse_po integer NOT NULL DEFAULT 0,
  bourse_pc integer NOT NULL DEFAULT 0,
  peuple_id uuid,
  profils_id uuid,
  user_id uuid,
  CONSTRAINT pj_pkey PRIMARY KEY (id),
  CONSTRAINT characters_player_id_fkey FOREIGN KEY (player_id) REFERENCES auth.users(id),
  CONSTRAINT pj_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.unlocked_content (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  character_id uuid,
  entity_id uuid,
  unlocked_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unlocked_content_pkey PRIMARY KEY (id),
  CONSTRAINT unlocked_content_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.pj(id)
);
CREATE TABLE public.peuples (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  nom text NOT NULL,
  is_custom boolean DEFAULT false,
  description text,
  data jsonb DEFAULT '{}'::jsonb,
  campaign_id uuid,
  image_url text,
  multi boolean,
  lore text,
  CONSTRAINT peuples_pkey PRIMARY KEY (id),
  CONSTRAINT peuples_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id)
);
CREATE TABLE public.profils (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  nom text NOT NULL,
  description text,
  is_custom boolean DEFAULT false,
  data jsonb DEFAULT '{}'::jsonb,
  campaign_id uuid,
  image_url text,
  equipement_base text,
  maitrise_equipement text,
  lore text,
  equipements_data jsonb DEFAULT '[]'::jsonb,
  famille_id uuid,
  CONSTRAINT profils_pkey PRIMARY KEY (id),
  CONSTRAINT profils_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id),
  CONSTRAINT profils_famille_id_fkey FOREIGN KEY (famille_id) REFERENCES public.familles(id)
);
CREATE TABLE public.voies (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  nom text NOT NULL,
  type USER-DEFINED NOT NULL,
  peuple_id uuid,
  profil_id uuid,
  is_custom boolean DEFAULT false,
  capacites jsonb DEFAULT '{"rang1": {"nom": "", "type": "passif", "description": ""}, "rang2": {"nom": "", "type": "passif", "description": ""}, "rang3": {"nom": "", "type": "passif", "description": ""}, "rang4": {"nom": "", "type": "passif", "description": ""}, "rang5": {"nom": "", "type": "passif", "description": ""}}'::jsonb,
  campaign_id uuid,
  famille_id uuid,
  notes text,
  CONSTRAINT voies_pkey PRIMARY KEY (id),
  CONSTRAINT voies_peuple_id_fkey FOREIGN KEY (peuple_id) REFERENCES public.peuples(id),
  CONSTRAINT voies_famille_id_fkey FOREIGN KEY (profil_id) REFERENCES public.profils(id),
  CONSTRAINT voies_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id),
  CONSTRAINT voies_famille_id_fkey1 FOREIGN KEY (famille_id) REFERENCES public.familles(id)
);
CREATE TABLE public.bestiaire (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  nom text NOT NULL,
  nc text NOT NULL,
  type_creature text NOT NULL DEFAULT 'vivant'::text,
  taille text NOT NULL DEFAULT 'Moyenne'::text,
  is_custom boolean DEFAULT false,
  stats jsonb NOT NULL DEFAULT '{"agi": {"mod": 0, "sup": false}, "cha": {"mod": 0, "sup": false}, "con": {"mod": 0, "sup": false}, "for": {"mod": 0, "sup": false}, "int": {"mod": 0, "sup": false}, "per": {"mod": 0, "sup": false}, "vol": {"mod": 0, "sup": false}}'::jsonb,
  combat jsonb NOT NULL DEFAULT '{"pv": 10, "rd": 0, "pv_max": 10, "defense": 10, "initiative": 10, "attaque_magique": null}'::jsonb,
  attaques jsonb NOT NULL DEFAULT '[]'::jsonb,
  capacites jsonb NOT NULL DEFAULT '[]'::jsonb,
  data jsonb DEFAULT '{}'::jsonb,
  campaign_id uuid,
  image_url text,
  description text,
  CONSTRAINT bestiaire_pkey PRIMARY KEY (id),
  CONSTRAINT monsters_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id)
);
CREATE TABLE public.equipements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  nom text NOT NULL,
  categorie text NOT NULL,
  prix text,
  is_custom boolean DEFAULT false,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_url text,
  campaign_id uuid,
  CONSTRAINT equipements_pkey PRIMARY KEY (id),
  CONSTRAINT equipements_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id)
);
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  parent_id uuid,
  position_index integer NOT NULL DEFAULT 0,
  campaign_id uuid,
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id),
  CONSTRAINT categories_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id)
);
CREATE TABLE public.wiki_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  category_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  campaign_id uuid,
  position_index integer NOT NULL DEFAULT 0,
  subcategory_id uuid,
  is_public boolean NOT NULL DEFAULT false,
  system USER-DEFINED DEFAULT 'COF'::rpg_system,
  CONSTRAINT wiki_pages_pkey PRIMARY KEY (id),
  CONSTRAINT wiki_pages_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT wiki_pages_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id),
  CONSTRAINT wiki_pages_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.categories(id)
);
CREATE TABLE public.campagnes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  description text,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  owner_id uuid,
  system USER-DEFINED DEFAULT 'COF'::rpg_system,
  CONSTRAINT campagnes_pkey PRIMARY KEY (id),
  CONSTRAINT campagnes_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);
CREATE TABLE public.utilisateurs (
  id uuid NOT NULL,
  pseudo text,
  role text DEFAULT 'joueur'::text CHECK (role = ANY (ARRAY['joueur'::text, 'mj'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  image_url text,
  CONSTRAINT utilisateurs_pkey PRIMARY KEY (id),
  CONSTRAINT utilisateurs_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.pnj (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  campaign_id uuid,
  name text NOT NULL,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  pathways jsonb NOT NULL DEFAULT '[]'::jsonb,
  inventory jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  image_url text,
  peuple_id uuid,
  profils_id uuid,
  CONSTRAINT pnj_pkey PRIMARY KEY (id)
);
CREATE TABLE public.armes_contact (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  nom text,
  dm text,
  prix text,
  type_de_dm USER-DEFINED,
  categorie USER-DEFINED,
  notes text,
  image_url text,
  is_custom boolean,
  campaign_id uuid,
  CONSTRAINT armes_contact_pkey PRIMARY KEY (id),
  CONSTRAINT armes_contact_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id)
);
CREATE TABLE public.armes_distance (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  nom text,
  dm text,
  prix text,
  type_de_dm USER-DEFINED,
  categorie USER-DEFINED,
  notes text,
  image_url text,
  portee text,
  is_custom boolean,
  campaign_id uuid,
  CONSTRAINT armes_distance_pkey PRIMARY KEY (id),
  CONSTRAINT armes_distance_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id)
);
CREATE TABLE public.armures (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  nom text,
  bonus_def text,
  agi_max text,
  prix text,
  image_url text,
  is_custom boolean,
  campaign_id uuid,
  CONSTRAINT armures_pkey PRIMARY KEY (id),
  CONSTRAINT armures_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id)
);
CREATE TABLE public.combats (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  campaign_id uuid NOT NULL,
  titre text DEFAULT 'Nouvelle rencontre'::text,
  round_actuel integer NOT NULL DEFAULT 1,
  tour_actif_index integer NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'preparation'::text,
  CONSTRAINT combats_pkey PRIMARY KEY (id),
  CONSTRAINT combats_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id)
);
CREATE TABLE public.combat_participants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  combat_id uuid NOT NULL,
  entite_id uuid NOT NULL,
  entite_type text NOT NULL,
  nom text NOT NULL,
  image_url text,
  couleur_bordure text,
  initiative integer DEFAULT 0,
  pv_actuels integer NOT NULL DEFAULT 0,
  pv_max integer NOT NULL DEFAULT 0,
  pm_actuels integer NOT NULL DEFAULT 0,
  pm_max integer NOT NULL DEFAULT 0,
  etats jsonb NOT NULL DEFAULT '[]'::jsonb,
  est_cache boolean NOT NULL DEFAULT false,
  CONSTRAINT combat_participants_pkey PRIMARY KEY (id),
  CONSTRAINT combat_participants_combat_id_fkey FOREIGN KEY (combat_id) REFERENCES public.combats(id)
);
CREATE TABLE public.familles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  nom text NOT NULL,
  pv_niveau integer NOT NULL,
  de_recuperation text NOT NULL,
  bonus_chance integer DEFAULT 0,
  is_custom boolean DEFAULT false,
  campaign_id uuid,
  notes text,
  CONSTRAINT familles_pkey PRIMARY KEY (id),
  CONSTRAINT familles_veritables_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id)
);
CREATE TABLE public.scenarios (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  campaign_id uuid,
  title text NOT NULL,
  description text,
  image_url text,
  content jsonb DEFAULT '[]'::jsonb,
  is_completed boolean NOT NULL DEFAULT false,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scenarios_pkey PRIMARY KEY (id),
  CONSTRAINT scenarios_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id)
);
CREATE TABLE public.pj_inventaire (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  pj_id uuid NOT NULL,
  item_type text NOT NULL,
  item_id bigint,
  nom_custom text,
  description_custom text,
  qte integer NOT NULL DEFAULT 1,
  is_equipped boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pj_inventaire_pkey PRIMARY KEY (id),
  CONSTRAINT pj_inventaire_pj_id_fkey FOREIGN KEY (pj_id) REFERENCES public.pj(id)
);
CREATE TABLE public.chapitres (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  scenario_id uuid NOT NULL,
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  completed boolean NOT NULL DEFAULT false,
  combat_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT chapitres_pkey PRIMARY KEY (id),
  CONSTRAINT chapitres_scenario_id_fkey FOREIGN KEY (scenario_id) REFERENCES public.scenarios(id)
);
CREATE TABLE public.campaign_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT campaign_members_pkey PRIMARY KEY (id),
  CONSTRAINT campaign_members_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id),
  CONSTRAINT campaign_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.campaign_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT campaign_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT campaign_invitations_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id),
  CONSTRAINT campaign_invitations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.campaign_revealed_pnjs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  pnj_id uuid NOT NULL,
  revealed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT campaign_revealed_pnjs_pkey PRIMARY KEY (id),
  CONSTRAINT campaign_revealed_pnjs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id),
  CONSTRAINT campaign_revealed_pnjs_pnj_id_fkey FOREIGN KEY (pnj_id) REFERENCES public.pnj(id)
);
CREATE TABLE public.pj_familiers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pj_id uuid,
  pnj_id uuid,
  monster_id uuid,
  monster_nom text NOT NULL,
  monster_image_url text,
  custom_name text,
  pv integer NOT NULL DEFAULT 0,
  pv_max integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  data jsonb DEFAULT '{}'::jsonb,
  ally_pnj_id uuid,
  CONSTRAINT pj_familiers_pkey PRIMARY KEY (id),
  CONSTRAINT pj_familiers_pj_id_fkey FOREIGN KEY (pj_id) REFERENCES public.pj(id),
  CONSTRAINT pj_familiers_pnj_id_fkey FOREIGN KEY (pnj_id) REFERENCES public.pnj(id),
  CONSTRAINT pj_familiers_ally_pnj_id_fkey FOREIGN KEY (ally_pnj_id) REFERENCES public.pnj(id)
);
CREATE TABLE public.campaign_revealed_monstres (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  monstre_id uuid NOT NULL,
  revealed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT campaign_revealed_monstres_pkey PRIMARY KEY (id),
  CONSTRAINT campaign_revealed_monstres_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id),
  CONSTRAINT campaign_revealed_monstres_monstre_id_fkey FOREIGN KEY (monstre_id) REFERENCES public.bestiaire(id)
);
CREATE TABLE public.dnd_classes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  summary text,
  description text,
  source_book text,
  version_tag text NOT NULL DEFAULT '2024'::text,
  primary_ability text,
  hit_die text,
  saving_throw_proficiencies ARRAY NOT NULL DEFAULT '{}'::text[],
  skill_choices_count integer NOT NULL DEFAULT 0 CHECK (skill_choices_count >= 0),
  weapon_proficiencies ARRAY NOT NULL DEFAULT '{}'::text[],
  armor_training ARRAY NOT NULL DEFAULT '{}'::text[],
  tool_proficiencies ARRAY NOT NULL DEFAULT '{}'::text[],
  spellcasting_ability text,
  multiclass_requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  starting_equipment_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  campaign_id uuid,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  is_custom boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dnd_classes_pkey PRIMARY KEY (id),
  CONSTRAINT dnd_classes_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id)
);
CREATE TABLE public.dnd_class_progression (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  level integer NOT NULL CHECK (level >= 1 AND level <= 20),
  proficiency_bonus integer NOT NULL,
  class_features_summary text,
  class_resource_die text,
  cantrips_known integer,
  spells_prepared integer,
  spell_slots ARRAY NOT NULL DEFAULT '{0,0,0,0,0,0,0,0,0}'::smallint[] CHECK (COALESCE(cardinality(spell_slots), 0) = 9),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dnd_class_progression_pkey PRIMARY KEY (id),
  CONSTRAINT dnd_class_progression_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.dnd_classes(id)
);
CREATE TABLE public.dnd_class_features (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  level integer NOT NULL CHECK (level >= 1 AND level <= 20),
  name text NOT NULL,
  description text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dnd_class_features_pkey PRIMARY KEY (id),
  CONSTRAINT dnd_class_features_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.dnd_classes(id)
);
CREATE TABLE public.dnd_subclasses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  name text NOT NULL,
  entry_level integer NOT NULL DEFAULT 3 CHECK (entry_level >= 1 AND entry_level <= 20),
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dnd_subclasses_pkey PRIMARY KEY (id),
  CONSTRAINT dnd_subclasses_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.dnd_classes(id)
);
CREATE TABLE public.dnd_subclass_features (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subclass_id uuid NOT NULL,
  level integer NOT NULL CHECK (level >= 1 AND level <= 20),
  name text NOT NULL,
  description text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dnd_subclass_features_pkey PRIMARY KEY (id),
  CONSTRAINT dnd_subclass_features_subclass_id_fkey FOREIGN KEY (subclass_id) REFERENCES public.dnd_subclasses(id)
);