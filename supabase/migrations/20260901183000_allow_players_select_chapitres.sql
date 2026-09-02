drop policy if exists chapitres_select_campaign_access on public.chapitres;

create policy chapitres_select_campaign_access on public.chapitres
for select
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
);
