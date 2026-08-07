-- Migration: Add multi-system support to Grimoire (wiki_pages + categories)
-- Strategy:
--   • Approach A  → wiki_pages, categories  (generic structure, shared across RPG systems)
--   • Approach B  → all COF compendium tables (bestiaire, peuples, familles, profils,
--                   voies, armes_*, armures, equipements) — kept COF-only for now.
--
-- For rows that are global (campaign_id IS NULL)  : system column is the source of truth.
-- For rows that are campaign-scoped               : system is copied from campagnes.system
--                                                   (redundant but keeps queries simple).

-- ─── 0. Extend the ENUM ─────────────────────────────────────────────────────
-- DND5E was referenced in planning but not yet in the schema.
ALTER TYPE public.rpg_system ADD VALUE IF NOT EXISTS 'DND5E';


-- ─── 1. categories ──────────────────────────────────────────────────────────

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS system public.rpg_system;

-- Backfill: campaign-scoped rows inherit their campaign's system,
-- global rows default to COF (all existing data is COF).
UPDATE public.categories c
SET system = COALESCE(
  (SELECT ca.system FROM public.campagnes ca WHERE ca.id = c.campaign_id),
  'COF'::public.rpg_system
);

ALTER TABLE public.categories
  ALTER COLUMN system SET NOT NULL,
  ALTER COLUMN system SET DEFAULT 'COF'::public.rpg_system;

-- The old UNIQUE(name) constraint is incorrect: it prevents two categories
-- with the same name from existing across different campaigns or systems.
ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_name_key;

-- Global categories: unique per (name, system).
CREATE UNIQUE INDEX IF NOT EXISTS categories_global_name_system_key
  ON public.categories (name, system)
  WHERE campaign_id IS NULL;

-- Campaign-scoped categories: unique per (name, campaign_id).
CREATE UNIQUE INDEX IF NOT EXISTS categories_campaign_name_key
  ON public.categories (name, campaign_id)
  WHERE campaign_id IS NOT NULL;


-- ─── 2. wiki_pages ──────────────────────────────────────────────────────────

ALTER TABLE public.wiki_pages
  ADD COLUMN IF NOT EXISTS system public.rpg_system;

-- Same backfill logic as categories.
UPDATE public.wiki_pages wp
SET system = COALESCE(
  (SELECT ca.system FROM public.campagnes ca WHERE ca.id = wp.campaign_id),
  'COF'::public.rpg_system
);

ALTER TABLE public.wiki_pages
  ALTER COLUMN system SET NOT NULL,
  ALTER COLUMN system SET DEFAULT 'COF'::public.rpg_system;

-- Index for the most common query pattern: global pages for a given system.
CREATE INDEX IF NOT EXISTS idx_wiki_pages_system
  ON public.wiki_pages (system)
  WHERE campaign_id IS NULL;


-- ─── 3. Update duplicate_campaign() to carry the system column ──────────────
-- The function hard-codes the INSERT column lists for categories and wiki_pages.
-- It must now include `system` so duplicated content keeps the correct value.

CREATE OR REPLACE FUNCTION public.duplicate_campaign(
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
  -- 1. Copy campaign row
  INSERT INTO campagnes (nom, description, image_url, system)
  SELECT new_nom, description, image_url, system
  FROM campagnes WHERE id = source_id
  RETURNING id INTO new_campaign_id;

  -- 2. Copy categories (defer parent_id remapping)
  FOR old_cat IN SELECT * FROM categories WHERE campaign_id = source_id LOOP
    INSERT INTO categories (name, parent_id, position_index, campaign_id, system)
    VALUES (old_cat.name, NULL, old_cat.position_index, new_campaign_id, old_cat.system)
    RETURNING id INTO new_cat_id;
    cat_id_map := cat_id_map || jsonb_build_object(old_cat.id::text, new_cat_id::text);
  END LOOP;

  -- Remap parent_id using the id map built above
  UPDATE categories
  SET parent_id = (cat_id_map->>(parent_id::text))::uuid
  WHERE campaign_id = new_campaign_id AND parent_id IS NOT NULL;

  -- 3. Copy wiki pages with category/subcategory remapping
  FOR old_page IN SELECT * FROM wiki_pages WHERE campaign_id = source_id LOOP
    INSERT INTO wiki_pages (
      title, content, category_id, subcategory_id,
      position_index, campaign_id, is_public, system
    )
    VALUES (
      old_page.title,
      old_page.content,
      CASE WHEN old_page.category_id    IS NOT NULL
           THEN (cat_id_map->>(old_page.category_id::text))::uuid    ELSE NULL END,
      CASE WHEN old_page.subcategory_id IS NOT NULL
           THEN (cat_id_map->>(old_page.subcategory_id::text))::uuid ELSE NULL END,
      old_page.position_index,
      new_campaign_id,
      old_page.is_public,
      old_page.system
    );
  END LOOP;

  -- 4. Characters
  PERFORM _copy_campaign_table('pj', source_id, new_campaign_id);

  -- 5. COF compendium private content
  PERFORM _copy_campaign_table('peuples',       source_id, new_campaign_id);
  PERFORM _copy_campaign_table('familles',       source_id, new_campaign_id);
  PERFORM _copy_campaign_table('profils',        source_id, new_campaign_id);
  PERFORM _copy_campaign_table('bestiaire',      source_id, new_campaign_id);
  PERFORM _copy_campaign_table('voies',          source_id, new_campaign_id);
  PERFORM _copy_campaign_table('armes_contact',  source_id, new_campaign_id);
  PERFORM _copy_campaign_table('armes_distance', source_id, new_campaign_id);
  PERFORM _copy_campaign_table('armures',        source_id, new_campaign_id);
  PERFORM _copy_campaign_table('equipements',    source_id, new_campaign_id);

  RETURN new_campaign_id;
END;
$function$;

GRANT ALL ON FUNCTION public.duplicate_campaign(uuid, text) TO anon;
GRANT ALL ON FUNCTION public.duplicate_campaign(uuid, text) TO authenticated;
GRANT ALL ON FUNCTION public.duplicate_campaign(uuid, text) TO service_role;
