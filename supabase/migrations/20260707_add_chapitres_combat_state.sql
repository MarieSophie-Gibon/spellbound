-- Ensure chapitre combat preparation data can be persisted.
ALTER TABLE IF EXISTS public.chapitres
ADD COLUMN IF NOT EXISTS combat_state jsonb NOT NULL DEFAULT '{}'::jsonb;
