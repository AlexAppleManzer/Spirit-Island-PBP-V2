/**
 * Spirit Island Event Cards
 * 
 * fearModifier: number, can be positive or negative
 *   +1 = "Fear Card"
 *   -1 = "Fear Removed"
 * invaderModifier: optional, for invader deck changes (future use)
 */

export interface EventCard {
  id: string;
  name: string;
  phase: 'growth' | 'fast' | 'event' | 'invader' | 'slow';
  description: string;
  fearModifier: number;
  invaderModifier?: number;
}

export const EVENT_CARDS: EventCard[] = [
  {
    id: 'event-fear-1',
    name: 'Fear Card',
    phase: 'event',
    description: 'Earn 1 fear card',
    fearModifier: 1,
  },
  {
    id: 'event-fear-2',
    name: 'Fear Card',
    phase: 'event',
    description: 'Earn 1 fear card',
    fearModifier: 1,
  },
  {
    id: 'event-fear-3',
    name: 'Panic',
    phase: 'event',
    description: 'Earn 2 fear cards',
    fearModifier: 2,
  },
  {
    id: 'event-fear-4',
    name: 'Dread',
    phase: 'event',
    description: 'Earn 1 fear card',
    fearModifier: 1,
  },
  {
    id: 'event-fear-removed-1',
    name: 'Morale Boost',
    phase: 'growth',
    description: 'Remove 1 fear card from the game',
    fearModifier: -1,
  },
  {
    id: 'event-fear-removed-2',
    name: 'Relief',
    phase: 'growth',
    description: 'Remove 2 fear cards from the game',
    fearModifier: -2,
  },
  {
    id: 'event-neutral-1',
    name: 'Trade Agreement',
    phase: 'growth',
    description: 'No fear or invader changes',
    fearModifier: 0,
  },
  {
    id: 'event-neutral-2',
    name: 'Diplomatic Mission',
    phase: 'fast',
    description: 'No immediate effect',
    fearModifier: 0,
  },
  {
    id: 'event-invader-1',
    name: 'Reinforcements',
    phase: 'invader',
    description: 'Earn 1 fear card and add 1 invader card',
    fearModifier: 1,
    invaderModifier: 1,
  },
  {
    id: 'event-invader-2',
    name: 'Uprising',
    phase: 'event',
    description: 'Earn 3 fear cards; lose 1 invader card',
    fearModifier: 3,
    invaderModifier: -1,
  },
  {
    id: 'event-invader-3',
    name: 'Retreat',
    phase: 'slow',
    description: 'Remove 1 invader card',
    fearModifier: -1,
    invaderModifier: -1,
  },
  {
    id: 'event-escalation-1',
    name: 'Full Force Engagement',
    phase: 'invader',
    description: 'Large escalation: +2 fear, +2 invaders',
    fearModifier: 2,
    invaderModifier: 2,
  },
];

export const getEventCard = (id: string): EventCard | null => {
  return EVENT_CARDS.find((card) => card.id === id) ?? null;
};

export const getEventCardByName = (name: string): EventCard | null => {
  const normalized = name.toLowerCase();
  return EVENT_CARDS.find((card) => card.name.toLowerCase() === normalized) ?? null;
};

export const getEventCardsByPhase = (phase: string): EventCard[] => {
  return EVENT_CARDS.filter((card) => card.phase === phase);
};
