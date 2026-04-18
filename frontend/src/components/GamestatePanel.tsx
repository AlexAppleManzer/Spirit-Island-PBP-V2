import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { DEFAULT_INVADER_DECK, createInvaderSetupDeckForAdversary, INVADER_CARDS, type InvaderCardDefinition } from '../data/invaderCards';
import {
  EVENT_CARDS,
  createShuffledEventCardDeck,
  type EventCardDefinition,
} from '../data/eventCards';
import {
  FEAR_CARDS,
  createShuffledFearCardDeck,
  type FearCardDefinition,
} from '../data/fearCards';
import {
  BLIGHT_CARDS,
  createShuffledBlightCardDeck,
  type BlightCardDefinition,
} from '../data/blightCards';

const TURN_PHASES = ['growth', 'fast', 'event', 'invader', 'slow'] as const;
type TurnPhase = (typeof TURN_PHASES)[number];

type InvaderCard = InvaderCardDefinition;
type EventCard = EventCardDefinition;
type FearCard = FearCardDefinition;
type BlightCard = BlightCardDefinition;

type ForgottenPowerCard = {
  id: string;
  name: string;
  faceUrl: string;
  backUrl: string;
  kind: 'minor' | 'major' | 'unique';
  sourceBoardId?: string;
};

type InvaderTrackCards = {
  ravage: InvaderCard[];
  build: InvaderCard[];
  explore: InvaderCard[];
};

const FEAR_PER_PLAYER = 4;
const DEFAULT_FEAR_THRESHOLDS = [3, 6, 9];

type GamestateSnapshot = {
  turn: number;
  phase: TurnPhase;
  spiritCount: number;
  fearPool: number;
  fearThreshold: number;
  fearCardsEarned: number;
  fearThresholds: number[];
  terrorLevel: number;
  invaderTrack: { ravage: number; build: number; explore: number };
  invaderLands: {
    ravageLands: number[];
    buildLands: number[];
    exploredLands: number[];
  };
  invaderDeckCards: InvaderCard[];
  invaderRemovedCards: InvaderCard[];
  invaderDiscardCards: InvaderCard[];
  invaderTrackCards: InvaderTrackCards;
  eventDeckCards: EventCard[];
  eventRemovedCards: EventCard[];
  eventDiscardCards: EventCard[];
  currentEventCard: EventCard | null;
  fearDeckCards: FearCard[];
  fearEarnedCards: FearCard[];
  fearDiscardCards: FearCard[];
  currentFearCard: FearCard | null;
  blightDeckCards: BlightCard[];
  blightDiscardCards: BlightCard[];
  currentBlightCard: BlightCard | null;
  blightLoss: boolean;
  decks: { invader: number; fear: number; event: number };
  discards: { invader: number; fear: number; event: number; blight: number };
  blightCard: string;
  blightCount: number;
  adversary: string;
  adversaryId: string;
  adversaryLevel: number;
  adversaryCounter: number;
  townCount: number;
  forgottenMinorPowerCards: ForgottenPowerCard[];
  forgottenMajorPowerCards: ForgottenPowerCard[];
  forgottenUniquePowerCards: ForgottenPowerCard[];
  outcome: 'win' | 'loss' | null;
};

interface GamestatePanelProps {
  docRef: React.MutableRefObject<Y.Doc | null>;
  selectedSpiritId?: string | null;
  isOwner: boolean;
  gameId: string;
  token: string;
}

const getSafeNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return fallback;
};

const isDeckCard = (value: unknown): value is EventCard | FearCard => {
  if (!value || typeof value !== 'object') return false;
  const card = value as Partial<EventCard>;
  return (
    typeof card.id === 'string' &&
    typeof card.name === 'string' &&
    typeof card.faceUrl === 'string' &&
    typeof card.backUrl === 'string'
  );
};

const parseDeckCardList = <T extends EventCard | FearCard>(value: unknown, fallback: T[] = []): T[] => {
  if (!Array.isArray(value)) {
    return fallback;
  }
  return value.filter(isDeckCard) as T[];
};

const isInvaderCard = (value: unknown): value is InvaderCard => {
  if (!value || typeof value !== 'object') return false;
  const card = value as Partial<InvaderCard>;
  return (
    typeof card.id === 'string' &&
    typeof card.name === 'string' &&
    typeof card.faceUrl === 'string' &&
    typeof card.backUrl === 'string' &&
    (card.stage === 1 || card.stage === 2 || card.stage === 3)
  );
};

const parseInvaderCardList = (value: unknown, fallback: InvaderCard[] = []): InvaderCard[] => {
  if (!Array.isArray(value)) {
    return fallback;
  }
  return value.filter(isInvaderCard);
};

const parseTrackCards = (value: unknown): InvaderTrackCards => {
  if (!value || typeof value !== 'object') {
    return { ravage: [], build: [], explore: [] };
  }
  const cards = value as Record<string, unknown>;
  const parseSlot = (slot: unknown): InvaderCard[] => {
    if (Array.isArray(slot)) return slot.filter(isInvaderCard);
    if (isInvaderCard(slot)) return [slot]; // backwards compat with old single-card format
    return [];
  };
  return {
    ravage: parseSlot(cards.ravage),
    build: parseSlot(cards.build),
    explore: parseSlot(cards.explore),
  };
};

const parseSingleDeckCard = <T extends EventCard | FearCard>(value: unknown): T | null => {
  return isDeckCard(value) ? (value as T) : null;
};

const isBlightCard = (value: unknown): value is BlightCard => {
  if (!value || typeof value !== 'object') return false;
  const card = value as Partial<BlightCard>;
  return (
    typeof card.id === 'string' &&
    typeof card.name === 'string' &&
    typeof card.faceUrl === 'string' &&
    typeof card.backUrl === 'string' &&
    typeof card.blightPerPlayer === 'number' &&
    Number.isFinite(card.blightPerPlayer) &&
    typeof card.healthy === 'boolean'
  );
};

const parseBlightCardList = (value: unknown, fallback: BlightCard[] = []): BlightCard[] => {
  if (!Array.isArray(value)) {
    return fallback;
  }
  return value.filter(isBlightCard);
};

const parseSingleBlightCard = (value: unknown): BlightCard | null => {
  return isBlightCard(value) ? value : null;
};

const isForgottenPowerCard = (value: unknown): value is ForgottenPowerCard => {
  if (!value || typeof value !== 'object') return false;
  const card = value as Partial<ForgottenPowerCard>;
  return (
    typeof card.id === 'string' &&
    typeof card.name === 'string' &&
    typeof card.faceUrl === 'string' &&
    typeof card.backUrl === 'string' &&
    (card.kind === 'minor' || card.kind === 'major' || card.kind === 'unique')
  );
};

const parseForgottenPowerCardList = (value: unknown): ForgottenPowerCard[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(isForgottenPowerCard);
};

const clampMin = (value: number, min: number) => {
  return value < min ? min : value;
};

const getTerrorLevelFromFearCards = (fearCardsEarned: number, fearThresholds: number[]) => {
  if (fearThresholds.length === 0) {
    return 1;
  }

  const maxThreshold = fearThresholds[fearThresholds.length - 1];
  if (maxThreshold !== undefined && fearCardsEarned >= maxThreshold) {
    return 4;
  }

  for (let i = fearThresholds.length - 1; i >= 0; i -= 1) {
    const threshold = fearThresholds[i];
    if (threshold !== undefined && fearCardsEarned >= threshold) {
      return i + 2;
    }
  }

  return 1;
};

const countTownsOnBoards = (gameMap: Y.Map<unknown>): number => {
  const boards = gameMap.get('boards');
  if (!(boards instanceof Y.Map)) return 0;
  let count = 0;
  boards.forEach((boardData) => {
    if (!(boardData instanceof Y.Map)) return;
    const landsMap = boardData.get('lands');
    if (!(landsMap instanceof Y.Map)) return;
    landsMap.forEach((piecesArray) => {
      if (!(piecesArray instanceof Y.Array)) return;
      piecesArray.forEach((piece) => {
        if (piece && typeof piece === 'object' && (piece as Record<string, unknown>).type === 'town') {
          count += 1;
        }
      });
    });
  });
  return count;
};

