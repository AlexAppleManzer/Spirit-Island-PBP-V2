/**
 * Event Card Executor
 * Applies event effects to game state
 */

import * as Y from 'yjs';
import { getEventCard } from '../data/eventCards.js';
import { applyFearModifier } from './fearUtils.js';

export interface EventExecutionResult {
  success: boolean;
  fearCardsEarned?: number;
  terrorLevel?: number;
  invaderCardChange?: number;
  isVictory?: boolean;
  message: string;
}

/**
 * Execute an event card by name or ID
 * Applies all modifiers (fear, invader, etc.) atomically
 * 
 * @param gameMap - Yjs Y.Map containing game state
 * @param eventId - Event card ID
 * @returns Execution result with new state values
 */
export const executeEvent = (gameMap: Y.Map<unknown>, eventId: string): EventExecutionResult => {
  const event = getEventCard(eventId);
  if (!event) {
    return { success: false, message: `Event card not found: ${eventId}` };
  }

  try {
    let fearResult = { fearCardsEarned: Number(gameMap.get('fearCardsEarned') || 0), terrorLevel: 1, isVictory: false };
    let invaderChange = 0;

    // Apply fear modifier
    if (event.fearModifier !== 0) {
      fearResult = applyFearModifier(gameMap, event.fearModifier);
    }

    // Apply invader modifier (future expansion)
    if (event.invaderModifier !== undefined && event.invaderModifier !== 0) {
      const currentInvaderCount = Number(gameMap.get('decks')instanceof Y.Map 
        ? (gameMap.get('decks') as Y.Map<unknown>).get('invader') 
        : 12);
      const newInvaderCount = Math.max(0, currentInvaderCount + event.invaderModifier);
      
      if (gameMap.get('decks') instanceof Y.Map) {
        (gameMap.get('decks') as Y.Map<unknown>).set('invader', newInvaderCount);
      }
      invaderChange = event.invaderModifier;
    }

    // Record the execution with timestamp
    const timestamp = Date.now();
    const eventHistory = (gameMap.get('eventHistory') instanceof Y.Array)
      ? (gameMap.get('eventHistory') as Y.Array<any>)
      : new Y.Array();

    if (!(gameMap.get('eventHistory') instanceof Y.Array)) {
      gameMap.set('eventHistory', eventHistory);
    }

    eventHistory.push([
      {
        eventId,
        eventName: event.name,
        timestamp,
        fearModifier: event.fearModifier,
        invaderModifier: event.invaderModifier || null,
      },
    ]);

    // Add to discard pile
    const discards = (gameMap.get('discards') instanceof Y.Map)
      ? (gameMap.get('discards') as Y.Map<unknown>)
      : new Y.Map();

    if (!(gameMap.get('discards') instanceof Y.Map)) {
      gameMap.set('discards', discards);
    }

    const eventDiscard = (discards.get('event') instanceof Y.Array)
      ? (discards.get('event') as Y.Array<any>)
      : new Y.Array();

    if (!(discards.get('event') instanceof Y.Array)) {
      discards.set('event', eventDiscard);
    }

    eventDiscard.push([{ card: event.name, timestamp }]);

    return {
      success: true,
      fearCardsEarned: fearResult.fearCardsEarned,
      terrorLevel: fearResult.terrorLevel,
      invaderCardChange: invaderChange,
      isVictory: fearResult.isVictory,
      message: `Event "${event.name}" executed successfully`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error executing event: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Undo the most recent event (remove from history and reverse modifiers)
 * Returns the state before the event
 */
export const undoLastEvent = (gameMap: Y.Map<unknown>): EventExecutionResult => {
  const eventHistory = gameMap.get('eventHistory') instanceof Y.Array
    ? (gameMap.get('eventHistory') as Y.Array<any>)
    : null;

  if (!eventHistory || eventHistory.length === 0) {
    return { success: false, message: 'No events to undo' };
  }

  // Get the last event
  const lastEventEntry = eventHistory.toArray().pop();
  if (!lastEventEntry) {
    return { success: false, message: 'No events to undo' };
  }

  const lastEvent = lastEventEntry[0];
  const event = getEventCard(lastEvent.eventId);

  if (!event) {
    return { success: false, message: 'Event card not found for undo' };
  }

  try {
    // Reverse the fear modifier
    if (event.fearModifier !== 0) {
      applyFearModifier(gameMap, -event.fearModifier);
    }

    // Reverse the invader modifier
    if (event.invaderModifier !== undefined && event.invaderModifier !== 0) {
      const currentInvaderCount = Number(gameMap.get('decks') instanceof Y.Map
        ? (gameMap.get('decks') as Y.Map<unknown>).get('invader')
        : 12);
      const newInvaderCount = Math.max(0, currentInvaderCount - event.invaderModifier);

      if (gameMap.get('decks') instanceof Y.Map) {
        (gameMap.get('decks') as Y.Map<unknown>).set('invader', newInvaderCount);
      }
    }

    // Remove from history
    eventHistory.delete(eventHistory.length - 1, 1);

    return {
      success: true,
      fearCardsEarned: Number(gameMap.get('fearCardsEarned') || 0),
      terrorLevel: Number(gameMap.get('terrorLevel') || 1),
      message: `Undid event "${event.name}"`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error undoing event: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};
