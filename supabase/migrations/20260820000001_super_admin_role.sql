-- ============================================================
-- Migration: Super Admin role — global content management
--
-- Goals:
--   1. Add 'super_admin' as a valid utilisateurs.role value.
--   2. Create is_super_admin() helper function.
--   3. Restrict global content writes (campaign_id IS NULL) to
--      super_admin only. Campaign-scoped writes remain for
--      campaign managers (primary owner + Co-DM).
--   4. Restrict wiki_pages and categories writes similarly.
--   5. Prevent privilege escalation via utilisateurs_write.
--   6. Seed mariesophie.gb@gmail.com as super_admin.
--
-- NOTE: The is_campaign_manager() helper was created in
--       20260820000000_extend_write_policies_to_co_dm.sql.
--       The _write policies updated there are re-updated here.
-- ============================================================


-- ─── 1. Allow 'super_admin' as a utilisateurs role ───────────────────────────
ALTER TABLE public.utilisateurs
  DROP CONSTRAINT IF EXISTS utilisateurs_role_check;

ALTER TABLE public.utilisateurs
  ADD CONSTRAINT utilisateurs_role_check
    CHECK (role = ANY (ARRAY['joueur'::text, 'mj'::text, 'super_admin'::text]));


-- ─── 2. Helper: is the current user a super_admin? ───────────────────────────
CREATE OR REPLACE FUNCTION public.is_super_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.utilisateurs
      WHERE id = auth.uid()
        AND role = 'super_admin'
    );
  $$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

COMMENT ON FUNCTION public.is_super_admin() IS
  'Returns true if auth.uid() has role = ''super_admin'' in utilisateurs. '
  'Used to gate writes to global (campaign_id IS NULL) content.';


-- ─── 3. Prevent privilege self-escalation to super_admin ─────────────────────
-- A regular user can update their own utilisateurs row (pseudo, role),
-- but they must not be able to grant themselves super_admin.
-- Only an existing super_admin (or a DB admin via service_role) can do so.
DROP POLICY IF EXISTS utilisateurs_write ON public.utilisateurs;
CREATE POLICY utilisateurs_write ON public.utilisateurs
  TO authenticated
  USING  (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND (
      -- Allow any non-super_admin role freely
      role != 'super_admin'
      -- Allow preserving or setting super_admin only if already super_admin
      OR public.is_super_admin()
    )
  );


-- ─── 4. Update global-content write policies ─────────────────────────────────
-- Pattern: (campaign_id IS NULL AND is_super_admin()) OR is_campaign_manager(campaign_id)
-- This replaces the policies from 20260820000000 that only checked is_campaign_manager.

DROP POLICY IF EXISTS armes_contact_write ON public.armes_contact;
CREATE POLICY armes_contact_write ON public.armes_contact
  TO authenticated
  USING  ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id))
  WITH CHECK ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id));

DROP POLICY IF EXISTS armes_distance_write ON public.armes_distance;
CREATE POLICY armes_distance_write ON public.armes_distance
  TO authenticated
  USING  ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id))
  WITH CHECK ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id));

DROP POLICY IF EXISTS armures_write ON public.armures;
CREATE POLICY armures_write ON public.armures
  TO authenticated
  USING  ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id))
  WITH CHECK ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id));

DROP POLICY IF EXISTS bestiaire_write ON public.bestiaire;
CREATE POLICY bestiaire_write ON public.bestiaire
  TO authenticated
  USING  ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id))
  WITH CHECK ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id));

DROP POLICY IF EXISTS equipements_write ON public.equipements;
CREATE POLICY equipements_write ON public.equipements
  TO authenticated
  USING  ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id))
  WITH CHECK ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id));

DROP POLICY IF EXISTS familles_write ON public.familles;
CREATE POLICY familles_write ON public.familles
  TO authenticated
  USING  ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id))
  WITH CHECK ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id));

DROP POLICY IF EXISTS peuples_write ON public.peuples;
CREATE POLICY peuples_write ON public.peuples
  TO authenticated
  USING  ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id))
  WITH CHECK ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id));

DROP POLICY IF EXISTS profils_write ON public.profils;
CREATE POLICY profils_write ON public.profils
  TO authenticated
  USING  ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id))
  WITH CHECK ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id));


-- ─── 5. wiki_pages: replace free write with scoped policy ────────────────────
-- Old: WITH CHECK (true) — anyone could write anything
-- New: super_admin for global pages, campaign_manager for campaign pages
DROP POLICY IF EXISTS wiki_pages_authenticated_all ON public.wiki_pages;

CREATE POLICY wiki_pages_read ON public.wiki_pages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY wiki_pages_write ON public.wiki_pages
  FOR INSERT
  TO authenticated
  WITH CHECK ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id));

CREATE POLICY wiki_pages_update ON public.wiki_pages
  FOR UPDATE
  TO authenticated
  USING  ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id))
  WITH CHECK ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id));

CREATE POLICY wiki_pages_delete ON public.wiki_pages
  FOR DELETE
  TO authenticated
  USING  ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id));


-- ─── 6. categories: replace free write with scoped policy ────────────────────
-- Old: two overlapping policies both WITH CHECK (true)
DROP POLICY IF EXISTS "Accès total authentifié" ON public.categories;
DROP POLICY IF EXISTS categories_authenticated_all ON public.categories;

CREATE POLICY categories_read ON public.categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY categories_write ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id));

CREATE POLICY categories_update ON public.categories
  FOR UPDATE
  TO authenticated
  USING  ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id))
  WITH CHECK ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id));

CREATE POLICY categories_delete ON public.categories
  FOR DELETE
  TO authenticated
  USING  ((campaign_id IS NULL AND public.is_super_admin()) OR public.is_campaign_manager(campaign_id));


-- ─── 7. Seed super_admin for mariesophie.gb@gmail.com ────────────────────────
-- Uses auth.users to resolve the UUID from email, then upserts into utilisateurs.
-- Safe to run multiple times (ON CONFLICT DO UPDATE).
INSERT INTO public.utilisateurs (id, role)
SELECT id, 'super_admin'
FROM auth.users
WHERE email = 'mariesophie.gb@gmail.com'
ON CONFLICT (id)
  DO UPDATE SET role = 'super_admin';