const ensureNestedMap = (parent: Y.Map<unknown>, key: string) => {
  const existing = parent.get(key);
  if (existing instanceof Y.Map) {
    return existing as Y.Map<unknown>;
  }

  const created = new Y.Map<unknown>();
  parent.set(key, created);
  return created;
};

const ensureYArray = (parent: Y.Map<unknown>, key: string) => {
  const existing = parent.get(key);
  if (existing instanceof Y.Array) {
    return existing as Y.Array<unknown>;
  }

  const created = new Y.Array<unknown>();
  parent.set(key, created);
  return created;
};

const ensureGamestateDefaults = (doc: Y.Doc) => {
  const gameMap = doc.getMap('game') as Y.Map<unknown>;

  const legacyRound = getSafeNumber(gameMap.get('round'), 1);
  const turn = clampMin(getSafeNumber(gameMap.get('turn'), legacyRound), 1);
  gameMap.set('turn', turn);

  const currentPhaseRaw = gameMap.get('currentPhase');
  const phase =
    typeof currentPhaseRaw === 'string' && TURN_PHASES.includes(currentPhaseRaw as TurnPhase)
      ? (currentPhaseRaw as TurnPhase)
      : 'growth';
  gameMap.set('currentPhase', phase);

  if (!gameMap.has('boards')) {
    gameMap.set('boards', new Y.Map());
  }

  const spiritCount = clampMin(getSafeNumber(gameMap.get('spiritCount'), getSafeNumber(gameMap.get('playerCount'), 1)), 1);
  const fearThreshold = FEAR_PER_PLAYER * spiritCount;

  gameMap.set('spiritCount', spiritCount);
  gameMap.set('playerCount', spiritCount);
  gameMap.set('fearThreshold', fearThreshold);

  const fearPool = clampMin(getSafeNumber(gameMap.get('fearPool'), 0), 0);
  const fearCardsEarned = clampMin(getSafeNumber(gameMap.get('fearCardsEarned'), 0), 0);
  gameMap.set('fearPool', fearPool);
  gameMap.set('fearCardsEarned', fearCardsEarned);

  let fearThresholds = DEFAULT_FEAR_THRESHOLDS;
  const gameConfig = gameMap.get('gameConfig');
  if (gameConfig instanceof Y.Map) {
    const configThresholds = gameConfig.get('fearThresholds');
    if (Array.isArray(configThresholds)) {
      fearThresholds = configThresholds;
    }
  }

  gameMap.set('terrorLevel', getTerrorLevelFromFearCards(fearCardsEarned, fearThresholds));

  // Adversary identity (set once at game creation, read-only here)
  const adversaryId = (gameConfig instanceof Y.Map
    ? (gameConfig as Y.Map<unknown>).get('adversary') as string
    : null) ?? 'none';
  const adversaryLevel = getSafeNumber(
    gameConfig instanceof Y.Map ? (gameConfig as Y.Map<unknown>).get('adversaryLevel') : undefined,
    0,
  );

  // Adversary-specific counter (France town supply, Habsburg damage, Russia beast kills)
  if (!gameMap.has('adversaryCounter')) {
    gameMap.set('adversaryCounter', 0);
  }

  if (!gameMap.has('blightCard')) {
    gameMap.set('blightCard', 'Unknown Blight Card');
  }
  const blightCount = clampMin(getSafeNumber(gameMap.get('blightCount'), spiritCount * 2 + 1), 0);
  gameMap.set('blightCount', blightCount);

  const rawBlightDeckCards = gameMap.get('blightDeckCards');
  const parsedBlightDeckCards = parseBlightCardList(rawBlightDeckCards);
  if (!Array.isArray(rawBlightDeckCards)) {
    gameMap.set('blightDeckCards', createShuffledBlightCardDeck());
  } else if (parsedBlightDeckCards.length === 0 && BLIGHT_CARDS.length > 0) {
    gameMap.set('blightDeckCards', createShuffledBlightCardDeck());
  }
  if (!Array.isArray(gameMap.get('blightDiscardCards'))) {
    gameMap.set('blightDiscardCards', []);
  }
  if (!gameMap.has('currentBlightCard')) {
    gameMap.set('currentBlightCard', null);
  }

  const invaderTrack = ensureNestedMap(gameMap, 'invaderTrack');
  invaderTrack.set('ravage', clampMin(getSafeNumber(invaderTrack.get('ravage'), 0), 0));
  invaderTrack.set('build', clampMin(getSafeNumber(invaderTrack.get('build'), 0), 0));
  invaderTrack.set('explore', clampMin(getSafeNumber(invaderTrack.get('explore'), 1), 0));

  if (!(invaderTrack.get('exploredLands') instanceof Y.Array)) {
    invaderTrack.set('exploredLands', new Y.Array());
  }
  if (!(invaderTrack.get('buildLands') instanceof Y.Array)) {
    invaderTrack.set('buildLands', new Y.Array());
  }
  if (!(invaderTrack.get('ravageLands') instanceof Y.Array)) {
    invaderTrack.set('ravageLands', new Y.Array());
  }

  // Only initialize invaderDeckCards after the Yjs sync has delivered gameConfig from the
  // backend. Pre-sync the doc is empty, so writing here would produce a standard deck that
  // could win the CRDT merge over the adversary deck the backend already stored.
  const rawInvaderDeckCards = gameMap.get('invaderDeckCards');
  if (!Array.isArray(rawInvaderDeckCards) && gameConfig instanceof Y.Map) {
    const invaderDeckOrder = gameConfig.get('invaderDeckOrder') as string | null | undefined;
    const { deck, removed } = createInvaderSetupDeckForAdversary(invaderDeckOrder);
    gameMap.set('invaderDeckCards', deck);
    gameMap.set('invaderRemovedCards', removed);
  }

  if (!gameMap.has('invaderRemovedCards')) {
    gameMap.set('invaderRemovedCards', parseInvaderCardList(gameMap.get('invaderRemovedCards')));
  }

  if (!gameMap.has('invaderDiscardCards')) {
    gameMap.set('invaderDiscardCards', parseInvaderCardList(gameMap.get('invaderDiscardCards')));
  }

  gameMap.set('invaderTrackCards', parseTrackCards(gameMap.get('invaderTrackCards')));

  const rawEventDeckCards = gameMap.get('eventDeckCards');
  const parsedEventDeckCards = parseDeckCardList<EventCard>(rawEventDeckCards);
  if (!Array.isArray(rawEventDeckCards)) {
    gameMap.set('eventDeckCards', createShuffledEventCardDeck(adversaryId, adversaryLevel));
  } else if (parsedEventDeckCards.length === 0 && EVENT_CARDS.length > 0) {
    gameMap.set('eventDeckCards', createShuffledEventCardDeck(adversaryId, adversaryLevel));
  }

  if (!Array.isArray(gameMap.get('eventRemovedCards'))) {
    gameMap.set('eventRemovedCards', []);
  }
  if (!Array.isArray(gameMap.get('eventDiscardCards'))) {
    gameMap.set('eventDiscardCards', []);
  }
  if (!gameMap.has('currentEventCard')) {
    gameMap.set('currentEventCard', null);
  }

  const rawFearDeckCards = gameMap.get('fearDeckCards');
  const parsedFearDeckCards = parseDeckCardList<FearCard>(rawFearDeckCards);
  if (!Array.isArray(rawFearDeckCards)) {
    let fearDeck = createShuffledFearCardDeck();
    // Russia L5+: embed an unused Stage II card under top 3 fear cards,
    // and an unused Stage III card under top 7 fear cards.
    if (adversaryId === 'russia' && adversaryLevel >= 5) {
      let removedInvaders = parseInvaderCardList(gameMap.get('invaderRemovedCards'));
      const stage2Card = removedInvaders.find((c) => c.stage === 2);
      const stage3Card = removedInvaders.find((c) => c.stage === 3);

      if (stage2Card) {
        removedInvaders = removedInvaders.filter((c) => c.id !== stage2Card.id);
        const bomb2: FearCard = {
          id: 'russia-invader-bomb-stage2',
          name: `Russia Bomb: ${stage2Card.name}`,
          faceUrl: stage2Card.faceUrl,
          backUrl: stage2Card.backUrl,
          embeddedInvaderStage: 2,
          embeddedInvaderCardId: stage2Card.id,
        };
        // Insert "under top 3 fear cards" = at index 3
        fearDeck = [...fearDeck.slice(0, 3), bomb2, ...fearDeck.slice(3)];
      }

      if (stage3Card) {
        removedInvaders = removedInvaders.filter((c) => c.id !== stage3Card.id);
        const bomb3: FearCard = {
          id: 'russia-invader-bomb-stage3',
          name: `Russia Bomb: ${stage3Card.name}`,
          faceUrl: stage3Card.faceUrl,
          backUrl: stage3Card.backUrl,
          embeddedInvaderStage: 3,
          embeddedInvaderCardId: stage3Card.id,
        };
        // "Under top 7 fear cards" = index 7 in original deck.
        // With bomb2 already at index 3, that original index 7 is now index 8.
        fearDeck = [...fearDeck.slice(0, 8), bomb3, ...fearDeck.slice(8)];
      }

      gameMap.set('invaderRemovedCards', removedInvaders);
    }
    gameMap.set('fearDeckCards', fearDeck);
  } else if (parsedFearDeckCards.length === 0 && FEAR_CARDS.length > 0) {
    gameMap.set('fearDeckCards', createShuffledFearCardDeck());
  }

  if (!Array.isArray(gameMap.get('fearEarnedCards'))) {
    gameMap.set('fearEarnedCards', []);
  }
  if (!Array.isArray(gameMap.get('fearDiscardCards'))) {
    gameMap.set('fearDiscardCards', []);
  }
  if (!gameMap.has('currentFearCard')) {
    gameMap.set('currentFearCard', null);
  }

  let normalizedFearDeck = parseDeckCardList<FearCard>(gameMap.get('fearDeckCards'));
  let normalizedFearEarned = parseDeckCardList<FearCard>(gameMap.get('fearEarnedCards'));
  const normalizedFearDiscard = parseDeckCardList<FearCard>(gameMap.get('fearDiscardCards'));
  const normalizedCurrentFear = parseSingleDeckCard<FearCard>(gameMap.get('currentFearCard'));
  const representedFearCards =
    normalizedFearEarned.length + normalizedFearDiscard.length + (normalizedCurrentFear ? 1 : 0);

  if (representedFearCards < fearCardsEarned) {
    const missing = fearCardsEarned - representedFearCards;
    for (let i = 0; i < missing; i += 1) {
      const [earnedCard, ...remainingDeck] = normalizedFearDeck;
      if (!earnedCard) break;
      normalizedFearDeck = remainingDeck;
      normalizedFearEarned = [...normalizedFearEarned, earnedCard];
    }
    gameMap.set('fearDeckCards', normalizedFearDeck);
    gameMap.set('fearEarnedCards', normalizedFearEarned);
  }

  const decks = ensureNestedMap(gameMap, 'decks');
  decks.set('invader', parseInvaderCardList(gameMap.get('invaderDeckCards')).length);
  decks.set('fear', parseDeckCardList<FearCard>(gameMap.get('fearDeckCards')).length);
  decks.set('event', parseDeckCardList<EventCard>(gameMap.get('eventDeckCards')).length);

  const discards = ensureNestedMap(gameMap, 'discards');
  discards.set('invader', parseInvaderCardList(gameMap.get('invaderDiscardCards')).length);
  discards.set('fear', parseDeckCardList<FearCard>(gameMap.get('fearDiscardCards')).length);
  discards.set('event', parseDeckCardList<EventCard>(gameMap.get('eventDiscardCards')).length);
  discards.set('blight', parseBlightCardList(gameMap.get('blightDiscardCards')).length);

  const currentBlightCard = parseSingleBlightCard(gameMap.get('currentBlightCard'));
  const persistedBlightLoss = gameMap.get('blightLoss');
  const shouldBeBlightLoss = !!(currentBlightCard && !currentBlightCard.healthy && blightCount === 0);
  if (typeof persistedBlightLoss !== 'boolean') {
    gameMap.set('blightLoss', shouldBeBlightLoss);
  } else if (!persistedBlightLoss && shouldBeBlightLoss) {
    gameMap.set('blightLoss', true);
  }
};

