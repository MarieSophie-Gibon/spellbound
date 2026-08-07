-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP EXTENSION pg_net;

DROP EXTENSION pg_graphql;

CREATE ROLE supabase_privileged_role;

GRANT supabase_privileged_role TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

CREATE TYPE public."actions-type" AS ENUM (
  'Action d''attaque',
  'Action limitée',
  'Action de mouvement',
  'Action gratuite',
  'Bonus de caractéristique',
  'Autre'
);

CREATE TYPE public."armes-type" AS ENUM (
  'Arme légère',
  'Arme à une ou deux mains',
  'Arme à deux mains',
  'Arme à poudre'
);

CREATE TYPE public."voies-type" AS ENUM (
  'famille',
  'peuple',
  'prestige',
  'profil'
);

CREATE TYPE public.dm_type AS ENUM (
  'Contondants',
  'Perforants',
  'Tranchants'
);

CREATE TYPE public.rpg_system AS ENUM (
  'COF',
  'DAGGERHEART'
);

CREATE FUNCTION public._copy_campaign_table (
  p_table   text,
  source_id uuid,
  target_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  col_list text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
  INTO col_list
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = p_table
    AND column_name NOT IN ('id', 'campaign_id', 'created_at', 'updated_at');

  IF col_list IS NULL THEN RETURN; END IF;

  EXECUTE format(
    'INSERT INTO %I (%s, campaign_id) SELECT %s, %L FROM %I WHERE campaign_id = %L',
    p_table, col_list, col_list, target_id, p_table, source_id
  );
END;
$function$;

GRANT ALL ON FUNCTION public._copy_campaign_table(text, uuid, uuid) TO anon;

GRANT ALL ON FUNCTION public._copy_campaign_table(text, uuid, uuid) TO authenticated;

GRANT ALL ON FUNCTION public._copy_campaign_table(text, uuid, uuid) TO service_role;

CREATE FUNCTION public.cleanup_pj_on_campaign_member_delete()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  delete from public.pj
  where campaign_id = old.campaign_id
    and (user_id = old.user_id or player_id = old.user_id);

  return old;
end;
$function$;

GRANT ALL ON FUNCTION public.cleanup_pj_on_campaign_member_delete() TO anon;

GRANT ALL ON FUNCTION public.cleanup_pj_on_campaign_member_delete() TO authenticated;

GRANT ALL ON FUNCTION public.cleanup_pj_on_campaign_member_delete() TO service_role;

CREATE FUNCTION public.duplicate_campaign (
  source_id uuid,
  new_nom   text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  new_campaign_id uuid;
  cat_id_map      jsonb := '{}'::jsonb;
  old_cat         record;
  new_cat_id      uuid;
  old_page        record;
BEGIN
  -- 1. Copie de la campagne
  INSERT INTO campagnes (nom, description, image_url)
  SELECT new_nom, description, image_url
  FROM campagnes WHERE id = source_id
  RETURNING id INTO new_campaign_id;

  -- 2. Copie des catégories (sans parent_id pour l'instant)
  FOR old_cat IN SELECT * FROM categories WHERE campaign_id = source_id LOOP
    INSERT INTO categories (name, parent_id, position_index, campaign_id)
    VALUES (old_cat.name, NULL, old_cat.position_index, new_campaign_id)
    RETURNING id INTO new_cat_id;
    cat_id_map := cat_id_map || jsonb_build_object(old_cat.id::text, new_cat_id::text);
  END LOOP;

  -- Correction des parent_id via la map d'IDs
  UPDATE categories
  SET parent_id = (cat_id_map->>(parent_id::text))::uuid
  WHERE campaign_id = new_campaign_id AND parent_id IS NOT NULL;

  -- 3. Copie des pages grimoire avec remapping category/subcategory
  FOR old_page IN SELECT * FROM wiki_pages WHERE campaign_id = source_id LOOP
    INSERT INTO wiki_pages (title, content, category_id, subcategory_id, position_index, campaign_id, is_public)
    VALUES (
      old_page.title,
      old_page.content,
      CASE WHEN old_page.category_id    IS NOT NULL THEN (cat_id_map->>(old_page.category_id::text))::uuid    ELSE NULL END,
      CASE WHEN old_page.subcategory_id IS NOT NULL THEN (cat_id_map->>(old_page.subcategory_id::text))::uuid ELSE NULL END,
      old_page.position_index,
      new_campaign_id,
      old_page.is_public
    );
  END LOOP;

  -- 4. Personnages
  PERFORM _copy_campaign_table('pj', source_id, new_campaign_id);

  -- 5. Éléments compendium privés à la campagne
  PERFORM _copy_campaign_table('peuples',        source_id, new_campaign_id);
  PERFORM _copy_campaign_table('familles',        source_id, new_campaign_id);
  PERFORM _copy_campaign_table('profils',         source_id, new_campaign_id);
  PERFORM _copy_campaign_table('bestiaire',       source_id, new_campaign_id);
  PERFORM _copy_campaign_table('voies',           source_id, new_campaign_id);
  PERFORM _copy_campaign_table('armes_contact',   source_id, new_campaign_id);
  PERFORM _copy_campaign_table('armes_distance',  source_id, new_campaign_id);
  PERFORM _copy_campaign_table('armures',         source_id, new_campaign_id);
  PERFORM _copy_campaign_table('equipements',     source_id, new_campaign_id);

  RETURN new_campaign_id;
END;
$function$;

GRANT ALL ON FUNCTION public.duplicate_campaign(uuid, text) TO anon;

GRANT ALL ON FUNCTION public.duplicate_campaign(uuid, text) TO authenticated;

GRANT ALL ON FUNCTION public.duplicate_campaign(uuid, text) TO service_role;

CREATE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  INSERT INTO public.utilisateurs (id, pseudo, role)
  VALUES (new.id, split_part(new.email, '@', 1), 'joueur');
  RETURN new;
END;
$function$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;

GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;

GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;

CREATE FUNCTION public.set_campaign_owner_id()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$function$;

GRANT ALL ON FUNCTION public.set_campaign_owner_id() TO anon;

GRANT ALL ON FUNCTION public.set_campaign_owner_id() TO authenticated;

GRANT ALL ON FUNCTION public.set_campaign_owner_id() TO service_role;

CREATE TABLE public.armes_contact (
  id          bigint                   GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  created_at  timestamp with time zone DEFAULT now() NOT NULL,
  nom         text,
  dm          text,
  prix        text,
  type_de_dm  public.dm_type,
  categorie   public."armes-type",
  notes       text,
  image_url   text,
  is_custom   boolean,
  campaign_id uuid
);

ALTER TABLE public.armes_contact
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.armes_contact
  ADD CONSTRAINT armes_contact_pkey PRIMARY KEY (id);

GRANT ALL ON public.armes_contact TO anon;

GRANT ALL ON public.armes_contact TO authenticated;

GRANT ALL ON public.armes_contact TO service_role;

CREATE POLICY "Allow all for authenticated users" ON public.armes_contact
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE public.armes_distance (
  id          bigint                   GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  created_at  timestamp with time zone DEFAULT now() NOT NULL,
  nom         text,
  dm          text,
  prix        text,
  type_de_dm  public.dm_type,
  categorie   public."armes-type",
  notes       text,
  image_url   text,
  portee      text,
  is_custom   boolean,
  campaign_id uuid
);

ALTER TABLE public.armes_distance
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.armes_distance
  ADD CONSTRAINT armes_distance_pkey PRIMARY KEY (id);

GRANT ALL ON public.armes_distance TO anon;

GRANT ALL ON public.armes_distance TO authenticated;

GRANT ALL ON public.armes_distance TO service_role;

CREATE POLICY "Allow all for authenticated users" ON public.armes_distance
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE public.armures (
  id          bigint                   GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  created_at  timestamp with time zone DEFAULT now() NOT NULL,
  nom         text,
  bonus_def   text,
  agi_max     text,
  prix        text,
  image_url   text,
  is_custom   boolean,
  campaign_id uuid
);

ALTER TABLE public.armures
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.armures
  ADD CONSTRAINT armures_pkey PRIMARY KEY (id);

GRANT ALL ON public.armures TO anon;

GRANT ALL ON public.armures TO authenticated;

GRANT ALL ON public.armures TO service_role;

CREATE POLICY "Allow all for authenticated users" ON public.armures
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE public.bestiaire (
  id            uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  created_at    timestamp with time zone DEFAULT now(),
  nom           text                     NOT NULL,
  nc            text                     NOT NULL,
  type_creature text                     DEFAULT 'vivant'::text NOT NULL,
  taille        text                     DEFAULT 'Moyenne'::text NOT NULL,
  is_custom     boolean                  DEFAULT false,
  stats         jsonb                    DEFAULT
    '{"agi": {"mod": 0, "sup": false}, "cha": {"mod": 0, "sup": false}, "con": {"mod": 0, "sup": false}, "for": {"mod": 0, "sup": false}, "int": {"mod": 0, "sup": false}, "per": {"mod": 0, "sup": false}, "vol": {"mod": 0, "sup": false}}'::jsonb NOT NULL,
  combat        jsonb                    DEFAULT '{"pv": 10, "rd": 0, "pv_max": 10, "defense": 10, "initiative": 10, "attaque_magique": null}'::jsonb NOT NULL,
  attaques      jsonb                    DEFAULT '[]'::jsonb NOT NULL,
  capacites     jsonb                    DEFAULT '[]'::jsonb NOT NULL,
  data          jsonb                    DEFAULT '{}'::jsonb,
  campaign_id   uuid,
  image_url     text,
  description   text
);

ALTER TABLE public.bestiaire
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bestiaire
  ADD CONSTRAINT monsters_pkey PRIMARY KEY (id);

GRANT ALL ON public.bestiaire TO anon;

GRANT ALL ON public.bestiaire TO authenticated;

GRANT ALL ON public.bestiaire TO service_role;

CREATE TABLE public.campagnes (
  id          uuid                     DEFAULT gen_random_uuid() NOT NULL,
  nom         text                     NOT NULL,
  description text,
  image_url   text,
  created_at  timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  owner_id    uuid,
  system      public.rpg_system        DEFAULT 'COF'::public.rpg_system
);

CREATE POLICY armes_contact_write ON public.armes_contact
  TO authenticated
  USING (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = armes_contact.campaign_id) AND (c.owner_id = auth.uid()))))))
  WITH CHECK (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = armes_contact.campaign_id) AND (c.owner_id = auth.uid()))))));

