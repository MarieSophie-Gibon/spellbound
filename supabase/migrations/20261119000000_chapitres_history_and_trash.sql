-- ============================================================
-- Migration: Version history and trash for chapitres
--
-- Context:
--   A chapitre's content was lost after being overwritten by an
--   autosave bug, and a deleted chapitre (misclick) cannot be
--   recovered. Two safety nets, both maintained in the database so
--   they work whatever the client does:
--
--   1. chapitres_history: a BEFORE UPDATE trigger keeps the previous
--      content of a chapitre. To stay light on Disk IO, at most one
--      version every 5 minutes per chapitre is kept, and only the
--      30 most recent versions. combat_state updates never fire it
--      (UPDATE OF content + WHEN clause).
--
--   2. chapitres_trash: a BEFORE DELETE trigger copies the deleted
--      row (whole row as jsonb, so future columns are kept) into the
--      trash. restore_chapitre() puts it back with the same id, so
--      links from other chapitres keep working; trashed chapitres are
--      purged after 30 days. Chapitres deleted through a scenario
--      deletion (cascade) are not trashed.
--
--   History rows have no FK to chapitres on purpose: they must
--   survive while the chapitre is in the trash. They are removed
--   when the chapitre is permanently deleted or purged.
--
--   Only campaign managers (owner or Co-DM) can read history/trash
--   and call the restore/delete functions.
-- ============================================================

-- ------------------------------------------------------------
-- 1. History
-- ------------------------------------------------------------

create table if not exists public.chapitres_history (
  id          uuid        primary key default gen_random_uuid(),
  chapitre_id uuid        not null,
  title       text        not null,
  content     jsonb       not null,
  saved_at    timestamptz not null default now(),
  saved_by    uuid        default auth.uid()
);

create index if not exists chapitres_history_chapitre_saved_idx
  on public.chapitres_history (chapitre_id, saved_at desc);

alter table public.chapitres_history enable row level security;

revoke all on public.chapitres_history from anon, authenticated;
grant select on public.chapitres_history to authenticated;

drop policy if exists chapitres_history_select_manager on public.chapitres_history;
create policy chapitres_history_select_manager
on public.chapitres_history
for select
to authenticated
using (
  exists (
    select 1
    from public.chapitres c
    join public.scenarios s on s.id = c.scenario_id
    where c.id = chapitres_history.chapitre_id
      and public.is_campaign_manager(s.campaign_id)
  )
);

