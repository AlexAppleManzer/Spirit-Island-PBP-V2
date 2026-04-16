import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { EVENT_CARDS, createShuffledEventCardDeck, type EventCardDefinition } from '../data/eventCards';

type EventCard = EventCardDefinition;

interface EventDeckSetupPageProps {
  docRef: React.MutableRefObject<Y.Doc | null>;
}

const isEventCard = (value: unknown): value is EventCard => {
  if (!value || typeof value !== 'object') return false;
  const card = value as Partial<EventCard>;
  return (
    typeof card.id === 'string' &&
    typeof card.name === 'string' &&
    typeof card.faceUrl === 'string' &&
    typeof card.backUrl === 'string'
  );
};

const parseCardList = (value: unknown): EventCard[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isEventCard);
};

const EventDeckSetupPage: React.FC<EventDeckSetupPageProps> = ({ docRef }) => {
  const [deckCards, setDeckCards] = useState<EventCard[]>([...EVENT_CARDS]);
  const [removedCards, setRemovedCards] = useState<EventCard[]>([]);

  useEffect(() => {
    const doc = docRef.current;
    if (!doc) return;

    const syncFromDoc = () => {
      const gameMap = doc.getMap('game') as Y.Map<unknown>;
      const rawDeck = gameMap.get('eventDeckCards');
      const nextDeck = parseCardList(rawDeck);
      const nextRemoved = parseCardList(gameMap.get('eventRemovedCards'));
      setDeckCards(Array.isArray(rawDeck) ? nextDeck : [...EVENT_CARDS]);
      setRemovedCards(nextRemoved);
    };

    doc.transact(() => {
      const gameMap = doc.getMap('game') as Y.Map<unknown>;
      if (!Array.isArray(gameMap.get('eventDeckCards'))) {
        const gc = gameMap.get('gameConfig');
        const adversaryId = gc instanceof Y.Map ? (gc.get('adversary') as string | undefined) : undefined;
        const adversaryLevel = gc instanceof Y.Map ? (gc.get('adversaryLevel') as number | undefined) : undefined;
        gameMap.set('eventDeckCards', createShuffledEventCardDeck(adversaryId, adversaryLevel));
      }
      if (!Array.isArray(gameMap.get('eventRemovedCards'))) {
        gameMap.set('eventRemovedCards', []);
      }
      if (!Array.isArray(gameMap.get('eventDiscardCards'))) {
        gameMap.set('eventDiscardCards', []);
      }
    });

    syncFromDoc();
    doc.on('update', syncFromDoc);
    return () => doc.off('update', syncFromDoc);
  }, [docRef]);

  const withGameMap = (mutator: (gameMap: Y.Map<unknown>) => void) => {
    const doc = docRef.current;
    if (!doc) return;
    doc.transact(() => {
      const gameMap = doc.getMap('game') as Y.Map<unknown>;
      mutator(gameMap);
    });
  };

  const syncDeckCount = (gameMap: Y.Map<unknown>, count: number) => {
    const decks = gameMap.get('decks') instanceof Y.Map ? (gameMap.get('decks') as Y.Map<unknown>) : new Y.Map<unknown>();
    if (!(gameMap.get('decks') instanceof Y.Map)) {
      gameMap.set('decks', decks);
    }
    decks.set('event', count);
  };

  const resetEventDiscardCount = (gameMap: Y.Map<unknown>) => {
    const discards = gameMap.get('discards') instanceof Y.Map ? (gameMap.get('discards') as Y.Map<unknown>) : new Y.Map<unknown>();
    if (!(gameMap.get('discards') instanceof Y.Map)) {
      gameMap.set('discards', discards);
    }
    discards.set('event', 0);
  };

  const moveDeckCard = (index: number, direction: -1 | 1) => {
    withGameMap((gameMap) => {
      const currentDeck = parseCardList(gameMap.get('eventDeckCards'));
      const target = index + direction;
      if (index < 0 || index >= currentDeck.length || target < 0 || target >= currentDeck.length) {
        return;
      }
      const nextDeck = [...currentDeck];
      const [card] = nextDeck.splice(index, 1);
      if (!card) return;
      nextDeck.splice(target, 0, card);
      gameMap.set('eventDeckCards', nextDeck);
      syncDeckCount(gameMap, nextDeck.length);
    });
  };

  const removeDeckCard = (index: number) => {
    withGameMap((gameMap) => {
      const currentDeck = parseCardList(gameMap.get('eventDeckCards'));
      if (index < 0 || index >= currentDeck.length) return;
      const nextDeck = [...currentDeck];
      const [removed] = nextDeck.splice(index, 1);
      if (!removed) return;
      const nextRemoved = [...parseCardList(gameMap.get('eventRemovedCards')), removed];
      gameMap.set('eventDeckCards', nextDeck);
      gameMap.set('eventRemovedCards', nextRemoved);
      syncDeckCount(gameMap, nextDeck.length);
    });
  };

  const restoreRemovedCard = (index: number) => {
    withGameMap((gameMap) => {
      const currentRemoved = parseCardList(gameMap.get('eventRemovedCards'));
      if (index < 0 || index >= currentRemoved.length) return;
      const nextRemoved = [...currentRemoved];
      const [restored] = nextRemoved.splice(index, 1);
      if (!restored) return;
      const nextDeck = [...parseCardList(gameMap.get('eventDeckCards')), restored];
      gameMap.set('eventDeckCards', nextDeck);
      gameMap.set('eventRemovedCards', nextRemoved);
      syncDeckCount(gameMap, nextDeck.length);
    });
  };

  const resetEventDeck = () => {
    withGameMap((gameMap) => {
      const gc = gameMap.get('gameConfig');
      const adversaryId = gc instanceof Y.Map ? (gc.get('adversary') as string | undefined) : undefined;
      const adversaryLevel = gc instanceof Y.Map ? (gc.get('adversaryLevel') as number | undefined) : undefined;
      const resetDeck = createShuffledEventCardDeck(adversaryId, adversaryLevel);
      gameMap.set('eventDeckCards', resetDeck);
      gameMap.set('eventRemovedCards', []);
      gameMap.set('eventDiscardCards', []);
      gameMap.set('currentEventCard', null);
      syncDeckCount(gameMap, resetDeck.length);
      resetEventDiscardCount(gameMap);
    });
  };

  return (
    <section className="rounded-xl bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Event Setup</h2>
          <p className="text-sm text-slate-500">Reorder or remove event cards before the game begins.</p>
        </div>
        <button
          type="button"
          onClick={resetEventDeck}
          className="rounded border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
        >
          Reset Deck
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Event Deck Order</h3>
            <span className="text-xs text-slate-500">Top card is drawn next</span>
          </div>
          <div className="max-h-[65vh] space-y-2 overflow-auto pr-1">
            {deckCards.map((card, index) => (
              <div key={card.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="w-7 text-center text-xs font-semibold text-slate-500">{index + 1}</span>
                <img
                  src={card.faceUrl}
                  alt={card.name || 'Event card'}
                  className="rounded border border-slate-300 object-cover"
                  style={{ width: 70, height: 100, minWidth: 70 }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{card.name}</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => moveDeckCard(index, -1)} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100">Up</button>
                  <button type="button" onClick={() => moveDeckCard(index, 1)} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100">Down</button>
                  <button type="button" onClick={() => removeDeckCard(index)} className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Deck Summary</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Remaining</p>
                <p className="text-lg font-semibold text-slate-900">{deckCards.length}</p>
              </div>
              <div className="rounded border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Removed</p>
                <p className="text-lg font-semibold text-slate-900">{removedCards.length}</p>
              </div>
            </div>
            {deckCards[0] && (
              <div className="mt-4 rounded border border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Current Deck Top</p>
                <img
                  src={deckCards[0].backUrl}
                  alt={(deckCards[0].name || 'Event card') + ' back'}
                  className="rounded border border-slate-300 object-cover"
                  style={{ width: 140, height: 200, minWidth: 140 }}
                />
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Removed Cards</h3>
            <div className="mt-3 space-y-2">
              {removedCards.length === 0 && <p className="text-sm text-slate-500">No cards removed.</p>}
              {removedCards.map((card, index) => (
                <div key={`removed-${card.id}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{card.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => restoreRemovedCard(index)}
                    className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EventDeckSetupPage;