CREATE POLICY armes_distance_write ON public.armes_distance
  TO authenticated
  USING (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = armes_distance.campaign_id) AND (c.owner_id = auth.uid()))))))
  WITH CHECK (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = armes_distance.campaign_id) AND (c.owner_id = auth.uid()))))));

CREATE POLICY armures_write ON public.armures
  TO authenticated
  USING (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = armures.campaign_id) AND (c.owner_id = auth.uid()))))))
  WITH CHECK (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = armures.campaign_id) AND (c.owner_id = auth.uid()))))));

CREATE POLICY bestiaire_write ON public.bestiaire
  TO authenticated
  USING (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = bestiaire.campaign_id) AND (c.owner_id = auth.uid()))))))
  WITH CHECK (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = bestiaire.campaign_id) AND (c.owner_id = auth.uid()))))));

ALTER TABLE public.campagnes
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.campagnes
  ADD CONSTRAINT campagnes_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.campagnes
  ADD CONSTRAINT campagnes_pkey PRIMARY KEY (id);

ALTER TABLE public.armes_contact
  ADD CONSTRAINT armes_contact_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id) ON DELETE CASCADE;

ALTER TABLE public.armes_distance
  ADD CONSTRAINT armes_distance_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id) ON DELETE CASCADE;

ALTER TABLE public.armures
  ADD CONSTRAINT armures_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id) ON DELETE CASCADE;

