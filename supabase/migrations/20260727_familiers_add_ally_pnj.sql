-- Allow familiers to reference a PNJ ally (e.g., écuyer for a knight)
-- rather than only bestiaire monsters
ALTER TABLE pj_familiers
  ALTER COLUMN monster_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS ally_pnj_id UUID REFERENCES pnj(id) ON DELETE SET NULL;

-- Ensure at least one source (monster or pnj ally) is set
ALTER TABLE pj_familiers
  DROP CONSTRAINT IF EXISTS pj_familiers_has_source,
  ADD CONSTRAINT pj_familiers_has_source CHECK (
    monster_id IS NOT NULL OR ally_pnj_id IS NOT NULL
  );
