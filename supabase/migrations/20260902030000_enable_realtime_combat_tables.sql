-- ============================================================
-- Migration: Enable Postgres realtime replication for combat tables
--
-- Context:
--   The supabase_realtime publication had zero tables registered,
--   meaning every postgres_changes subscription in the app
--   (chapitres.combat_state sync, and the new bestiaire/pnj
--   combatant-appearance refresh) has silently never received any
--   event from the database. Only same-browser BroadcastChannel
--   sync and manual refetches gave the illusion it worked.
-- ============================================================

alter publication supabase_realtime add table public.chapitres;
alter publication supabase_realtime add table public.bestiaire;
alter publication supabase_realtime add table public.pnj;
