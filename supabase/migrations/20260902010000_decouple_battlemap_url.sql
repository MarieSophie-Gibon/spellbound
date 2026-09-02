-- ============================================================
-- Migration: Decouple battlemap URL from combat_state JSON blob
--
-- Context:
--   combat_state is a single JSON blob rewritten in full by every
--   client (MJ dashboard + every player moving a token). Any client
--   holding a slightly stale local copy silently reverts the
--   battlemap for everyone on its next write. Moving battlemap_url
--   to its own column lets it be updated independently, immediately,
--   and without being clobbered by unrelated combat_state writes.
-- ============================================================

alter table public.chapitres
  add column if not exists battlemap_url text;

update public.chapitres
  set battlemap_url = combat_state->>'battlemapUrl'
  where battlemap_url is null
    and combat_state ? 'battlemapUrl'
    and combat_state->>'battlemapUrl' is not null;
