-- Allow campaign members (and players linked to a PJ in the campaign) to read PNJs.
-- This is required so revealed PNJs can be resolved in player-facing views.

alter table public.pnj enable row level security;

drop policy if exists pnj_select_campaign_access on public.pnj;
create policy pnj_select_campaign_access on public.pnj
  for select to authenticated
  using (
    exists (
      select 1
      from public.campagnes c
      where c.id = pnj.campaign_id
        and (
          c.owner_id = auth.uid()
          or exists (
            select 1 from public.campaign_members m
            where m.campaign_id = c.id and m.user_id = auth.uid()
          )
          or exists (
            select 1 from public.pj p
            where p.campaign_id = c.id and p.user_id = auth.uid()
          )
        )
    )
  );

-- Owner-only writes for PNJ rows.
drop policy if exists pnj_write_owner on public.pnj;
create policy pnj_write_owner on public.pnj
  for all to authenticated
  using (
    exists (
      select 1
      from public.campagnes c
      where c.id = pnj.campaign_id and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.campagnes c
      where c.id = pnj.campaign_id and c.owner_id = auth.uid()
    )
  );
