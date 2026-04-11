/**
 * Spirit Island Adversaries with Fear Thresholds
 * 
 * fearThresholds: number[] - cumulative dividers between fear card tiers
 * Example: [3, 6, 9] means:
 *   - Cards 1-3 earned: Terror Level 1
 *   - Cards 4-6 earned: Terror Level 2
 *   - Cards 7-9 earned: Terror Level 3
 *   - Cards 9+ earned: Terror Level 4 (VICTORY)
 */

export interface Adversary {
  id: string;
  name: string;
  difficulty: number; // 1 = Easy, 2 = Medium, 3 = Hard, 4 = Very Hard
  fearThresholds: number[]; // Cumulative thresholds for terror levels
  initialInvaderCardCount: number;
  description: string;
}

export const ADVERSARIES: Record<string, Adversary> = {
  'brandenburg-prussia': {
    id: 'brandenburg-prussia',
    name: 'Brandenburg-Prussia',
    difficulty: 1,
    fearThresholds: [3, 6, 9],
    initialInvaderCardCount: 12,
    description: 'Early colonial power with standard fear scaling',
  },
  england: {
    id: 'england',
    name: 'England',
    difficulty: 2,
    fearThresholds: [4, 8, 12],
    initialInvaderCardCount: 12,
    description: 'Naval power - generates more fear cards',
  },
  france: {
    id: 'france',
    name: 'France',
    difficulty: 2,
    fearThresholds: [3, 6, 9],
    initialInvaderCardCount: 12,
    description: 'Colonial rival with standard mechanisms',
  },
  spain: {
    id: 'spain',
    name: 'Spain',
    difficulty: 3,
    fearThresholds: [2, 5, 8],
    initialInvaderCardCount: 14,
    description: 'Aggressive conquistador - fewer fear cards needed to escalate',
  },
  sweden: {
    id: 'sweden',
    name: 'Sweden',
    difficulty: 1,
    fearThresholds: [3, 6, 9],
    initialInvaderCardCount: 11,
    description: 'Minor power with smaller invader deck',
  },
  russia: {
    id: 'russia',
    name: 'Russia',
    difficulty: 3,
    fearThresholds: [3, 6, 9],
    initialInvaderCardCount: 15,
    description: 'Massive continental expansion - larger invader deck',
  },
  netherlands: {
    id: 'netherlands',
    name: 'The Netherlands',
    difficulty: 2,
    fearThresholds: [3, 6, 9],
    initialInvaderCardCount: 12,
    description: 'Trade-focused power',
  },
  italy: {
    id: 'italy',
    name: 'Italy',
    difficulty: 1,
    fearThresholds: [3, 6, 9],
    initialInvaderCardCount: 10,
    description: 'Fragmented power - smallest invader presence',
  },
  germany: {
    id: 'germany',
    name: 'Germany',
    difficulty: 3,
    fearThresholds: [3, 6, 9],
    initialInvaderCardCount: 14,
    description: 'Industrial power with military might',
  },
  japan: {
    id: 'japan',
    name: 'Japan',
    difficulty: 3,
    fearThresholds: [2, 5, 8],
    initialInvaderCardCount: 13,
    description: 'Island nation - rapid escalation',
  },
};

export const getAdversary = (id: string): Adversary | null => {
  return ADVERSARIES[id.toLowerCase()] ?? null;
};

export const listAdversaries = (): Adversary[] => {
  return Object.values(ADVERSARIES);
};

export const getAdversaryByName = (name: string): Adversary | null => {
  const normalized = name.toLowerCase().replace(/[\s-]/g, '');
  return (
    Object.values(ADVERSARIES).find((a) => a.name.toLowerCase().replace(/[\s-]/g, '') === normalized) ??
    null
  );
};
