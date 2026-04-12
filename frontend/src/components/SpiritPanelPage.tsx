import { useEffect, useMemo, useState } from 'react';
import * as Y from 'yjs';
import { SPIRITS } from '../data/spirits';

type SpiritState = {
  boardId: string;
  playerId: number;
  spiritId: string;
  energy: number;
  presenceInSupply: number;
  presenceOnIsland: number;
  presenceDestroyed: number;
  presenceRemoved: number;
  presenceColor: string;
};

type SpiritPanelPageProps = {
  docRef: React.MutableRefObject<Y.Doc | null>;
  mode?: 'full' | 'manage';
};

const getSafeNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return fallback;
};

const clampMin = (value: number, min: number) => {
  return value < min ? min : value;
};

const DEFAULT_COLORS = ['#facc15', '#38bdf8', '#34d399', '#f97316', '#a78bfa', '#f43f5e'];
const MAX_SPIRITS = 6;
const BOARD_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const toElementSummary = (elements: Record<string, number>) => {
  return Object.entries(elements)
    .filter(([, count]) => count > 0)
    .map(([name, count]) => `${name}:${count}`)
    .join(' ');
};

const getNextBoardId = (existingBoardIds: string[]) => {
  for (let i = 0; i < BOARD_LETTERS.length; i += 1) {
    const candidate = BOARD_LETTERS[i] ?? `P${i + 1}`;
    if (!existingBoardIds.includes(candidate)) {
      return candidate;
    }
  }

  return `P${existingBoardIds.length + 1}`;
};

