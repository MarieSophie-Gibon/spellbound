-- ============================================================
-- Migration: Remove chapitres from the realtime publication
--
-- Context:
--   chapitres was added to supabase_realtime in
--   20260902030000_enable_realtime_combat_tables.sql, but no client
--   subscribes to its postgres_changes anymore: the MJ / co-MJ combat
--   session syncs over a private broadcast channel. Keeping it in the
--   publication made Realtime decode every combat_state UPDATE (a large
--   JSONB blob written repeatedly during combats) from the WAL for
--   nothing, adding to the project's Disk IO consumption.
--   bestiaire and pnj stay published (combatant appearance refresh).
-- ============================================================

alter publication supabase_realtime drop table public.chapitres;
