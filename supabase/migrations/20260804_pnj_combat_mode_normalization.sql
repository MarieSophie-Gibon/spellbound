-- Normalize legacy PNJ combat mode:
-- if a PNJ is combatant and has monster-style data (attaques/capacites_speciales),
-- force combat_stats_mode to "extended".

UPDATE public.pnj
SET stats = jsonb_set(
  COALESCE(stats, '{}'::jsonb),
  '{combat_stats_mode}',
  '"extended"'::jsonb,
  true
)
WHERE
  COALESCE((stats->>'is_combatant')::boolean, false) = true
  AND (
    jsonb_typeof(stats->'attaques') = 'array'
    AND jsonb_array_length(stats->'attaques') > 0
    OR jsonb_typeof(stats->'capacites_speciales') = 'array'
    AND jsonb_array_length(stats->'capacites_speciales') > 0
  )
  AND COALESCE(stats->>'combat_stats_mode', '') <> 'extended';
