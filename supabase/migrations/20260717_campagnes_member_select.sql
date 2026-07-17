-- Open campagnes SELECT to all authenticated users.
--
-- Why USING (true)?
-- All content tables (scenarios, chapitres, pj, etc.) have RLS policies that
-- do EXISTS subqueries on campagnes to verify ownership. If campagnes itself
-- has a restrictive SELECT policy, those subqueries return empty → all content
-- becomes invisible in a cascade failure.
--
-- campagnes only contains name/description/image — not sensitive data.
-- The actual content is protected by its own policies on each table.

DROP POLICY IF EXISTS campagnes_select_owner          ON public.campagnes;
DROP POLICY IF EXISTS campagnes_select_member         ON public.campagnes;
DROP POLICY IF EXISTS campagnes_select_access         ON public.campagnes;
DROP POLICY IF EXISTS campagnes_select_all_access     ON public.campagnes;
DROP POLICY IF EXISTS campagnes_select_authenticated  ON public.campagnes;

CREATE POLICY campagnes_select_authenticated ON public.campagnes
  FOR SELECT TO authenticated
  USING (true);
