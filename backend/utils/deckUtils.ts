/**
 * Deck Utilities
 * Handles fear and invader deck shuffling and drawing
 */

/**
 * Fisher-Yates shuffle for shuffling an array
 */
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    if (temp !== undefined && shuffled[j] !== undefined) {
      shuffled[i] = shuffled[j];
      shuffled[j] = temp;
    }
  }
  return shuffled;
};

/**
 * Standard Fear Card Pool (from Spirit Island base game)
 * These are the 9 fear cards in the base game, which might appear multiple times
 * depending on the adversary and difficulty
 */
export const FEAR_CARD_NAMES = [
  'Fear Card 1',
  'Fear Card 2',
  'Fear Card 3',
  'Fear Card 4',
  'Fear Card 5',
  'Fear Card 6',
  'Fear Card 7',
  'Fear Card 8',
  'Fear Card 9',
];

/**
 * Standard Invader Cards (from Spirit Island base game)
 * These represent the 12 invader cards in the base game
 */
export const INVADER_CARD_NAMES = [
  'Invader 1',
  'Invader 2',
  'Invader 3',
  'Invader 4',
  'Invader 5',
  'Invader 6',
  'Invader 7',
  'Invader 8',
  'Invader 9',
  'Invader 10',
  'Invader 11',
  'Invader 12',
];

/**
 * Create a shuffled fear deck based on adversary thresholds
 * Returns a shuffled array of fear card names to be drawn
 */
export const createFearDeck = (fearThresholds: number[]): string[] => {
  if (fearThresholds.length === 0) {
    return [];
  }

  const maxThreshold = fearThresholds[fearThresholds.length - 1];
  if (maxThreshold === undefined) {
    return [];
  }
  const fearCards = FEAR_CARD_NAMES.slice(0, Math.min(maxThreshold, FEAR_CARD_NAMES.length));

  return shuffleArray(fearCards);
};

/**
 * Create a shuffled invader deck based on card count
 * Most adversaries use 12 cards, but some vary
 */
export const createInvaderDeck = (cardCount: number = 12): string[] => {
  const invaderCards = INVADER_CARD_NAMES.slice(0, Math.min(cardCount, INVADER_CARD_NAMES.length));
  return shuffleArray(invaderCards);
};

/**
 * Draw a card from the deck
 * If deck is empty, reshuffle the discard pile and draw from it
 * 
 * @param deck - Current deck (array of card names)
 * @param discard - Discard pile (array of card names)
 * @returns Object with drawn card, updated deck, and updated discard
 */
export const drawCard = (
  deck: string[],
  discard: string[]
): { card: string; newDeck: string[]; newDiscard: string[] } => {
  const firstCard = deck[0];
  if (firstCard !== undefined && deck.length > 0) {
    const newDeck = deck.slice(1);
    return { card: firstCard, newDeck, newDiscard: discard };
  }

  // Deck is empty, reshuffle discard
  if (discard.length === 0) {
    // No cards anywhere - game is in an unusual state
    console.warn('Both deck and discard pile are empty');
    return { card: 'Unknown Card', newDeck: [], newDiscard: [] };
  }

  const reshuffledDeck = shuffleArray(discard);
  const card = reshuffledDeck[0];
  const newDeck = (card !== undefined) ? reshuffledDeck.slice(1) : reshuffledDeck;

  return { card: card || 'Unknown Card', newDeck, newDiscard: [] };
};

/**
 * Initialize a fear deck and discard pile for a game
 * Returns the shuffled deck and empty discard pile
 */
export const initializeFearDeck = (fearThresholds: number[]): { deck: string[]; discard: string[] } => {
  const deck = createFearDeck(fearThresholds);
  return { deck, discard: [] };
};

/**
 * Initialize an invader deck and discard pile for a game
 * Returns the shuffled deck and empty discard pile
 */
export const initializeInvaderDeck = (cardCount: number = 12): { deck: string[]; discard: string[] } => {
  const deck = createInvaderDeck(cardCount);
  return { deck, discard: [] };
};

/**
 * Generate a random land from 1-8
 * Used for "Draw to Explore" mechanic
 */
export const getRandomLand = (): number => {
  return Math.floor(Math.random() * 8) + 1;
};

/**
 * Get a list of random lands (with possible duplicates for stacking)
 */
export const getRandomLands = (count: number): number[] => {
  const lands: number[] = [];
  for (let i = 0; i < count; i++) {
    lands.push(getRandomLand());
  }
  return lands;
};
