import { describe, expect, it } from 'vitest';
import { isNpcMonsterModeForCombatant } from './CombatantCard';

describe('isNpcMonsterModeForCombatant', () => {
  it('keeps a non-monster NPC in PJ-like mode even when combat_stats_mode is extended', () => {
    const combatant = {
      id: 'npc-1',
      type: 'npc' as const,
      name: 'Guerrier du donjon',
      initiative: 12,
      pv: 20,
      pvMax: 20,
      conditions: [],
      pjStats: {
        is_combatant: true,
        combat_stats_mode: 'extended' as const,
        attaques: [],
        capacites_speciales: [],
      },
    };

    expect(isNpcMonsterModeForCombatant(combatant)).toBe(false);
  });

  it('uses monster mode only when the NPC really has monster data', () => {
    const combatant = {
      id: 'npc-2',
      type: 'npc' as const,
      name: 'Boss du donjon',
      initiative: 18,
      pv: 60,
      pvMax: 60,
      conditions: [],
      pjStats: {
        is_combatant: true,
        combat_stats_mode: 'extended' as const,
        attaques: [{ nom: 'Coup de masse', bonus: '2', degats: '3d6' }],
        capacites_speciales: [],
      },
    };

    expect(isNpcMonsterModeForCombatant(combatant)).toBe(true);
  });
});
