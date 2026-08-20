-- ============================================================
-- Migration: Remove mj/joueur from utilisateurs.role
--
-- Goals:
--   1. utilisateurs.role now only holds NULL or 'super_admin'.
--      mj/joueur status is derived from campaign ownership/co-DM
--      membership (campagnes.owner_id, campaign_members.role).
--   2. Migrate existing mj/joueur rows to NULL.
--   3. Update the anti-escalation write policy (logic unchanged).
-- ============================================================

-- ─── 1. Drop existing constraint ─────────────────────────────────────────────
ALTER TABLE public.utilisateurs
  DROP CONSTRAINT IF EXISTS utilisateurs_role_check;

-- ─── 2. Clear legacy mj/joueur values FIRST ──────────────────────────────────
UPDATE public.utilisateurs
  SET role = NULL
  WHERE role IN ('mj', 'joueur');

-- ─── 3. Add new constraint (safe now that rows are clean) ─────────────────────
ALTER TABLE public.utilisateurs
  ADD CONSTRAINT utilisateurs_role_check
    CHECK (role IS NULL OR role = 'super_admin');
