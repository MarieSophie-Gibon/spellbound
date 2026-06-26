-- Table des familiers liés à un PJ ou un PNJ
CREATE TABLE IF NOT EXISTS pj_familiers (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pj_id            UUID        REFERENCES pj(id)  ON DELETE CASCADE,
  pnj_id           UUID        REFERENCES pnj(id) ON DELETE CASCADE,
  monster_id       UUID        NOT NULL,
  monster_nom      TEXT        NOT NULL,
  monster_image_url TEXT,
  custom_name      TEXT,
  pv               INTEGER     NOT NULL DEFAULT 0,
  pv_max           INTEGER     NOT NULL DEFAULT 0,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT one_owner CHECK (
    (pj_id IS NOT NULL)::int + (pnj_id IS NOT NULL)::int = 1
  )
);
