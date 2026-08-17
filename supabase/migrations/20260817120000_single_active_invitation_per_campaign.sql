BEGIN;

-- Nettoyage des invitations expirées.
DELETE FROM public.campaign_invitations
WHERE expires_at IS NOT NULL
  AND expires_at < now();

-- Dédoublonnage: conserver uniquement la plus récente par campagne.
WITH ranked AS (
  SELECT
    id,
    campaign_id,
    ROW_NUMBER() OVER (
      PARTITION BY campaign_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.campaign_invitations
)
DELETE FROM public.campaign_invitations ci
USING ranked r
WHERE ci.id = r.id
  AND r.rn > 1;

-- Garde-fou: un seul code d'invitation par campagne.
CREATE UNIQUE INDEX IF NOT EXISTS uq_campaign_invitations_campaign_id
  ON public.campaign_invitations (campaign_id);

COMMIT;
