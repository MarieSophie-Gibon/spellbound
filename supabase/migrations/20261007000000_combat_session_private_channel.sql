-- ============================================================
-- Migration: Restrict the shared combat session channel to campaign managers
--
-- Context:
--   The MJ / co-MJ combat session (useCombatSession) uses a Supabase
--   Realtime channel "combat-session:<chapitre_id>" (Broadcast + Presence).
--   It was public: anyone holding the chapter id and the anon key could
--   listen to or inject combat state. The client now joins it as a
--   private channel, which makes Realtime enforce RLS on
--   realtime.messages for both receiving and sending.
--
--   Access rule: the authenticated user must be a manager (owner or
--   co-DM, see is_campaign_manager) of the campaign that owns the
--   chapter named in the topic.
--
--   Only topics matching "combat-session:<uuid>" are covered; other
--   (public) channels of the app are unaffected.
-- ============================================================

create or replace function public.can_access_combat_session(p_topic text)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select case
      when p_topic ~ '^combat-session:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
        exists (
          select 1
          from public.chapitres ch
          join public.scenarios s on s.id = ch.scenario_id
          where ch.id = split_part(p_topic, ':', 2)::uuid
            and public.is_campaign_manager(s.campaign_id)
        )
      else false
    end;
  $$;

grant execute on function public.can_access_combat_session(text) to authenticated;

comment on function public.can_access_combat_session(text) is
  'True if auth.uid() manages (owner or co-DM) the campaign of the chapter in a '
  '"combat-session:<chapitre_id>" Realtime topic. Used by realtime.messages RLS.';

-- Receive broadcast messages and presence state
drop policy if exists combat_session_read on realtime.messages;
create policy combat_session_read
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension in ('broadcast', 'presence')
  and public.can_access_combat_session(realtime.topic())
);

-- Send broadcast messages and track presence
drop policy if exists combat_session_write on realtime.messages;
create policy combat_session_write
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension in ('broadcast', 'presence')
  and public.can_access_combat_session(realtime.topic())
);