ALTER TABLE public.bestiaire
  ADD CONSTRAINT monsters_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id) ON DELETE CASCADE;

GRANT ALL ON public.campagnes TO anon;

GRANT ALL ON public.campagnes TO authenticated;

GRANT ALL ON public.campagnes TO service_role;

CREATE INDEX idx_campagnes_owner_id ON public.campagnes (owner_id);

CREATE TRIGGER trg_set_campaign_owner_id
  BEFORE INSERT ON public.campagnes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_campaign_owner_id();

CREATE POLICY campagnes_delete_owner ON public.campagnes
  FOR DELETE
  TO authenticated
  USING ((owner_id = auth.uid()));

CREATE POLICY campagnes_insert_owner ON public.campagnes
  FOR INSERT
  TO authenticated
  WITH CHECK ((owner_id = auth.uid()));

CREATE POLICY campagnes_select_authenticated ON public.campagnes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY campagnes_update_owner ON public.campagnes
  FOR UPDATE
  TO authenticated
  USING ((owner_id = auth.uid()))
  WITH CHECK ((owner_id = auth.uid()));

CREATE TABLE public.campaign_invitations (
  id          uuid                     DEFAULT gen_random_uuid() NOT NULL,
  campaign_id uuid                     NOT NULL,
  code        text                     NOT NULL,
  created_by  uuid                     NOT NULL,
  expires_at  timestamp with time zone,
  created_at  timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.campaign_invitations
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.campaign_invitations
  ADD CONSTRAINT campaign_invitations_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id) ON DELETE CASCADE;

ALTER TABLE public.campaign_invitations
  ADD CONSTRAINT campaign_invitations_code_key UNIQUE (code);

ALTER TABLE public.campaign_invitations
  ADD CONSTRAINT campaign_invitations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.campaign_invitations
  ADD CONSTRAINT campaign_invitations_pkey PRIMARY KEY (id);

GRANT ALL ON public.campaign_invitations TO anon;

GRANT ALL ON public.campaign_invitations TO authenticated;

GRANT ALL ON public.campaign_invitations TO service_role;

CREATE POLICY campaign_invitations_access ON public.campaign_invitations
  TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = campaign_invitations.campaign_id) AND (c.owner_id = auth.uid())))) OR (auth.uid() IS NOT NULL)))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = campaign_invitations.campaign_id) AND (c.owner_id = auth.uid())))));

CREATE POLICY campaign_invitations_delete_owner ON public.campaign_invitations
  FOR DELETE
  TO authenticated
  USING ((created_by = auth.uid()));

CREATE TABLE public.campaign_members (
  id          uuid                     DEFAULT gen_random_uuid() NOT NULL,
  campaign_id uuid                     NOT NULL,
  user_id     uuid                     NOT NULL,
  created_at  timestamp with time zone DEFAULT now() NOT NULL
);

CREATE POLICY campaign_invitations_select_owner_or_member ON public.campaign_invitations
  FOR SELECT
  TO authenticated
  USING (((created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.campaign_members cm
  WHERE ((cm.campaign_id = campaign_invitations.campaign_id) AND (cm.user_id = auth.uid()))))));

ALTER TABLE public.campaign_members
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.campaign_members
  ADD CONSTRAINT campaign_members_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id) ON DELETE CASCADE;

ALTER TABLE public.campaign_members
  ADD CONSTRAINT campaign_members_campaign_id_user_id_key UNIQUE (campaign_id, user_id);

ALTER TABLE public.campaign_members
  ADD CONSTRAINT campaign_members_pkey PRIMARY KEY (id);

ALTER TABLE public.campaign_members
  ADD CONSTRAINT campaign_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

GRANT ALL ON public.campaign_members TO anon;

GRANT ALL ON public.campaign_members TO authenticated;

GRANT ALL ON public.campaign_members TO service_role;

CREATE TRIGGER trg_cleanup_pj_on_campaign_member_delete
  AFTER DELETE ON public.campaign_members
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_pj_on_campaign_member_delete();

CREATE POLICY campaign_members_select ON public.campaign_members
  FOR SELECT
  TO authenticated
  USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = campaign_members.campaign_id) AND (c.owner_id = auth.uid()))))));

CREATE POLICY campaign_members_write ON public.campaign_members
  TO authenticated
  USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = campaign_members.campaign_id) AND (c.owner_id = auth.uid()))))))
  WITH CHECK (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = campaign_members.campaign_id) AND (c.owner_id = auth.uid()))))));

CREATE TABLE public.campaign_revealed_monstres (
  id          uuid                     DEFAULT gen_random_uuid() NOT NULL,
  campaign_id uuid                     NOT NULL,
  monstre_id  uuid                     NOT NULL,
  revealed_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.campaign_revealed_monstres
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.campaign_revealed_monstres
  ADD CONSTRAINT campaign_revealed_monstres_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id) ON DELETE CASCADE;

ALTER TABLE public.campaign_revealed_monstres
  ADD CONSTRAINT campaign_revealed_monstres_campaign_id_monstre_id_key UNIQUE (campaign_id, monstre_id);

ALTER TABLE public.campaign_revealed_monstres
  ADD CONSTRAINT campaign_revealed_monstres_monstre_id_fkey FOREIGN KEY (monstre_id) REFERENCES public.bestiaire(id) ON DELETE CASCADE;

ALTER TABLE public.campaign_revealed_monstres
  ADD CONSTRAINT campaign_revealed_monstres_pkey PRIMARY KEY (id);

GRANT ALL ON public.campaign_revealed_monstres TO anon;

GRANT ALL ON public.campaign_revealed_monstres TO authenticated;

GRANT ALL ON public.campaign_revealed_monstres TO service_role;

CREATE POLICY crm_member_select ON public.campaign_revealed_monstres
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.campaign_members
  WHERE ((campaign_members.campaign_id = campaign_revealed_monstres.campaign_id) AND (campaign_members.user_id = auth.uid())))));