const SpiritPanelPage: React.FC<SpiritPanelPageProps> = ({ docRef, mode = 'full' }) => {
  const [spiritStates, setSpiritStates] = useState<SpiritState[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [isAddingSpirit, setIsAddingSpirit] = useState(false);
  const [spiritToAddId, setSpiritToAddId] = useState(SPIRITS[0]?.id ?? '');

  const withGameMap = (mutator: (gameMap: Y.Map<unknown>) => void) => {
    const doc = docRef.current;
    if (!doc) return;
    doc.transact(() => {
      const gameMap = doc.getMap('game') as Y.Map<unknown>;
      mutator(gameMap);
    });
  };

  useEffect(() => {
    const doc = docRef.current;
    if (!doc) return;

    const syncFromDoc = () => {
      const gameMap = doc.getMap('game') as Y.Map<unknown>;
      const boards = gameMap.get('boards') as Y.Map<unknown> | undefined;
      if (!(boards instanceof Y.Map)) {
        setSpiritStates([]);
        return;
      }

      const nextStates: SpiritState[] = [];
      let index = 0;

      boards.forEach((boardData, boardId) => {
        if (!(boardData instanceof Y.Map)) {
          return;
        }

        let spiritState = boardData.get('spiritState') as Y.Map<unknown> | undefined;
        if (!(spiritState instanceof Y.Map)) {
          spiritState = new Y.Map<unknown>();
          boardData.set('spiritState', spiritState);
        }

        const fallbackSpiritId = SPIRITS[index]?.id ?? SPIRITS[0]?.id ?? '';
        const spiritIdRaw = spiritState.get('spiritId');
        const spiritId = typeof spiritIdRaw === 'string' && spiritIdRaw.length > 0 ? spiritIdRaw : fallbackSpiritId;

        if (spiritId && spiritIdRaw !== spiritId) {
          spiritState.set('spiritId', spiritId);
        }

        const energy = getSafeNumber(spiritState.get('energy'), 0);
        const presenceInSupply = clampMin(getSafeNumber(spiritState.get('presenceInSupply'), 13), 0);
        const presenceOnIsland = clampMin(getSafeNumber(spiritState.get('presenceOnIsland'), 0), 0);
        const presenceDestroyed = clampMin(getSafeNumber(spiritState.get('presenceDestroyed'), 0), 0);
        const presenceRemoved = clampMin(getSafeNumber(spiritState.get('presenceRemoved'), 0), 0);
        const presenceColorRaw = spiritState.get('presenceColor');
        const presenceColor = typeof presenceColorRaw === 'string' && presenceColorRaw.length > 0
          ? presenceColorRaw
          : DEFAULT_COLORS[index % DEFAULT_COLORS.length] ?? '#facc15';

        if (presenceColorRaw !== presenceColor) {
          spiritState.set('presenceColor', presenceColor);
        }

        if (getSafeNumber(spiritState.get('energy'), Number.NaN) !== energy) {
          spiritState.set('energy', energy);
        }
        if (getSafeNumber(spiritState.get('presenceInSupply'), Number.NaN) !== presenceInSupply) {
          spiritState.set('presenceInSupply', presenceInSupply);
        }
        if (getSafeNumber(spiritState.get('presenceOnIsland'), Number.NaN) !== presenceOnIsland) {
          spiritState.set('presenceOnIsland', presenceOnIsland);
        }
        if (getSafeNumber(spiritState.get('presenceDestroyed'), Number.NaN) !== presenceDestroyed) {
          spiritState.set('presenceDestroyed', presenceDestroyed);
        }
        if (getSafeNumber(spiritState.get('presenceRemoved'), Number.NaN) !== presenceRemoved) {
          spiritState.set('presenceRemoved', presenceRemoved);
        }

        nextStates.push({
          boardId,
          playerId: getSafeNumber(boardData.get('playerId'), 0),
          spiritId,
          energy,
          presenceInSupply,
          presenceOnIsland,
          presenceDestroyed,
          presenceRemoved,
          presenceColor,
        });

        index += 1;
      });

      setSpiritStates(nextStates);
      if (!selectedBoardId || !nextStates.some((state) => state.boardId === selectedBoardId)) {
        setSelectedBoardId(nextStates[0]?.boardId ?? null);
      }
    };

    syncFromDoc();
    doc.on('update', syncFromDoc);
    return () => doc.off('update', syncFromDoc);
  }, [docRef, selectedBoardId]);

  const selectedState = useMemo(() => {
    if (!selectedBoardId) return null;
    return spiritStates.find((state) => state.boardId === selectedBoardId) ?? null;
  }, [selectedBoardId, spiritStates]);

  const selectedSpirit = useMemo(() => {
    if (!selectedState) return null;
    return SPIRITS.find((spirit) => spirit.id === selectedState.spiritId) ?? null;
  }, [selectedState]);

  const selectedSpiritName = useMemo(() => {
    if (!selectedState) return 'this spirit';
    return SPIRITS.find((spirit) => spirit.id === selectedState.spiritId)?.name ?? 'this spirit';
  }, [selectedState]);

  const setSpiritField = (boardId: string, field: string, value: unknown) => {
    withGameMap((gameMap) => {
      const boards = gameMap.get('boards') as Y.Map<unknown> | undefined;
      const boardData = boards instanceof Y.Map ? (boards.get(boardId) as Y.Map<unknown> | undefined) : undefined;
      if (!(boardData instanceof Y.Map)) return;

      const spiritState = boardData.get('spiritState') as Y.Map<unknown> | undefined;
      if (!(spiritState instanceof Y.Map)) return;
      spiritState.set(field, value);
    });
  };

  const adjustEnergy = (boardId: string, delta: number) => {
    withGameMap((gameMap) => {
      const boards = gameMap.get('boards') as Y.Map<unknown> | undefined;
      const boardData = boards instanceof Y.Map ? (boards.get(boardId) as Y.Map<unknown> | undefined) : undefined;
      if (!(boardData instanceof Y.Map)) return;
      const spiritState = boardData.get('spiritState') as Y.Map<unknown> | undefined;
      if (!(spiritState instanceof Y.Map)) return;

      const next = clampMin(getSafeNumber(spiritState.get('energy'), 0) + delta, 0);
      spiritState.set('energy', next);
    });
  };

  const recalcPresence = (boardId: string, patch: Partial<Pick<SpiritState, 'presenceInSupply' | 'presenceOnIsland' | 'presenceDestroyed' | 'presenceRemoved'>>) => {
    withGameMap((gameMap) => {
      const boards = gameMap.get('boards') as Y.Map<unknown> | undefined;
      const boardData = boards instanceof Y.Map ? (boards.get(boardId) as Y.Map<unknown> | undefined) : undefined;
      if (!(boardData instanceof Y.Map)) return;
      const spiritState = boardData.get('spiritState') as Y.Map<unknown> | undefined;
      if (!(spiritState instanceof Y.Map)) return;

      const inSupply = clampMin(
        patch.presenceInSupply ?? getSafeNumber(spiritState.get('presenceInSupply'), 13),
        0
      );
      const onIsland = clampMin(
        patch.presenceOnIsland ?? getSafeNumber(spiritState.get('presenceOnIsland'), 0),
        0
      );
      const destroyed = clampMin(
        patch.presenceDestroyed ?? getSafeNumber(spiritState.get('presenceDestroyed'), 0),
        0
      );
      const removed = clampMin(
        patch.presenceRemoved ?? getSafeNumber(spiritState.get('presenceRemoved'), 0),
        0
      );

      spiritState.set('presenceInSupply', inSupply);
      spiritState.set('presenceOnIsland', onIsland);
      spiritState.set('presenceDestroyed', destroyed);
      spiritState.set('presenceRemoved', removed);
    });
  };

  const getNextAvailableSpiritId = () => {
    const usedSpiritIds = new Set(spiritStates.map((state) => state.spiritId));
    return SPIRITS.find((spirit) => !usedSpiritIds.has(spirit.id))?.id ?? SPIRITS[0]?.id ?? '';
  };

  const openAddSpiritScreen = () => {
    setSpiritToAddId(getNextAvailableSpiritId());
    setIsAddingSpirit(true);
  };

  const addSpiritBoard = (spiritIdToAdd: string) => {
    const nextBoardIdHolder: { value: string | null } = { value: null };

    withGameMap((gameMap) => {
      let boards = gameMap.get('boards') as Y.Map<unknown> | undefined;
      if (!(boards instanceof Y.Map)) {
        boards = new Y.Map<unknown>();
        gameMap.set('boards', boards);
      }

      const existingBoardIds: string[] = [];
      const usedSpiritIds = new Set<string>();
      let highestPlayerId = 0;

      boards.forEach((boardData, boardId) => {
        if (!(boardData instanceof Y.Map)) {
          return;
        }

        existingBoardIds.push(boardId);

        const playerIdRaw = boardData.get('playerId');
        if (typeof playerIdRaw === 'number' && Number.isFinite(playerIdRaw)) {
          highestPlayerId = Math.max(highestPlayerId, Math.floor(playerIdRaw));
        }

        const spiritState = boardData.get('spiritState');
        if (spiritState instanceof Y.Map) {
          const spiritId = spiritState.get('spiritId');
          if (typeof spiritId === 'string' && spiritId.length > 0) {
            usedSpiritIds.add(spiritId);
          }
        }
      });

      if (existingBoardIds.length >= MAX_SPIRITS) {
        return;
      }

      const nextBoardId = getNextBoardId(existingBoardIds);
      const nextSpirit =
        SPIRITS.find((spirit) => spirit.id === spiritIdToAdd) ??
        SPIRITS.find((spirit) => !usedSpiritIds.has(spirit.id)) ??
        SPIRITS[0];
      const newBoard = new Y.Map<unknown>();

      newBoard.set('boardId', nextBoardId);
      newBoard.set('playerId', highestPlayerId + 1);

      const boardIndex = existingBoardIds.length;
      newBoard.set('x', 120 + (boardIndex % 3) * 220);
      newBoard.set('y', 100 + Math.floor(boardIndex / 3) * 170);
      newBoard.set('rotation', 0);

      const lands = new Y.Map<unknown>();
      for (let i = 1; i <= 8; i += 1) {
        lands.set(String(i), new Y.Array<unknown>());
      }
      newBoard.set('lands', lands);

      const spiritState = new Y.Map<unknown>();
      spiritState.set('spiritId', nextSpirit?.id ?? '');
      spiritState.set('energy', 0);
      spiritState.set('presenceInSupply', 13);
      spiritState.set('presenceOnIsland', 0);
      spiritState.set('presenceDestroyed', 0);
      spiritState.set('presenceRemoved', 0);
      spiritState.set('presenceColor', DEFAULT_COLORS[boardIndex % DEFAULT_COLORS.length] ?? '#facc15');
      newBoard.set('spiritState', spiritState);

      boards.set(nextBoardId, newBoard);

      const nextSpiritCount = existingBoardIds.length + 1;
      gameMap.set('spiritCount', nextSpiritCount);
      gameMap.set('playerCount', nextSpiritCount);
      gameMap.set('fearThreshold', nextSpiritCount * 4);

      nextBoardIdHolder.value = nextBoardId;
    });

    if (nextBoardIdHolder.value) {
      setSelectedBoardId(nextBoardIdHolder.value);
      return true;
    }

    return false;
  };

  const confirmAddSpirit = () => {
    if (!spiritToAddId) {
      return;
    }

    const added = addSpiritBoard(spiritToAddId);
    if (added) {
      setIsAddingSpirit(false);
    }
  };

  const removeSpiritBoard = (boardId: string) => {
    const confirmed = window.confirm(`Remove ${selectedSpiritName}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    const nextSelectedBoardIdHolder: { value: string | null } = { value: null };

    withGameMap((gameMap) => {
      const boards = gameMap.get('boards') as Y.Map<unknown> | undefined;
      if (!(boards instanceof Y.Map) || !boards.has(boardId)) {
        return;
      }

      boards.delete(boardId);

      const remainingBoardIds: string[] = [];
      boards.forEach((_boardData, remainingBoardId) => {
        remainingBoardIds.push(remainingBoardId);
      });

      const nextSpiritCount = Math.max(1, remainingBoardIds.length);
      gameMap.set('spiritCount', nextSpiritCount);
      gameMap.set('playerCount', nextSpiritCount);
      gameMap.set('fearThreshold', nextSpiritCount * 4);

      nextSelectedBoardIdHolder.value = remainingBoardIds[0] ?? null;
    });

    setSelectedBoardId(nextSelectedBoardIdHolder.value);
  };

  if (isAddingSpirit) {
    const availableSpiritIds = new Set(spiritStates.map((state) => state.spiritId));

    return (
      <section className="rounded-xl bg-white p-6 shadow">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Add Spirit</h2>
            <p className="text-sm text-slate-500">Choose a spirit to add. You cannot change this later without removing the spirit.</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">Spirit to add</label>
          <select
            className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
            value={spiritToAddId}
            onChange={(event) => setSpiritToAddId(event.target.value)}
          >
            {SPIRITS.map((spirit) => (
              <option key={spirit.id} value={spirit.id}>
                {spirit.name}{availableSpiritIds.has(spirit.id) ? ' (already in game)' : ''}
              </option>
            ))}
          </select>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setIsAddingSpirit(false)}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmAddSpirit}
              disabled={spiritStates.length >= MAX_SPIRITS || !spiritToAddId}
              className={`rounded border px-3 py-1.5 text-sm font-semibold ${
                spiritStates.length >= MAX_SPIRITS || !spiritToAddId
                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              Add Selected Spirit
            </button>
          </div>
        </div>
      </section>
    );
  };

  if (spiritStates.length === 0) {
    return (
      <section className="rounded-xl bg-white p-6 shadow">
        <div className="flex items-center justify-between gap-3">
          {mode === 'manage' ? <h2 className="text-xl font-semibold text-slate-900">Manage Spirits</h2> : <div />}
          <button
            type="button"
            onClick={openAddSpiritScreen}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Add Spirit
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-500">No spirit boards are initialized in this game yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between gap-4">
        {mode === 'manage' ? (
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Manage Spirits</h2>
            <p className="text-sm text-slate-500">
              Use this page to add and remove spirits. Detailed spirit panel information lives on the Board tab.
            </p>
          </div>
        ) : <div />}
        <button
          type="button"
          onClick={openAddSpiritScreen}
          disabled={spiritStates.length >= MAX_SPIRITS}
          className={`rounded border px-3 py-1.5 text-sm font-semibold ${
            spiritStates.length >= MAX_SPIRITS
              ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          Add Spirit ({spiritStates.length}/{MAX_SPIRITS})
        </button>
      </div>

      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
        {spiritStates.map((state) => {
          const spirit = SPIRITS.find((item) => item.id === state.spiritId);
          return (
            <button
              key={state.boardId}
              type="button"
              onClick={() => setSelectedBoardId(state.boardId)}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                selectedBoardId === state.boardId ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-white'
              }`}
            >
              {spirit?.name ?? `Spirit ${state.boardId}`}
            </button>
          );
        })}
      </div>

      {mode === 'manage' ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          {selectedState ? (
            <div>
              <p className="text-sm font-semibold text-slate-900">{selectedSpirit?.name ?? selectedState.spiritId}</p>
              <p className="mt-1 text-xs text-slate-500">
                Board {selectedState.boardId} (Player {selectedState.playerId})
              </p>
              <p className="mt-2 text-xs text-slate-500">Spirit choice is locked after add. Remove and re-add to change.</p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => removeSpiritBoard(selectedState.boardId)}
                  className="rounded border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Remove Spirit
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === 'full' && selectedState ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="rounded border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900">
                {selectedSpirit?.name ?? selectedState.spiritId}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Presence color</span>
                <input
                  type="color"
                  value={selectedState.presenceColor}
                  onChange={(event) => setSpiritField(selectedState.boardId, 'presenceColor', event.target.value)}
                  className="h-8 w-12 cursor-pointer rounded border border-slate-300 bg-white"
                />
                <span className="text-xs text-slate-500">Board {selectedState.boardId} (Player {selectedState.playerId})</span>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => removeSpiritBoard(selectedState.boardId)}
                  className="rounded border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Remove Spirit
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Unique Powers</h3>
              <div className="mt-3 space-y-2">
                {(selectedSpirit?.uniquePowers ?? []).map((power) => (
                  <div key={power.id} className="rounded border border-slate-200 bg-white px-3 py-2">
                    <p className="text-sm font-semibold text-slate-900">{power.name}</p>
                    <p className="text-xs text-slate-600">
                      Cost {power.cost} · {power.speed.toUpperCase()} · {toElementSummary(power.elements)}
                    </p>
                    {power.thresholds.length > 0 ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Thresholds: {power.thresholds.map((item) => toElementSummary(item.elements)).join(' | ')}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Energy</h3>
              <p className="mt-1 text-3xl font-bold text-slate-900">{selectedState.energy}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => adjustEnergy(selectedState.boardId, -1)}
                  className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Spend 1
                </button>
                <button
                  type="button"
                  onClick={() => adjustEnergy(selectedState.boardId, 1)}
                  className="rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  Gain 1
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Presence Pools</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded border border-slate-200 bg-white px-3 py-2">
                  <p className="text-xs text-slate-500">In Supply</p>
                  <p className="font-semibold">{selectedState.presenceInSupply}</p>
                </div>
                <div className="rounded border border-slate-200 bg-white px-3 py-2">
                  <p className="text-xs text-slate-500">On Island</p>
                  <p className="font-semibold">{selectedState.presenceOnIsland}</p>
                </div>
                <div className="rounded border border-slate-200 bg-white px-3 py-2">
                  <p className="text-xs text-slate-500">Destroyed</p>
                  <p className="font-semibold">{selectedState.presenceDestroyed}</p>
                </div>
                <div className="rounded border border-slate-200 bg-white px-3 py-2">
                  <p className="text-xs text-slate-500">Removed</p>
                  <p className="font-semibold">{selectedState.presenceRemoved}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => recalcPresence(selectedState.boardId, {
                    presenceInSupply: selectedState.presenceInSupply - 1,
                    presenceOnIsland: selectedState.presenceOnIsland + 1,
                  })}
                  className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Place Presence
                </button>
                <button
                  type="button"
                  onClick={() => recalcPresence(selectedState.boardId, {
                    presenceOnIsland: selectedState.presenceOnIsland - 1,
                    presenceDestroyed: selectedState.presenceDestroyed + 1,
                  })}
                  className="rounded border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                >
                  Mark Destroyed
                </button>
                <button
                  type="button"
                  onClick={() => recalcPresence(selectedState.boardId, {
                    presenceDestroyed: selectedState.presenceDestroyed - 1,
                    presenceInSupply: selectedState.presenceInSupply + 1,
                  })}
                  className="rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  Return Destroyed
                </button>
                <button
                  type="button"
                  onClick={() => recalcPresence(selectedState.boardId, {
                    presenceDestroyed: selectedState.presenceDestroyed - 1,
                    presenceRemoved: selectedState.presenceRemoved + 1,
                  })}
                  className="rounded border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Remove from Game
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Total tracked presence: {selectedState.presenceInSupply + selectedState.presenceOnIsland + selectedState.presenceDestroyed + selectedState.presenceRemoved} / 13
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default SpiritPanelPage;
