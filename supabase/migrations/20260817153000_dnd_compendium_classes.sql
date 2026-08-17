-- DND 5e compendium groundwork (isolated from COF)
-- Tables: classes, progression, class features, subclasses, subclass features.

create table if not exists public.dnd_classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  summary text,
  description text,
  source_book text,
  version_tag text not null default '2024',
  primary_ability text,
  hit_die text,
  saving_throw_proficiencies text[] not null default '{}',
  skill_choices_count integer not null default 0,
  weapon_proficiencies text[] not null default '{}',
  armor_training text[] not null default '{}',
  tool_proficiencies text[] not null default '{}',
  spellcasting_ability text,
  multiclass_requirements jsonb not null default '{}'::jsonb,
  starting_equipment_options jsonb not null default '[]'::jsonb,
  campaign_id uuid references public.campagnes(id) on delete cascade,
  owner_id uuid not null default auth.uid(),
  is_custom boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dnd_classes_skill_choices_count_check check (skill_choices_count >= 0)
);

create table if not exists public.dnd_class_progression (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.dnd_classes(id) on delete cascade,
  level integer not null,
  proficiency_bonus integer not null,
  class_features_summary text,
  class_resource_die text,
  cantrips_known integer,
  spells_prepared integer,
  spell_slots smallint[] not null default '{0,0,0,0,0,0,0,0,0}'::smallint[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dnd_class_progression_level_check check (level between 1 and 20),
  constraint dnd_class_progression_slots_len_check check (coalesce(cardinality(spell_slots), 0) = 9),
  constraint dnd_class_progression_unique_level unique (class_id, level)
);

create table if not exists public.dnd_class_features (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.dnd_classes(id) on delete cascade,
  level integer not null,
  name text not null,
  description text not null,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dnd_class_features_level_check check (level between 1 and 20)
);

create table if not exists public.dnd_subclasses (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.dnd_classes(id) on delete cascade,
  name text not null,
  entry_level integer not null default 3,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dnd_subclasses_entry_level_check check (entry_level between 1 and 20)
);

create table if not exists public.dnd_subclass_features (
  id uuid primary key default gen_random_uuid(),
  subclass_id uuid not null references public.dnd_subclasses(id) on delete cascade,
  level integer not null,
  name text not null,
  description text not null,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dnd_subclass_features_level_check check (level between 1 and 20)
);

create index if not exists dnd_classes_campaign_name_idx on public.dnd_classes(campaign_id, name);
create index if not exists dnd_class_progression_class_level_idx on public.dnd_class_progression(class_id, level);
create index if not exists dnd_class_features_class_level_idx on public.dnd_class_features(class_id, level, sort_order);
create index if not exists dnd_subclasses_class_entry_idx on public.dnd_subclasses(class_id, entry_level, sort_order);
create index if not exists dnd_subclass_features_subclass_level_idx on public.dnd_subclass_features(subclass_id, level, sort_order);

create or replace function public.dnd_has_campaign_read_access(target_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_campaign_id is null
    or exists (
      select 1
      from public.campagnes c
      where c.id = target_campaign_id
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
    );
$$;

create or replace function public.dnd_can_read_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.dnd_classes dc
    where dc.id = target_class_id
      and (
        dc.owner_id = auth.uid()
        or public.dnd_has_campaign_read_access(dc.campaign_id)
      )
  );
$$;

create or replace function public.dnd_can_write_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.dnd_classes dc
    where dc.id = target_class_id
      and (
        dc.owner_id = auth.uid()
        or exists (
          select 1
          from public.campagnes c
          where c.id = dc.campaign_id
            and c.owner_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.dnd_can_read_subclass(target_subclass_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.dnd_subclasses ds
    where ds.id = target_subclass_id
      and public.dnd_can_read_class(ds.class_id)
  );
$$;

create or replace function public.dnd_can_write_subclass(target_subclass_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.dnd_subclasses ds
    where ds.id = target_subclass_id
      and public.dnd_can_write_class(ds.class_id)
  );
$$;

alter table public.dnd_classes enable row level security;
alter table public.dnd_class_progression enable row level security;
alter table public.dnd_class_features enable row level security;
alter table public.dnd_subclasses enable row level security;
alter table public.dnd_subclass_features enable row level security;

-- dnd_classes policies
drop policy if exists dnd_classes_select on public.dnd_classes;
create policy dnd_classes_select on public.dnd_classes
for select to authenticated
using (
  owner_id = auth.uid()
  or public.dnd_has_campaign_read_access(campaign_id)
);

drop policy if exists dnd_classes_insert on public.dnd_classes;
create policy dnd_classes_insert on public.dnd_classes
for insert to authenticated
with check (
  owner_id = auth.uid()
  and public.dnd_has_campaign_read_access(campaign_id)
);

drop policy if exists dnd_classes_update on public.dnd_classes;
create policy dnd_classes_update on public.dnd_classes
for update to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.campagnes c
    where c.id = dnd_classes.campaign_id
      and c.owner_id = auth.uid()
  )
)
with check (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.campagnes c
    where c.id = dnd_classes.campaign_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists dnd_classes_delete on public.dnd_classes;
create policy dnd_classes_delete on public.dnd_classes
for delete to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.campagnes c
    where c.id = dnd_classes.campaign_id
      and c.owner_id = auth.uid()
  )
);

