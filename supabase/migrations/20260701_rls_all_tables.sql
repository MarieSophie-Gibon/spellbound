-- =============================================================================
-- RLS COMPLET — toutes les tables restantes
-- À exécuter dans Supabase > SQL Editor
-- =============================================================================

-- Helper : est-ce que l'utilisateur courant a accès à une campagne donnée ?
-- (owner OU campaign_member OU pj lié)
-- On utilisera ce pattern en ligne dans chaque policy.

-- =============================================================================
-- 1. GRIMOIRE : categories + wiki_pages
--    Ces tables n'ont pas forcément de campaign_id ; on ouvre à tous les authentifiés.
-- =============================================================================

alter table public.categories enable row level security;
drop policy if exists "categories_authenticated_all" on public.categories;
create policy "categories_authenticated_all" on public.categories
  for all to authenticated
  using (true)
  with check (true);

alter table public.wiki_pages enable row level security;
drop policy if exists "wiki_pages_authenticated_all" on public.wiki_pages;
create policy "wiki_pages_authenticated_all" on public.wiki_pages
  for all to authenticated
  using (true)
  with check (true);

-- =============================================================================
-- 3. COMPENDIUM GLOBAL
--    bestiaire, profils, peuples, familles, voies,
--    armes_contact, armes_distance, armures, equipements
--
--    Ces tables ont un campaign_id nullable :
--      - NULL  = entrée globale (visible par tous les authentifiés)
--      - SET   = entrée spécifique à une campagne (visible par owner/member)
--
--    Écriture : NULL (tout auth) OU campaign owner seulement.
-- =============================================================================

-- bestiaire
alter table public.bestiaire enable row level security;
drop policy if exists "bestiaire_select" on public.bestiaire;
drop policy if exists "bestiaire_write"  on public.bestiaire;

create policy "bestiaire_select" on public.bestiaire
  for select to authenticated
  using (
    campaign_id is null
    or exists (
      select 1 from public.campagnes c
      where c.id = bestiaire.campaign_id
        and (
          c.owner_id = auth.uid()
          or exists (select 1 from public.campaign_members m where m.campaign_id = c.id and m.user_id = auth.uid())
          or exists (select 1 from public.pj p where p.campaign_id = c.id and p.user_id = auth.uid())
        )
    )
  );

create policy "bestiaire_write" on public.bestiaire
  for all to authenticated
  using (
    campaign_id is null
    or exists (select 1 from public.campagnes c where c.id = bestiaire.campaign_id and c.owner_id = auth.uid())
  )
  with check (
    campaign_id is null
    or exists (select 1 from public.campagnes c where c.id = bestiaire.campaign_id and c.owner_id = auth.uid())
  );

-- profils
alter table public.profils enable row level security;
drop policy if exists "profils_select" on public.profils;
drop policy if exists "profils_write"  on public.profils;

create policy "profils_select" on public.profils
  for select to authenticated
  using (
    campaign_id is null
    or exists (
      select 1 from public.campagnes c
      where c.id = profils.campaign_id
        and (
          c.owner_id = auth.uid()
          or exists (select 1 from public.campaign_members m where m.campaign_id = c.id and m.user_id = auth.uid())
          or exists (select 1 from public.pj p where p.campaign_id = c.id and p.user_id = auth.uid())
        )
    )
  );

create policy "profils_write" on public.profils
  for all to authenticated
  using (
    campaign_id is null
    or exists (select 1 from public.campagnes c where c.id = profils.campaign_id and c.owner_id = auth.uid())
  )
  with check (
    campaign_id is null
    or exists (select 1 from public.campagnes c where c.id = profils.campaign_id and c.owner_id = auth.uid())
  );

-- peuples
alter table public.peuples enable row level security;
drop policy if exists "peuples_select" on public.peuples;
drop policy if exists "peuples_write"  on public.peuples;