const readSnapshot = (doc: Y.Doc): GamestateSnapshot => {
  const gameMap = doc.getMap('game') as Y.Map<unknown>;
  const invaderTrack = gameMap.get('invaderTrack') as Y.Map<unknown> | undefined;
  const gameConfig = gameMap.get('gameConfig') as Y.Map<unknown> | undefined;

  const invaderDeckCards = parseInvaderCardList(gameMap.get('invaderDeckCards'));
  const invaderRemovedCards = parseInvaderCardList(gameMap.get('invaderRemovedCards'));
  const invaderDiscardCards = parseInvaderCardList(gameMap.get('invaderDiscardCards'));
  const invaderTrackCards = parseTrackCards(gameMap.get('invaderTrackCards'));

  const eventDeckCards = parseDeckCardList<EventCard>(gameMap.get('eventDeckCards'));
  const eventRemovedCards = parseDeckCardList<EventCard>(gameMap.get('eventRemovedCards'));
  const eventDiscardCards = parseDeckCardList<EventCard>(gameMap.get('eventDiscardCards'));
  const currentEventCard = parseSingleDeckCard<EventCard>(gameMap.get('currentEventCard'));

  const fearDeckCards = parseDeckCardList<FearCard>(gameMap.get('fearDeckCards'));
  const fearEarnedCards = parseDeckCardList<FearCard>(gameMap.get('fearEarnedCards'));
  const fearDiscardCards = parseDeckCardList<FearCard>(gameMap.get('fearDiscardCards'));
  const currentFearCard = parseSingleDeckCard<FearCard>(gameMap.get('currentFearCard'));
  const blightDeckCards = parseBlightCardList(gameMap.get('blightDeckCards'));
  const blightDiscardCards = parseBlightCardList(gameMap.get('blightDiscardCards'));
  const currentBlightCard = parseSingleBlightCard(gameMap.get('currentBlightCard'));

  const spiritCount = clampMin(getSafeNumber(gameMap.get('spiritCount'), getSafeNumber(gameMap.get('playerCount'), 1)), 1);
  const fearThreshold = FEAR_PER_PLAYER * spiritCount;
  const fearCardsEarned = clampMin(getSafeNumber(gameMap.get('fearCardsEarned'), 0), 0);

  let fearThresholds = DEFAULT_FEAR_THRESHOLDS;
  if (gameConfig) {
    const configThresholds = gameConfig.get('fearThresholds');
    if (Array.isArray(configThresholds)) {
      fearThresholds = configThresholds;
    }
  }

  const currentPhaseRaw = gameMap.get('currentPhase');
  const phase: TurnPhase =
    typeof currentPhaseRaw === 'string' && TURN_PHASES.includes(currentPhaseRaw as TurnPhase)
      ? (currentPhaseRaw as TurnPhase)
      : 'growth';

  const exploredLands = (invaderTrack?.get('exploredLands') instanceof Y.Array
    ? (invaderTrack.get('exploredLands') as Y.Array<number>).toArray()
    : []) as number[];
  const buildLands = (invaderTrack?.get('buildLands') instanceof Y.Array
    ? (invaderTrack.get('buildLands') as Y.Array<number>).toArray()
    : []) as number[];
  const ravageLands = (invaderTrack?.get('ravageLands') instanceof Y.Array
    ? (invaderTrack.get('ravageLands') as Y.Array<number>).toArray()
    : []) as number[];

  return {
    turn: clampMin(getSafeNumber(gameMap.get('turn'), getSafeNumber(gameMap.get('round'), 1)), 1),
    phase,
    spiritCount,
    fearPool: clampMin(getSafeNumber(gameMap.get('fearPool'), 0), 0),
    fearThreshold,
    fearCardsEarned,
    fearThresholds,
    terrorLevel: getTerrorLevelFromFearCards(fearCardsEarned, fearThresholds),
    invaderTrack: {
      ravage: clampMin(getSafeNumber(invaderTrack?.get('ravage'), 0), 0),
      build: clampMin(getSafeNumber(invaderTrack?.get('build'), 0), 0),
      explore: clampMin(getSafeNumber(invaderTrack?.get('explore'), 1), 0),
    },
    invaderLands: {
      exploredLands,
      buildLands,
      ravageLands,
    },
    invaderDeckCards,
    invaderRemovedCards,
    invaderDiscardCards,
    invaderTrackCards,
    eventDeckCards,
    eventRemovedCards,
    eventDiscardCards,
    currentEventCard,
    fearDeckCards,
    fearEarnedCards,
    fearDiscardCards,
    currentFearCard,
    blightDeckCards,
    blightDiscardCards,
    currentBlightCard,
    blightLoss:
      (gameMap.get('blightLoss') as boolean) ||
      !!(currentBlightCard && !currentBlightCard.healthy && clampMin(getSafeNumber(gameMap.get('blightCount'), spiritCount * 2 + 1), 0) === 0),
    decks: {
      invader: invaderDeckCards.length,
      fear: fearDeckCards.length,
      event: eventDeckCards.length,
    },
    discards: {
      invader: invaderDiscardCards.length,
      fear: fearDiscardCards.length,
      event: eventDiscardCards.length,
      blight: blightDiscardCards.length,
    },
    blightCard: (currentBlightCard?.name || (gameMap.get('blightCard') as string)) || 'Unknown Blight Card',
    blightCount: clampMin(getSafeNumber(gameMap.get('blightCount'), spiritCount * 2 + 1), 0),
    adversary: (gameConfig?.get('adversary') as string) || 'Unknown Adversary',
    adversaryId: (gameConfig?.get('adversary') as string) || 'none',
    adversaryLevel: getSafeNumber(gameConfig?.get('adversaryLevel'), 0),
    adversaryCounter: clampMin(getSafeNumber(gameMap.get('adversaryCounter'), 0), 0),
    townCount: countTownsOnBoards(gameMap),
    forgottenMinorPowerCards: parseForgottenPowerCardList(gameMap.get('forgottenMinorPowerCards')),
    forgottenMajorPowerCards: parseForgottenPowerCardList(gameMap.get('forgottenMajorPowerCards')),
    forgottenUniquePowerCards: parseForgottenPowerCardList(gameMap.get('forgottenUniquePowerCards')),
    outcome: (() => {
      const raw = gameMap.get('outcome');
      if (raw === 'win') return 'win';
      if (raw === 'loss') return 'loss';
      return null;
    })(),
  };
};

