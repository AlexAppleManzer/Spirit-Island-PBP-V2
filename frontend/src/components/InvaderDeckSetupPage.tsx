import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { DEFAULT_INVADER_DECK, createInvaderSetupDeck, type InvaderCardDefinition } from '../data/invaderCards';

type InvaderCard = InvaderCardDefinition;

interface InvaderDeckSetupPageProps {
  docRef: React.MutableRefObject<Y.Doc | null>;
}

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

const parseCardList = (value: unknown): InvaderCard[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isInvaderCard);
};

const InvaderDeckSetupPage: React.FC<InvaderDeckSetupPageProps> = ({ docRef }) => {
  const [deckCards, setDeckCards] = useState<InvaderCard[]>([...DEFAULT_INVADER_DECK]);
  const [removedCards, setRemovedCards] = useState<InvaderCard[]>([]);

  useEffect(() => {
    const doc = docRef.current;
    if (!doc) return;

    const syncFromDoc = () => {
      const gameMap = doc.getMap('game') as Y.Map<unknown>;
      const rawDeck = gameMap.get('invaderDeckCards');
      const nextDeck = parseCardList(gameMap.get('invaderDeckCards'));
      const nextRemoved = parseCardList(gameMap.get('invaderRemovedCards'));
      setDeckCards(Array.isArray(rawDeck) ? nextDeck : [...DEFAULT_INVADER_DECK]);
      setRemovedCards(nextRemoved);
    };

    doc.transact(() => {
      const gameMap = doc.getMap('game') as Y.Map<unknown>;
      if (!Array.isArray(gameMap.get('invaderDeckCards'))) {
        gameMap.set('invaderDeckCards', [...DEFAULT_INVADER_DECK]);
      }
      if (!Array.isArray(gameMap.get('invaderRemovedCards'))) {
        gameMap.set('invaderRemovedCards', []);
      }
      if (!Array.isArray(gameMap.get('invaderDiscardCards'))) {
        gameMap.set('invaderDiscardCards', []);
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
    decks.set('invader', count);
  };

  const resetInvaderDiscardCount = (gameMap: Y.Map<unknown>) => {
    const discards = gameMap.get('discards') instanceof Y.Map ? (gameMap.get('discards') as Y.Map<unknown>) : new Y.Map<unknown>();
    if (!(gameMap.get('discards') instanceof Y.Map)) {
      gameMap.set('discards', discards);
    }
    discards.set('invader', 0);
  };

  const moveDeckCard = (index: number, direction: -1 | 1) => {
    withGameMap((gameMap) => {
      const currentDeck = parseCardList(gameMap.get('invaderDeckCards'));
      const target = index + direction;
      if (index < 0 || index >= currentDeck.length || target < 0 || target >= currentDeck.length) {
        return;
      }
      const nextDeck = [...currentDeck];
      const [card] = nextDeck.splice(index, 1);
      if (!card) return;
      nextDeck.splice(target, 0, card);
      gameMap.set('invaderDeckCards', nextDeck);
      syncDeckCount(gameMap, nextDeck.length);
    });
  };

  const removeDeckCard = (index: number) => {
    withGameMap((gameMap) => {
      const currentDeck = parseCardList(gameMap.get('invaderDeckCards'));
      if (index < 0 || index >= currentDeck.length) return;
      const nextDeck = [...currentDeck];
      const [removed] = nextDeck.splice(index, 1);
      if (!removed) return;
      const nextRemoved = [...parseCardList(gameMap.get('invaderRemovedCards')), removed];
      gameMap.set('invaderDeckCards', nextDeck);
      gameMap.set('invaderRemovedCards', nextRemoved);
      syncDeckCount(gameMap, nextDeck.length);
    });
  };

  const restoreRemovedCard = (index: number) => {
    withGameMap((gameMap) => {
      const currentRemoved = parseCardList(gameMap.get('invaderRemovedCards'));
      if (index < 0 || index >= currentRemoved.length) return;
      const nextRemoved = [...currentRemoved];
      const [restored] = nextRemoved.splice(index, 1);
      if (!restored) return;
      const nextDeck = [...parseCardList(gameMap.get('invaderDeckCards')), restored];
      gameMap.set('invaderDeckCards', nextDeck);
      gameMap.set('invaderRemovedCards', nextRemoved);
      syncDeckCount(gameMap, nextDeck.length);
    });
  };

  const resetInvaderDeck = () => {
    withGameMap((gameMap) => {
      const resetDeck = createInvaderSetupDeck();
      gameMap.set('invaderDeckCards', resetDeck.deck);
      gameMap.set('invaderRemovedCards', resetDeck.removed);
      gameMap.set('invaderTrackCards', { ravage: null, build: null, explore: null });
      gameMap.set('invaderDiscardCards', []);
      syncDeckCount(gameMap, resetDeck.deck.length);
      resetInvaderDiscardCount(gameMap);
    });
  };

  return (
    <section className="rounded-xl bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Invader Setup</h2>
          <p className="text-sm text-slate-500">Reorder or remove cards before they ever flip into the Explore slot.</p>
        </div>
        <button
          type="button"
          onClick={resetInvaderDeck}
          className="rounded border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
        >
          Reset Deck
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Invader Deck Order</h3>
            <span className="text-xs text-slate-500">Top card is drawn next</span>
          </div>
          <div className="max-h-[65vh] space-y-2 overflow-auto pr-1">
            {deckCards.map((card, index) => (
              <div key={card.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="w-7 text-center text-xs font-semibold text-slate-500">{index + 1}</span>
                <img
                  src={card.faceUrl}
                  alt={card.name}
                  className="rounded border border-slate-300 object-cover"
                  style={{ width: 70, height: 100, minWidth: 70 }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{card.name}</p>
                  <p className="text-xs text-slate-500">Stage {card.stage}</p>
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
                  alt={`${deckCards[0].name} back`}
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
                    <p className="text-xs text-slate-500">Stage {card.stage}</p>
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

export default InvaderDeckSetupPage;
