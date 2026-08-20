-- ============================================================
-- Migration: Extend all write RLS policies to Co-DMs
--
-- A Co-DM is a campaign_members row with role = 'OWNER'.
-- They should have the exact same write rights as the primary
-- owner on all campaign-scoped content.
--
-- Strategy:
--   1. Create a stable helper function is_campaign_manager()
--      that is used by all updated policies.
--   2. DROP + RECREATE each affected write policy.
--
-- Affected tables:
--   armes_contact, armes_distance, armures, bestiaire,
--   campaign_invitations, campaign_members, campaign_revealed_monstres,
--   campaign_revealed_pnjs, equipements, familles, peuples,
--   pj, pnj, profils
-- ============================================================

-- ─── 1. Helper function ──────────────────────────────────────────────────────
-- Returns TRUE if the current authenticated user is either:
--   • the primary owner (campagnes.owner_id = auth.uid()), OR
--   • a Co-DM (campaign_members row with role = 'OWNER')

CREATE OR REPLACE FUNCTION public.is_campaign_manager(p_campaign_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  AS $$
    SELECT
      EXISTS (
        SELECT 1 FROM public.campagnes
        WHERE id = p_campaign_id AND owner_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.campaign_members
        WHERE campaign_id = p_campaign_id
          AND user_id = auth.uid()
          AND role = 'OWNER'
      );
  $$;

GRANT EXECUTE ON FUNCTION public.is_campaign_manager(uuid) TO authenticated;

COMMENT ON FUNCTION public.is_campaign_manager(uuid) IS
  'Returns true if auth.uid() is the primary owner OR a Co-DM (campaign_members.role = ''OWNER'') '
  'for the given campaign. Use in all campaign-scoped write RLS policies.';


-- ─── 2. armes_contact_write ──────────────────────────────────────────────────
DROP POLICY IF EXISTS armes_contact_write ON public.armes_contact;
CREATE POLICY armes_contact_write ON public.armes_contact
  TO authenticated
  USING  ((campaign_id IS NULL) OR public.is_campaign_manager(campaign_id))
  WITH CHECK ((campaign_id IS NULL) OR public.is_campaign_manager(campaign_id));


-- ─── 3. armes_distance_write ─────────────────────────────────────────────────
DROP POLICY IF EXISTS armes_distance_write ON public.armes_distance;
CREATE POLICY armes_distance_write ON public.armes_distance
  TO authenticated
  USING  ((campaign_id IS NULL) OR public.is_campaign_manager(campaign_id))
  WITH CHECK ((campaign_id IS NULL) OR public.is_campaign_manager(campaign_id));


-- ─── 4. armures_write ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS armures_write ON public.armures;
CREATE POLICY armures_write ON public.armures
  TO authenticated
  USING  ((campaign_id IS NULL) OR public.is_campaign_manager(campaign_id))
  WITH CHECK ((campaign_id IS NULL) OR public.is_campaign_manager(campaign_id));


-- ─── 5. bestiaire_write ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS bestiaire_write ON public.bestiaire;
CREATE POLICY bestiaire_write ON public.bestiaire
  TO authenticated
  USING  ((campaign_id IS NULL) OR public.is_campaign_manager(campaign_id))
  WITH CHECK ((campaign_id IS NULL) OR public.is_campaign_manager(campaign_id));


-- ─── 6. equipements_write ────────────────────────────────────────────────────
DROP POLICY IF EXISTS equipements_write ON public.equipements;
CREATE POLICY equipements_write ON public.equipements
  TO authenticated
  USING  ((campaign_id IS NULL) OR public.is_campaign_manager(campaign_id))
  WITH CHECK ((campaign_id IS NULL) OR public.is_campaign_manager(campaign_id));


-- ─── 7. familles_write ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS familles_write ON public.familles;
CREATE POLICY familles_write ON public.familles
  TO authenticated
  USING  ((campaign_id IS NULL) OR public.is_campaign_manager(campaign_id))
  WITH CHECK ((campaign_id IS NULL) OR public.is_campaign_manager(campaign_id));


-- ─── 8. peuples_write ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS peuples_write ON public.peuples;
CREATE POLICY peuples_write ON public.peuples
  TO authenticated
  USING  ((campaign_id IS NULL) OR public.is_campaign_manager(campaign_id))
  WITH CHECK ((campaign_id IS NULL) OR public.is_campaign_manager(campaign_id));


-- ─── 9. profils_write ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS profils_write ON public.profils;
CREATE POLICY profils_write ON public.profils
  TO authenticated
  USING  ((campaign_id IS NULL) OR public.is_campaign_manager(campaign_id))
  WITH CHECK ((campaign_id IS NULL) OR public.is_campaign_manager(campaign_id));


-- ─── 10. pnj_write_owner ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS pnj_write_owner ON public.pnj;
CREATE POLICY pnj_write_owner ON public.pnj
  TO authenticated
  USING  (public.is_campaign_manager(campaign_id))
  WITH CHECK (public.is_campaign_manager(campaign_id));


-- ─── 11. pj_delete_owner_or_self ─────────────────────────────────────────────
-- Players can still delete their own PJ; Co-DMs inherit owner rights.
DROP POLICY IF EXISTS pj_delete_owner_or_self ON public.pj;
CREATE POLICY pj_delete_owner_or_self ON public.pj
  FOR DELETE
  TO authenticated
  USING (public.is_campaign_manager(campaign_id) OR (user_id = auth.uid()));


-- ─── 12. pj_insert_owner_or_self ─────────────────────────────────────────────
DROP POLICY IF EXISTS pj_insert_owner_or_self ON public.pj;
CREATE POLICY pj_insert_owner_or_self ON public.pj
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_campaign_manager(campaign_id) OR (user_id = auth.uid()));