CREATE POLICY crm_owner_all ON public.campaign_revealed_monstres
  USING ((EXISTS ( SELECT 1
   FROM public.campagnes
  WHERE ((campagnes.id = campaign_revealed_monstres.campaign_id) AND (campagnes.owner_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.campagnes
  WHERE ((campagnes.id = campaign_revealed_monstres.campaign_id) AND (campagnes.owner_id = auth.uid())))));

CREATE TABLE public.campaign_revealed_pnjs (
  id          uuid                     DEFAULT gen_random_uuid() NOT NULL,
  campaign_id uuid                     NOT NULL,
  pnj_id      uuid                     NOT NULL,
  revealed_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.campaign_revealed_pnjs
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.campaign_revealed_pnjs
  ADD CONSTRAINT campaign_revealed_pnjs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id) ON DELETE CASCADE;

ALTER TABLE public.campaign_revealed_pnjs
  ADD CONSTRAINT campaign_revealed_pnjs_campaign_id_pnj_id_key UNIQUE (campaign_id, pnj_id);

ALTER TABLE public.campaign_revealed_pnjs
  ADD CONSTRAINT campaign_revealed_pnjs_pkey PRIMARY KEY (id);

GRANT ALL ON public.campaign_revealed_pnjs TO anon;

GRANT ALL ON public.campaign_revealed_pnjs TO authenticated;

GRANT ALL ON public.campaign_revealed_pnjs TO service_role;

CREATE POLICY campaign_revealed_pnjs_write ON public.campaign_revealed_pnjs
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = campaign_revealed_pnjs.campaign_id) AND (c.owner_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = campaign_revealed_pnjs.campaign_id) AND (c.owner_id = auth.uid())))));

CREATE TABLE public.categories (
  id             uuid                     DEFAULT gen_random_uuid() NOT NULL,
  name           text                     NOT NULL,
  created_at     timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  parent_id      uuid,
  position_index integer                  DEFAULT 0 NOT NULL,
  campaign_id    uuid
);

ALTER TABLE public.categories
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id) ON DELETE CASCADE;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_name_key UNIQUE (name);

ALTER TABLE public.categories
  ADD CONSTRAINT categories_pkey PRIMARY KEY (id);

ALTER TABLE public.categories
  ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE CASCADE;

GRANT ALL ON public.categories TO anon;

GRANT ALL ON public.categories TO authenticated;

GRANT ALL ON public.categories TO service_role;

CREATE POLICY "Accès total authentifié" ON public.categories
  USING ((auth.role() = 'authenticated'::text))
  WITH CHECK ((auth.role() = 'authenticated'::text));

CREATE POLICY categories_authenticated_all ON public.categories
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE public.chapitres (
  id           uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  scenario_id  uuid                     NOT NULL,
  title        text                     NOT NULL,
  content      jsonb                    DEFAULT '[]'::jsonb NOT NULL,
  ordre        integer                  DEFAULT 0 NOT NULL,
  created_at   timestamp with time zone DEFAULT now(),
  completed    boolean                  DEFAULT false NOT NULL,
  combat_state jsonb                    DEFAULT '{}'::jsonb NOT NULL
);

ALTER TABLE public.chapitres
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.chapitres
  ADD CONSTRAINT chapitres_pkey PRIMARY KEY (id);

GRANT ALL ON public.chapitres TO anon;

GRANT ALL ON public.chapitres TO authenticated;

GRANT ALL ON public.chapitres TO service_role;

CREATE INDEX chapitres_scenario_id_idx ON public.chapitres (scenario_id);

CREATE TABLE public.combat_participants (
  id              uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  created_at      timestamp with time zone DEFAULT now(),
  combat_id       uuid                     NOT NULL,
  entite_id       uuid                     NOT NULL,
  entite_type     text                     NOT NULL,
  nom             text                     NOT NULL,
  image_url       text,
  couleur_bordure text,
  initiative      integer                  DEFAULT 0,
  pv_actuels      integer                  DEFAULT 0 NOT NULL,
  pv_max          integer                  DEFAULT 0 NOT NULL,
  pm_actuels      integer                  DEFAULT 0 NOT NULL,
  pm_max          integer                  DEFAULT 0 NOT NULL,
  etats           jsonb                    DEFAULT '[]'::jsonb NOT NULL,
  est_cache       boolean                  DEFAULT false NOT NULL
);

ALTER TABLE public.combat_participants
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.combat_participants
  ADD CONSTRAINT combat_participants_pkey PRIMARY KEY (id);

GRANT ALL ON public.combat_participants TO anon;

GRANT ALL ON public.combat_participants TO authenticated;

GRANT ALL ON public.combat_participants TO service_role;

CREATE POLICY "Autoriser accès total aux participants" ON public.combat_participants
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE public.combats (
  id               uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  created_at       timestamp with time zone DEFAULT now(),
  campaign_id      uuid                     NOT NULL,
  titre            text                     DEFAULT 'Nouvelle rencontre'::text,
  round_actuel     integer                  DEFAULT 1 NOT NULL,
  tour_actif_index integer                  DEFAULT 0 NOT NULL,
  statut           text                     DEFAULT 'preparation'::text NOT NULL
);

ALTER TABLE public.combats
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.combats
  ADD CONSTRAINT combats_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id) ON DELETE CASCADE;

ALTER TABLE public.combats
  ADD CONSTRAINT combats_pkey PRIMARY KEY (id);

ALTER TABLE public.combat_participants
  ADD CONSTRAINT combat_participants_combat_id_fkey FOREIGN KEY (combat_id) REFERENCES public.combats(id) ON DELETE CASCADE;

GRANT ALL ON public.combats TO anon;

GRANT ALL ON public.combats TO authenticated;

GRANT ALL ON public.combats TO service_role;

CREATE POLICY "Autoriser accès total aux combats" ON public.combats
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE public.equipements (
  id          uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  created_at  timestamp with time zone DEFAULT now(),
  nom         text                     NOT NULL,
  categorie   text                     NOT NULL,
  prix        text,
  is_custom   boolean                  DEFAULT false,
  data        jsonb                    DEFAULT '{}'::jsonb NOT NULL,
  image_url   text,
  campaign_id uuid
);

