import { useEffect, useMemo, useState } from 'react';
import * as Y from 'yjs';
import { DEFAULT_INVADER_DECK, type InvaderCardDefinition } from '../data/invaderCards';

const TURN_PHASES = ['growth', 'fast', 'event', 'invader', 'slow'] as const;
type TurnPhase = (typeof TURN_PHASES)[number];

type InvaderCard = InvaderCardDefinition;

type InvaderTrackCards = {
  ravage: InvaderCard | null;
  build: InvaderCard | null;
  explore: InvaderCard | null;
};

const FEAR_PER_PLAYER = 4;
const DEFAULT_FEAR_THRESHOLDS = [3, 6, 9];

type GamestateSnapshot = {
  turn: number;
  phase: TurnPhase;
  playerCount: number;
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
  decks: { invader: number; fear: number; event: number };
  discards: { invader: number; fear: number; event: number; blight: number };
  blightCard: string;
  blightCount: number;
  adversary: string;
};

interface GamestatePanelProps {
  docRef: React.MutableRefObject<Y.Doc | null>;
}

const getSafeNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return fallback;
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

const parseCardList = (value: unknown, fallback: InvaderCard[] = []): InvaderCard[] => {
  if (!Array.isArray(value)) {
    return fallback;
  }
  return value.filter(isInvaderCard);
};

