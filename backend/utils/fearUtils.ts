/**
 * Fear and Terror Level Utilities
 */

import * as Y from 'yjs';

/**
 * Calculate terror level from fearCardsEarned and fear thresholds
 * 
 * @param fearCardsEarned - Total fear cards earned
 * @param fearThresholds - Cumulative thresholds [3, 6, 9] for example
 * @returns Terror level (1-4)
 * 
 * Example with thresholds [3, 6, 9]:
 *   fearCardsEarned 0-3 → level 1
 *   fearCardsEarned 4-6 → level 2
 *   fearCardsEarned 7-9 → level 3
 *   fearCardsEarned 9+ → level 4 (VICTORY)
 */
export const calculateTerrorLevel = (fearCardsEarned: number, fearThresholds: number[]): number => {
  if (fearThresholds.length === 0) {
    return 1;
  }

  const maxThreshold = fearThresholds[fearThresholds.length - 1];
  if (maxThreshold !== undefined && fearCardsEarned >= maxThreshold) {
    return 4; // Victory via fear
  }

  for (let i = fearThresholds.length - 1; i >= 0; i--) {
    const threshold = fearThresholds[i];
    if (threshold !== undefined && fearCardsEarned >= threshold) {
      return i + 2; // Levels start at 2 after level 1
    }
  }

  return 1; // Below first threshold
};

/**
 * Get the number of fear cards available in the current tier
 * 
 * @param fearCardsEarned - Total fear cards earned
 * @param fearThresholds - Cumulative thresholds
 * @returns Number of cards available in current tier
 */
export const getFearCardsAvailableInTier = (fearCardsEarned: number, fearThresholds: number[]): number => {
  if (fearThresholds.length === 0) {
    return 0;
  }

  const maxThreshold = fearThresholds[fearThresholds.length - 1];
  if (maxThreshold !== undefined && fearCardsEarned >= maxThreshold) {
    return 0; // Victory - no more cards available
  }

  // Find which tier we're in
  let tierStart = 0;
  for (let i = 0; i < fearThresholds.length; i++) {
    const threshold = fearThresholds[i];
    if (threshold !== undefined && fearCardsEarned < threshold) {
      // We're in tier i
      const tierEnd = threshold;
      return tierEnd - fearCardsEarned;
    }
    tierStart = threshold || 0;
  }

  return 0;
};

/**
 * Apply a fear modifier to the game state
 * Updates fearCardsEarned, terrorLevel, and triggers victory check if needed
 * 
 * @param gameMap - Yjs Y.Map containing game state
 * @param modifier - Number to add/subtract from fearCardsEarned (can be negative)
 * @returns Object with new state values
 */
export const applyFearModifier = (
  gameMap: Y.Map<unknown>,
  modifier: number
): { fearCardsEarned: number; terrorLevel: number; isVictory: boolean } => {
  const fearThresholds = gameMap.get('gameConfig') instanceof Y.Map
    ? ((gameMap.get('gameConfig') as Y.Map<unknown>).get('fearThresholds') as number[])
    : [3, 6, 9]; // fallback

  let fearCardsEarned = Number(gameMap.get('fearCardsEarned') || 0);
  fearCardsEarned += modifier;
  fearCardsEarned = Math.max(0, fearCardsEarned); // Don't go below 0

  const terrorLevel = calculateTerrorLevel(fearCardsEarned, fearThresholds);
  const isVictory = terrorLevel >= 4;

  gameMap.set('fearCardsEarned', fearCardsEarned);
  gameMap.set('terrorLevel', terrorLevel);

  return { fearCardsEarned, terrorLevel, isVictory };
};

/**
 * Initialize fear state based on adversary thresholds
 * 
 * @param gameMap - Yjs Y.Map containing game state
 * @param fearThresholds - Thresholds from adversary
 */
export const initializeFearState = (gameMap: Y.Map<unknown>, fearThresholds: number[]) => {
  gameMap.set('fearCardsEarned', 0);
  const initialTerrorLevel = calculateTerrorLevel(0, fearThresholds);
  gameMap.set('terrorLevel', initialTerrorLevel);
  gameMap.set('fearCardsAvailable', fearThresholds[0] || 0);
};
