/**
 * Spirit Island Scenarios
 */

export interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: number; // 1-4, difficulty modifier
  specialRules?: string[];
}

export const SCENARIOS: Record<string, Scenario> = {
  'base-game': {
    id: 'base-game',
    name: 'Base Game',
    description: 'Standard game setup with default rules',
    difficulty: 0,
  },
  'guardians-of-the-island': {
    id: 'guardians-of-the-island',
    name: 'Guardians of the Island',
    description: 'A classic early-game scenario',
    difficulty: 0,
    specialRules: ['Standard rules apply', 'Spirits work together from the start'],
  },
  'rituals-of-terror': {
    id: 'rituals-of-terror',
    name: 'Rituals of Terror',
    description: 'Fear plays a dominant role',
    difficulty: 1,
    specialRules: ['Doubled fear card draws', 'Terror level matters more'],
  },
  'waning-land': {
    id: 'waning-land',
    name: 'Waning Land',
    description: 'A critical point in the struggle',
    difficulty: 1,
    specialRules: ['Blight spreads faster'],
  },
  'shadow-flicker': {
    id: 'shadow-flicker',
    name: 'Shadow Flicker',
    description: 'Escalating darkness scenario',
    difficulty: 2,
    specialRules: ['Accelerated invader progression'],
  },
};

export const getScenario = (id: string): Scenario | null => {
  return SCENARIOS[id.toLowerCase()] ?? null;
};

export const listScenarios = (): Scenario[] => {
  return Object.values(SCENARIOS);
};