ALTER TABLE public.equipements
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.equipements
  ADD CONSTRAINT equipements_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id) ON DELETE CASCADE;

ALTER TABLE public.equipements
  ADD CONSTRAINT equipments_pkey PRIMARY KEY (id);

GRANT ALL ON public.equipements TO anon;

GRANT ALL ON public.equipements TO authenticated;

GRANT ALL ON public.equipements TO service_role;

CREATE POLICY "Allow all for authenticated users" ON public.equipements
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY equipements_write ON public.equipements
  TO authenticated
  USING (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = equipements.campaign_id) AND (c.owner_id = auth.uid()))))))
  WITH CHECK (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = equipements.campaign_id) AND (c.owner_id = auth.uid()))))));

CREATE TABLE public.familles (
  id              uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  created_at      timestamp with time zone DEFAULT now(),
  nom             text                     NOT NULL,
  pv_niveau       integer                  NOT NULL,
  de_recuperation text                     NOT NULL,
  bonus_chance    integer                  DEFAULT 0,
  is_custom       boolean                  DEFAULT false,
  campaign_id     uuid,
  notes           text
);

ALTER TABLE public.familles
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.familles
  ADD CONSTRAINT familles_veritables_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id) ON DELETE CASCADE;

ALTER TABLE public.familles
  ADD CONSTRAINT familles_veritables_pkey PRIMARY KEY (id);

GRANT ALL ON public.familles TO anon;

GRANT ALL ON public.familles TO authenticated;

GRANT ALL ON public.familles TO service_role;

CREATE POLICY "Allow delete familles" ON public.familles
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert familles" ON public.familles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow read familles" ON public.familles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY familles_write ON public.familles
  TO authenticated
  USING (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = familles.campaign_id) AND (c.owner_id = auth.uid()))))))
  WITH CHECK (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = familles.campaign_id) AND (c.owner_id = auth.uid()))))));

CREATE TABLE public.peuples (
  id          uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  created_at  timestamp with time zone DEFAULT now(),
  nom         text                     NOT NULL,
  is_custom   boolean                  DEFAULT false,
  description text,
  data        jsonb                    DEFAULT '{}'::jsonb,
  campaign_id uuid,
  image_url   text,
  multi       boolean,
  lore        text
);

ALTER TABLE public.peuples
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.peuples
  ADD CONSTRAINT peuples_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id) ON DELETE CASCADE;

ALTER TABLE public.peuples
  ADD CONSTRAINT peuples_pkey PRIMARY KEY (id);

GRANT ALL ON public.peuples TO anon;

GRANT ALL ON public.peuples TO authenticated;

GRANT ALL ON public.peuples TO service_role;

CREATE POLICY "Autoriser accès total aux peuples pour utilisateurs connectés" ON public.peuples
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY peuples_write ON public.peuples
  TO authenticated
  USING (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = peuples.campaign_id) AND (c.owner_id = auth.uid()))))))
  WITH CHECK (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = peuples.campaign_id) AND (c.owner_id = auth.uid()))))));

CREATE TABLE public.pj (
  id          uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  campaign_id uuid,
  player_id   uuid,
  name        text                     NOT NULL,
  stats       jsonb                    DEFAULT '{}'::jsonb NOT NULL,
  pathways    jsonb                    DEFAULT '[]'::jsonb NOT NULL,
  inventory   jsonb                    DEFAULT '[]'::jsonb NOT NULL,
  created_at  timestamp with time zone DEFAULT now(),
  image_url   text,
  bourse_pa   integer                  DEFAULT 0 NOT NULL,
  bourse_po   integer                  DEFAULT 0 NOT NULL,
  bourse_pc   integer                  DEFAULT 0 NOT NULL,
  peuple_id   uuid,
  profils_id  uuid,
  user_id     uuid
);

CREATE POLICY armes_contact_select ON public.armes_contact
  FOR SELECT
  TO authenticated
  USING (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = armes_contact.campaign_id) AND ((c.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.campaign_members m
          WHERE ((m.campaign_id = c.id) AND (m.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.pj p
          WHERE ((p.campaign_id = c.id) AND (p.user_id = auth.uid()))))))))));

CREATE POLICY armes_distance_select ON public.armes_distance
  FOR SELECT
  TO authenticated
  USING (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = armes_distance.campaign_id) AND ((c.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.campaign_members m
          WHERE ((m.campaign_id = c.id) AND (m.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.pj p
          WHERE ((p.campaign_id = c.id) AND (p.user_id = auth.uid()))))))))));

CREATE POLICY armures_select ON public.armures
  FOR SELECT
  TO authenticated
  USING (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = armures.campaign_id) AND ((c.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.campaign_members m
          WHERE ((m.campaign_id = c.id) AND (m.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.pj p
          WHERE ((p.campaign_id = c.id) AND (p.user_id = auth.uid()))))))))));

CREATE POLICY bestiaire_select ON public.bestiaire
  FOR SELECT
  TO authenticated
  USING (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = bestiaire.campaign_id) AND ((c.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.campaign_members m
          WHERE ((m.campaign_id = c.id) AND (m.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.pj p
          WHERE ((p.campaign_id = c.id) AND (p.user_id = auth.uid()))))))))));

CREATE POLICY crm_pj_select ON public.campaign_revealed_monstres
  FOR SELECT
  USING ((EXISTS ( SELECT 1
   FROM public.pj
  WHERE ((pj.campaign_id = campaign_revealed_monstres.campaign_id) AND (pj.user_id = auth.uid())))));

CREATE POLICY campaign_revealed_pnjs_select ON public.campaign_revealed_pnjs
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = campaign_revealed_pnjs.campaign_id) AND ((c.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.campaign_members m
          WHERE ((m.campaign_id = c.id) AND (m.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.pj p
          WHERE ((p.campaign_id = c.id) AND (p.user_id = auth.uid())))))))));