create policy "peuples_select" on public.peuples
  for select to authenticated
  using (
    campaign_id is null
    or exists (
      select 1 from public.campagnes c
      where c.id = peuples.campaign_id
        and (
          c.owner_id = auth.uid()
          or exists (select 1 from public.campaign_members m where m.campaign_id = c.id and m.user_id = auth.uid())
          or exists (select 1 from public.pj p where p.campaign_id = c.id and p.user_id = auth.uid())
        )
    )
  );

create policy "peuples_write" on public.peuples
  for all to authenticated
  using (
    campaign_id is null
    or exists (select 1 from public.campagnes c where c.id = peuples.campaign_id and c.owner_id = auth.uid())
  )
  with check (
    campaign_id is null
    or exists (select 1 from public.campagnes c where c.id = peuples.campaign_id and c.owner_id = auth.uid())
  );

-- familles
alter table public.familles enable row level security;
drop policy if exists "familles_select" on public.familles;
drop policy if exists "familles_write"  on public.familles;

create policy "familles_select" on public.familles
  for select to authenticated
  using (
    campaign_id is null
    or exists (
      select 1 from public.campagnes c
      where c.id = familles.campaign_id
        and (
          c.owner_id = auth.uid()
          or exists (select 1 from public.campaign_members m where m.campaign_id = c.id and m.user_id = auth.uid())
          or exists (select 1 from public.pj p where p.campaign_id = c.id and p.user_id = auth.uid())
        )
    )
  );

create policy "familles_write" on public.familles
  for all to authenticated
  using (
    campaign_id is null
    or exists (select 1 from public.campagnes c where c.id = familles.campaign_id and c.owner_id = auth.uid())
  )
  with check (
    campaign_id is null
    or exists (select 1 from public.campagnes c where c.id = familles.campaign_id and c.owner_id = auth.uid())
  );

-- voies (pas de campaign_id direct, liées via peuple_id/profil_id → on ouvre à tous les auth)
alter table public.voies enable row level security;
drop policy if exists "voies_authenticated_all" on public.voies;
create policy "voies_authenticated_all" on public.voies
  for all to authenticated
  using (true)
  with check (true);

-- armes_contact
alter table public.armes_contact enable row level security;
drop policy if exists "armes_contact_select" on public.armes_contact;
drop policy if exists "armes_contact_write"  on public.armes_contact;

create policy "armes_contact_select" on public.armes_contact
  for select to authenticated
  using (
    campaign_id is null
    or exists (
      select 1 from public.campagnes c
      where c.id = armes_contact.campaign_id
        and (
          c.owner_id = auth.uid()
          or exists (select 1 from public.campaign_members m where m.campaign_id = c.id and m.user_id = auth.uid())
          or exists (select 1 from public.pj p where p.campaign_id = c.id and p.user_id = auth.uid())
        )
    )
  );

create policy "armes_contact_write" on public.armes_contact
  for all to authenticated
  using (
    campaign_id is null
    or exists (select 1 from public.campagnes c where c.id = armes_contact.campaign_id and c.owner_id = auth.uid())
  )
  with check (
    campaign_id is null
    or exists (select 1 from public.campagnes c where c.id = armes_contact.campaign_id and c.owner_id = auth.uid())
  );

-- armes_distance
alter table public.armes_distance enable row level security;
drop policy if exists "armes_distance_select" on public.armes_distance;
drop policy if exists "armes_distance_write"  on public.armes_distance;

create policy "armes_distance_select" on public.armes_distance
  for select to authenticated
  using (
    campaign_id is null
    or exists (
      select 1 from public.campagnes c
      where c.id = armes_distance.campaign_id
        and (
          c.owner_id = auth.uid()
          or exists (select 1 from public.campaign_members m where m.campaign_id = c.id and m.user_id = auth.uid())
          or exists (select 1 from public.pj p where p.campaign_id = c.id and p.user_id = auth.uid())
        )
    )
  );