-- dnd_class_progression policies
drop policy if exists dnd_class_progression_select on public.dnd_class_progression;
create policy dnd_class_progression_select on public.dnd_class_progression
for select to authenticated
using (public.dnd_can_read_class(class_id));

drop policy if exists dnd_class_progression_write on public.dnd_class_progression;
create policy dnd_class_progression_write on public.dnd_class_progression
for all to authenticated
using (public.dnd_can_write_class(class_id))
with check (public.dnd_can_write_class(class_id));

-- dnd_class_features policies
drop policy if exists dnd_class_features_select on public.dnd_class_features;
create policy dnd_class_features_select on public.dnd_class_features
for select to authenticated
using (public.dnd_can_read_class(class_id));

drop policy if exists dnd_class_features_write on public.dnd_class_features;
create policy dnd_class_features_write on public.dnd_class_features
for all to authenticated
using (public.dnd_can_write_class(class_id))
with check (public.dnd_can_write_class(class_id));

-- dnd_subclasses policies
drop policy if exists dnd_subclasses_select on public.dnd_subclasses;
create policy dnd_subclasses_select on public.dnd_subclasses
for select to authenticated
using (public.dnd_can_read_class(class_id));

drop policy if exists dnd_subclasses_write on public.dnd_subclasses;
create policy dnd_subclasses_write on public.dnd_subclasses
for all to authenticated
using (public.dnd_can_write_class(class_id))
with check (public.dnd_can_write_class(class_id));

-- dnd_subclass_features policies
drop policy if exists dnd_subclass_features_select on public.dnd_subclass_features;
create policy dnd_subclass_features_select on public.dnd_subclass_features
for select to authenticated
using (public.dnd_can_read_subclass(subclass_id));

drop policy if exists dnd_subclass_features_write on public.dnd_subclass_features;
create policy dnd_subclass_features_write on public.dnd_subclass_features
for all to authenticated
using (public.dnd_can_write_subclass(subclass_id))
with check (public.dnd_can_write_subclass(subclass_id));

grant all on public.dnd_classes to authenticated;
grant all on public.dnd_class_progression to authenticated;
grant all on public.dnd_class_features to authenticated;
grant all on public.dnd_subclasses to authenticated;
grant all on public.dnd_subclass_features to authenticated;

grant all on public.dnd_classes to service_role;
grant all on public.dnd_class_progression to service_role;
grant all on public.dnd_class_features to service_role;
grant all on public.dnd_subclasses to service_role;
grant all on public.dnd_subclass_features to service_role;