CREATE POLICY equipements_select ON public.equipements
  FOR SELECT
  TO authenticated
  USING (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = equipements.campaign_id) AND ((c.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.campaign_members m
          WHERE ((m.campaign_id = c.id) AND (m.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.pj p
          WHERE ((p.campaign_id = c.id) AND (p.user_id = auth.uid()))))))))));

CREATE POLICY familles_select ON public.familles
  FOR SELECT
  TO authenticated
  USING (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = familles.campaign_id) AND ((c.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.campaign_members m
          WHERE ((m.campaign_id = c.id) AND (m.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.pj p
          WHERE ((p.campaign_id = c.id) AND (p.user_id = auth.uid()))))))))));

CREATE POLICY peuples_select ON public.peuples
  FOR SELECT
  TO authenticated
  USING (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = peuples.campaign_id) AND ((c.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.campaign_members m
          WHERE ((m.campaign_id = c.id) AND (m.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.pj p
          WHERE ((p.campaign_id = c.id) AND (p.user_id = auth.uid()))))))))));

ALTER TABLE public.pj
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pj
  ADD CONSTRAINT characters_pkey PRIMARY KEY (id);

ALTER TABLE public.pj
  ADD CONSTRAINT characters_player_id_fkey FOREIGN KEY (player_id) REFERENCES auth.users(id);

ALTER TABLE public.pj
  ADD CONSTRAINT pj_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

GRANT ALL ON public.pj TO anon;

GRANT ALL ON public.pj TO authenticated;

GRANT ALL ON public.pj TO service_role;

CREATE POLICY pj_delete_owner_or_self ON public.pj
  FOR DELETE
  TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = pj.campaign_id) AND (c.owner_id = auth.uid())))) OR (user_id = auth.uid())));

CREATE POLICY pj_insert_owner_or_self ON public.pj
  FOR INSERT
  TO authenticated
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = pj.campaign_id) AND (c.owner_id = auth.uid())))) OR (user_id = auth.uid())));

CREATE POLICY pj_select_campaign_access ON public.pj
  FOR SELECT
  TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = pj.campaign_id) AND (c.owner_id = auth.uid())))) OR (user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.campaign_members m
  WHERE ((m.campaign_id = pj.campaign_id) AND (m.user_id = auth.uid()))))));

CREATE POLICY pj_update_owner_or_self ON public.pj
  FOR UPDATE
  TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = pj.campaign_id) AND (c.owner_id = auth.uid())))) OR (user_id = auth.uid())))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = pj.campaign_id) AND (c.owner_id = auth.uid())))) OR (user_id = auth.uid())));

CREATE TABLE public.pj_familiers (
  id                uuid                     DEFAULT gen_random_uuid() NOT NULL,
  pj_id             uuid,
  pnj_id            uuid,
  monster_id        uuid,
  monster_nom       text                     NOT NULL,
  monster_image_url text,
  custom_name       text,
  pv                integer                  DEFAULT 0 NOT NULL,
  pv_max            integer                  DEFAULT 0 NOT NULL,
  notes             text,
  created_at        timestamp with time zone DEFAULT now() NOT NULL,
  data              jsonb                    DEFAULT '{}'::jsonb,
  ally_pnj_id       uuid
);

ALTER TABLE public.pj_familiers
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pj_familiers
  ADD CONSTRAINT one_owner CHECK (((pj_id IS NOT NULL)::integer + (pnj_id IS NOT NULL)::integer) = 1);

ALTER TABLE public.pj_familiers
  ADD CONSTRAINT pj_familiers_has_source CHECK (monster_id IS NOT NULL OR ally_pnj_id IS NOT NULL);

ALTER TABLE public.pj_familiers
  ADD CONSTRAINT pj_familiers_pj_id_fkey FOREIGN KEY (pj_id) REFERENCES public.pj(id) ON DELETE CASCADE;

ALTER TABLE public.pj_familiers
  ADD CONSTRAINT pj_familiers_pkey PRIMARY KEY (id);

GRANT ALL ON public.pj_familiers TO anon;

GRANT ALL ON public.pj_familiers TO authenticated;

GRANT ALL ON public.pj_familiers TO service_role;

CREATE POLICY "Accès total authentifié" ON public.pj_familiers
  USING ((auth.role() = 'authenticated'::text))
  WITH CHECK ((auth.role() = 'authenticated'::text));

CREATE TABLE public.pj_inventaire (
  id                 uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  pj_id              uuid                     NOT NULL,
  item_type          text                     NOT NULL,
  item_id            bigint,
  nom_custom         text,
  description_custom text,
  qte                integer                  DEFAULT 1 NOT NULL,
  is_equipped        boolean                  DEFAULT false NOT NULL,
  created_at         timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.pj_inventaire
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pj_inventaire
  ADD CONSTRAINT pj_inventaire_pj_id_fkey FOREIGN KEY (pj_id) REFERENCES public.pj(id) ON DELETE CASCADE;

ALTER TABLE public.pj_inventaire
  ADD CONSTRAINT pj_inventaire_pkey PRIMARY KEY (id);

GRANT ALL ON public.pj_inventaire TO anon;

GRANT ALL ON public.pj_inventaire TO authenticated;

GRANT ALL ON public.pj_inventaire TO service_role;

CREATE POLICY "Acces total pj_inventaire" ON public.pj_inventaire
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY pj_inventaire_access ON public.pj_inventaire
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.pj p
  WHERE ((p.id = pj_inventaire.pj_id) AND ((p.user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.campagnes c
          WHERE ((c.id = p.campaign_id) AND ((c.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
                   FROM public.campaign_members m
                  WHERE ((m.campaign_id = c.id) AND (m.user_id = auth.uid())))))))))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.pj p
  WHERE ((p.id = pj_inventaire.pj_id) AND ((p.user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.campagnes c
          WHERE ((c.id = p.campaign_id) AND (c.owner_id = auth.uid())))))))));

