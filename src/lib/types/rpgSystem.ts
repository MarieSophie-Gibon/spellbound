export type RpgSystem = 'COF' | 'DAGGERHEART' | 'DND5E';

export const RPG_SYSTEMS: { value: RpgSystem; label: string }[] = [
  { value: 'COF',         label: 'COF' },
  { value: 'DAGGERHEART', label: 'DH' },
  { value: 'DND5E',       label: 'D&D 5E' },
];
