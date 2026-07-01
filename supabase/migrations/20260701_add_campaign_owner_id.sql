BEGIN;

-- 1) Add explicit owner on campaigns
ALTER TABLE IF EXISTS public.campagnes
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campagnes_owner_id ON public.campagnes(owner_id);

-- 2) Auto-assign owner on insert when not provided
CREATE OR REPLACE FUNCTION public.set_campaign_owner_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'campagnes'
      AND t.tgname = 'trg_set_campaign_owner_id'
      AND NOT t.tgisinternal
  ) THEN
    DROP TRIGGER trg_set_campaign_owner_id ON public.campagnes;
  END IF;

  CREATE TRIGGER trg_set_campaign_owner_id
  BEFORE INSERT ON public.campagnes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_campaign_owner_id();
END $$;

-- 3) Best-effort backfill for existing campaigns from invitation creator
--    (if campaign_invitations exists and contains created_by)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'campaign_invitations'
  ) THEN
    UPDATE public.campagnes c
    SET owner_id = src.created_by
    FROM (
      SELECT DISTINCT ON (campaign_id) campaign_id, created_by
      FROM public.campaign_invitations
      WHERE created_by IS NOT NULL
      ORDER BY campaign_id, expires_at DESC NULLS LAST
    ) src
    WHERE c.id = src.campaign_id
      AND c.owner_id IS NULL;
  END IF;
END $$;

-- 4) RLS policies for owner access (idempotent)
ALTER TABLE public.campagnes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'campagnes'
      AND policyname = 'campagnes_select_owner'
  ) THEN
    CREATE POLICY campagnes_select_owner
      ON public.campagnes
      FOR SELECT
      TO authenticated
      USING (owner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'campagnes'
      AND policyname = 'campagnes_insert_owner'
  ) THEN
    CREATE POLICY campagnes_insert_owner
      ON public.campagnes
      FOR INSERT
      TO authenticated
      WITH CHECK (owner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'campagnes'
      AND policyname = 'campagnes_update_owner'
  ) THEN
    CREATE POLICY campagnes_update_owner
      ON public.campagnes
      FOR UPDATE
      TO authenticated
      USING (owner_id = auth.uid())
      WITH CHECK (owner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'campagnes'
      AND policyname = 'campagnes_delete_owner'
  ) THEN
    CREATE POLICY campagnes_delete_owner
      ON public.campagnes
      FOR DELETE
      TO authenticated
      USING (owner_id = auth.uid());
  END IF;
END $$;

COMMIT;
