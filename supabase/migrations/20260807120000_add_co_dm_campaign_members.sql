-- ============================================================
-- Migration: Phase 1 Soft Migration — Multi-Owner (Co-DM) support
--
-- STRATEGY: additive-only. The `owner_id` column, its index, and the
-- `trg_set_campaign_owner_id` trigger are intentionally left untouched so
-- every existing React query and RLS policy that reads `owner_id` keeps
-- working without any frontend change.
--
-- New architecture: campaign_members.role drives authorisation going forward.
-- Hybrid RLS: a user is a "manager" if owner_id = auth.uid()
--             OR they have a row in campaign_members with role = 'OWNER'.
-- ============================================================

-- ─── 1. Add role column to campaign_members ─────────────────────────────────

ALTER TABLE public.campaign_members
  ADD COLUMN IF NOT EXISTS role text
    NOT NULL
    DEFAULT 'PLAYER'
    CHECK (role IN ('OWNER', 'PLAYER'));

COMMENT ON COLUMN public.campaign_members.role IS
  'OWNER = Co-DM with full management rights. PLAYER = regular player. '
  'owner_id on campagnes remains the single primary owner for legacy queries.';


-- ─── 2. Back-fill: copy every campagnes.owner_id into campaign_members ───────
-- ON CONFLICT: if the owner was already a member (e.g. joined their own
-- campaign), just promote their role to OWNER instead of inserting a duplicate.

INSERT INTO public.campaign_members (campaign_id, user_id, role)
SELECT id, owner_id, 'OWNER'
FROM   public.campagnes
WHERE  owner_id IS NOT NULL
ON CONFLICT (campaign_id, user_id)
  DO UPDATE SET role = 'OWNER';


-- ─── 3. Update cleanup trigger — skip PJ deletion for OWNER removals ─────────
-- An OWNER being removed from campaign_members should NOT wipe their characters.
-- Only a PLAYER removal should cascade to PJ cleanup.

CREATE OR REPLACE FUNCTION public.cleanup_pj_on_campaign_member_delete()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  -- Co-DMs (OWNER role) are not players; they have no PJs to clean up.
  IF old.role = 'OWNER' THEN
    RETURN old;
  END IF;

  DELETE FROM public.pj
  WHERE campaign_id = old.campaign_id
    AND (user_id = old.user_id OR player_id = old.user_id);

  RETURN old;
END;
$function$;

GRANT ALL ON FUNCTION public.cleanup_pj_on_campaign_member_delete() TO anon;
GRANT ALL ON FUNCTION public.cleanup_pj_on_campaign_member_delete() TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_pj_on_campaign_member_delete() TO service_role;


-- ─── 4. Hybrid RLS helper: is the current user a manager of a campaign? ───────
-- Centralised as a function so the logic is written once and reused in
-- every policy. Returns true if the user is the legacy owner_id OR holds an
-- OWNER row in campaign_members.

CREATE OR REPLACE FUNCTION public.is_campaign_manager(p_campaign_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.campagnes
      WHERE id = p_campaign_id
        AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.campaign_members
      WHERE campaign_id = p_campaign_id
        AND user_id     = auth.uid()
        AND role        = 'OWNER'
    );
  $$;

GRANT EXECUTE ON FUNCTION public.is_campaign_manager(uuid) TO authenticated;


-- ─── 5. Update campagnes RLS — UPDATE policy ────────────────────────────────
-- Replace the owner_id-only check with the hybrid check.
-- The old policy name is preserved so diffs stay minimal.

DROP POLICY IF EXISTS campagnes_update_owner ON public.campagnes;

CREATE POLICY campagnes_update_owner ON public.campagnes
  FOR UPDATE
  TO authenticated
  -- Hybrid: legacy owner_id OR a campaign_members OWNER row.
  USING  (owner_id = auth.uid() OR public.is_campaign_manager(id))
  WITH CHECK (owner_id = auth.uid() OR public.is_campaign_manager(id));


-- ─── 6. Update campagnes RLS — DELETE policy ────────────────────────────────
-- Same hybrid logic. Only the primary owner (owner_id) or a Co-DM can delete.

DROP POLICY IF EXISTS campagnes_delete_owner ON public.campagnes;

CREATE POLICY campagnes_delete_owner ON public.campagnes
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_campaign_manager(id));


-- ─── 7. NOT touching any of the following (backward-compat guarantee): ────────
--   • campagnes.owner_id column
--   • idx_campagnes_owner_id index
--   • trg_set_campaign_owner_id trigger (auto-sets owner_id on INSERT)
--   • campagnes_insert_owner policy  (owner_id = auth.uid() on INSERT is correct)
--   • campagnes_select_authenticated policy
--   • Any other table's RLS policies
-- ─────────────────────────────────────────────────────────────────────────────