create policy "armes_distance_write" on public.armes_distance
  for all to authenticated
  using (
    campaign_id is null
    or exists (select 1 from public.campagnes c where c.id = armes_distance.campaign_id and c.owner_id = auth.uid())
  )
  with check (
    campaign_id is null
    or exists (select 1 from public.campagnes c where c.id = armes_distance.campaign_id and c.owner_id = auth.uid())
  );

-- armures
alter table public.armures enable row level security;
drop policy if exists "armures_select" on public.armures;
drop policy if exists "armures_write"  on public.armures;

create policy "armures_select" on public.armures
  for select to authenticated
  using (
    campaign_id is null
    or exists (
      select 1 from public.campagnes c
      where c.id = armures.campaign_id
        and (
          c.owner_id = auth.uid()
          or exists (select 1 from public.campaign_members m where m.campaign_id = c.id and m.user_id = auth.uid())
          or exists (select 1 from public.pj p where p.campaign_id = c.id and p.user_id = auth.uid())
        )
    )
  );

create policy "armures_write" on public.armures
  for all to authenticated
  using (
    campaign_id is null
    or exists (select 1 from public.campagnes c where c.id = armures.campaign_id and c.owner_id = auth.uid())
  )
  with check (
    campaign_id is null
    or exists (select 1 from public.campagnes c where c.id = armures.campaign_id and c.owner_id = auth.uid())
  );

-- equipements
alter table public.equipements enable row level security;
drop policy if exists "equipements_select" on public.equipements;
drop policy if exists "equipements_write"  on public.equipements;

create policy "equipements_select" on public.equipements
  for select to authenticated
  using (
    campaign_id is null
    or exists (
      select 1 from public.campagnes c
      where c.id = equipements.campaign_id
        and (
          c.owner_id = auth.uid()
          or exists (select 1 from public.campaign_members m where m.campaign_id = c.id and m.user_id = auth.uid())
          or exists (select 1 from public.pj p where p.campaign_id = c.id and p.user_id = auth.uid())
        )
    )
  );

create policy "equipements_write" on public.equipements
  for all to authenticated
  using (
    campaign_id is null
    or exists (select 1 from public.campagnes c where c.id = equipements.campaign_id and c.owner_id = auth.uid())
  )
  with check (
    campaign_id is null
    or exists (select 1 from public.campagnes c where c.id = equipements.campaign_id and c.owner_id = auth.uid())
  );

-- =============================================================================
-- 4. TABLES LIÉES AUX PJs
--    pj_inventaire, pj_familiers
--    Accès si l'utilisateur est owner/member de la campagne du PJ, ou si c'est son PJ
-- =============================================================================

-- pj_inventaire
alter table public.pj_inventaire enable row level security;
drop policy if exists "pj_inventaire_access" on public.pj_inventaire;
create policy "pj_inventaire_access" on public.pj_inventaire
  for all to authenticated
  using (
    exists (
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
    )
  )
  with check (
    exists (
      select 1 from public.pj p
      where p.id = pj_inventaire.pj_id
        and (
          p.user_id = auth.uid()
          or exists (select 1 from public.campagnes c where c.id = p.campaign_id and c.owner_id = auth.uid())
        )
    )
  );

