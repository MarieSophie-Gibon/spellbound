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
-- ============================================================
--
-- ── PHASE 2 FRONT-END TODO ───────────────────────────────────────────────────
--
-- 1. TYPE  src/hooks/campaign/useCampaigns.ts
--    - Add `role?: 'OWNER' | 'PLAYER'` to the CampaignMember interface (or create one).
--    - The Campaign interface's `access_type` ('owner'|'member'|'pj') is still valid
--      for read access; no change needed there yet.
--
-- 2. HOOK  useCampaignMembers (new hook, or extend useCampaigns.ts)
--    - Fetch campaign_members with role for a given campaignId.
--    - Expose helpers: isCoDM(userId), promoteToOwner(userId), demoteToPlayer(userId).
--
-- 3. PERMISSION HELPER  src/lib/permissions.ts (new file)
--    - `isManager(campaign, userId)`:
--        return campaign.owner_id === userId
--            || campaignMembers.some(m => m.user_id === userId && m.role === 'OWNER')
--    - Replace every `canManageActiveCampaign` derived value in App.tsx with this helper
--      once the Co-DM flow is live (today it still reads owner_id, which is fine).
--
-- 4. UI  Co-DM management panel (new component, Campaign dashboard)
--    - List of campaign members with their role badge (OWNER / PLAYER).
--    - MJ-only: promote/demote buttons calling the new hook mutations.
--    - Invite flow: reuse existing campaign_invitations + set role = 'OWNER' on join.
--
-- 5. UI  SideNav / campaign context
--    - When a Co-DM (not the primary owner_id) is logged in, `canManageActiveCampaign`
--      must return true. Update the check in App.tsx to use isManager() from step 3.
--
-- 6. UI  Footer / campaign switcher
--    - Campaign cards: show a small "Co-DM" badge when access_type is 'owner' but
--      owner_id !== current user (i.e. they are a campaign_members OWNER, not the creator).
--
-- 7. SUPABASE  Apply the matching remote migration
--    - `npx supabase db push` or run the SQL in the Supabase dashboard.
--    - Verify that existing RLS smoke-tests still pass for primary owners.
--
-- ─────────────────────────────────────────────────────────────────────────────
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