-- ─── 13. pj_update_owner_or_self ─────────────────────────────────────────────
DROP POLICY IF EXISTS pj_update_owner_or_self ON public.pj;
CREATE POLICY pj_update_owner_or_self ON public.pj
  FOR UPDATE
  TO authenticated
  USING  (public.is_campaign_manager(campaign_id) OR (user_id = auth.uid()))
  WITH CHECK (public.is_campaign_manager(campaign_id) OR (user_id = auth.uid()));


-- ─── 14. crm_owner_all (campaign_revealed_monstres) ──────────────────────────
DROP POLICY IF EXISTS crm_owner_all ON public.campaign_revealed_monstres;
CREATE POLICY crm_owner_all ON public.campaign_revealed_monstres
  TO authenticated
  USING  (public.is_campaign_manager(campaign_id))
  WITH CHECK (public.is_campaign_manager(campaign_id));


-- ─── 15. campaign_revealed_pnjs_write ────────────────────────────────────────
DROP POLICY IF EXISTS campaign_revealed_pnjs_write ON public.campaign_revealed_pnjs;
CREATE POLICY campaign_revealed_pnjs_write ON public.campaign_revealed_pnjs
  TO authenticated
  USING  (public.is_campaign_manager(campaign_id))
  WITH CHECK (public.is_campaign_manager(campaign_id));


-- ─── 16. campaign_invitations_access (WITH CHECK only) ───────────────────────
-- The USING allows read for any authenticated user; only WITH CHECK gates writes.
DROP POLICY IF EXISTS campaign_invitations_access ON public.campaign_invitations;
CREATE POLICY campaign_invitations_access ON public.campaign_invitations
  TO authenticated
  USING  ((public.is_campaign_manager(campaign_id)) OR (auth.uid() IS NOT NULL))
  WITH CHECK (public.is_campaign_manager(campaign_id));


-- ─── 17. campaign_members_write ──────────────────────────────────────────────
-- Users can still remove themselves (user_id = auth.uid()).
-- Co-DMs can manage the member list just like the primary owner.
DROP POLICY IF EXISTS campaign_members_write ON public.campaign_members;
CREATE POLICY campaign_members_write ON public.campaign_members
  TO authenticated
  USING  ((user_id = auth.uid()) OR public.is_campaign_manager(campaign_id))
  WITH CHECK ((user_id = auth.uid()) OR public.is_campaign_manager(campaign_id));


-- ─── 18. campaign_members_select ─────────────────────────────────────────────
DROP POLICY IF EXISTS campaign_members_select ON public.campaign_members;
CREATE POLICY campaign_members_select ON public.campaign_members
  FOR SELECT
  TO authenticated
  USING  ((user_id = auth.uid()) OR public.is_campaign_manager(campaign_id));