-- pj_familiers
alter table public.pj_familiers enable row level security;
drop policy if exists "pj_familiers_access" on public.pj_familiers;
create policy "pj_familiers_access" on public.pj_familiers
  for all to authenticated
  using (
    -- via pj_id
    (pj_id is not null and exists (
      select 1 from public.pj p
      where p.id = pj_familiers.pj_id
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
    -- via pnj_id
    or (pnj_id is not null and exists (
      select 1 from public.pnj n
      join public.campagnes c on c.id = n.campaign_id
      where n.id = pj_familiers.pnj_id
        and (
          c.owner_id = auth.uid()
          or exists (select 1 from public.campaign_members m where m.campaign_id = c.id and m.user_id = auth.uid())
          or exists (select 1 from public.pj pp where pp.campaign_id = c.id and pp.user_id = auth.uid())
        )
    ))
  )
  with check (
    (pj_id is not null and exists (
      select 1 from public.pj p
      where p.id = pj_familiers.pj_id
        and (
          p.user_id = auth.uid()
          or exists (select 1 from public.campagnes c where c.id = p.campaign_id and c.owner_id = auth.uid())
        )
    ))
    or (pnj_id is not null and exists (
      select 1 from public.pnj n
      join public.campagnes c on c.id = n.campaign_id
      where n.id = pj_familiers.pnj_id and c.owner_id = auth.uid()
    ))
  );

-- =============================================================================
-- 5. CAMPAIGN_REVEALED_PNJS
--    Visible par tous les membres de la campagne, modifiable par le owner
-- =============================================================================

alter table public.campaign_revealed_pnjs enable row level security;
drop policy if exists "campaign_revealed_pnjs_select" on public.campaign_revealed_pnjs;
drop policy if exists "campaign_revealed_pnjs_write"  on public.campaign_revealed_pnjs;

create policy "campaign_revealed_pnjs_select" on public.campaign_revealed_pnjs
  for select to authenticated
  using (
    exists (
      select 1 from public.campagnes c
      where c.id = campaign_revealed_pnjs.campaign_id
        and (
          c.owner_id = auth.uid()
          or exists (select 1 from public.campaign_members m where m.campaign_id = c.id and m.user_id = auth.uid())
          or exists (select 1 from public.pj p where p.campaign_id = c.id and p.user_id = auth.uid())
        )
    )
  );

create policy "campaign_revealed_pnjs_write" on public.campaign_revealed_pnjs
  for all to authenticated
  using (
    exists (select 1 from public.campagnes c where c.id = campaign_revealed_pnjs.campaign_id and c.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.campagnes c where c.id = campaign_revealed_pnjs.campaign_id and c.owner_id = auth.uid())
  );

-- =============================================================================
-- 6. UTILISATEURS (profil utilisateur)
--    Lecture publique (pseudo visible par les autres), écriture sur sa propre ligne
-- =============================================================================

alter table public.utilisateurs enable row level security;
drop policy if exists "utilisateurs_select" on public.utilisateurs;
drop policy if exists "utilisateurs_write"  on public.utilisateurs;

create policy "utilisateurs_select" on public.utilisateurs
  for select to authenticated
  using (true);

create policy "utilisateurs_write" on public.utilisateurs
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- =============================================================================
-- 7. CAMPAIGN_MEMBERS + CAMPAIGN_INVITATIONS
--    Lecture : membres de la campagne, écriture : owner de la campagne
-- =============================================================================

alter table public.campaign_members enable row level security;
drop policy if exists "campaign_members_select" on public.campaign_members;
drop policy if exists "campaign_members_write"  on public.campaign_members;

create policy "campaign_members_select" on public.campaign_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.campagnes c where c.id = campaign_members.campaign_id and c.owner_id = auth.uid())
  );

create policy "campaign_members_write" on public.campaign_members
  for all to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.campagnes c where c.id = campaign_members.campaign_id and c.owner_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.campagnes c where c.id = campaign_members.campaign_id and c.owner_id = auth.uid())
  );

alter table public.campaign_invitations enable row level security;
drop policy if exists "campaign_invitations_access" on public.campaign_invitations;

create policy "campaign_invitations_access" on public.campaign_invitations
  for all to authenticated
  using (
    -- Le owner de la campagne peut tout faire
    exists (select 1 from public.campagnes c where c.id = campaign_invitations.campaign_id and c.owner_id = auth.uid())
    -- N'importe quel auth peut lire un code d'invitation (pour rejoindre par code)
    or auth.uid() is not null
  )
  with check (
    exists (select 1 from public.campagnes c where c.id = campaign_invitations.campaign_id and c.owner_id = auth.uid())
  );
