-- ============================================================
-- Migration: Add missing UPDATE policy on chapitres
--
-- Context:
--   chapitres only ever had a SELECT RLS policy
--   (chapitres_select_campaign_access). With RLS enabled and no
--   UPDATE policy, every UPDATE from the anon/authenticated roles
--   is silently rejected by Postgres (0 rows affected, no error
--   raised by supabase-js) — combat_state and battlemap_url were
--   never actually durably persisted to the database, regardless
--   of any client-side fix. Local persistence "worked" only via
--   localStorage/BroadcastChannel within a single browser.
--
--   Mirrors the SELECT policy's access rule: campaign owner, co-DM
--   members, or players with a PJ in the campaign (players need to
--   be able to move their own tokens during combat).
-- ============================================================

create policy chapitres_update_campaign_access
on public.chapitres
for update
to authenticated
using (
  exists (
    select 1
    from public.scenarios s
    join public.campagnes c on c.id = s.campaign_id
    where s.id = chapitres.scenario_id
      and (
        c.owner_id = auth.uid()
        or exists (
          select 1
          from public.campaign_members m
          where m.campaign_id = c.id
            and m.user_id = auth.uid()
        )
        or exists (
          select 1
          from public.pj p
          where p.campaign_id = c.id
            and p.user_id = auth.uid()
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.scenarios s
    join public.campagnes c on c.id = s.campaign_id
    where s.id = chapitres.scenario_id
      and (
        c.owner_id = auth.uid()
        or exists (
          select 1
          from public.campaign_members m
          where m.campaign_id = c.id
            and m.user_id = auth.uid()
        )
        or exists (
          select 1
          from public.pj p
          where p.campaign_id = c.id
            and p.user_id = auth.uid()
        )
      )
  )
);
