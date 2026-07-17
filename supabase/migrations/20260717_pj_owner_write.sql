-- Allow campaign owner (MJ) to create/update/delete PJ rows,
-- including rows assigned to another user_id.
-- Also keep self-management for players on their own PJ rows.

alter table public.pj enable row level security;

-- INSERT
DROP POLICY IF EXISTS pj_insert_owner_or_self ON public.pj;
CREATE POLICY pj_insert_owner_or_self ON public.pj
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Owner of the campaign can create any PJ in that campaign
    EXISTS (
      SELECT 1
      FROM public.campagnes c
      WHERE c.id = pj.campaign_id
        AND c.owner_id = auth.uid()
    )
    -- A player can create a PJ only for themselves
    OR pj.user_id = auth.uid()
  );

-- UPDATE
DROP POLICY IF EXISTS pj_update_owner_or_self ON public.pj;
CREATE POLICY pj_update_owner_or_self ON public.pj
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campagnes c
      WHERE c.id = pj.campaign_id
        AND c.owner_id = auth.uid()
    )
    OR pj.user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.campagnes c
      WHERE c.id = pj.campaign_id
        AND c.owner_id = auth.uid()
    )
    OR pj.user_id = auth.uid()
  );

-- DELETE
DROP POLICY IF EXISTS pj_delete_owner_or_self ON public.pj;
CREATE POLICY pj_delete_owner_or_self ON public.pj
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campagnes c
      WHERE c.id = pj.campaign_id
        AND c.owner_id = auth.uid()
    )
    OR pj.user_id = auth.uid()
  );