const initialSnapshot: GamestateSnapshot = {
  turn: 1,
  phase: 'growth',
  spiritCount: 1,
  fearPool: 0,
  fearThreshold: FEAR_PER_PLAYER,
  fearCardsEarned: 0,
  fearThresholds: DEFAULT_FEAR_THRESHOLDS,
  terrorLevel: 1,
  invaderTrack: { ravage: 0, build: 0, explore: 1 },
  invaderLands: { exploredLands: [], buildLands: [], ravageLands: [] },
  invaderDeckCards: [...DEFAULT_INVADER_DECK],
  invaderRemovedCards: [],
  invaderDiscardCards: [],
  invaderTrackCards: { ravage: [], build: [], explore: [] },
  eventDeckCards: [...EVENT_CARDS],
  eventRemovedCards: [],
  eventDiscardCards: [],
  currentEventCard: null,
  fearDeckCards: [...FEAR_CARDS],
  fearEarnedCards: [],
  fearDiscardCards: [],
  currentFearCard: null,
  blightDeckCards: [...BLIGHT_CARDS],
  blightDiscardCards: [],
  currentBlightCard: null,
  blightLoss: false,
  decks: { invader: 12, fear: FEAR_CARDS.length, event: EVENT_CARDS.length },
  discards: { invader: 0, fear: 0, event: 0, blight: 0 },
  blightCard: 'Unknown Blight Card',
  blightCount: 3,
  adversary: 'Unknown Adversary',
  adversaryId: 'none',
  adversaryLevel: 0,
  adversaryCounter: 0,
  townCount: 0,
  forgottenMinorPowerCards: [],
  forgottenMajorPowerCards: [],
  forgottenUniquePowerCards: [],
  outcome: null,
};

const StatPill = ({ label, value }: { label: string; value: number | string }) => (
  <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
    <p className="text-lg font-semibold text-slate-900">{value}</p>
  </div>
);

