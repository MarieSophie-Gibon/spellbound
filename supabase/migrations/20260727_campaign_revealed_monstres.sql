-- Table pour contrôler quels monstres de campagne sont visibles par les joueurs
create table if not exists campaign_revealed_monstres (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campagnes(id) on delete cascade,
  monstre_id uuid not null references bestiaire(id) on delete cascade,
  revealed_at timestamptz not null default now(),
  unique(campaign_id, monstre_id)
);

alter table campaign_revealed_monstres enable row level security;

-- Le propriétaire de la campagne peut tout faire
create policy "crm_owner_all" on campaign_revealed_monstres
  for all
  using (
    exists (
      select 1 from campagnes
      where campagnes.id = campaign_revealed_monstres.campaign_id
        and campagnes.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from campagnes
      where campagnes.id = campaign_revealed_monstres.campaign_id
        and campagnes.owner_id = auth.uid()
    )
  );

-- Les membres (via invitation) peuvent lire les monstres révélés
create policy "crm_member_select" on campaign_revealed_monstres
  for select
  using (
    exists (
      select 1 from campaign_members
      where campaign_members.campaign_id = campaign_revealed_monstres.campaign_id
        and campaign_members.user_id = auth.uid()
    )
  );

-- Les joueurs (via PJ) peuvent lire les monstres révélés
create policy "crm_pj_select" on campaign_revealed_monstres
  for select
  using (
    exists (
      select 1 from pj
      where pj.campaign_id = campaign_revealed_monstres.campaign_id
        and pj.user_id = auth.uid()
    )
  );