create or replace function public.prune_chapitre_history(p_chapitre_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.chapitres_history h
  where h.chapitre_id = p_chapitre_id
    and h.id not in (
      select id
      from public.chapitres_history
      where chapitre_id = p_chapitre_id
      order by saved_at desc
      limit 30
    );
$$;

revoke all on function public.prune_chapitre_history(uuid) from public, anon, authenticated;

create or replace function public.snapshot_chapitre_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Rien à conserver pour un chapitre vide.
  if old.content is null or old.content = '[]'::jsonb then
    return new;
  end if;

  -- Une version toutes les 5 minutes au plus : l'autosave écrit toutes les
  -- 2 secondes pendant la frappe.
  if exists (
    select 1
    from public.chapitres_history h
    where h.chapitre_id = old.id
      and h.saved_at > now() - interval '5 minutes'
  ) then
    return new;
  end if;

  insert into public.chapitres_history (chapitre_id, title, content, saved_by)
  values (old.id, old.title, old.content, auth.uid());

  perform public.prune_chapitre_history(old.id);
  return new;
end;
$$;

drop trigger if exists chapitres_snapshot_content on public.chapitres;
create trigger chapitres_snapshot_content
before update of content on public.chapitres
for each row
when (old.content is distinct from new.content)
execute function public.snapshot_chapitre_content();

create or replace function public.restore_chapitre_version(p_history_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hist     public.chapitres_history;
  v_campaign uuid;
  v_title    text;
  v_current  jsonb;
begin
  select * into v_hist from public.chapitres_history where id = p_history_id;
  if not found then
    raise exception 'Version introuvable';
  end if;

  select s.campaign_id, c.title, c.content
    into v_campaign, v_title, v_current
  from public.chapitres c
  join public.scenarios s on s.id = c.scenario_id
  where c.id = v_hist.chapitre_id;
  if not found then
    raise exception 'Chapitre introuvable';
  end if;

  if not public.is_campaign_manager(v_campaign) then
    raise exception 'Accès refusé';
  end if;

  -- Le contenu actuel est toujours conservé, pour pouvoir annuler la restauration.
  if v_current is distinct from v_hist.content and v_current <> '[]'::jsonb then
    insert into public.chapitres_history (chapitre_id, title, content, saved_by)
    values (v_hist.chapitre_id, v_title, v_current, auth.uid());
    perform public.prune_chapitre_history(v_hist.chapitre_id);
  end if;

  -- Le trigger de snapshot voit la version qui vient d'être insérée et n'en ajoute pas.
  update public.chapitres set content = v_hist.content where id = v_hist.chapitre_id;
end;
$$;

revoke all on function public.restore_chapitre_version(uuid) from public, anon;
grant execute on function public.restore_chapitre_version(uuid) to authenticated;

-- ------------------------------------------------------------
-- 2. Trash
-- ------------------------------------------------------------

create table if not exists public.chapitres_trash (
  id          uuid        primary key,  -- id du chapitre supprimé
  scenario_id uuid        not null references public.scenarios(id) on delete cascade,
  title       text        not null,
  data        jsonb       not null,     -- ligne complète de chapitres
  deleted_at  timestamptz not null default now(),
  deleted_by  uuid        default auth.uid()
);

create index if not exists chapitres_trash_scenario_idx
  on public.chapitres_trash (scenario_id);

alter table public.chapitres_trash enable row level security;

revoke all on public.chapitres_trash from anon, authenticated;
grant select on public.chapitres_trash to authenticated;

drop policy if exists chapitres_trash_select_manager on public.chapitres_trash;
create policy chapitres_trash_select_manager
on public.chapitres_trash
for select
to authenticated
using (
  exists (
    select 1
    from public.scenarios s
    where s.id = chapitres_trash.scenario_id
      and public.is_campaign_manager(s.campaign_id)
  )
);

-- Vide la corbeille des chapitres supprimés depuis plus de 30 jours, et
-- l'historique qui n'appartient plus à aucun chapitre (ni actif, ni en corbeille).
create or replace function public.purge_chapitres_trash()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.chapitres_trash
  where deleted_at < now() - interval '30 days';

  delete from public.chapitres_history h
  where not exists (select 1 from public.chapitres c where c.id = h.chapitre_id)
    and not exists (select 1 from public.chapitres_trash t where t.id = h.chapitre_id);
$$;

revoke all on function public.purge_chapitres_trash() from public, anon, authenticated;

create or replace function public.trash_deleted_chapitre()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Suppression en cascade d'un scénario entier : pas de corbeille.
  if pg_trigger_depth() > 1 then
    delete from public.chapitres_history where chapitre_id = old.id;
    return old;
  end if;

  insert into public.chapitres_trash (id, scenario_id, title, data, deleted_by)
  values (old.id, old.scenario_id, old.title, to_jsonb(old), auth.uid())
  on conflict (id) do update
    set scenario_id = excluded.scenario_id,
        title       = excluded.title,
        data        = excluded.data,
        deleted_at  = now(),
        deleted_by  = excluded.deleted_by;

  -- Purge paresseuse : pas besoin de tâche planifiée.
  perform public.purge_chapitres_trash();
  return old;
end;
$$;

drop trigger if exists chapitres_trash_on_delete on public.chapitres;
create trigger chapitres_trash_on_delete
before delete on public.chapitres
for each row
execute function public.trash_deleted_chapitre();

create or replace function public.restore_chapitre(p_chapitre_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trash    public.chapitres_trash;
  v_campaign uuid;
  v_row      public.chapitres;
begin
  select * into v_trash from public.chapitres_trash where id = p_chapitre_id;
  if not found then
    raise exception 'Chapitre introuvable dans la corbeille';
  end if;

  select campaign_id into v_campaign from public.scenarios where id = v_trash.scenario_id;
  if v_campaign is null or not public.is_campaign_manager(v_campaign) then
    raise exception 'Accès refusé';
  end if;

  v_row := jsonb_populate_record(null::public.chapitres, v_trash.data);

  -- Reprend sa place d'origine dans le scénario.
  update public.chapitres
  set ordre = ordre + 1
  where scenario_id = v_row.scenario_id
    and ordre >= v_row.ordre;

  insert into public.chapitres select (v_row).*;
  delete from public.chapitres_trash where id = p_chapitre_id;
end;
$$;

revoke all on function public.restore_chapitre(uuid) from public, anon;
grant execute on function public.restore_chapitre(uuid) to authenticated;

create or replace function public.delete_chapitre_permanently(p_chapitre_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign uuid;
begin
  select s.campaign_id into v_campaign
  from public.chapitres_trash t
  join public.scenarios s on s.id = t.scenario_id
  where t.id = p_chapitre_id;
  if v_campaign is null or not public.is_campaign_manager(v_campaign) then
    raise exception 'Accès refusé';
  end if;

  delete from public.chapitres_trash where id = p_chapitre_id;
  delete from public.chapitres_history where chapitre_id = p_chapitre_id;
end;
$$;

revoke all on function public.delete_chapitre_permanently(uuid) from public, anon;
grant execute on function public.delete_chapitre_permanently(uuid) to authenticated;