CREATE TABLE public.pnj (
  id          uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  campaign_id uuid,
  name        text                     NOT NULL,
  stats       jsonb                    DEFAULT '{}'::jsonb NOT NULL,
  pathways    jsonb                    DEFAULT '[]'::jsonb NOT NULL,
  inventory   jsonb                    DEFAULT '[]'::jsonb NOT NULL,
  created_at  timestamp with time zone DEFAULT now(),
  image_url   text,
  peuple_id   uuid,
  profils_id  uuid
);

CREATE POLICY pj_familiers_access ON public.pj_familiers
  TO authenticated
  USING ((((pj_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.pj p
  WHERE ((p.id = pj_familiers.pj_id) AND ((p.user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.campagnes c
          WHERE ((c.id = p.campaign_id) AND ((c.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
                   FROM public.campaign_members m
                  WHERE ((m.campaign_id = c.id) AND (m.user_id = auth.uid()))))))))))))) OR ((pnj_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (public.pnj n
     JOIN public.campagnes c ON ((c.id = n.campaign_id)))
  WHERE ((n.id = pj_familiers.pnj_id) AND ((c.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.campaign_members m
          WHERE ((m.campaign_id = c.id) AND (m.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.pj pp
          WHERE ((pp.campaign_id = c.id) AND (pp.user_id = auth.uid())))))))))))
  WITH CHECK ((((pj_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.pj p
  WHERE ((p.id = pj_familiers.pj_id) AND ((p.user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.campagnes c
          WHERE ((c.id = p.campaign_id) AND (c.owner_id = auth.uid()))))))))) OR ((pnj_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (public.pnj n
     JOIN public.campagnes c ON ((c.id = n.campaign_id)))
  WHERE ((n.id = pj_familiers.pnj_id) AND (c.owner_id = auth.uid())))))));

ALTER TABLE public.pnj
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pnj
  ADD CONSTRAINT pnj_pkey PRIMARY KEY (id);

ALTER TABLE public.campaign_revealed_pnjs
  ADD CONSTRAINT campaign_revealed_pnjs_pnj_id_fkey FOREIGN KEY (pnj_id) REFERENCES public.pnj(id) ON DELETE CASCADE;

ALTER TABLE public.pj_familiers
  ADD CONSTRAINT pj_familiers_ally_pnj_id_fkey FOREIGN KEY (ally_pnj_id) REFERENCES public.pnj(id) ON DELETE SET NULL;

ALTER TABLE public.pj_familiers
  ADD CONSTRAINT pj_familiers_pnj_id_fkey FOREIGN KEY (pnj_id) REFERENCES public.pnj(id) ON DELETE CASCADE;

GRANT ALL ON public.pnj TO anon;

GRANT ALL ON public.pnj TO authenticated;

GRANT ALL ON public.pnj TO service_role;

CREATE POLICY pnj_select_campaign_access ON public.pnj
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = pnj.campaign_id) AND ((c.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.campaign_members m
          WHERE ((m.campaign_id = c.id) AND (m.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.pj p
          WHERE ((p.campaign_id = c.id) AND (p.user_id = auth.uid())))))))));

CREATE POLICY pnj_write_owner ON public.pnj
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = pnj.campaign_id) AND (c.owner_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = pnj.campaign_id) AND (c.owner_id = auth.uid())))));

CREATE TABLE public.profils (
  id                  uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  created_at          timestamp with time zone DEFAULT now(),
  nom                 text                     NOT NULL,
  description         text,
  is_custom           boolean                  DEFAULT false,
  data                jsonb                    DEFAULT '{}'::jsonb,
  campaign_id         uuid,
  image_url           text,
  equipement_base     text,
  maitrise_equipement text,
  lore                text,
  equipements_data    jsonb                    DEFAULT '[]'::jsonb,
  famille_id          uuid
);

ALTER TABLE public.profils
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profils
  ADD CONSTRAINT profils_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id) ON DELETE CASCADE;

ALTER TABLE public.profils
  ADD CONSTRAINT profils_famille_id_fkey FOREIGN KEY (famille_id) REFERENCES public.familles(id) ON DELETE CASCADE;

ALTER TABLE public.profils
  ADD CONSTRAINT profils_pkey PRIMARY KEY (id);

GRANT ALL ON public.profils TO anon;

GRANT ALL ON public.profils TO authenticated;

GRANT ALL ON public.profils TO service_role;

CREATE POLICY profils_select ON public.profils
  FOR SELECT
  TO authenticated
  USING (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = profils.campaign_id) AND ((c.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.campaign_members m
          WHERE ((m.campaign_id = c.id) AND (m.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.pj p
          WHERE ((p.campaign_id = c.id) AND (p.user_id = auth.uid()))))))))));

CREATE POLICY profils_write ON public.profils
  TO authenticated
  USING (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = profils.campaign_id) AND (c.owner_id = auth.uid()))))))
  WITH CHECK (((campaign_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = profils.campaign_id) AND (c.owner_id = auth.uid()))))));

CREATE TABLE public.scenarios (
  id           uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  campaign_id  uuid,
  title        text                     NOT NULL,
  description  text,
  image_url    text,
  content      jsonb                    DEFAULT '[]'::jsonb,
  is_completed boolean                  DEFAULT false NOT NULL,
  ordre        integer                  DEFAULT 0 NOT NULL,
  created_at   timestamp with time zone DEFAULT now()
);

CREATE POLICY chapitres_select_campaign_access ON public.chapitres
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (public.scenarios s
     JOIN public.campagnes c ON ((c.id = s.campaign_id)))
  WHERE ((s.id = chapitres.scenario_id) AND (c.owner_id = auth.uid())))));

ALTER TABLE public.scenarios
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.scenarios
  ADD CONSTRAINT scenarios_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id) ON DELETE CASCADE;

ALTER TABLE public.scenarios
  ADD CONSTRAINT scenarios_pkey PRIMARY KEY (id);

