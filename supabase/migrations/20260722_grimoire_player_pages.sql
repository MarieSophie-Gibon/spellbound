-- =============================================================================
-- Grimoire : autoriser les PJs à créer/éditer leurs propres articles
-- =============================================================================

-- 1. Ajouter la colonne created_by à wiki_pages
alter table public.wiki_pages
  add column if not exists created_by uuid references auth.users(id) default auth.uid();

-- 2. Remplacer la policy "open à tout le monde" par des policies granulaires

drop policy if exists "wiki_pages_authenticated_all" on public.wiki_pages;

-- SELECT : tous les authentifiés (inchangé)
create policy "wiki_pages_select" on public.wiki_pages
  for select to authenticated
  using (true);

-- INSERT : tout membre/PJ/owner de la campagne (ou page globale)
create policy "wiki_pages_insert" on public.wiki_pages
  for insert to authenticated
  with check (
    campaign_id is null
    or exists (
      select 1 from public.campagnes c
      where c.id = wiki_pages.campaign_id
        and (
          c.owner_id = auth.uid()
          or exists (select 1 from public.campaign_members m where m.campaign_id = c.id and m.user_id = auth.uid())
          or exists (select 1 from public.pj p where p.campaign_id = c.id and p.user_id = auth.uid())
        )
    )
  );

-- UPDATE : créateur de la page OU owner de la campagne
create policy "wiki_pages_update" on public.wiki_pages
  for update to authenticated
  using (
    created_by = auth.uid()
    or campaign_id is null
    or exists (select 1 from public.campagnes c where c.id = wiki_pages.campaign_id and c.owner_id = auth.uid())
  )
  with check (
    created_by = auth.uid()
    or campaign_id is null
    or exists (select 1 from public.campagnes c where c.id = wiki_pages.campaign_id and c.owner_id = auth.uid())
  );

-- DELETE : créateur de la page OU owner de la campagne
create policy "wiki_pages_delete" on public.wiki_pages
  for delete to authenticated
  using (
    created_by = auth.uid()
    or campaign_id is null
    or exists (select 1 from public.campagnes c where c.id = wiki_pages.campaign_id and c.owner_id = auth.uid())
  );
