-- ============================================================
-- Migration: Add missing INSERT policy on chapitres
--
-- Context:
--   chapitres has RLS enabled but only SELECT and UPDATE policies.
--   Every INSERT from the authenticated role is rejected with
--   "new row violates row-level security policy", so MJs could
--   not create new chapters.
--
--   Only campaign managers (owner or Co-DM) may create chapters.
-- ============================================================

drop policy if exists chapitres_insert_campaign_manager on public.chapitres;

create policy chapitres_insert_campaign_manager
on public.chapitres
for insert
to authenticated
with check (
  exists (
    select 1
    from public.scenarios s
    where s.id = chapitres.scenario_id
      and public.is_campaign_manager(s.campaign_id)
  )
);