ALTER TABLE public.chapitres
  ADD CONSTRAINT chapitres_scenario_id_fkey FOREIGN KEY (scenario_id) REFERENCES public.scenarios(id) ON DELETE CASCADE;

GRANT ALL ON public.scenarios TO anon;

GRANT ALL ON public.scenarios TO authenticated;

GRANT ALL ON public.scenarios TO service_role;

CREATE POLICY "Autoriser l'accès total aux scénarios pour les utilisateurs c" ON public.scenarios
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY scenarios_select_campaign_access ON public.scenarios
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.campagnes c
  WHERE ((c.id = scenarios.campaign_id) AND (c.owner_id = auth.uid())))));

CREATE TABLE public.unlocked_content (
  id           uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  character_id uuid,
  entity_id    uuid,
  unlocked_at  timestamp with time zone DEFAULT now()
);

ALTER TABLE public.unlocked_content
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.unlocked_content
  ADD CONSTRAINT unlocked_content_character_id_entity_id_key UNIQUE (character_id, entity_id);

ALTER TABLE public.unlocked_content
  ADD CONSTRAINT unlocked_content_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.pj(id) ON DELETE CASCADE;

ALTER TABLE public.unlocked_content
  ADD CONSTRAINT unlocked_content_pkey PRIMARY KEY (id);

GRANT ALL ON public.unlocked_content TO anon;

GRANT ALL ON public.unlocked_content TO authenticated;

GRANT ALL ON public.unlocked_content TO service_role;

CREATE TABLE public.utilisateurs (
  id         uuid                     NOT NULL,
  pseudo     text,
  role       text                     DEFAULT 'joueur'::text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  image_url  text
);

CREATE POLICY campaign_invitations_insert_mj ON public.campaign_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (((created_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.utilisateurs u
  WHERE ((u.id = auth.uid()) AND (u.role = 'mj'::text))))));

ALTER TABLE public.utilisateurs
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.utilisateurs
  ADD CONSTRAINT utilisateurs_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.utilisateurs
  ADD CONSTRAINT utilisateurs_pkey PRIMARY KEY (id);

ALTER TABLE public.utilisateurs
  ADD CONSTRAINT utilisateurs_role_check CHECK (role = ANY (ARRAY['joueur'::text, 'mj'::text]));

GRANT ALL ON public.utilisateurs TO anon;

GRANT ALL ON public.utilisateurs TO authenticated;

GRANT ALL ON public.utilisateurs TO service_role;

CREATE POLICY utilisateurs_select ON public.utilisateurs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY utilisateurs_write ON public.utilisateurs
  TO authenticated
  USING ((id = auth.uid()))
  WITH CHECK ((id = auth.uid()));

CREATE TABLE public.voies (
  id          uuid                     DEFAULT extensions.uuid_generate_v4() NOT NULL,
  created_at  timestamp with time zone DEFAULT now(),
  nom         text                     NOT NULL,
  type        public."voies-type"      NOT NULL,
  peuple_id   uuid,
  profil_id   uuid,
  is_custom   boolean                  DEFAULT false,
  capacites   jsonb                    DEFAULT
    '{"rang1": {"nom": "", "type": "passif", "description": ""}, "rang2": {"nom": "", "type": "passif", "description": ""}, "rang3": {"nom": "", "type": "passif", "description": ""}, "rang4": {"nom": "", "type": "passif", "description": ""}, "rang5": {"nom": "", "type": "passif", "description": ""}}'::jsonb,
  campaign_id uuid,
  famille_id  uuid,
  notes       text
);

ALTER TABLE public.voies
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.voies
  ADD CONSTRAINT voies_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id) ON DELETE CASCADE;

ALTER TABLE public.voies
  ADD CONSTRAINT voies_famille_id_fkey FOREIGN KEY (profil_id) REFERENCES public.profils(id) ON DELETE CASCADE;

ALTER TABLE public.voies
  ADD CONSTRAINT voies_famille_id_fkey1 FOREIGN KEY (famille_id) REFERENCES public.familles(id) ON DELETE SET NULL;

ALTER TABLE public.voies
  ADD CONSTRAINT voies_peuple_id_fkey FOREIGN KEY (peuple_id) REFERENCES public.peuples(id) ON DELETE CASCADE;

ALTER TABLE public.voies
  ADD CONSTRAINT voies_pkey PRIMARY KEY (id);

GRANT ALL ON public.voies TO anon;

GRANT ALL ON public.voies TO authenticated;

GRANT ALL ON public.voies TO service_role;

CREATE POLICY "Autoriser accès total aux voies pour utilisateurs connectés" ON public.voies
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY voies_authenticated_all ON public.voies
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE public.wiki_pages (
  id             uuid                     DEFAULT gen_random_uuid() NOT NULL,
  title          text                     NOT NULL,
  content        text,
  category_id    uuid,
  created_at     timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  campaign_id    uuid,
  position_index integer                  DEFAULT 0 NOT NULL,
  subcategory_id uuid,
  is_public      boolean                  DEFAULT false NOT NULL
);

ALTER TABLE public.wiki_pages
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.wiki_pages
  ADD CONSTRAINT wiki_pages_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campagnes(id) ON DELETE CASCADE;

ALTER TABLE public.wiki_pages
  ADD CONSTRAINT wiki_pages_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;

ALTER TABLE public.wiki_pages
  ADD CONSTRAINT wiki_pages_pkey PRIMARY KEY (id);

ALTER TABLE public.wiki_pages
  ADD CONSTRAINT wiki_pages_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.categories(id) ON DELETE SET NULL;

GRANT ALL ON public.wiki_pages TO anon;

GRANT ALL ON public.wiki_pages TO authenticated;

GRANT ALL ON public.wiki_pages TO service_role;

CREATE INDEX idx_wiki_pages_category ON public.wiki_pages (category_id);

CREATE INDEX idx_wiki_pages_subcategory ON public.wiki_pages (subcategory_id);

CREATE POLICY wiki_pages_authenticated_all ON public.wiki_pages
  TO authenticated
  USING (true)
  WITH CHECK (true);
