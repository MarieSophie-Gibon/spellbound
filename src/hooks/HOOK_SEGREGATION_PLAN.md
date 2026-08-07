# Hook Segregation Plan (Core vs COF)

This plan is intentionally non-destructive.
No existing hook implementation was moved or edited.
New Core/COF paths currently re-export existing hooks to preserve runtime behavior.

## Core hooks (system-agnostic)

- src/hooks/core/auth/useAuthData.ts -> re-export from src/hooks/auth/useAuthData.ts
- src/hooks/core/lobby/useLobbyData.ts -> re-export from src/hooks/lobby/useLobbyData.ts
- src/hooks/core/grimoire/useGrimoireData.ts -> re-export from src/hooks/grimoire/useGrimoireData.ts
- src/hooks/core/personnage/useProfile.ts -> re-export from src/hooks/personnage/useProfile.ts
- src/hooks/core/scenarios/useChapitreEditorData.ts -> re-export from src/hooks/scenarios/useChapitreEditorData.ts

## COF hooks (system-specific)

Compendium:
- src/hooks/systems/cof/compendium/useCompendiumData.ts -> re-export from src/hooks/compendium/useCompendiumData.ts
- src/hooks/systems/cof/compendium/useEquipementWizardData.ts -> re-export from src/hooks/compendium/useEquipementWizardData.ts
- src/hooks/systems/cof/compendium/useFamilleData.ts -> re-export from src/hooks/compendium/useFamilleData.ts
- src/hooks/systems/cof/compendium/usePeupleData.ts -> re-export from src/hooks/compendium/usePeupleData.ts
- src/hooks/systems/cof/compendium/useProfilData.ts -> re-export from src/hooks/compendium/useProfilData.ts
- src/hooks/systems/cof/compendium/useVoiePrestigeData.ts -> re-export from src/hooks/compendium/useVoiePrestigeData.ts

Personnage:
- src/hooks/systems/cof/personnage/useInventory.ts -> re-export from src/hooks/personnage/useInventory.ts
- src/hooks/systems/cof/personnage/useLevelUp.ts -> re-export from src/hooks/personnage/useLevelUp.ts
- src/hooks/systems/cof/personnage/useLore.ts -> re-export from src/hooks/personnage/useLore.ts
- src/hooks/systems/cof/personnage/usePersonnagesData.ts -> re-export from src/hooks/personnage/usePersonnagesData.ts

Scenarios:
- src/hooks/systems/cof/scenarios/useScenarioBlocksData.ts -> re-export from src/hooks/scenarios/useScenarioBlocksData.ts

## Mixed hooks to refactor next

- src/hooks/campaign/usePJs.ts
  - Core extract: users lookup and campaign membership-level identity reads.
  - COF extract: pj reads and character-list shaping.

- src/hooks/campaign/useCampaignHomeData.ts
  - Core extract: campaign_members + utilisateurs roster and campaign meta.
  - COF extract: voies enrichment.

- src/hooks/campaign/useCampaignPjListData.ts
  - Core extract: utilisateurs-facing reads.
  - COF extract: peuples/profils lookups.

- src/hooks/campaign/useCampaigns.ts
  - Core extract: campagnes, campaign_members, campaign_invitations, scenarios, chapitres, duplicate_campaign lifecycle.
  - COF extract: pj/bestiaire/profils counters and revealed PNJ/monster state.

- src/hooks/compendium/useMonsterWizardData.ts
  - Core extract: campaign ownership/access fetch.
  - COF extract: bestiaire CRUD + compendium media.

- src/hooks/personnage/usePersonnageCreationData.ts
  - Core extract: auth context, utilisateurs/campagnes access checks.
  - COF extract: peuples/profils/familles/voies/equipements + pj/pnj/pj_inventaire/pj_familiers flows.

- src/hooks/personnage/usePersonnageDetail.ts
  - Core extract: utilisateurs/campagnes reads and generic permissions.
  - COF extract: voies/inventory/weapons/familiers and COF stat shaping.

- src/hooks/scenarios/useScenariosData.ts
  - Core extract: scenarios/chapitres CRUD and ordering.
  - COF extract: campaign_revealed_pnjs side-effects.

- src/hooks/scenarios/useCombatDashboardData.ts
  - Core extract: chapitres/campagnes realtime combat state transport.
  - COF extract: combatant resolution from pj/pnj/bestiaire/voies/pj_familiers.
