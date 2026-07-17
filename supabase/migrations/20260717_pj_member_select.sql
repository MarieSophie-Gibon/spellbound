-- Allow campaign members to see all PJs in a campaign (read-only list view).
-- Players can see the full PJ list but the frontend restricts access
-- to only their own character (pj.user_id = auth.uid()).

DROP POLICY IF EXISTS pj_select_campaign_access ON public.pj;

CREATE POLICY pj_select_campaign_access ON public.pj
  FOR SELECT TO authenticated
  USING (
    -- Le MJ voit tous les PJs de ses campagnes
    EXISTS (
      SELECT 1 FROM public.campagnes c
      WHERE c.id = pj.campaign_id AND c.owner_id = auth.uid()
    )
    -- Un joueur voit toujours son propre PJ
    OR user_id = auth.uid()
    -- Un membre de la campagne voit tous les PJs de cette campagne
    OR EXISTS (
      SELECT 1 FROM public.campaign_members m
      WHERE m.campaign_id = pj.campaign_id AND m.user_id = auth.uid()
    )
  );