const CounterRow = ({
  label,
  value,
  onDecrement,
  onIncrement,
}: {
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) => (
  <div className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-2">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onDecrement}
        className="h-7 w-7 rounded border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200"
      >
        -
      </button>
      <span className="w-8 text-center text-sm font-semibold text-slate-900">{value}</span>
      <button
        type="button"
        onClick={onIncrement}
        className="h-7 w-7 rounded border border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
      >
        +
      </button>
    </div>
  </div>
);

type DiscardDisplayCard = {
  id: string;
  name: string;
  faceUrl: string;
  subtitle?: string;
};

const DiscardPileSection = ({
  title,
  cards,
  isShown,
  onToggle,
  emptyMessage,
  onCardAction,
  cardActionLabel,
}: {
  title: string;
  cards: DiscardDisplayCard[];
  isShown: boolean;
  onToggle: () => void;
  emptyMessage: string;
  onCardAction?: (cardId: string) => void;
  cardActionLabel?: string;
}) => (
  <div className="rounded border border-slate-200 bg-white px-3 py-2">
    <div className="flex items-center justify-between gap-2">
      <div>
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <p className="text-xs text-slate-500">{cards.length} card(s)</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
      >
        {isShown ? 'Hide' : 'Show'}
      </button>
    </div>
    {isShown && (
      <div className="mt-3">
        {cards.length === 0 ? (
          <p className="text-xs text-slate-500">{emptyMessage}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {cards
              .slice()
              .reverse()
              .map((card, index) => (
                <div key={`${card.id}-${index}`} className="rounded border border-slate-200 px-2 py-2">
                  <div className="flex justify-center">
                    <img
                      src={card.faceUrl}
                      alt={card.name}
                      className="rounded border border-slate-300 object-cover"
                      style={{ width: 140, height: 200, minWidth: 140 }}
                    />
                  </div>
                  <p className="mt-1 truncate text-center text-[11px] font-semibold text-slate-900">{card.name}</p>
                  {card.subtitle ? <p className="text-center text-[10px] text-slate-500">{card.subtitle}</p> : null}
                  {onCardAction && cardActionLabel ? (
                    <button
                      type="button"
                      onClick={() => onCardAction(card.id)}
                      className="mt-1 w-full rounded border border-slate-300 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-100"
                    >
                      {cardActionLabel}
                    </button>
                  ) : null}
                </div>
              ))}
          </div>
        )}
      </div>
    )}
  </div>
);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';

const GamestatePanel: React.FC<GamestatePanelProps> = ({ docRef, selectedSpiritId, isOwner, gameId, token }) => {
  const [snapshot, setSnapshot] = useState<GamestateSnapshot>(initialSnapshot);
  const [showInvaderDiscard, setShowInvaderDiscard] = useState(false);
  const [showEventDiscard, setShowEventDiscard] = useState(false);
  const [showFearDiscard, setShowFearDiscard] = useState(false);
  const [showBlightDiscard, setShowBlightDiscard] = useState(false);
  const [showMinorPowerDiscard, setShowMinorPowerDiscard] = useState(false);
  const [showMajorPowerDiscard, setShowMajorPowerDiscard] = useState(false);
  const [showUniquePowerDiscard, setShowUniquePowerDiscard] = useState(false);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    const attachWhenReady = () => {
      const doc = docRef.current;
      if (!doc) {
        if (!disposed) {
          requestAnimationFrame(attachWhenReady);
        }
        return;
      }

      doc.transact(() => {
        ensureGamestateDefaults(doc);
      });

      const syncFromDoc = () => {
        const gm = doc.getMap('game') as Y.Map<unknown>;
        // Post-sync fallback: if the backend never stored invaderDeckCards (old game) but
        // gameConfig has now arrived, initialize the deck using the adversary order.
        if (!Array.isArray(gm.get('invaderDeckCards')) && gm.get('gameConfig') instanceof Y.Map) {
          doc.transact(() => {
            const gm2 = doc.getMap('game') as Y.Map<unknown>;
            if (!Array.isArray(gm2.get('invaderDeckCards'))) {
              const gc = gm2.get('gameConfig') as Y.Map<unknown>;
              const order = gc.get('invaderDeckOrder') as string | null | undefined;
              const { deck, removed } = createInvaderSetupDeckForAdversary(order);
              gm2.set('invaderDeckCards', deck);
              gm2.set('invaderRemovedCards', removed);
            }
          });
          return; // update fired by transact above will call syncFromDoc again
        }
        setSnapshot(readSnapshot(doc));
      };

      syncFromDoc();
      doc.on('update', syncFromDoc);
      cleanup = () => {
        doc.off('update', syncFromDoc);
      };
    };

    attachWhenReady();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [docRef]);

  const withGameMap = (mutator: (doc: Y.Doc, gameMap: Y.Map<unknown>) => void) => {
    const doc = docRef.current;
    if (!doc) return;

    doc.transact(() => {
      const gameMap = doc.getMap('game') as Y.Map<unknown>;
      mutator(doc, gameMap);
    });
  };

  const syncDeckAndDiscardCounts = (gameMap: Y.Map<unknown>) => {
    const decks = ensureNestedMap(gameMap, 'decks');
    const discards = ensureNestedMap(gameMap, 'discards');

    decks.set('invader', parseInvaderCardList(gameMap.get('invaderDeckCards')).length);
    decks.set('fear', parseDeckCardList<FearCard>(gameMap.get('fearDeckCards')).length);
    decks.set('event', parseDeckCardList<EventCard>(gameMap.get('eventDeckCards')).length);

    discards.set('invader', parseInvaderCardList(gameMap.get('invaderDiscardCards')).length);
    discards.set('fear', parseDeckCardList<FearCard>(gameMap.get('fearDiscardCards')).length);
    discards.set('event', parseDeckCardList<EventCard>(gameMap.get('eventDiscardCards')).length);
    discards.set('blight', parseBlightCardList(gameMap.get('blightDiscardCards')).length);
  };

  const adjustPhase = (step: 1 | -1) => {
    withGameMap((_doc, gameMap) => {
      const currentPhaseRaw = gameMap.get('currentPhase');
      const currentPhase: TurnPhase =
        typeof currentPhaseRaw === 'string' && TURN_PHASES.includes(currentPhaseRaw as TurnPhase)
          ? (currentPhaseRaw as TurnPhase)
          : 'growth';
      const currentIndex = TURN_PHASES.indexOf(currentPhase);

      if (step === 1 && currentPhase === 'event') {
        const currentEventCard = parseSingleDeckCard<EventCard>(gameMap.get('currentEventCard'));
        if (currentEventCard) {
          const eventDiscard = parseDeckCardList<EventCard>(gameMap.get('eventDiscardCards'));
          gameMap.set('eventDiscardCards', [...eventDiscard, currentEventCard]);
          gameMap.set('currentEventCard', null);
        }
      }

      if (step === 1) {
        if (currentIndex === TURN_PHASES.length - 1) {
          gameMap.set('currentPhase', TURN_PHASES[0]);
          const turn = clampMin(getSafeNumber(gameMap.get('turn'), 1), 1);
          gameMap.set('turn', turn + 1);
          syncDeckAndDiscardCounts(gameMap);
          return;
        }

        gameMap.set('currentPhase', TURN_PHASES[currentIndex + 1]);
        syncDeckAndDiscardCounts(gameMap);
        return;
      }

      if (currentIndex === 0) {
        const turn = clampMin(getSafeNumber(gameMap.get('turn'), 1), 1);
        gameMap.set('currentPhase', TURN_PHASES[TURN_PHASES.length - 1]);
        gameMap.set('turn', clampMin(turn - 1, 1));
        syncDeckAndDiscardCounts(gameMap);
        return;
      }

      gameMap.set('currentPhase', TURN_PHASES[currentIndex - 1]);
      syncDeckAndDiscardCounts(gameMap);
    });
  };

  const adjustFearPool = (delta: number) => {
    withGameMap((_doc, gameMap) => {
      const spiritCount = clampMin(getSafeNumber(gameMap.get('spiritCount'), getSafeNumber(gameMap.get('playerCount'), 1)), 1);
      const threshold = FEAR_PER_PLAYER * spiritCount;

      let fearPool = getSafeNumber(gameMap.get('fearPool'), 0);
      let fearCardsEarned = clampMin(getSafeNumber(gameMap.get('fearCardsEarned'), 0), 0);

      const gameConfig = gameMap.get('gameConfig') as Y.Map<unknown> | undefined;
      let fearThresholds = DEFAULT_FEAR_THRESHOLDS;
      if (gameConfig) {
        const configThresholds = gameConfig.get('fearThresholds');
        if (Array.isArray(configThresholds)) {
          fearThresholds = configThresholds;
        }
      }

      let fearDeck = parseDeckCardList<FearCard>(gameMap.get('fearDeckCards'));
      let fearEarned = parseDeckCardList<FearCard>(gameMap.get('fearEarnedCards'));

      // Handle mini undo: if trying to go below 0, move last earned card back to deck instead
      if (delta < 0 && fearPool === 0 && fearEarned.length > 0) {
        const lastEarnedCard = fearEarned[fearEarned.length - 1];
        if (lastEarnedCard) {
          fearEarned = fearEarned.slice(0, -1);
          fearDeck = [lastEarnedCard, ...fearDeck];
          fearPool = threshold - 1;
          fearCardsEarned = clampMin(fearCardsEarned - 1, 0);
        }
      } else {
        fearPool = clampMin(fearPool + delta, 0);

        while (fearPool >= threshold) {
          fearPool -= threshold;
          fearCardsEarned += 1;
          const [earnedCard, ...remainingFearDeck] = fearDeck;
          if (earnedCard) {
            fearEarned = [...fearEarned, earnedCard];
            fearDeck = remainingFearDeck;
          }
        }
      }

      gameMap.set('fearPool', fearPool);
      gameMap.set('fearThreshold', threshold);
      gameMap.set('fearCardsEarned', fearCardsEarned);
      gameMap.set('fearDeckCards', fearDeck);
      gameMap.set('fearEarnedCards', fearEarned);

      const terrorLevel = getTerrorLevelFromFearCards(fearCardsEarned, fearThresholds);
      gameMap.set('terrorLevel', terrorLevel);
      syncDeckAndDiscardCounts(gameMap);
    });
  };


  const revealEventCard = () => {
    withGameMap((_doc, gameMap) => {
      const currentPhase = gameMap.get('currentPhase');
      if (currentPhase !== 'event') {
        return;
      }

      const currentEventCard = parseSingleDeckCard<EventCard>(gameMap.get('currentEventCard'));
      if (currentEventCard) {
        return;
      }

      const eventDeck = parseDeckCardList<EventCard>(gameMap.get('eventDeckCards'));
      const [nextEventCard, ...remainingDeck] = eventDeck;
      if (!nextEventCard) {
        return;
      }

      gameMap.set('eventDeckCards', remainingDeck);
      gameMap.set('currentEventCard', nextEventCard);
      syncDeckAndDiscardCounts(gameMap);
    });
  };

  const revealFearCard = () => {
    withGameMap((_doc, gameMap) => {
      const currentPhase = gameMap.get('currentPhase');
      if (currentPhase !== 'event') {
        return;
      }

      const currentFearCard = parseSingleDeckCard<FearCard>(gameMap.get('currentFearCard'));
      if (currentFearCard) {
        return;
      }

      const fearEarned = parseDeckCardList<FearCard>(gameMap.get('fearEarnedCards'));
      const [nextFearCard, ...remainingEarned] = fearEarned;
      if (!nextFearCard) {
        return;
      }

      gameMap.set('fearEarnedCards', remainingEarned);

      // Russia L5+ invader bomb: auto-place the embedded invader card in the Build space
      if (nextFearCard.embeddedInvaderCardId) {
        const invaderCard = INVADER_CARDS.find((c) => c.id === nextFearCard.embeddedInvaderCardId);
        if (invaderCard) {
          const trackCards = parseTrackCards(gameMap.get('invaderTrackCards'));
          gameMap.set('invaderTrackCards', {
            ravage: trackCards.ravage,
            build: [...trackCards.build, invaderCard],
            explore: trackCards.explore,
          });
        }
        // Still surface it as currentFearCard so players see what happened
      }

      gameMap.set('currentFearCard', nextFearCard);
      syncDeckAndDiscardCounts(gameMap);
    });
  };

  /** Return a card with returnsUnderTop3 (e.g. Slave Rebellion) back into the event deck below the top 3 */
  const returnEventCardUnderTop3 = () => {
    withGameMap((_doc, gameMap) => {
      const card = parseSingleDeckCard<EventCard>(gameMap.get('currentEventCard'));
      if (!card) return;

      const eventDeck = parseDeckCardList<EventCard>(gameMap.get('eventDeckCards'));
      const insertIdx = Math.min(3, eventDeck.length);
      gameMap.set('eventDeckCards', [
        ...eventDeck.slice(0, insertIdx),
        card,
        ...eventDeck.slice(insertIdx),
      ]);
      gameMap.set('currentEventCard', null);
      syncDeckAndDiscardCounts(gameMap);
    });
  };

  const discardCurrentFearCard = () => {
    withGameMap((_doc, gameMap) => {
      const currentFearCard = parseSingleDeckCard<FearCard>(gameMap.get('currentFearCard'));
      if (!currentFearCard) {
        return;
      }

      const fearDiscard = parseDeckCardList<FearCard>(gameMap.get('fearDiscardCards'));
      gameMap.set('fearDiscardCards', [...fearDiscard, currentFearCard]);
      gameMap.set('currentFearCard', null);
      syncDeckAndDiscardCounts(gameMap);
    });
  };

  const shiftInvaderTrackLeft = () => {
    withGameMap((_doc, gameMap) => {
      const invaderTrack = ensureNestedMap(gameMap, 'invaderTrack');
      const trackCards = parseTrackCards(gameMap.get('invaderTrackCards'));
      const invaderDiscardCards = parseInvaderCardList(gameMap.get('invaderDiscardCards'));

      const exploredLands = (invaderTrack.get('exploredLands') instanceof Y.Array
        ? (invaderTrack.get('exploredLands') as Y.Array<number>).toArray()
        : []) as number[];
      const buildLands = (invaderTrack.get('buildLands') instanceof Y.Array
        ? (invaderTrack.get('buildLands') as Y.Array<number>).toArray()
        : []) as number[];

      const newBuildLands = ensureYArray(invaderTrack, 'buildLands');
      const newRavageLands = ensureYArray(invaderTrack, 'ravageLands');
      const newExploredLands = ensureYArray(invaderTrack, 'exploredLands');

      newBuildLands.delete(0, newBuildLands.length);
      newRavageLands.delete(0, newRavageLands.length);
      newExploredLands.delete(0, newExploredLands.length);

      exploredLands.forEach((land) => newBuildLands.push([land]));
      buildLands.forEach((land) => newRavageLands.push([land]));

      gameMap.set('invaderDiscardCards', [...invaderDiscardCards, ...trackCards.ravage]);

      gameMap.set('invaderTrackCards', {
        ravage: trackCards.build,
        build: trackCards.explore,
        explore: [],
      });

      syncDeckAndDiscardCounts(gameMap);
    });
  };

  const drawToExplore = () => {
    withGameMap((_doc, gameMap) => {
      const invaderTrack = ensureNestedMap(gameMap, 'invaderTrack');
      const deckCards = parseInvaderCardList(gameMap.get('invaderDeckCards'));
      const trackCards = parseTrackCards(gameMap.get('invaderTrackCards'));

      if (deckCards.length === 0) return;

      const randomLand = Math.floor(Math.random() * 8) + 1;
      const exploredLands = ensureYArray(invaderTrack, 'exploredLands');
      exploredLands.push([randomLand]);

      const [drawnCard, ...remainingCards] = deckCards;
      if (!drawnCard) return;

      gameMap.set('invaderDeckCards', remainingCards);
      gameMap.set('invaderTrackCards', {
        ravage: trackCards.ravage,
        build: trackCards.build,
        explore: [...trackCards.explore, drawnCard],
      });

      syncDeckAndDiscardCounts(gameMap);
    });
  };

  const adjustBlightCount = (delta: number) => {
    withGameMap((_doc, gameMap) => {
      const next = clampMin(getSafeNumber(gameMap.get('blightCount'), 0) + delta, 0);
      gameMap.set('blightCount', next);

      const currentBlightCard = parseSingleBlightCard(gameMap.get('currentBlightCard'));
      if (currentBlightCard && !currentBlightCard.healthy && next === 0) {
        gameMap.set('blightLoss', true);
      }
    });
  };

  const flipBlightCard = () => {
    withGameMap((_doc, gameMap) => {
      const blightCount = clampMin(getSafeNumber(gameMap.get('blightCount'), 0), 0);
      if (blightCount > 0) {
        return;
      }

      if (gameMap.get('blightLoss') === true) {
        return;
      }

      const currentBlightCard = parseSingleBlightCard(gameMap.get('currentBlightCard'));
      if (currentBlightCard && !currentBlightCard.healthy) {
        gameMap.set('blightLoss', true);
        return;
      }

      let blightDeck = parseBlightCardList(gameMap.get('blightDeckCards'));
      let blightDiscard = parseBlightCardList(gameMap.get('blightDiscardCards'));

      if (currentBlightCard && currentBlightCard.healthy) {
        blightDiscard = [...blightDiscard, currentBlightCard];
        gameMap.set('blightDiscardCards', blightDiscard);
      }

      const [nextBlightCard, ...remainingBlightDeck] = blightDeck;
      if (!nextBlightCard) {
        gameMap.set('blightLoss', true);
        return;
      }

      const spiritCount = clampMin(getSafeNumber(gameMap.get('spiritCount'), getSafeNumber(gameMap.get('playerCount'), 1)), 1);
      const nextBlightCount = clampMin(nextBlightCard.blightPerPlayer * spiritCount, 0);

      gameMap.set('blightDeckCards', remainingBlightDeck);
      gameMap.set('currentBlightCard', nextBlightCard);
      gameMap.set('blightCard', nextBlightCard.name);
      gameMap.set('blightCount', nextBlightCount);
      gameMap.set('blightLoss', false);

      syncDeckAndDiscardCounts(gameMap);
    });
  };

  const adjustAdversaryCounter = (delta: number) => {
    withGameMap((_doc, gameMap) => {
      const current = getSafeNumber(gameMap.get('adversaryCounter'), 0);
      gameMap.set('adversaryCounter', clampMin(current + delta, 0));
    });
  };

  const sendForgottenCardToHand = (
    cardId: string,
    pileKey: 'forgottenMinorPowerCards' | 'forgottenMajorPowerCards' | 'forgottenUniquePowerCards',
  ) => {
    if (!selectedSpiritId) return;

    withGameMap((_doc, gameMap) => {
      const pile = parseForgottenPowerCardList(gameMap.get(pileKey));
      if (!pile.some((c) => c.id === cardId)) return;

      gameMap.set(pileKey, pile.filter((c) => c.id !== cardId));

      const spirits = gameMap.get('spirits');
      if (spirits instanceof Y.Map) {
        const spiritData = spirits.get(selectedSpiritId);
        if (spiritData instanceof Y.Map) {
          const hand = spiritData.get('cardsInHand');
          const currentHand: string[] = Array.isArray(hand) ? hand.filter((id) => typeof id === 'string') : [];
          if (!currentHand.includes(cardId)) {
            spiritData.set('cardsInHand', [...currentHand, cardId]);
          }
        }
      }
    });
  };

  const eventActionsDisabled = snapshot.phase !== 'event';

  const handleSetOutcome = async (outcome: 'win' | 'loss' | null) => {
    await fetch(`${BACKEND_URL}/api/games/${gameId}/outcome`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ outcome }),
    });
    // Yjs will propagate the update; no need to update local state manually
  };

  return (
    <aside className="h-full min-h-0 space-y-4 overflow-y-scroll rounded-xl bg-white p-4 shadow">

      {/* Outcome banner */}
      {snapshot.outcome === 'win' && (
        <section className="rounded-lg border border-green-300 bg-green-50 p-3 text-center space-y-2">
          <p className="text-xl font-bold text-green-800">VICTORY</p>
          {isOwner && (
            <button
              type="button"
              onClick={() => void handleSetOutcome(null)}
              className="text-xs text-green-700 underline hover:text-green-900"
            >
              Clear outcome
            </button>
          )}
        </section>
      )}
      {snapshot.outcome === 'loss' && (
        <section className="rounded-lg border border-red-300 bg-red-50 p-3 text-center space-y-2">
          <p className="text-xl font-bold text-red-800">DEFEAT</p>
          {isOwner && (
            <button
              type="button"
              onClick={() => void handleSetOutcome(null)}
              className="text-xs text-red-700 underline hover:text-red-900"
            >
              Clear outcome
            </button>
          )}
        </section>
      )}
      {snapshot.outcome === null && isOwner && (
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Declare Outcome</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleSetOutcome('win')}
              className="flex-1 rounded bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              Victory
            </button>
            <button
              type="button"
              onClick={() => void handleSetOutcome('loss')}
              className="flex-1 rounded bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800"
            >
              Defeat
            </button>
          </div>
        </section>
      )}

      <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="grid grid-cols-2 gap-3">
          <StatPill label="Turn" value={snapshot.turn} />
          <StatPill label="Current Phase" value={snapshot.phase} />
        </div>
        <div className="grid grid-cols-5 gap-1">
          {TURN_PHASES.map((phase) => {
            const isActive = phase === snapshot.phase;
            return (
              <div
                key={phase}
                className={`rounded px-2 py-1 text-center text-xs font-semibold uppercase ${
                  isActive ? 'bg-slate-800 text-white' : 'border border-slate-200 bg-white text-slate-600'
                }`}
              >
                {phase}
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => adjustPhase(-1)}
            className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Prev Phase
          </button>
          <button
            type="button"
            onClick={() => adjustPhase(1)}
            className="flex-1 rounded bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Next Phase
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={eventActionsDisabled || snapshot.currentEventCard !== null || snapshot.eventDeckCards.length === 0}
            onClick={revealEventCard}
            className="flex-1 rounded border border-indigo-300 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reveal Event Card
          </button>
        </div>
        {snapshot.currentEventCard ? (
          <div className="rounded border border-indigo-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Current Event</p>
            <div className="mt-2 flex justify-center">
              <img
                src={snapshot.currentEventCard.faceUrl}
                alt={snapshot.currentEventCard.name || 'Event card'}
                className="rounded border border-slate-300 object-cover"
                style={{ width: 140, height: 200, minWidth: 140 }}
              />
            </div>
            <p className="mt-2 text-center text-sm font-semibold text-slate-900">{snapshot.currentEventCard.name}</p>
            {snapshot.currentEventCard.returnsUnderTop3 ? (
              <button
                type="button"
                onClick={returnEventCardUnderTop3}
                className="mt-2 w-full rounded border border-indigo-400 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
              >
                Return under Top 3
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
        <div className="grid grid-cols-2 gap-3">
          <StatPill label="Next Fear Card" value={`${snapshot.fearPool}/${snapshot.fearThreshold}`} />
          <StatPill label="Earned Fear Pile" value={snapshot.fearEarnedCards.length} />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => adjustFearPool(-1)}
            disabled={snapshot.fearPool === 0 && snapshot.fearEarnedCards.length === 0}
            className={`flex-1 rounded border px-3 py-2 text-sm font-medium ${
              snapshot.fearPool === 0 && snapshot.fearEarnedCards.length === 0
                ? 'cursor-not-allowed border-rose-200 bg-rose-100 text-rose-400'
                : 'border-rose-300 bg-white text-rose-700 hover:bg-rose-100'
            }`}
          >
            − Fear
          </button>
          <button
            type="button"
            onClick={() => adjustFearPool(1)}
            className="flex-1 rounded border border-rose-300 bg-white px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
          >
            + Fear
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={eventActionsDisabled || snapshot.currentFearCard !== null || snapshot.fearEarnedCards.length === 0}
            onClick={revealFearCard}
            className="flex-1 rounded border border-rose-300 bg-white px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reveal Fear Card
          </button>
          <button
            type="button"
            disabled={eventActionsDisabled || snapshot.currentFearCard === null}
            onClick={discardCurrentFearCard}
            className="flex-1 rounded border border-rose-300 bg-white px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Discard Revealed Fear
          </button>
        </div>
        {snapshot.currentFearCard ? (
          <div className="rounded border border-rose-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
              {snapshot.currentFearCard.embeddedInvaderStage ? 'Russia Invader Bomb' : 'Revealed Fear Card'}
            </p>
            {snapshot.currentFearCard.embeddedInvaderStage ? (
              <div className="mt-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                A Stage {snapshot.currentFearCard.embeddedInvaderStage} Invader Card has been automatically placed in the <strong>Build</strong> space.
              </div>
            ) : null}
            <div className="mt-2 flex justify-center">
              <img
                src={snapshot.currentFearCard.faceUrl}
                alt={snapshot.currentFearCard.name || 'Fear card'}
                className="rounded border border-slate-300 object-cover"
                style={{ width: 140, height: 200, minWidth: 140 }}
              />
            </div>
            <p className="mt-2 text-center text-sm font-semibold text-slate-900">{snapshot.currentFearCard.name}</p>
          </div>
        ) : null}
        <div className="rounded border border-rose-200 bg-white px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-rose-700">Terror Level</p>
          <p className="text-sm font-semibold text-slate-900">
            {snapshot.terrorLevel >= 4 ? 'Fear Victory' : `Level ${snapshot.terrorLevel}`}
          </p>
          <p className="text-xs text-slate-500">
            Adversary: {snapshot.adversary} | Thresholds: {snapshot.fearThresholds.join('/')}
          </p>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="grid grid-cols-3 gap-2 rounded border border-slate-200 bg-white p-2">
          {([
            { key: 'ravage', label: 'Ravage', bgClass: 'bg-red-50', textClass: 'text-red-800' },
            { key: 'build', label: 'Build', bgClass: 'bg-orange-50', textClass: 'text-orange-800' },
            { key: 'explore', label: 'Explore', bgClass: 'bg-amber-50', textClass: 'text-amber-800' },
          ] as const).map(({ key, label, bgClass, textClass }) => {
            const slotCards = snapshot.invaderTrackCards[key];
            const previewCard = key === 'explore' && slotCards.length === 0 ? snapshot.invaderDeckCards[0] ?? null : null;
            const CARD_W = 140;
            const CARD_H = 200;
            const SPLAY_OFFSET = CARD_W / 2;
            const containerWidth =
              slotCards.length <= 1 ? CARD_W : SPLAY_OFFSET * (slotCards.length - 1) + CARD_W;

            return (
              <div key={key} className={`rounded border p-2 ${bgClass}`}>
                <p className={`text-center text-xs font-semibold ${textClass}`}>{label}</p>
                <div className="mt-2 flex justify-center overflow-visible">
                  <div style={{ position: 'relative', width: containerWidth, height: CARD_H, flexShrink: 0 }}>
                    {slotCards.length > 0 ? (
                      slotCards.map((card, i) => (
                        <img
                          key={i}
                          src={card.faceUrl}
                          alt={card.name}
                          className="rounded border border-slate-300 object-cover shadow-sm"
                          style={{
                            position: 'absolute',
                            left: i * SPLAY_OFFSET,
                            top: 0,
                            width: CARD_W,
                            height: CARD_H,
                            zIndex: i,
                          }}
                        />
                      ))
                    ) : previewCard ? (
                      <img
                        src={previewCard.backUrl}
                        alt={`${previewCard.name} back`}
                        className="rounded border border-slate-300 object-cover shadow-sm"
                        style={{ position: 'absolute', left: 0, top: 0, width: CARD_W, height: CARD_H }}
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center rounded border border-dashed border-slate-300 bg-white text-[8px] text-slate-400"
                        style={{ position: 'absolute', left: 0, top: 0, width: CARD_W, height: CARD_H }}
                      >
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={drawToExplore}
            className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Draw to Explore
          </button>
          <button
            type="button"
            onClick={shiftInvaderTrackLeft}
            className="flex-1 rounded bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Advance Track
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <div className="relative flex justify-center">
          <img
            src={snapshot.currentBlightCard?.faceUrl ?? BLIGHT_CARDS[0]?.backUrl}
            alt={snapshot.currentBlightCard?.name ?? 'Blight card'}
            className="rounded border border-slate-300 object-cover"
            style={{ width: 140, height: 200, minWidth: 140 }}
          />
          <div className="absolute inset-0 flex items-start justify-center pt-[50px]">
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('piece-type', 'blight-from-card');
              }}
              title="Drag onto the board to add blight from counter"
              className="flex cursor-grab flex-col items-center active:cursor-grabbing"
            >
              <img src="/Blight.png" alt="Blight" style={{ width: 52, height: 52, pointerEvents: 'none' }} />
              <span
                style={{
                  marginTop: 4,
                  minWidth: 36,
                  borderRadius: 9999,
                  border: '2px solid white',
                  background: '#0f172a',
                  padding: '2px 8px',
                  textAlign: 'center',
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.4,
                  color: 'white',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
                  display: 'block',
                }}
              >
                {snapshot.blightCount}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => adjustBlightCount(-1)}
            className="flex-1 rounded border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
          >
            − Blight
          </button>
          <button
            type="button"
            onClick={() => adjustBlightCount(1)}
            className="flex-1 rounded border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
          >
            + Blight
          </button>
        </div>
        {snapshot.blightCount === 0 && !snapshot.blightLoss ? (
          <button
            type="button"
            onClick={flipBlightCard}
            className="w-full rounded border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            Flip Blight Card
          </button>
        ) : null}
        {snapshot.blightLoss ? (
          <div className="rounded border border-red-300 bg-red-50 px-3 py-2">
            <p className="text-sm font-semibold text-red-700">Blight Loss: the blight card has run out and cannot be flipped again.</p>
          </div>
        ) : null}
      </section>

      {(() => {
        const { adversaryId, adversaryLevel, adversaryCounter, spiritCount, townCount } = snapshot;
        if (adversaryId === 'france') {
          const max = 7 * spiritCount;
          const isLoss = townCount > max;
          return (
            <section className="space-y-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-800">France — Town Count</h2>
              <p className="text-xs text-orange-700">Invaders win if towns on the board exceed {max} ({7}×{spiritCount} spirits).</p>
              <div className="flex items-center justify-between rounded border border-orange-200 bg-white px-3 py-2">
                <span className="text-sm font-medium text-slate-700">Towns on Board</span>
                <span className="text-lg font-bold text-slate-900">{townCount} / {max}</span>
              </div>
              {isLoss ? (
                <div className="rounded border border-red-400 bg-red-100 px-3 py-2 text-sm font-semibold text-red-800">
                  Loss condition met: town count ({townCount}) exceeds {max}!
                </div>
              ) : null}
              {adversaryLevel >= 2 ? (
                <p className="text-xs text-orange-600">Slave Rebellion card has been shuffled into the event deck under the top 3 cards.</p>
              ) : null}
            </section>
          );
        }
        if (adversaryId === 'habsburg-livestock') {
          const isLoss = adversaryCounter > spiritCount;
          return (
            <section className="space-y-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-800">Habsburg Livestock — Damage Tracker</h2>
              <p className="text-xs text-orange-700">Tick up when a Ravage deals 8+ damage. Invaders win if this exceeds {spiritCount} (spirit count).</p>
              <CounterRow
                label="Livestock Damage"
                value={adversaryCounter}
                onDecrement={() => adjustAdversaryCounter(-1)}
                onIncrement={() => adjustAdversaryCounter(1)}
              />
              {isLoss ? (
                <div className="rounded border border-red-400 bg-red-100 px-3 py-2 text-sm font-semibold text-red-800">
                  Loss condition met: damage count ({adversaryCounter}) exceeds spirit count ({spiritCount})!
                </div>
              ) : null}
            </section>
          );
        }
        if (adversaryId === 'russia') {
          return (
            <section className="space-y-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-800">Russia — Hunted Beasts</h2>
              <p className="text-xs text-orange-700">Tick up each time the adversary destroys a Beast. Invaders win if this exceeds the number of Beast tokens currently on the board.</p>
              <CounterRow
                label="Hunted Beasts"
                value={adversaryCounter}
                onDecrement={() => adjustAdversaryCounter(-1)}
                onIncrement={() => adjustAdversaryCounter(1)}
              />
              {adversaryLevel >= 5 ? (
                <p className="text-xs text-orange-600">Invader bombs are embedded in the fear deck (Stage II under card 3, Stage III under card 7). They auto-place in Build when revealed.</p>
              ) : null}
            </section>
          );
        }
        return null;
      })()}

      <section className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Decks</h2>
        <StatPill label="Invader Deck" value={snapshot.decks.invader} />
        <StatPill label="Fear Deck" value={snapshot.decks.fear} />
        <StatPill label="Event Deck" value={snapshot.decks.event} />
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Discard Piles</h2>
        <DiscardPileSection
          title="Invader Discard"
          cards={snapshot.invaderDiscardCards.map((card) => ({
            id: card.id,
            name: card.name,
            faceUrl: card.faceUrl,
            subtitle: `Stage ${card.stage}`,
          }))}
          isShown={showInvaderDiscard}
          onToggle={() => setShowInvaderDiscard((current) => !current)}
          emptyMessage="No invader cards discarded yet."
        />

        <DiscardPileSection
          title="Event Discard"
          cards={snapshot.eventDiscardCards.map((card) => ({
            id: card.id,
            name: card.name,
            faceUrl: card.faceUrl,
          }))}
          isShown={showEventDiscard}
          onToggle={() => setShowEventDiscard((current) => !current)}
          emptyMessage="No event cards discarded yet."
        />

        <DiscardPileSection
          title="Fear Discard"
          cards={snapshot.fearDiscardCards.map((card) => ({
            id: card.id,
            name: card.name,
            faceUrl: card.faceUrl,
          }))}
          isShown={showFearDiscard}
          onToggle={() => setShowFearDiscard((current) => !current)}
          emptyMessage="No fear cards discarded yet."
        />

        <DiscardPileSection
          title="Blight Discard"
          cards={snapshot.blightDiscardCards.map((card) => ({
            id: card.id,
            name: card.name,
            faceUrl: card.faceUrl,
            subtitle: card.healthy ? 'Healthy Island' : 'Blighted Island',
          }))}
          isShown={showBlightDiscard}
          onToggle={() => setShowBlightDiscard((current) => !current)}
          emptyMessage="No blight cards discarded yet."
        />

        <DiscardPileSection
          title="Forgotten Minor Powers"
          cards={snapshot.forgottenMinorPowerCards.map((card) => ({
            id: card.id,
            name: card.name,
            faceUrl: card.faceUrl,
            subtitle: 'Minor Power',
          }))}
          isShown={showMinorPowerDiscard}
          onToggle={() => setShowMinorPowerDiscard((current) => !current)}
          emptyMessage="No minor powers forgotten yet."
          onCardAction={(cardId) => sendForgottenCardToHand(cardId, 'forgottenMinorPowerCards')}
          cardActionLabel="Send to Hand"
        />

        <DiscardPileSection
          title="Forgotten Major Powers"
          cards={snapshot.forgottenMajorPowerCards.map((card) => ({
            id: card.id,
            name: card.name,
            faceUrl: card.faceUrl,
            subtitle: 'Major Power',
          }))}
          isShown={showMajorPowerDiscard}
          onToggle={() => setShowMajorPowerDiscard((current) => !current)}
          emptyMessage="No major powers forgotten yet."
          onCardAction={(cardId) => sendForgottenCardToHand(cardId, 'forgottenMajorPowerCards')}
          cardActionLabel="Send to Hand"
        />

        <DiscardPileSection
          title="Forgotten Unique Powers"
          cards={snapshot.forgottenUniquePowerCards.map((card) => ({
            id: card.id,
            name: card.name,
            faceUrl: card.faceUrl,
            subtitle: 'Unique Power',
          }))}
          isShown={showUniquePowerDiscard}
          onToggle={() => setShowUniquePowerDiscard((current) => !current)}
          emptyMessage="No unique powers forgotten yet."
          onCardAction={(cardId) => sendForgottenCardToHand(cardId, 'forgottenUniquePowerCards')}
          cardActionLabel="Send to Hand"
        />
      </section>
    </aside>
  );
};

export default GamestatePanel;