const parseTrackCards = (value: unknown): InvaderTrackCards => {
  if (!value || typeof value !== 'object') {
    return { ravage: null, build: null, explore: null };
  }
  const cards = value as Partial<InvaderTrackCards>;
  return {
    ravage: isInvaderCard(cards.ravage) ? cards.ravage : null,
    build: isInvaderCard(cards.build) ? cards.build : null,
    explore: isInvaderCard(cards.explore) ? cards.explore : null,
  };
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

  for (let i = fearThresholds.length - 1; i >= 0; i--) {
    const threshold = fearThresholds[i];
    if (threshold !== undefined && fearCardsEarned >= threshold) {
      return i + 2;
    }
  }

  return 1;
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

const ensureYArray = (parent: Y.Map<unknown> | Y.Array<unknown>, key: string | number) => {
  if (parent instanceof Y.Array) {
    // For Y.Array, key is an index; can't ensure by index, just return parent
    return parent;
  }

  const existing = parent.get(key as string);
  if (existing instanceof Y.Array) {
    return existing as Y.Array<unknown>;
  }

  const created = new Y.Array<unknown>();
  parent.set(key as string, created);
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

  const playerCount = clampMin(getSafeNumber(gameMap.get('playerCount'), 1), 1);
  const fearThreshold = FEAR_PER_PLAYER * playerCount;

  gameMap.set('playerCount', playerCount);
  gameMap.set('fearThreshold', fearThreshold);

  const fearPool = clampMin(getSafeNumber(gameMap.get('fearPool'), 0), 0);
  const fearCardsEarned = clampMin(getSafeNumber(gameMap.get('fearCardsEarned'), 0), 0);
  gameMap.set('fearPool', fearPool);
  gameMap.set('fearCardsEarned', fearCardsEarned);

  // Get fear thresholds from gameConfig or use defaults
  let fearThresholds = DEFAULT_FEAR_THRESHOLDS;
  const gameConfig = gameMap.get('gameConfig');
  if (gameConfig instanceof Y.Map) {
    const configThresholds = gameConfig.get('fearThresholds');
    if (Array.isArray(configThresholds)) {
      fearThresholds = configThresholds;
    }
  }

  gameMap.set('terrorLevel', getTerrorLevelFromFearCards(fearCardsEarned, fearThresholds));

  if (!gameMap.has('blightCard')) {
    gameMap.set('blightCard', 'Unknown Blight Card');
  }
  const blightCount = clampMin(getSafeNumber(gameMap.get('blightCount'), playerCount * 2 + 1), 0);
  gameMap.set('blightCount', blightCount);

  const invaderTrack = ensureNestedMap(gameMap, 'invaderTrack');
  invaderTrack.set('ravage', clampMin(getSafeNumber(invaderTrack.get('ravage'), 0), 0));
  invaderTrack.set('build', clampMin(getSafeNumber(invaderTrack.get('build'), 0), 0));
  invaderTrack.set('explore', clampMin(getSafeNumber(invaderTrack.get('explore'), 1), 0));

  // Ensure invader lands arrays exist
  if (!(invaderTrack.get('exploredLands') instanceof Y.Array)) {
    invaderTrack.set('exploredLands', new Y.Array());
  }
  if (!(invaderTrack.get('buildLands') instanceof Y.Array)) {
    invaderTrack.set('buildLands', new Y.Array());
  }
  if (!(invaderTrack.get('ravageLands') instanceof Y.Array)) {
    invaderTrack.set('ravageLands', new Y.Array());
  }

  const decks = ensureNestedMap(gameMap, 'decks');
  decks.set('invader', clampMin(getSafeNumber(decks.get('invader'), 12), 0));
  decks.set('fear', clampMin(getSafeNumber(decks.get('fear'), 9), 0));
  decks.set('event', clampMin(getSafeNumber(decks.get('event'), 0), 0));

  const discards = ensureNestedMap(gameMap, 'discards');
  discards.set('invader', clampMin(getSafeNumber(discards.get('invader'), 0), 0));
  discards.set('fear', clampMin(getSafeNumber(discards.get('fear'), 0), 0));
  discards.set('event', clampMin(getSafeNumber(discards.get('event'), 0), 0));
  discards.set('blight', clampMin(getSafeNumber(discards.get('blight'), 0), 0));

  const rawInvaderDeckCards = gameMap.get('invaderDeckCards');
  const invaderDeckCards = parseCardList(rawInvaderDeckCards);
  if (!Array.isArray(rawInvaderDeckCards)) {
    gameMap.set('invaderDeckCards', [...DEFAULT_INVADER_DECK]);
    decks.set('invader', DEFAULT_INVADER_DECK.length);
  } else {
    decks.set('invader', invaderDeckCards.length);
  }

  const invaderRemovedCards = parseCardList(gameMap.get('invaderRemovedCards'));
  if (!gameMap.has('invaderRemovedCards')) {
    gameMap.set('invaderRemovedCards', invaderRemovedCards);
  }

  const invaderDiscardCards = parseCardList(gameMap.get('invaderDiscardCards'));
  if (!gameMap.has('invaderDiscardCards')) {
    gameMap.set('invaderDiscardCards', invaderDiscardCards);
  }

  const invaderTrackCards = parseTrackCards(gameMap.get('invaderTrackCards'));
  gameMap.set('invaderTrackCards', invaderTrackCards);
};

const readSnapshot = (doc: Y.Doc): GamestateSnapshot => {
  const gameMap = doc.getMap('game') as Y.Map<unknown>;
  const invaderTrack = gameMap.get('invaderTrack') as Y.Map<unknown> | undefined;
  const decks = gameMap.get('decks') as Y.Map<unknown> | undefined;
  const discards = gameMap.get('discards') as Y.Map<unknown> | undefined;
  const gameConfig = gameMap.get('gameConfig') as Y.Map<unknown> | undefined;
  const invaderDeckCards = parseCardList(gameMap.get('invaderDeckCards'));
  const invaderRemovedCards = parseCardList(gameMap.get('invaderRemovedCards'));
  const invaderDiscardCards = parseCardList(gameMap.get('invaderDiscardCards'));
  const invaderTrackCards = parseTrackCards(gameMap.get('invaderTrackCards'));

  const playerCount = clampMin(getSafeNumber(gameMap.get('playerCount'), 1), 1);
  const fearThreshold = FEAR_PER_PLAYER * playerCount;
  const fearCardsEarned = clampMin(getSafeNumber(gameMap.get('fearCardsEarned'), 0), 0);

  // Get fear thresholds from gameConfig or use defaults
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

  // Get invader lands
  const exploredLands = (invaderTrack?.get('exploredLands') instanceof Y.Array
    ? (invaderTrack?.get('exploredLands') as Y.Array<number>).toArray()
    : []) as number[];
  const buildLands = (invaderTrack?.get('buildLands') instanceof Y.Array
    ? (invaderTrack?.get('buildLands') as Y.Array<number>).toArray()
    : []) as number[];
  const ravageLands = (invaderTrack?.get('ravageLands') instanceof Y.Array
    ? (invaderTrack?.get('ravageLands') as Y.Array<number>).toArray()
    : []) as number[];

  return {
    turn: clampMin(getSafeNumber(gameMap.get('turn'), getSafeNumber(gameMap.get('round'), 1)), 1),
    phase,
    playerCount,
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
    decks: {
      invader: invaderDeckCards.length,
      fear: clampMin(getSafeNumber(decks?.get('fear'), 9), 0),
      event: clampMin(getSafeNumber(decks?.get('event'), 0), 0),
    },
    discards: {
      invader: invaderDiscardCards.length,
      fear: clampMin(getSafeNumber(discards?.get('fear'), 0), 0),
      event: clampMin(getSafeNumber(discards?.get('event'), 0), 0),
      blight: clampMin(getSafeNumber(discards?.get('blight'), 0), 0),
    },
    blightCard: (gameMap.get('blightCard') as string) || 'Unknown Blight Card',
    blightCount: clampMin(getSafeNumber(gameMap.get('blightCount'), playerCount * 2 + 1), 0),
    adversary: (gameConfig?.get('adversary') as string) || 'Unknown Adversary',
  };
};


const initialSnapshot: GamestateSnapshot = {
  turn: 1,
  phase: 'growth',
  playerCount: 1,
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
  invaderTrackCards: { ravage: null, build: null, explore: null },
  decks: { invader: 12, fear: 9, event: 0 },
  discards: { invader: 0, fear: 0, event: 0, blight: 0 },
  blightCard: 'Unknown Blight Card',
  blightCount: 3,
  adversary: 'Unknown Adversary',
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

const GamestatePanel: React.FC<GamestatePanelProps> = ({ docRef }) => {
  const [snapshot, setSnapshot] = useState<GamestateSnapshot>(initialSnapshot);
  const [showInvaderDiscard, setShowInvaderDiscard] = useState(false);

  useEffect(() => {
    const doc = docRef.current;
    if (!doc) return;

    doc.transact(() => {
      ensureGamestateDefaults(doc);
    });

    const syncFromDoc = () => {
      setSnapshot(readSnapshot(doc));
    };

    syncFromDoc();
    doc.on('update', syncFromDoc);

    return () => {
      doc.off('update', syncFromDoc);
    };
  }, [docRef]);

  const phaseIndex = useMemo(() => {
    return TURN_PHASES.indexOf(snapshot.phase);
  }, [snapshot.phase]);

  const withGameMap = (mutator: (doc: Y.Doc, gameMap: Y.Map<unknown>) => void) => {
    const doc = docRef.current;
    if (!doc) return;

    doc.transact(() => {
      const gameMap = doc.getMap('game') as Y.Map<unknown>;
      ensureGamestateDefaults(doc);
      mutator(doc, gameMap);
    });
  };

  const adjustPhase = (step: 1 | -1) => {
    withGameMap((_doc, gameMap) => {
      const currentPhaseRaw = gameMap.get('currentPhase');
      const currentPhase: TurnPhase =
        typeof currentPhaseRaw === 'string' && TURN_PHASES.includes(currentPhaseRaw as TurnPhase)
          ? (currentPhaseRaw as TurnPhase)
          : 'growth';
      const currentIndex = TURN_PHASES.indexOf(currentPhase);

      if (step === 1) {
        if (currentIndex === TURN_PHASES.length - 1) {
          gameMap.set('currentPhase', TURN_PHASES[0]);
          const turn = clampMin(getSafeNumber(gameMap.get('turn'), 1), 1);
          gameMap.set('turn', turn + 1);
          return;
        }

        gameMap.set('currentPhase', TURN_PHASES[currentIndex + 1]);
        return;
      }

      if (currentIndex === 0) {
        const turn = clampMin(getSafeNumber(gameMap.get('turn'), 1), 1);
        gameMap.set('currentPhase', TURN_PHASES[TURN_PHASES.length - 1]);
        gameMap.set('turn', clampMin(turn - 1, 1));
        return;
      }

      gameMap.set('currentPhase', TURN_PHASES[currentIndex - 1]);
    });
  };

  const adjustFearPool = (delta: number) => {
    withGameMap((_doc, gameMap) => {
      const playerCount = clampMin(getSafeNumber(gameMap.get('playerCount'), 1), 1);
      const threshold = FEAR_PER_PLAYER * playerCount;

      let fearPool = clampMin(getSafeNumber(gameMap.get('fearPool'), 0) + delta, 0);
      let fearCardsEarned = clampMin(getSafeNumber(gameMap.get('fearCardsEarned'), 0), 0);

      // Get fear thresholds
      const gameConfig = gameMap.get('gameConfig') as Y.Map<unknown> | undefined;
      let fearThresholds = DEFAULT_FEAR_THRESHOLDS;
      if (gameConfig) {
        const configThresholds = gameConfig.get('fearThresholds');
        if (Array.isArray(configThresholds)) {
          fearThresholds = configThresholds;
        }
      }

      while (fearPool >= threshold) {
        fearPool -= threshold;
        fearCardsEarned += 1;
      }

      gameMap.set('fearPool', fearPool);
      gameMap.set('fearThreshold', threshold);
      gameMap.set('fearCardsEarned', fearCardsEarned);
      
      const terrorLevel = getTerrorLevelFromFearCards(fearCardsEarned, fearThresholds);
      gameMap.set('terrorLevel', terrorLevel);
    });
  };

  const adjustFearCardsEarned = (delta: number) => {
    withGameMap((_doc, gameMap) => {
      const gameConfig = gameMap.get('gameConfig') as Y.Map<unknown> | undefined;
      let fearThresholds = DEFAULT_FEAR_THRESHOLDS;
      
      if (gameConfig) {
        const configThresholds = gameConfig.get('fearThresholds');
        if (Array.isArray(configThresholds)) {
          fearThresholds = configThresholds;
        }
      }

      const fearCardsEarned = clampMin(getSafeNumber(gameMap.get('fearCardsEarned'), 0) + delta, 0);
      gameMap.set('fearCardsEarned', fearCardsEarned);
      
      // Recalculate terror level based on fearThresholds
      const terrorLevel = getTerrorLevelFromFearCards(fearCardsEarned, fearThresholds);
      gameMap.set('terrorLevel', terrorLevel);
    });
  };

  const shiftInvaderTrackLeft = () => {
    withGameMap((_doc, gameMap) => {
      const invaderTrack = ensureNestedMap(gameMap, 'invaderTrack');
      const discards = ensureNestedMap(gameMap, 'discards');
      const trackCards = parseTrackCards(gameMap.get('invaderTrackCards'));
      const invaderDiscardCards = parseCardList(gameMap.get('invaderDiscardCards'));

      // Get lands arrays
      const exploredLands = (invaderTrack.get('exploredLands') instanceof Y.Array
        ? (invaderTrack.get('exploredLands') as Y.Array<number>).toArray()
        : []) as number[];
      const buildLands = (invaderTrack.get('buildLands') instanceof Y.Array
        ? (invaderTrack.get('buildLands') as Y.Array<number>).toArray()
        : []) as number[];
      const ravageLands = (invaderTrack.get('ravageLands') instanceof Y.Array
        ? (invaderTrack.get('ravageLands') as Y.Array<number>).toArray()
        : []) as number[];

      // Shift: Build → Ravage, Explored → Build, clear Explored
      const newBuildLands = ensureYArray(invaderTrack, 'buildLands');
      const newRavageLands = ensureYArray(invaderTrack, 'ravageLands');
      const newExploredLands = ensureYArray(invaderTrack, 'exploredLands');

      newBuildLands.delete(0, newBuildLands.length);
      newRavageLands.delete(0, newRavageLands.length);
      newExploredLands.delete(0, newExploredLands.length);

      exploredLands.forEach((land) => newBuildLands.push([land]));
      buildLands.forEach((land) => newRavageLands.push([land]));

      const nextInvaderDiscardCards = trackCards.ravage
        ? [...invaderDiscardCards, trackCards.ravage]
        : invaderDiscardCards;
      gameMap.set('invaderDiscardCards', nextInvaderDiscardCards);
      discards.set('invader', nextInvaderDiscardCards.length);

      gameMap.set('invaderTrackCards', {
        ravage: trackCards.build,
        build: trackCards.explore,
        explore: null,
      });
    });
  };

  const drawToExplore = () => {
    withGameMap((_doc, gameMap) => {
      const decks = ensureNestedMap(gameMap, 'decks');
      const invaderTrack = ensureNestedMap(gameMap, 'invaderTrack');
      const deckCards = parseCardList(gameMap.get('invaderDeckCards'));
      const trackCards = parseTrackCards(gameMap.get('invaderTrackCards'));

      const deckCount = clampMin(getSafeNumber(decks.get('invader'), 0), 0);
      if (deckCount <= 0 || deckCards.length === 0) return;

      decks.set('invader', deckCount - 1);

      // Draw random land (1-8)
      const randomLand = Math.floor(Math.random() * 8) + 1;

      // Add to exploredLands array
      const exploredLands = ensureYArray(invaderTrack, 'exploredLands');
      exploredLands.push([randomLand]);

      const [drawnCard, ...remainingCards] = deckCards;
      gameMap.set('invaderDeckCards', remainingCards);
      gameMap.set('invaderTrackCards', {
        ravage: trackCards.ravage,
        build: trackCards.build,
        explore: drawnCard,
      });
    });
  };

  const adjustDeckCount = (deckKey: 'fear' | 'event', delta: number) => {
    withGameMap((_doc, gameMap) => {
      const decks = ensureNestedMap(gameMap, 'decks');
      const next = clampMin(getSafeNumber(decks.get(deckKey), 0) + delta, 0);
      decks.set(deckKey, next);
    });
  };

  const adjustDiscardCount = (discardKey: 'fear' | 'event' | 'blight', delta: number) => {
    withGameMap((_doc, gameMap) => {
      const discards = ensureNestedMap(gameMap, 'discards');
      const next = clampMin(getSafeNumber(discards.get(discardKey), 0) + delta, 0);
      discards.set(discardKey, next);
    });
  };

  const adjustBlightCount = (delta: number) => {
    withGameMap((_doc, gameMap) => {
      const next = clampMin(getSafeNumber(gameMap.get('blightCount'), 0) + delta, 0);
      gameMap.set('blightCount', next);
    });
  };

  return (
    <aside className="space-y-4 rounded-xl bg-white p-4 shadow">
      <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Turn and Phase</h2>
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
                  isActive ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'
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
        <p className="text-xs text-slate-500">
          Slow to Growth advances to the next turn. Current phase index: {phaseIndex + 1} / {TURN_PHASES.length}.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-rose-700">Fear and Terror</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatPill label="Fear Pool" value={snapshot.fearPool} />
          <StatPill label="Next Fear Card" value={`${snapshot.fearPool}/${snapshot.fearThreshold}`} />
        </div>
        <CounterRow
          label="Add Fear"
          value={snapshot.fearPool}
          onDecrement={() => adjustFearPool(-1)}
          onIncrement={() => adjustFearPool(1)}
        />
        <CounterRow
          label="Fear Cards Earned"
          value={snapshot.fearCardsEarned}
          onDecrement={() => adjustFearCardsEarned(-1)}
          onIncrement={() => adjustFearCardsEarned(1)}
        />
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700">Invader Track</h2>
        <div className="grid grid-cols-3 gap-2 rounded border border-slate-200 bg-white p-2">
          {([
            { key: 'ravage', label: 'Ravage', bgClass: 'bg-red-50', textClass: 'text-red-800' },
            { key: 'build', label: 'Build', bgClass: 'bg-orange-50', textClass: 'text-orange-800' },
            { key: 'explore', label: 'Explore', bgClass: 'bg-amber-50', textClass: 'text-amber-800' },
          ] as const).map(({ key, label, bgClass, textClass }) => {
            const activeCard = snapshot.invaderTrackCards[key];
            const previewCard = key === 'explore' && !activeCard ? snapshot.invaderDeckCards[0] ?? null : null;
            const lands =
              key === 'ravage'
                ? snapshot.invaderLands.ravageLands
                : key === 'build'
                ? snapshot.invaderLands.buildLands
                : snapshot.invaderLands.exploredLands;

            return (
              <div key={key} className={`rounded border p-2 ${bgClass}`}>
                <p className={`text-center text-xs font-semibold ${textClass}`}>{label}</p>
                <div className="mt-2 flex justify-center">
                  {activeCard ? (
                    <img
                      src={activeCard.faceUrl}
                      alt={activeCard.name}
                      className="rounded border border-slate-300 object-cover shadow-sm"
                      style={{ width: 140, height: 200, minWidth: 140 }}
                    />
                  ) : previewCard ? (
                    <img
                      src={previewCard.backUrl}
                      alt={`${previewCard.name} back`}
                      className="rounded border border-slate-300 object-cover shadow-sm"
                      style={{ width: 140, height: 200, minWidth: 140 }}
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center rounded border border-dashed border-slate-300 bg-white text-[8px] text-slate-400"
                      style={{ width: 140, height: 200, minWidth: 140 }}
                    >
                      Empty
                    </div>
                  )}
                </div>
                <p className="mt-2 text-center text-[11px] font-medium text-slate-700">
                  {activeCard ? activeCard.name : previewCard ? 'Face-down deck top' : 'No card'}
                </p>
                <p className="mt-1 text-center text-[11px] text-slate-500">{lands.join(', ') || '—'}</p>
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

      <section className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Decks</h2>
        <StatPill label="Invader Deck" value={snapshot.decks.invader} />
        <CounterRow
          label="Fear Deck"
          value={snapshot.decks.fear}
          onDecrement={() => adjustDeckCount('fear', -1)}
          onIncrement={() => adjustDeckCount('fear', 1)}
        />
        <CounterRow
          label="Event Deck"
          value={snapshot.decks.event}
          onDecrement={() => adjustDeckCount('event', -1)}
          onIncrement={() => adjustDeckCount('event', 1)}
        />
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Discard Piles</h2>
        <div className="rounded border border-slate-200 bg-white px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-slate-700">Invader Discard</p>
              <p className="text-xs text-slate-500">{snapshot.invaderDiscardCards.length} card(s)</p>
            </div>
            <button
              type="button"
              onClick={() => setShowInvaderDiscard((current) => !current)}
              className="rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              {showInvaderDiscard ? 'Hide' : 'Show'}
            </button>
          </div>
          {showInvaderDiscard && (
            <div className="mt-3">
              {snapshot.invaderDiscardCards.length === 0 ? (
                <p className="text-xs text-slate-500">No invader cards discarded yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {snapshot.invaderDiscardCards
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
                        <p className="text-center text-[10px] text-slate-500">Stage {card.stage}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
        <CounterRow
          label="Fear Discard"
          value={snapshot.discards.fear}
          onDecrement={() => adjustDiscardCount('fear', -1)}
          onIncrement={() => adjustDiscardCount('fear', 1)}
        />
        <CounterRow
          label="Event Discard"
          value={snapshot.discards.event}
          onDecrement={() => adjustDiscardCount('event', -1)}
          onIncrement={() => adjustDiscardCount('event', 1)}
        />
        <CounterRow
          label="Blight Discard"
          value={snapshot.discards.blight}
          onDecrement={() => adjustDiscardCount('blight', -1)}
          onIncrement={() => adjustDiscardCount('blight', 1)}
        />
      </section>

      <section className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Blight Card</h2>
        <div className="rounded border border-emerald-200 bg-white px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Card</p>
          <p className="text-sm font-semibold text-slate-900">{snapshot.blightCard}</p>
        </div>
        <CounterRow
          label="Blight Counter"
          value={snapshot.blightCount}
          onDecrement={() => adjustBlightCount(-1)}
          onIncrement={() => adjustBlightCount(1)}
        />
        <p className="text-xs text-slate-500">
          Base pool uses 2 blight per player + 1. Current setup tracks {snapshot.playerCount} player(s).
        </p>
      </section>
    </aside>
  );
};

export default GamestatePanel;
