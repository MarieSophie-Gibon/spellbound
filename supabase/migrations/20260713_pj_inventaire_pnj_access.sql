-- =============================================================================
-- Fix : pj_inventaire accessible pour les PNJ (pas seulement les PJ)
-- 1. pj_id devient nullable (les lignes PNJ n'ont pas de pj_id)
-- 2. Ajout colonne pnj_id avec FK vers pnj(id) ON DELETE CASCADE
-- 3. Mise à jour de la RLS policy pour les deux cas
-- =============================================================================

-- Étape 1 : rendre pj_id nullable
alter table public.pj_inventaire
  alter column pj_id drop not null;

-- Étape 2 : ajouter colonne pnj_id
alter table public.pj_inventaire
  add column if not exists pnj_id uuid references public.pnj(id) on delete cascade;

-- Étape 3 : remplacer la RLS policy
drop policy if exists "pj_inventaire_access" on public.pj_inventaire;

create policy "pj_inventaire_access" on public.pj_inventaire
  for all to authenticated
  using (
    -- Accès via un PJ classique
    (pj_id is not null and exists (
      select 1 from public.pj p
      where p.id = pj_inventaire.pj_id
        and (
          p.user_id = auth.uid()
          or exists (
            select 1 from public.campagnes c
            where c.id = p.campaign_id
              and (
                c.owner_id = auth.uid()
                or exists (select 1 from public.campaign_members m where m.campaign_id = c.id and m.user_id = auth.uid())
              )
          )
        )
    ))
    -- Accès via un PNJ
    or (pnj_id is not null and exists (
      select 1 from public.pnj n
      where n.id = pj_inventaire.pnj_id
        and exists (
          select 1 from public.campagnes c
          where c.id = n.campaign_id
            and (
              c.owner_id = auth.uid()
              or exists (select 1 from public.campaign_members m where m.campaign_id = c.id and m.user_id = auth.uid())
            )
        )
    ))
  )
  with check (
    -- Écriture via un PJ classique
    (pj_id is not null and exists (
      select 1 from public.pj p
      where p.id = pj_inventaire.pj_id
        and (
          p.user_id = auth.uid()
          or exists (select 1 from public.campagnes c where c.id = p.campaign_id and c.owner_id = auth.uid())
        )
    ))
    -- Écriture via un PNJ
    or (pnj_id is not null and exists (
      select 1 from public.pnj n
      where n.id = pj_inventaire.pnj_id
        and exists (select 1 from public.campagnes c where c.id = n.campaign_id and c.owner_id = auth.uid())
    ))
  );
