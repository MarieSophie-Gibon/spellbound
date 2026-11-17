-- ============================================================
-- Migration: Add missing DELETE policy on chapitres
--
-- Context:
--   chapitres has RLS enabled with SELECT, UPDATE and INSERT
--   policies but no DELETE policy. Every DELETE from the
--   authenticated role silently affects 0 rows (no error raised
--   by supabase-js), so the delete confirmation modal closed
--   without anything happening and the chapter stayed in place.
--
--   Only campaign managers (owner or Co-DM) may delete chapters.
-- ============================================================

drop policy if exists chapitres_delete_campaign_manager on public.chapitres;

create policy chapitres_delete_campaign_manager
on public.chapitres
for delete
to authenticated
using (
  exists (
    select 1
    from public.scenarios s
    where s.id = chapitres.scenario_id
      and public.is_campaign_manager(s.campaign_id)
  )
);
