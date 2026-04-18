import { useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import { SPIRITS } from '../data/spirits';
import { MAJOR_POWER_CARDS } from '../data/majorPowerCards';
import { MINOR_POWER_CARDS } from '../data/minorPowerCards';
import { ELEMENT_ORDER, type ElementCounts, type ElementName, type PowerCardDefinition } from '../data/deckCard';

type PresenceEffect =
  | { kind: 'set-energy-base'; value: number }
  | { kind: 'add-energy'; value: number }
  | { kind: 'set-card-plays-base'; value: number }
  | { kind: 'add-card-plays'; value: number }
  | { kind: 'add-element'; element: ElementName; value: number };

type Slot = { x: number; y: number; reward?: string; effects: PresenceEffect[] };

type SpiritLayout = { slots: Slot[]; baseEnergyGain: number; baseCardPlays: number; baseElements: ElementCounts };

type ForgottenPowerCard = {
  id: string;
  name: string;
  faceUrl: string;
  backUrl: string;
  kind: 'minor' | 'major' | 'unique';
  sourceBoardId?: string;
};

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';
const LAYOUT_MODEL_SIZE = 440;
const TOTAL_PRESENCE_SLOTS = 13;
const SPIRIT_SECTION_MIN_PERCENT = 30;
const SPIRIT_SECTION_MAX_PERCENT = 70;
const SPIRIT_SECTION_RESIZER_THICKNESS = 8;

type SpiritState = {
  spiritSlotId: string;
  spiritId: string;
  energy: number;
  turn: number;
  round: number;
  gainMarkedTurn: number;
  gainMarkedRound: number;
  paidMarkedTurn: number;
  paidMarkedRound: number;
  paidAmount: number;
  presenceInSupply: number;
  presenceSupplySlotIndices: number[];
  presenceOnIsland: number;
  presenceDestroyed: number;
  presenceRemoved: number;
  presenceColor: string;
  cardsInPlay: string[];
  cardsInHand: string[];
  cardsInDiscard: string[];
  draftSize: number;
  draftPicks: number;
  pendingDraftType: 'minor' | 'major' | null;
  pendingDraftCardIds: string[];
  pendingDraftPicksRemaining: number;
  ready: boolean;
};

type SpiritPanelPageProps = {
  docRef: React.MutableRefObject<Y.Doc | null>;
  mode?: 'full' | 'manage';
  onToggleSpiritPanelHeight?: () => void;
  spiritPanelExpanded?: boolean;
  resizeModeEnabled?: boolean;
  onSelectedSpiritChange?: (spiritSlotId: string | null) => void;
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

const POWER_CARD_COSTS = new Map<string, number>([
  ...MAJOR_POWER_CARDS.map((card) => [card.id, card.cost] as const),
  ...MINOR_POWER_CARDS.map((card) => [card.id, card.cost] as const),
  ...SPIRITS.flatMap((spirit) => spirit.uniquePowers.map((card) => [card.id, card.cost] as const)),
]);

const MIN_DRAFT_SIZE = 1;
const MAX_DRAFT_SIZE = 8;
const MIN_DRAFT_PICKS = 1;
const MAX_DRAFT_PICKS = 4;

const parsePresenceSupplySlotIndices = (raw: unknown, fallbackSupplyCount: number): number[] => {
  const toDefault = (count: number) =>
    Array.from({ length: Math.max(0, Math.min(TOTAL_PRESENCE_SLOTS, count)) }, (_, index) => index);

  if (!Array.isArray(raw)) {
    return toDefault(fallbackSupplyCount);
  }

  const cleaned = raw
    .map((entry) => (typeof entry === 'number' && Number.isFinite(entry) ? Math.floor(entry) : Number.NaN))
    .filter((index) => index >= 0 && index < TOTAL_PRESENCE_SLOTS);

  const unique = [...new Set(cleaned)];
  if (unique.length === 0 && fallbackSupplyCount > 0) {
    return toDefault(fallbackSupplyCount);
  }

  return unique;
};

const FORGETTABLE_POWER_CARD_BY_ID = new Map<string, ForgottenPowerCard>([
  ...MAJOR_POWER_CARDS.map((card) => [
    card.id,
    {
      id: card.id,
      name: card.name,
      faceUrl: card.faceUrl,
      backUrl: card.backUrl,
      kind: 'major' as const,
    },
  ] as const),
  ...MINOR_POWER_CARDS.map((card) => [
    card.id,
    {
      id: card.id,
      name: card.name,
      faceUrl: card.faceUrl,
      backUrl: card.backUrl,
      kind: 'minor' as const,
    },
  ] as const),
  ...SPIRITS.flatMap((spirit) =>
    spirit.uniquePowers.map((card) => [
      card.id,
      {
        id: card.id,
        name: card.name,
        faceUrl: card.faceUrl,
        backUrl: card.backUrl,
        kind: 'unique' as const,
      },
    ] as const)
  ),
]);

const MINOR_POWER_CARD_BY_ID = new Map(MINOR_POWER_CARDS.map((card) => [card.id, card] as const));
const MAJOR_POWER_CARD_BY_ID = new Map(MAJOR_POWER_CARDS.map((card) => [card.id, card] as const));

const parseStringArray = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item) => typeof item === 'string');
};

const shuffleArray = <T,>(arr: T[]): T[] => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};


const parseForgottenPowerCardList = (value: unknown): ForgottenPowerCard[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry) => {
    if (!entry || typeof entry !== 'object') {
      return false;
    }
    const card = entry as Partial<ForgottenPowerCard>;
    return (
      typeof card.id === 'string' &&
      typeof card.name === 'string' &&
      typeof card.faceUrl === 'string' &&
      typeof card.backUrl === 'string' &&
      (card.sourceBoardId === undefined || typeof card.sourceBoardId === 'string') &&
      (card.kind === 'minor' || card.kind === 'major' || card.kind === 'unique')
    );
  }) as ForgottenPowerCard[];
};

const SPIRIT_SLOT_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const getNextSpiritSlotId = (existingIds: string[]): string => {
  for (let i = 0; i < SPIRIT_SLOT_LETTERS.length; i++) {
    const candidate = SPIRIT_SLOT_LETTERS[i] ?? `S${i + 1}`;
    if (!existingIds.includes(candidate)) return candidate;
  }
  return `S${existingIds.length + 1}`;
};

const SpiritPanelPage: React.FC<SpiritPanelPageProps> = ({
  docRef,
  mode = 'full',
  onToggleSpiritPanelHeight,
  spiritPanelExpanded = false,
  resizeModeEnabled = false,
  onSelectedSpiritChange,
}) => {
  const [spiritStates, setSpiritStates] = useState<SpiritState[]>([]);
  const [emptySlotIds, setEmptySlotIds] = useState<string[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const selectSpirit = (spiritSlotId: string | null) => {
    setSelectedSlotId(spiritSlotId);
    onSelectedSpiritChange?.(spiritSlotId);
  };
  const [isAddingSpirit, setIsAddingSpirit] = useState(false);
  const [spiritToAddId, setSpiritToAddId] = useState(SPIRITS[0]?.id ?? '');
  const [layoutsBySpirit, setLayoutsBySpirit] = useState<Record<string, SpiritLayout>>({});
  const [panelAspectRatios, setPanelAspectRatios] = useState<Record<string, number>>({});
  const lastTurnKeyRef = useRef<string | null>(null);
  const lastStateKeyRef = useRef<string | null>(null);

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
      const turn = clampMin(getSafeNumber(gameMap.get('turn'), 1), 1);
      const round = clampMin(getSafeNumber(gameMap.get('round'), turn), 1);
      const currentPhaseRaw = gameMap.get('currentPhase');
      const currentPhase = typeof currentPhaseRaw === 'string' ? currentPhaseRaw : 'growth';
      const turnKey = `${turn}:${round}`;
      const stateKey = `${turn}:${round}:${currentPhase}`;

      const resetSpirits = (resetAll: boolean) => {
        const spirits = gameMap.get('spirits') as Y.Map<unknown> | undefined;
        if (!(spirits instanceof Y.Map)) return;
        spirits.forEach((spiritData) => {
          if (!(spiritData instanceof Y.Map)) return;
          if (resetAll) {
            spiritData.set('gainMarkedTurn', 0);
            spiritData.set('gainMarkedRound', 0);
            spiritData.set('paidMarkedTurn', 0);
            spiritData.set('paidMarkedRound', 0);
            spiritData.set('paidAmount', 0);
          }
          spiritData.set('ready', false);
        });
      };

      if (lastTurnKeyRef.current !== null && lastTurnKeyRef.current !== turnKey) {
        doc.transact(() => resetSpirits(true));
        lastTurnKeyRef.current = turnKey;
        lastStateKeyRef.current = stateKey;
        return;
      }

      if (lastStateKeyRef.current !== null && lastStateKeyRef.current !== stateKey) {
        doc.transact(() => resetSpirits(false));
        lastStateKeyRef.current = stateKey;
        return;
      }

      lastTurnKeyRef.current = turnKey;
      lastStateKeyRef.current = stateKey;

      const spirits = gameMap.get('spirits') as Y.Map<unknown> | undefined;
      if (!(spirits instanceof Y.Map)) {
        setSpiritStates([]);
        return;
      }

      const nextStates: SpiritState[] = [];
      const nextEmptySlotIds: string[] = [];
      let index = 0;

      spirits.forEach((spiritData, spiritSlotId) => {
        if (!(spiritData instanceof Y.Map)) {
          nextEmptySlotIds.push(spiritSlotId);
          return;
        }

        const spiritIdRaw = spiritData.get('spiritId');
        const spiritId = typeof spiritIdRaw === 'string' && spiritIdRaw.length > 0 ? spiritIdRaw : null;

        if (!spiritId) {
          nextEmptySlotIds.push(spiritSlotId);
          return;
        }

        const energy = getSafeNumber(spiritData.get('energy'), 0);
        const gainMarkedTurn = clampMin(getSafeNumber(spiritData.get('gainMarkedTurn'), 0), 0);
        const gainMarkedRound = clampMin(getSafeNumber(spiritData.get('gainMarkedRound'), 0), 0);
        const paidMarkedTurn = clampMin(getSafeNumber(spiritData.get('paidMarkedTurn'), 0), 0);
        const paidMarkedRound = clampMin(getSafeNumber(spiritData.get('paidMarkedRound'), 0), 0);
        const paidAmount = getSafeNumber(spiritData.get('paidAmount'), 0);
        const legacyPresenceInSupply = clampMin(getSafeNumber(spiritData.get('presenceInSupply'), TOTAL_PRESENCE_SLOTS), 0);
        const presenceSupplySlotIndices = parsePresenceSupplySlotIndices(
          spiritData.get('presenceSupplySlotIndices'),
          legacyPresenceInSupply
        );
        const presenceInSupply = presenceSupplySlotIndices.length;
        const presenceOnIsland = clampMin(getSafeNumber(spiritData.get('presenceOnIsland'), 0), 0);
        const presenceDestroyed = clampMin(getSafeNumber(spiritData.get('presenceDestroyed'), 0), 0);
        const presenceRemoved = clampMin(getSafeNumber(spiritData.get('presenceRemoved'), 0), 0);
        const presenceColorRaw = spiritData.get('presenceColor');
        const presenceColor = typeof presenceColorRaw === 'string' && presenceColorRaw.length > 0
          ? presenceColorRaw
          : DEFAULT_COLORS[index % DEFAULT_COLORS.length] ?? '#facc15';

        if (presenceColorRaw !== presenceColor) {
          spiritData.set('presenceColor', presenceColor);
        }

        if (getSafeNumber(spiritData.get('energy'), Number.NaN) !== energy) {
          spiritData.set('energy', energy);
        }
        if (getSafeNumber(spiritData.get('gainMarkedTurn'), Number.NaN) !== gainMarkedTurn) {
          spiritData.set('gainMarkedTurn', gainMarkedTurn);
        }
        if (getSafeNumber(spiritData.get('gainMarkedRound'), Number.NaN) !== gainMarkedRound) {
          spiritData.set('gainMarkedRound', gainMarkedRound);
        }
        if (getSafeNumber(spiritData.get('paidMarkedTurn'), Number.NaN) !== paidMarkedTurn) {
          spiritData.set('paidMarkedTurn', paidMarkedTurn);
        }
        if (getSafeNumber(spiritData.get('paidMarkedRound'), Number.NaN) !== paidMarkedRound) {
          spiritData.set('paidMarkedRound', paidMarkedRound);
        }
        if (getSafeNumber(spiritData.get('paidAmount'), Number.NaN) !== paidAmount) {
          spiritData.set('paidAmount', paidAmount);
        }
        const rawPresenceSupplySlotIndices = spiritData.get('presenceSupplySlotIndices');
        const rawPresenceSupplyMatches = Array.isArray(rawPresenceSupplySlotIndices)
          && rawPresenceSupplySlotIndices.length === presenceSupplySlotIndices.length
          && rawPresenceSupplySlotIndices.every((entry, entryIndex) => entry === presenceSupplySlotIndices[entryIndex]);
        if (!rawPresenceSupplyMatches) {
          spiritData.set('presenceSupplySlotIndices', presenceSupplySlotIndices);
        }
        if (getSafeNumber(spiritData.get('presenceInSupply'), Number.NaN) !== presenceInSupply) {
          spiritData.set('presenceInSupply', presenceInSupply);
        }
        if (getSafeNumber(spiritData.get('presenceOnIsland'), Number.NaN) !== presenceOnIsland) {
          spiritData.set('presenceOnIsland', presenceOnIsland);
        }
        if (getSafeNumber(spiritData.get('presenceDestroyed'), Number.NaN) !== presenceDestroyed) {
          spiritData.set('presenceDestroyed', presenceDestroyed);
        }
        if (getSafeNumber(spiritData.get('presenceRemoved'), Number.NaN) !== presenceRemoved) {
          spiritData.set('presenceRemoved', presenceRemoved);
        }

        const parseStringArray = (raw: unknown): string[] => {
          if (!Array.isArray(raw)) return [];
          return raw.filter((item) => typeof item === 'string');
        };

        const cardsInPlay = parseStringArray(spiritData.get('cardsInPlay'));
        const cardsInHand = parseStringArray(spiritData.get('cardsInHand'));
        const cardsInDiscard = parseStringArray(spiritData.get('cardsInDiscard'));
        const draftSize = Math.min(
          MAX_DRAFT_SIZE,
          Math.max(MIN_DRAFT_SIZE, Math.floor(getSafeNumber(spiritData.get('draftSize'), 4)))
        );
        const draftPicks = Math.min(
          MAX_DRAFT_PICKS,
          Math.max(MIN_DRAFT_PICKS, Math.floor(getSafeNumber(spiritData.get('draftPicks'), 1)))
        );
        const pendingDraftTypeRaw = spiritData.get('pendingDraftType');
        const pendingDraftType =
          pendingDraftTypeRaw === 'minor' || pendingDraftTypeRaw === 'major' ? pendingDraftTypeRaw : null;
        const pendingDraftCardIds = parseStringArray(spiritData.get('pendingDraftCardIds'));
        const pendingDraftPicksRemaining = Math.max(
          0,
          Math.floor(getSafeNumber(spiritData.get('pendingDraftPicksRemaining'), 0))
        );

        if (getSafeNumber(spiritData.get('draftSize'), Number.NaN) !== draftSize) {
          spiritData.set('draftSize', draftSize);
        }
        if (getSafeNumber(spiritData.get('draftPicks'), Number.NaN) !== draftPicks) {
          spiritData.set('draftPicks', draftPicks);
        }
        if (spiritData.get('pendingDraftType') !== pendingDraftType) {
          spiritData.set('pendingDraftType', pendingDraftType);
        }
        if (!Array.isArray(spiritData.get('pendingDraftCardIds'))) {
          spiritData.set('pendingDraftCardIds', pendingDraftCardIds);
        }
        if (getSafeNumber(spiritData.get('pendingDraftPicksRemaining'), Number.NaN) !== pendingDraftPicksRemaining) {
          spiritData.set('pendingDraftPicksRemaining', pendingDraftPicksRemaining);
        }

        const ready = spiritData.get('ready') === true;

        nextStates.push({
          spiritSlotId,
          spiritId: spiritId as string,
          energy,
          turn,
          round,
          gainMarkedTurn,
          gainMarkedRound,
          paidMarkedTurn,
          paidMarkedRound,
          paidAmount,
          presenceInSupply,
          presenceSupplySlotIndices,
          presenceOnIsland,
          presenceDestroyed,
          presenceRemoved,
          presenceColor,
          cardsInPlay,
          cardsInHand,
          cardsInDiscard,
          draftSize,
          draftPicks,
          pendingDraftType,
          pendingDraftCardIds,
          pendingDraftPicksRemaining,
          ready,
        });

        index += 1;
      });

      setSpiritStates(nextStates);
      setEmptySlotIds(nextEmptySlotIds);

    };

    syncFromDoc();
    doc.on('update', syncFromDoc);
    return () => doc.off('update', syncFromDoc);
  }, [docRef]);

  // Keep selection valid: if the selected slot disappears, fall back to the first slot
  useEffect(() => {
    if (!selectedSlotId || !spiritStates.some((s) => s.spiritSlotId === selectedSlotId)) {
      selectSpirit(spiritStates[0]?.spiritSlotId ?? null);
    }
  }, [spiritStates, selectedSlotId]);

  // Fetch presence layouts from backend when selected spirit changes
  const selectedSpiritIdForLayout = useMemo(() => {
    if (!selectedSlotId) return null;
    const state = spiritStates.find((s) => s.spiritSlotId === selectedSlotId);
    return state?.spiritId ?? null;
  }, [selectedSlotId, spiritStates]);

  const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  }), [authToken]);

  useEffect(() => {
    if (!selectedSpiritIdForLayout) return;
    if (layoutsBySpirit[selectedSpiritIdForLayout]) return; // already loaded

    const fetchLayout = async () => {
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/spirits/${encodeURIComponent(selectedSpiritIdForLayout)}/layout`,
          { headers: authHeaders }
        );
        if (!response.ok) return;
        const data = await response.json();
        const rawSlots: unknown[] = Array.isArray(data?.layout?.slots) ? data.layout.slots : [];
        const slots: Slot[] = rawSlots.map((s) => {
          const slot = s as { x: number; y: number; reward?: string; effects?: unknown[] };
          const effects: PresenceEffect[] = Array.isArray(slot.effects)
            ? (slot.effects.filter((e): e is PresenceEffect => {
                if (!e || typeof e !== 'object') return false;
                const ef = e as { kind?: string };
                return (
                  ef.kind === 'set-energy-base' || ef.kind === 'add-energy' ||
                  ef.kind === 'set-card-plays-base' || ef.kind === 'add-card-plays' ||
                  ef.kind === 'add-element'
                );
              }))
            : [];
          return { x: slot.x, y: slot.y, reward: slot.reward, effects };
        });
        if (slots.length > 0) {
          const baseEnergyGain: number = typeof data?.layout?.baseEnergyGain === 'number' ? data.layout.baseEnergyGain : 0;
          const baseCardPlays: number = typeof data?.layout?.baseCardPlays === 'number' ? data.layout.baseCardPlays : 1;
          const rawBase = data?.layout?.baseElements;
          const baseElements: ElementCounts = (rawBase && typeof rawBase === 'object')
            ? { ...EMPTY_ELEMENT_COUNTS, ...(rawBase as Partial<ElementCounts>) }
            : { ...EMPTY_ELEMENT_COUNTS };
          setLayoutsBySpirit((prev) => ({ ...prev, [selectedSpiritIdForLayout]: { slots, baseEnergyGain, baseCardPlays, baseElements } }));
        }
      } catch {
        // Ignore layout fetch errors; fall back to default positions
      }
    };

    void fetchLayout();
  }, [selectedSpiritIdForLayout, authHeaders, layoutsBySpirit]);

  const panelContainerRef = useRef<HTMLDivElement | null>(null);

  const selectedState = useMemo(() => {
    if (!selectedSlotId) return null;
    return spiritStates.find((state) => state.spiritSlotId === selectedSlotId) ?? null;
  }, [selectedSlotId, spiritStates]);

  const selectedSpirit = useMemo(() => {
    if (!selectedState) return null;
    return SPIRITS.find((spirit) => spirit.id === selectedState.spiritId) ?? null;
  }, [selectedState]);

  const selectedSpiritName = useMemo(() => {
    if (!selectedState) return 'this spirit';
    return SPIRITS.find((spirit) => spirit.id === selectedState.spiritId)?.name ?? 'this spirit';
  }, [selectedState]);

  const setSpiritField = (spiritSlotId: string, field: string, value: unknown) => {
    withGameMap((gameMap) => {
      const spirits = gameMap.get('spirits') as Y.Map<unknown> | undefined;
      const spiritData = spirits instanceof Y.Map ? (spirits.get(spiritSlotId) as Y.Map<unknown> | undefined) : undefined;
      if (!(spiritData instanceof Y.Map)) return;
      spiritData.set(field, value);
    });
  };

  const adjustEnergy = (spiritSlotId: string, delta: number) => {
    withGameMap((gameMap) => {
      const spirits = gameMap.get('spirits') as Y.Map<unknown> | undefined;
      const spiritData = spirits instanceof Y.Map ? (spirits.get(spiritSlotId) as Y.Map<unknown> | undefined) : undefined;
      if (!(spiritData instanceof Y.Map)) return;

      const next = getSafeNumber(spiritData.get('energy'), 0) + delta;
      spiritData.set('energy', next);
    });
  };

  const payCardsInPlay = (spiritSlotId: string) => {
    withGameMap((gameMap) => {
      const spirits = gameMap.get('spirits') as Y.Map<unknown> | undefined;
      const spiritData = spirits instanceof Y.Map ? (spirits.get(spiritSlotId) as Y.Map<unknown> | undefined) : undefined;
      if (!(spiritData instanceof Y.Map)) return;

      const turn = clampMin(getSafeNumber(gameMap.get('turn'), 1), 1);
      const round = clampMin(getSafeNumber(gameMap.get('round'), turn), 1);
      const paidMarkedTurn = clampMin(getSafeNumber(spiritData.get('paidMarkedTurn'), 0), 0);
      const paidMarkedRound = clampMin(getSafeNumber(spiritData.get('paidMarkedRound'), 0), 0);
      const paidAmount = getSafeNumber(spiritData.get('paidAmount'), 0);

      if (paidMarkedTurn === turn && paidMarkedRound === round) {
        spiritData.set('energy', getSafeNumber(spiritData.get('energy'), 0) + paidAmount);
        spiritData.set('paidMarkedTurn', 0);
        spiritData.set('paidMarkedRound', 0);
        spiritData.set('paidAmount', 0);
        return;
      }

      const cardsInPlayRaw = spiritData.get('cardsInPlay');
      const cardsInPlay = Array.isArray(cardsInPlayRaw)
        ? cardsInPlayRaw.filter((item): item is string => typeof item === 'string')
        : [];
      const totalCost = cardsInPlay.reduce((sum, cardId) => sum + (POWER_CARD_COSTS.get(cardId) ?? 0), 0);
      const energy = getSafeNumber(spiritData.get('energy'), 0);

      spiritData.set('energy', energy - totalCost);
      spiritData.set('paidMarkedTurn', turn);
      spiritData.set('paidMarkedRound', round);
      spiritData.set('paidAmount', totalCost);
    });
  };

  const recalcPresence = (spiritSlotId: string, patch: Partial<Pick<SpiritState, 'presenceInSupply' | 'presenceOnIsland' | 'presenceDestroyed' | 'presenceRemoved'>>) => {
    withGameMap((gameMap) => {
      const spirits = gameMap.get('spirits') as Y.Map<unknown> | undefined;
      const spiritData = spirits instanceof Y.Map ? (spirits.get(spiritSlotId) as Y.Map<unknown> | undefined) : undefined;
      if (!(spiritData instanceof Y.Map)) return;

      const legacyInSupply = clampMin(getSafeNumber(spiritData.get('presenceInSupply'), TOTAL_PRESENCE_SLOTS), 0);
      const currentSupplySlots = parsePresenceSupplySlotIndices(spiritData.get('presenceSupplySlotIndices'), legacyInSupply);
      const requestedInSupply = clampMin(
        patch.presenceInSupply ?? currentSupplySlots.length,
        0
      );
      const inSupply = Math.min(TOTAL_PRESENCE_SLOTS, requestedInSupply);
      const onIsland = clampMin(
        patch.presenceOnIsland ?? getSafeNumber(spiritData.get('presenceOnIsland'), 0),
        0
      );
      const destroyed = clampMin(
        patch.presenceDestroyed ?? getSafeNumber(spiritData.get('presenceDestroyed'), 0),
        0
      );
      const removed = clampMin(
        patch.presenceRemoved ?? getSafeNumber(spiritData.get('presenceRemoved'), 0),
        0
      );

      let nextSupplySlots = [...currentSupplySlots];
      if (inSupply < nextSupplySlots.length) {
        nextSupplySlots = nextSupplySlots.slice(0, inSupply);
      } else if (inSupply > nextSupplySlots.length) {
        const existing = new Set(nextSupplySlots);
        for (let slotIndex = 0; slotIndex < TOTAL_PRESENCE_SLOTS && nextSupplySlots.length < inSupply; slotIndex += 1) {
          if (!existing.has(slotIndex)) {
            nextSupplySlots.push(slotIndex);
            existing.add(slotIndex);
          }
        }
      }

      spiritData.set('presenceSupplySlotIndices', nextSupplySlots);
      spiritData.set('presenceInSupply', nextSupplySlots.length);
      spiritData.set('presenceOnIsland', onIsland);
      spiritData.set('presenceDestroyed', destroyed);
      spiritData.set('presenceRemoved', removed);
    });
  };

  const setCardZone = (spiritSlotId: string, zone: 'cardsInPlay' | 'cardsInHand' | 'cardsInDiscard', cards: string[]) => {
    withGameMap((gameMap) => {
      const spirits = gameMap.get('spirits') as Y.Map<unknown> | undefined;
      const spiritData = spirits instanceof Y.Map ? (spirits.get(spiritSlotId) as Y.Map<unknown> | undefined) : undefined;
      if (!(spiritData instanceof Y.Map)) return;
      spiritData.set(zone, cards);
    });
  };

  const drawFromSharedPile = (gameMap: Y.Map<unknown>, kind: 'minor' | 'major', count: number): string[] => {
    const drawKey = kind === 'minor' ? 'minorPowerDrawPile' : 'majorPowerDrawPile';
    const discardKey = kind === 'minor' ? 'minorPowerDiscardPile' : 'majorPowerDiscardPile';

    let drawPile = parseStringArray(gameMap.get(drawKey));
    let discardPile = parseStringArray(gameMap.get(discardKey));

    if (!Array.isArray(gameMap.get(drawKey))) {
      const allIds = (kind === 'minor' ? MINOR_POWER_CARDS : MAJOR_POWER_CARDS).map((c) => c.id);
      const owned = new Set<string>();
      const spirits = gameMap.get('spirits');
      if (spirits instanceof Y.Map) {
        spirits.forEach((sd: unknown) => {
          if (!(sd instanceof Y.Map)) return;
          for (const zone of ['cardsInPlay', 'cardsInHand', 'cardsInDiscard'] as const) {
            parseStringArray(sd.get(zone)).forEach((id) => owned.add(id));
          }
        });
      }
      drawPile = shuffleArray(allIds.filter((id) => !owned.has(id)));
      discardPile = [];
    }

    if (drawPile.length < count && discardPile.length > 0) {
      drawPile = shuffleArray([...drawPile, ...discardPile]);
      discardPile = [];
    }

    const drawn = drawPile.slice(0, Math.max(0, count));
    gameMap.set(drawKey, drawPile.slice(drawn.length));
    gameMap.set(discardKey, discardPile);
    return drawn;
  };

  const startPowerDraft = (spiritSlotId: string, kind: 'minor' | 'major') => {
    withGameMap((gameMap) => {
      const spirits = gameMap.get('spirits') as Y.Map<unknown> | undefined;
      const spiritData = spirits instanceof Y.Map ? (spirits.get(spiritSlotId) as Y.Map<unknown> | undefined) : undefined;
      if (!(spiritData instanceof Y.Map)) return;

      const draftSize = Math.min(
        MAX_DRAFT_SIZE,
        Math.max(MIN_DRAFT_SIZE, Math.floor(getSafeNumber(spiritData.get('draftSize'), 4)))
      );
      const draftPicks = Math.min(
        MAX_DRAFT_PICKS,
        Math.max(MIN_DRAFT_PICKS, Math.floor(getSafeNumber(spiritData.get('draftPicks'), 1)))
      );

      const offered = drawFromSharedPile(gameMap, kind, draftSize);
      spiritData.set('pendingDraftType', kind);
      spiritData.set('pendingDraftCardIds', offered);
      spiritData.set('pendingDraftPicksRemaining', Math.min(draftPicks, offered.length));
    });
  };

  const discardUnpickedDraftCards = (gameMap: Y.Map<unknown>, unpickedIds: string[], kind: 'minor' | 'major', boardId: string) => {
    const forgottenPileKey = kind === 'minor' ? 'forgottenMinorPowerCards' : 'forgottenMajorPowerCards';
    const currentForgotten = parseForgottenPowerCardList(gameMap.get(forgottenPileKey));
    const existingIds = new Set(currentForgotten.map((c) => c.id));
    const toAdd = unpickedIds
      .filter((id) => !existingIds.has(id))
      .map((id) => FORGETTABLE_POWER_CARD_BY_ID.get(id))
      .filter((c): c is ForgottenPowerCard => c !== undefined)
      .map((c) => ({ ...c, sourceBoardId: boardId }));
    if (toAdd.length > 0) {
      gameMap.set(forgottenPileKey, [...currentForgotten, ...toAdd]);
    }
  };

  const cancelPowerDraft = (spiritSlotId: string) => {
    withGameMap((gameMap) => {
      const spirits = gameMap.get('spirits') as Y.Map<unknown> | undefined;
      const spiritData = spirits instanceof Y.Map ? (spirits.get(spiritSlotId) as Y.Map<unknown> | undefined) : undefined;
      if (!(spiritData instanceof Y.Map)) return;

      const pendingDraftTypeRaw = spiritData.get('pendingDraftType');
      const pendingDraftType =
        pendingDraftTypeRaw === 'minor' || pendingDraftTypeRaw === 'major' ? pendingDraftTypeRaw : null;
      const offeredRaw = spiritData.get('pendingDraftCardIds');
      const offered = Array.isArray(offeredRaw)
        ? offeredRaw.filter((entry): entry is string => typeof entry === 'string')
        : [];

      if (pendingDraftType && offered.length > 0) {
        discardUnpickedDraftCards(gameMap, offered, pendingDraftType, spiritSlotId);
      }

      spiritData.set('pendingDraftType', null);
      spiritData.set('pendingDraftCardIds', []);
      spiritData.set('pendingDraftPicksRemaining', 0);
    });
  };

  const pickPowerDraftCard = (spiritSlotId: string, cardId: string) => {
    withGameMap((gameMap) => {
      const spirits = gameMap.get('spirits') as Y.Map<unknown> | undefined;
      const spiritData = spirits instanceof Y.Map ? (spirits.get(spiritSlotId) as Y.Map<unknown> | undefined) : undefined;
      if (!(spiritData instanceof Y.Map)) return;

      const pendingDraftTypeRaw = spiritData.get('pendingDraftType');
      const pendingDraftType =
        pendingDraftTypeRaw === 'minor' || pendingDraftTypeRaw === 'major' ? pendingDraftTypeRaw : null;
      if (!pendingDraftType) {
        return;
      }

      const offeredRaw = spiritData.get('pendingDraftCardIds');
      const offered = Array.isArray(offeredRaw)
        ? offeredRaw.filter((entry): entry is string => typeof entry === 'string')
        : [];
      if (!offered.includes(cardId)) {
        return;
      }

      const handRaw = spiritData.get('cardsInHand');
      const hand = Array.isArray(handRaw)
        ? handRaw.filter((entry): entry is string => typeof entry === 'string')
        : [];
      spiritData.set('cardsInHand', [...hand, cardId]);

      const remainingOffered = offered.filter((entry) => entry !== cardId);
      const picksRemaining = Math.max(
        0,
        Math.floor(getSafeNumber(spiritData.get('pendingDraftPicksRemaining'), 0)) - 1
      );

      if (picksRemaining <= 0 || remainingOffered.length === 0) {
        if (remainingOffered.length > 0) {
          discardUnpickedDraftCards(gameMap, remainingOffered, pendingDraftType, spiritSlotId);
        }
        spiritData.set('pendingDraftType', null);
        spiritData.set('pendingDraftCardIds', []);
        spiritData.set('pendingDraftPicksRemaining', 0);
        return;
      }

      spiritData.set('pendingDraftCardIds', remainingOffered);
      spiritData.set('pendingDraftPicksRemaining', Math.min(picksRemaining, remainingOffered.length));
    });
  };

  const forgetCard = (spiritSlotId: string, fromZone: CardZone, index: number) => {
    withGameMap((gameMap) => {
      const spirits = gameMap.get('spirits') as Y.Map<unknown> | undefined;
      const spiritData = spirits instanceof Y.Map ? (spirits.get(spiritSlotId) as Y.Map<unknown> | undefined) : undefined;
      if (!(spiritData instanceof Y.Map)) return;

      const sourceZoneRaw = spiritData.get(fromZone);
      const sourceZone = Array.isArray(sourceZoneRaw)
        ? sourceZoneRaw.filter((item): item is string => typeof item === 'string')
        : [];

      const cardId = sourceZone[index];
      if (!cardId) {
        return;
      }

      const nextSourceZone = [...sourceZone];
      nextSourceZone.splice(index, 1);
      spiritData.set(fromZone, nextSourceZone);

      const forgottenCard = FORGETTABLE_POWER_CARD_BY_ID.get(cardId);
      if (!forgottenCard) {
        return;
      }

      const forgottenPileKey =
        forgottenCard.kind === 'minor'
          ? 'forgottenMinorPowerCards'
          : forgottenCard.kind === 'major'
          ? 'forgottenMajorPowerCards'
          : 'forgottenUniquePowerCards';

      const currentForgottenPile = parseForgottenPowerCardList(gameMap.get(forgottenPileKey));
      if (currentForgottenPile.some((card) => card.id === forgottenCard.id)) {
        return;
      }

      gameMap.set(forgottenPileKey, [...currentForgottenPile, { ...forgottenCard, sourceBoardId: spiritSlotId }]);
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

  const assignSpiritToSlot = (spiritIdToAdd: string, targetSlotId: string, boardType: string | null) => {
    withGameMap((gameMap) => {
      const spirits = gameMap.get('spirits') as Y.Map<unknown> | undefined;
      if (!(spirits instanceof Y.Map)) return;

      const spirit = SPIRITS.find((s) => s.id === spiritIdToAdd) ?? SPIRITS[0];

      let slotIndex = 0;
      spirits.forEach((_s, sid) => {
        if (sid <= targetSlotId) slotIndex += 1;
      });

      let spiritData = spirits.get(targetSlotId) as Y.Map<unknown> | undefined;
      if (!(spiritData instanceof Y.Map)) {
        spiritData = new Y.Map<unknown>();
        spirits.set(targetSlotId, spiritData);
      }

      spiritData.set('spiritId', spirit?.id ?? spiritIdToAdd);
      spiritData.set('energy', 0);
      spiritData.set('gainMarkedTurn', 0);
      spiritData.set('gainMarkedRound', 0);
      spiritData.set('paidMarkedTurn', 0);
      spiritData.set('paidMarkedRound', 0);
      spiritData.set('paidAmount', 0);
      spiritData.set('presenceSupplySlotIndices', Array.from({ length: TOTAL_PRESENCE_SLOTS }, (_, i) => i));
      spiritData.set('presenceInSupply', TOTAL_PRESENCE_SLOTS);
      spiritData.set('presenceOnIsland', 0);
      spiritData.set('presenceDestroyed', 0);
      spiritData.set('presenceRemoved', 0);
      spiritData.set('presenceColor', DEFAULT_COLORS[(slotIndex - 1) % DEFAULT_COLORS.length] ?? '#facc15');
      spiritData.set('cardsInPlay', []);
      spiritData.set('cardsInDiscard', []);
      spiritData.set('cardsInHand', (spirit?.uniquePowers ?? []).map((p) => p.id));
      spiritData.set('draftSize', 4);
      spiritData.set('draftPicks', 1);
      spiritData.set('pendingDraftType', null);
      spiritData.set('pendingDraftCardIds', []);
      spiritData.set('pendingDraftPicksRemaining', 0);

      if (boardType !== null) {
        const boards = gameMap.get('boards') as Y.Map<unknown> | undefined;
        if (boards instanceof Y.Map) {
          const boardMap = boards.get(targetSlotId) as Y.Map<unknown> | undefined;
          if (boardMap instanceof Y.Map) {
            boardMap.set('boardType', boardType);
          }
        }
      }

      let filledCount = 0;
      spirits.forEach((sd) => {
        if (!(sd instanceof Y.Map)) return;
        const sId = sd.get('spiritId');
        if (typeof sId === 'string' && sId.length > 0) filledCount += 1;
      });
      const nextSpiritCount = Math.max(1, filledCount);
      gameMap.set('spiritCount', nextSpiritCount);
      gameMap.set('playerCount', nextSpiritCount);
      gameMap.set('fearThreshold', nextSpiritCount * 4);
    });

    selectSpirit(targetSlotId);
  };

  const confirmAddSpirit = () => {
    if (!spiritToAddId) return;
    const allSlotIds = [...spiritStates.map((s) => s.spiritSlotId), ...emptySlotIds];
    const targetSlotId = emptySlotIds[0] ?? getNextSpiritSlotId(allSlotIds);
    assignSpiritToSlot(spiritToAddId, targetSlotId, null);
    setIsAddingSpirit(false);
  };

  const removeSpirit = (spiritSlotId: string) => {
    const confirmed = window.confirm(`Remove ${selectedSpiritName}? This cannot be undone.`);
    if (!confirmed) return;

    const nextSelectedHolder: { value: string | null } = { value: null };

    withGameMap((gameMap) => {
      const spirits = gameMap.get('spirits') as Y.Map<unknown> | undefined;
      if (!(spirits instanceof Y.Map)) return;

      const spiritData = spirits.get(spiritSlotId);
      if (spiritData instanceof Y.Map) {
        spiritData.delete('spiritId');
      }

      let filledCount = 0;
      spirits.forEach((sd, sid) => {
        if (!(sd instanceof Y.Map)) return;
        const sId = sd.get('spiritId');
        if (typeof sId === 'string' && sId.length > 0) {
          filledCount += 1;
          if (sid !== spiritSlotId && nextSelectedHolder.value === null) {
            nextSelectedHolder.value = sid;
          }
        }
      });

      const nextSpiritCount = Math.max(1, filledCount);
      gameMap.set('spiritCount', nextSpiritCount);
      gameMap.set('playerCount', nextSpiritCount);
      gameMap.set('fearThreshold', nextSpiritCount * 4);
    });

    selectSpirit(nextSelectedHolder.value);
  };

  if (isAddingSpirit) {
    const usedSpiritIds = new Set(spiritStates.map((state) => state.spiritId));

    return (
      <section className="rounded-xl bg-white p-6 shadow">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Add Spirit</h2>
            <p className="text-sm text-slate-500">Choose a spirit to add to the game.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">Spirit</label>
            <select
              className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
              value={spiritToAddId}
              onChange={(event) => setSpiritToAddId(event.target.value)}
            >
              {SPIRITS.map((spirit) => (
                <option key={spirit.id} value={spirit.id}>
                  {spirit.name}{usedSpiritIds.has(spirit.id) ? ' (already in game)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
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
              disabled={!spiritToAddId}
              className={`rounded border px-3 py-1.5 text-sm font-semibold ${
                !spiritToAddId
                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              Add Spirit
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
          {mode === 'manage' ? (
            <button
              type="button"
              onClick={openAddSpiritScreen}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Add Spirit
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-slate-500">No spirits added yet. Use "Add Spirit" to add a spirit to the game.</p>
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
        {mode === 'manage' ? (
          <button
            type="button"
            onClick={openAddSpiritScreen}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Add Spirit
          </button>
        ) : null}
      </div>

      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="min-w-0 overflow-x-auto hide-scrollbar">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {spiritStates.map((state) => {
              const spirit = SPIRITS.find((item) => item.id === state.spiritId);
              return (
                <button
                  key={state.spiritSlotId}
                  type="button"
                  onClick={() => selectSpirit(state.spiritSlotId)}
                  className={`rounded px-3 py-1.5 text-sm font-medium ${
                    selectedSlotId === state.spiritSlotId ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  {state.ready ? '✅' : '❌'} {spirit?.name ?? `Spirit ${state.spiritSlotId}`}
                </button>
              );
            })}
          </div>
        </div>
        {mode === 'full' && onToggleSpiritPanelHeight ? (
          <button
            type="button"
            onClick={onToggleSpiritPanelHeight}
            className={`shrink-0 rounded border px-2 py-1 text-[11px] font-medium ${
              spiritPanelExpanded
                ? 'border-amber-600 bg-amber-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
            title={spiritPanelExpanded ? 'Restore spirit panel area' : 'Expand spirit panel area'}
          >
            {spiritPanelExpanded ? 'Collapse Spirit Panel' : 'Expand Spirit Panel'}
          </button>
        ) : null}
      </div>

      {mode === 'manage' ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          {selectedState ? (
            <div>
              <p className="text-sm font-semibold text-slate-900">{selectedSpirit?.name ?? selectedState.spiritId}</p>
              <p className="mt-2 text-xs text-slate-500">Spirit choice is locked after add. Remove and re-add to change.</p>
              <div className="mt-4 flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Presence color</span>
                <input
                  type="color"
                  value={selectedState.presenceColor}
                  onChange={(event) => setSpiritField(selectedState.spiritSlotId, 'presenceColor', event.target.value)}
                  className="h-8 w-12 cursor-pointer rounded border border-slate-300 bg-white"
                />
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => removeSpirit(selectedState.spiritSlotId)}
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
        <FullSpiritView
          selectedState={selectedState}
          selectedSpirit={selectedSpirit}
          layoutsBySpirit={layoutsBySpirit}
          panelAspectRatios={panelAspectRatios}
          setPanelAspectRatios={setPanelAspectRatios}
          panelContainerRef={panelContainerRef}
          adjustEnergy={adjustEnergy}
          payCardsInPlay={payCardsInPlay}
          setSpiritField={setSpiritField}
          recalcPresence={recalcPresence}
          setCardZone={setCardZone}
          forgetCard={forgetCard}
          startPowerDraft={startPowerDraft}
          cancelPowerDraft={cancelPowerDraft}
          pickPowerDraftCard={pickPowerDraftCard}
          resizeModeEnabled={resizeModeEnabled}
        />
      ) : null}
    </section>
  );
};

type CardZone = 'cardsInPlay' | 'cardsInHand' | 'cardsInDiscard';

const EMPTY_ELEMENT_COUNTS: ElementCounts = {
  sun: 0,
  moon: 0,
  fire: 0,
  air: 0,
  water: 0,
  earth: 0,
  plant: 0,
  animal: 0,
};

const ELEMENT_ICON_BY_NAME: Record<ElementName, string> = {
  sun: '/ESun.png',
  moon: '/EMoon.png',
  fire: '/EFire.png',
  air: '/EAir.png',
  water: '/EWater.png',
  earth: '/EEarth.png',
  plant: '/EPlant.png',
  animal: '/EAnimal.png',
};

const POWER_KIND_LABEL_BY_KIND: Record<PowerCardDefinition['kind'], 'Major' | 'Minor' | 'Unique'> = {
  major: 'Major',
  minor: 'Minor',
  unique: 'Unique',
};

const ALL_POWER_CARDS: PowerCardDefinition[] = [...MAJOR_POWER_CARDS, ...MINOR_POWER_CARDS];

type FullSpiritViewProps = {
  selectedState: SpiritState;
  selectedSpirit: ReturnType<typeof SPIRITS.find> | null;
  layoutsBySpirit: Record<string, SpiritLayout>;
  panelAspectRatios: Record<string, number>;
  setPanelAspectRatios: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  panelContainerRef: React.RefObject<HTMLDivElement | null>;
  adjustEnergy: (spiritSlotId: string, delta: number) => void;
  payCardsInPlay: (spiritSlotId: string) => void;
  setSpiritField: (spiritSlotId: string, field: string, value: unknown) => void;
  recalcPresence: (spiritSlotId: string, patch: Partial<Pick<SpiritState, 'presenceInSupply' | 'presenceOnIsland' | 'presenceDestroyed' | 'presenceRemoved'>>) => void;
  setCardZone: (spiritSlotId: string, zone: CardZone, cards: string[]) => void;
  forgetCard: (spiritSlotId: string, fromZone: CardZone, index: number) => void;
  startPowerDraft: (spiritSlotId: string, kind: 'minor' | 'major') => void;
  cancelPowerDraft: (spiritSlotId: string) => void;
  pickPowerDraftCard: (spiritSlotId: string, cardId: string) => void;
  resizeModeEnabled: boolean;
};

const FullSpiritView: React.FC<FullSpiritViewProps> = ({
  selectedState,
  selectedSpirit,
  layoutsBySpirit,
  panelAspectRatios,
  setPanelAspectRatios,
  panelContainerRef,
  adjustEnergy,
  payCardsInPlay,
  setSpiritField,
  recalcPresence,
  setCardZone,
  forgetCard,
  startPowerDraft,
  cancelPowerDraft,
  pickPowerDraftCard,
  resizeModeEnabled,
}) => {
  const [spiritSectionPercent, setSpiritSectionPercent] = useState(50);
  const [isResizingSpiritSection, setIsResizingSpiritSection] = useState(false);
  const spiritSectionRef = useRef<HTMLDivElement | null>(null);

  const clamp = (value: number, min: number, max: number) => {
    return Math.min(max, Math.max(min, value));
  };

  useEffect(() => {
    if (!resizeModeEnabled) {
      setIsResizingSpiritSection(false);
    }
  }, [resizeModeEnabled]);

  useEffect(() => {
    if (!isResizingSpiritSection || !resizeModeEnabled) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!spiritSectionRef.current) {
        return;
      }
      const bounds = spiritSectionRef.current.getBoundingClientRect();
      const nextPercent = ((event.clientX - bounds.left) / bounds.width) * 100;
      setSpiritSectionPercent(clamp(nextPercent, SPIRIT_SECTION_MIN_PERCENT, SPIRIT_SECTION_MAX_PERCENT));
    };

    const handleMouseUp = () => {
      setIsResizingSpiritSection(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSpiritSection, resizeModeEnabled]);

  const uniquePowerOptions = selectedSpirit?.uniquePowers ?? [];
  const allOptions = [...uniquePowerOptions, ...ALL_POWER_CARDS];

  const handleMoveCard = (fromZone: CardZone, index: number, toZone: CardZone) => {
    const cardId = selectedState[fromZone][index];
    if (!cardId) return;
    if (fromZone === toZone) return;
    const fromNext = [...selectedState[fromZone]];
    fromNext.splice(index, 1);
    setCardZone(selectedState.spiritSlotId, fromZone, fromNext);
    setCardZone(selectedState.spiritSlotId, toZone, [...selectedState[toZone], cardId]);
  };

  const getCardDefinition = (cardId: string) => {
    return allOptions.find((card) => card.id === cardId);
  };

  const getDraggedCardFromDataTransfer = (event: React.DragEvent) => {
    const raw = event.dataTransfer.getData('application/x-spirit-card');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { zone?: CardZone; index?: number };
      if (!parsed.zone || typeof parsed.index !== 'number' || parsed.index < 0) {
        return null;
      }
      return { zone: parsed.zone, index: parsed.index };
    } catch {
      return null;
    }
  };

  const getCardMeta = (cardId: string) => {
    const found = getCardDefinition(cardId);
    return {
      name: found?.name ?? cardId,
      faceUrl: found?.faceUrl,
      kind: found ? POWER_KIND_LABEL_BY_KIND[found.kind] : 'Unique',
      cost: typeof found?.cost === 'number' ? found.cost : 0,
    };
  };

  const spiritId = selectedState.spiritId;
  const spiritLayout = layoutsBySpirit[spiritId] ?? null;
  const layoutSlots: Slot[] = spiritLayout?.slots ?? [];
  const aspectRatio = panelAspectRatios[spiritId] ?? 3;
  const supplySlotIndices = selectedState.presenceSupplySlotIndices;
  const supplySlotSet = new Set(supplySlotIndices);
  const missingSlotIndices = Array.from({ length: TOTAL_PRESENCE_SLOTS }, (_, index) => index).filter(
    (index) => !supplySlotSet.has(index)
  );
  const [panelPixelSize, setPanelPixelSize] = useState({ width: 900, height: 360 });
  const presenceTokenDiameterPx = Math.round(
    Math.max(14, Math.min(64, Math.max(24, Math.min(panelPixelSize.width, panelPixelSize.height) * 0.12)) - 10)
  );
  const presenceBorderPx = Math.max(2, Math.round(presenceTokenDiameterPx * 0.1));

  useEffect(() => {
    if (!panelContainerRef.current) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setPanelPixelSize({ width, height });
      }
    });

    observer.observe(panelContainerRef.current);
    return () => observer.disconnect();
  }, [panelContainerRef, spiritId]);
  const gainedThisTurn =
    selectedState.gainMarkedTurn === selectedState.turn &&
    selectedState.gainMarkedRound === selectedState.round;

  const energyGainAmount = useMemo(() => {
    let base = spiritLayout?.baseEnergyGain ?? 0;
    let addEnergy = 0;
    for (const slotIndex of missingSlotIndices) {
      const slot = layoutSlots[slotIndex];
      if (!slot) continue;
      for (const effect of slot.effects) {
        if (effect.kind === 'set-energy-base') base = Math.max(base, effect.value);
        else if (effect.kind === 'add-energy') addEnergy += effect.value;
      }
    }
    return base + addEnergy;
  }, [spiritLayout, missingSlotIndices, layoutSlots]);

  const totalCardPlays = useMemo(() => {
    let base = spiritLayout?.baseCardPlays ?? 1;
    let addPlays = 0;
    for (const slotIndex of missingSlotIndices) {
      const slot = layoutSlots[slotIndex];
      if (!slot) continue;
      for (const effect of slot.effects) {
        if (effect.kind === 'set-card-plays-base') base = Math.max(base, effect.value);
        else if (effect.kind === 'add-card-plays') addPlays += effect.value;
      }
    }
    return base + addPlays;
  }, [spiritLayout, missingSlotIndices, layoutSlots]);

  const permanentElementCounts = useMemo<ElementCounts>(() => {
    const totals: ElementCounts = { ...(spiritLayout?.baseElements ?? EMPTY_ELEMENT_COUNTS) };
    for (const slotIndex of missingSlotIndices) {
      const slot = layoutSlots[slotIndex];
      if (!slot) continue;
      for (const effect of slot.effects) {
        if (effect.kind === 'add-element') {
          totals[effect.element] = (totals[effect.element] ?? 0) + effect.value;
        }
      }
    }
    return totals;
  }, [spiritLayout, missingSlotIndices, layoutSlots]);

  const paidThisTurn =
    selectedState.paidMarkedTurn === selectedState.turn &&
    selectedState.paidMarkedRound === selectedState.round;
  const cardsInPlayTotalCost = selectedState.cardsInPlay.reduce((sum, cardId) => sum + getCardMeta(cardId).cost, 0);
  const cardsInPlayElementCounts = useMemo<ElementCounts>(() => {
    return selectedState.cardsInPlay.reduce<ElementCounts>((totals, cardId) => {
      const card = getCardDefinition(cardId);
      if (!card) {
        return totals;
      }

      for (const element of ELEMENT_ORDER) {
        totals[element] += card.elements[element] ?? 0;
      }

      return totals;
    }, { ...EMPTY_ELEMENT_COUNTS });
  }, [selectedState.cardsInPlay, allOptions]);
  const pendingDraftCards = selectedState.pendingDraftCardIds.map((cardId) => {
    const card = selectedState.pendingDraftType === 'major'
      ? MAJOR_POWER_CARD_BY_ID.get(cardId)
      : MINOR_POWER_CARD_BY_ID.get(cardId);
    return {
      id: cardId,
      name: card?.name ?? cardId,
      faceUrl: card?.faceUrl,
    };
  });

  const renderCardZone = (zone: CardZone, label: string, colorClass: string, borderClass: string) => {
    const cards = selectedState[zone];
    return (
      <div className={`rounded-lg border ${borderClass} bg-white p-1.5`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`shrink-0 text-sm font-bold uppercase tracking-wide ${colorClass}`}>{label}</span>
            {zone === 'cardsInPlay' ? (
              <div className="flex min-w-0 flex-wrap items-center gap-1 py-0.5">
                {ELEMENT_ORDER.map((element) => {
                  const total = cardsInPlayElementCounts[element] + permanentElementCounts[element];
                  return (
                    <div
                      key={element}
                      className="flex items-center gap-1 rounded border border-violet-100 bg-violet-50 px-1.5 py-0.5"
                    >
                      <img
                        src={ELEMENT_ICON_BY_NAME[element]}
                        alt=""
                        aria-hidden
                        className="h-[30px] w-[30px] object-contain"
                        draggable={false}
                      />
                      <span className="text-[30px] leading-none font-semibold tabular-nums text-slate-900">
                        {total}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
          {zone === 'cardsInPlay' ? (
            <div className="flex items-center gap-2">
              <div className="rounded border border-slate-200 bg-white px-2 py-0.5">
                <span className="text-sm font-semibold text-slate-700">
                  {selectedState.cardsInPlay.length}/{totalCardPlays}
                </span>
              </div>
              <div className="rounded border border-slate-200 bg-white px-2 py-0.5">
                <span className="text-sm font-semibold text-slate-700">
                  Cost: {cardsInPlayTotalCost}
                </span>
              </div>
              <button
                type="button"
                onClick={() => payCardsInPlay(selectedState.spiritSlotId)}
                className={`rounded border px-2 py-1 text-sm font-semibold ${
                  paidThisTurn
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {paidThisTurn ? 'Paid' : 'Pay'}
              </button>
            </div>
          ) : null}
        </div>

        <div
          className="mt-1 flex min-h-[96px] flex-wrap content-start items-start gap-1 rounded border border-dashed border-transparent p-0.5 transition-colors hover:border-slate-200"
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(event) => {
            event.preventDefault();
            const draggedCard = getDraggedCardFromDataTransfer(event);
            if (!draggedCard) return;
            handleMoveCard(draggedCard.zone, draggedCard.index, zone);
          }}
        >
          {cards.length === 0 ? (
            <p className="text-[10px] text-slate-400 italic">Empty</p>
          ) : null}
          {cards.map((cardId, i) => (
            <div
              key={`${cardId}-${i}`}
              className="group flex w-fit flex-col gap-1 rounded p-0.5"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData(
                  'application/x-spirit-card',
                  JSON.stringify({ zone, index: i })
                );
              }}
            >
              {(() => {
                const meta = getCardMeta(cardId);
                return meta.faceUrl ? (
                  <img
                    src={meta.faceUrl}
                    alt={meta.name}
                    className="h-[203px] w-auto rounded object-contain"
                    draggable={false}
                    title={meta.name}
                  />
                ) : (
                  <div className="flex h-[203px] w-[144px] items-center justify-center rounded px-2 text-center text-[11px] text-slate-500">
                    {meta.name}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {selectedState.pendingDraftType ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-2">
          <div className="mt-2 rounded border border-sky-300 bg-white p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-sky-900">
                {selectedState.pendingDraftType === 'major' ? 'Major Power Draft' : 'Minor Power Draft'}
                {' '}· Picks remaining: {selectedState.pendingDraftPicksRemaining}
              </p>
              <button
                type="button"
                onClick={() => cancelPowerDraft(selectedState.spiritSlotId)}
                className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel Draft
              </button>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {pendingDraftCards.map((card) => (
                <div key={card.id} className="flex w-[148px] flex-col items-center gap-1 rounded border border-slate-200 bg-slate-50 p-1.5">
                  {card.faceUrl ? (
                    <img
                      src={card.faceUrl}
                      alt={card.name}
                      className="h-[203px] w-auto rounded object-contain"
                      draggable={false}
                    />
                  ) : (
                    <div className="flex h-[203px] w-[144px] items-center justify-center rounded bg-white px-2 text-center text-[11px] text-slate-500">
                      {card.name}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => pickPowerDraftCard(selectedState.spiritSlotId, card.id)}
                    className="w-full rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Pick
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div
        ref={spiritSectionRef}
        className="grid items-start"
        style={{
          columnGap: '0.5rem',
          gridTemplateColumns: resizeModeEnabled
            ? `${spiritSectionPercent}% ${SPIRIT_SECTION_RESIZER_THICKNESS}px minmax(0, 1fr)`
            : `${spiritSectionPercent}% minmax(0, 1fr)`,
        }}
      >
        <div className="min-w-0 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSpiritField(selectedState.spiritSlotId, 'ready', !selectedState.ready)}
              className={`shrink-0 rounded border px-3 py-1.5 text-sm font-semibold ${
                selectedState.ready
                  ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {selectedState.ready ? 'Ready ✅' : 'Ready ❌'}
            </button>
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm">
            <span className="text-sm font-semibold text-slate-700">Energy: {selectedState.energy}</span>
            <button
              type="button"
              onClick={() => adjustEnergy(selectedState.spiritSlotId, -1)}
              className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              −1
            </button>
            <button
              type="button"
              onClick={() => adjustEnergy(selectedState.spiritSlotId, 1)}
              className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => {
                if (!gainedThisTurn) {
                  adjustEnergy(selectedState.spiritSlotId, energyGainAmount);
                  setSpiritField(selectedState.spiritSlotId, 'gainMarkedTurn', selectedState.turn);
                  setSpiritField(selectedState.spiritSlotId, 'gainMarkedRound', selectedState.round);
                }
              }}
              className={`rounded border px-2 py-0.5 text-xs font-semibold ${
                gainedThisTurn
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {gainedThisTurn ? `Gained +${energyGainAmount}` : `Gain +${energyGainAmount}`}
            </button>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => startPowerDraft(selectedState.spiritSlotId, 'minor')}
                className="rounded border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
              >
                Gain Minor Power
              </button>
              <button
                type="button"
                onClick={() => startPowerDraft(selectedState.spiritSlotId, 'major')}
                className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
              >
                Gain Major Power
              </button>
            </div>
          </div>
          </div>

          <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-2">
          <div
            ref={panelContainerRef}
            className="relative mx-auto w-full min-h-[360px] max-h-[620px] max-w-[900px] overflow-hidden rounded border border-slate-200 bg-slate-100"
            style={{ aspectRatio: String(aspectRatio) }}
          >
            {selectedSpirit?.panel?.faceUrl ? (
              <img
                src={selectedSpirit.panel.faceUrl}
                alt={`${selectedSpirit.name} spirit panel`}
                className="h-full w-full object-cover"
                draggable={false}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                    setPanelAspectRatios((prev) => ({
                      ...prev,
                      [spiritId]: img.naturalWidth / img.naturalHeight,
                    }));
                  }
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">No panel image</div>
            )}

            {/* In-supply presence circles — draggable */}
            {supplySlotIndices.map((slotIndex) => {
              const slot = layoutSlots[slotIndex] ?? {
                x: Math.round(LAYOUT_MODEL_SIZE * 0.05 + (slotIndex % TOTAL_PRESENCE_SLOTS) * Math.round(LAYOUT_MODEL_SIZE * 0.07)),
                y: Math.round(LAYOUT_MODEL_SIZE * 0.5),
              };
              return (
                <div
                  key={`presence-supply-${slotIndex}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'copy';
                    e.dataTransfer.setData('piece-type', 'presence-from-panel');
                    e.dataTransfer.setData('spirit-board-id', selectedState.spiritSlotId);
                    e.dataTransfer.setData('spirit-slot-index', String(slotIndex));
                    e.dataTransfer.setData('spirit-slot-reward', slot.reward ?? '');
                  }}
                  title={slot.reward ? `Slot ${slotIndex + 1}: ${slot.reward}` : `Slot ${slotIndex + 1}: Drag onto a board land to place presence`}
                  style={{
                    position: 'absolute',
                    left: `${(slot.x / LAYOUT_MODEL_SIZE) * 100}%`,
                    top: `${(slot.y / LAYOUT_MODEL_SIZE) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: presenceTokenDiameterPx,
                    height: presenceTokenDiameterPx,
                    borderRadius: '50%',
                    background: selectedState.presenceColor,
                    border: `${presenceBorderPx}px solid rgba(255,255,255,0.9)`,
                    cursor: 'grab',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                    zIndex: 10,
                  }}
                />
              );
            })}

            {/* Already-placed / destroyed slots shown as translucent rings */}
            {missingSlotIndices.map((slotIndex) => {
              const slot = layoutSlots[slotIndex];
              if (!slot) return null;
              return (
                <div
                  key={`presence-placed-${slotIndex}`}
                  style={{
                    position: 'absolute',
                    left: `${(slot.x / LAYOUT_MODEL_SIZE) * 100}%`,
                    top: `${(slot.y / LAYOUT_MODEL_SIZE) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: presenceTokenDiameterPx,
                    height: presenceTokenDiameterPx,
                    borderRadius: '50%',
                    border: `${presenceBorderPx}px solid ${selectedState.presenceColor}`,
                    opacity: 0.35,
                    zIndex: 9,
                  }}
                />
              );
            })}
          </div>
        </div>
        </div>

        {resizeModeEnabled ? (
          <div
            role="separator"
            aria-label="Resize spirit and card sections"
            className="h-full cursor-col-resize rounded bg-slate-200 hover:bg-slate-300"
            onMouseDown={(event) => {
              if (!resizeModeEnabled) return;
              event.preventDefault();
              setIsResizingSpiritSection(true);
            }}
          />
        ) : null}

        <div className="min-w-0 flex flex-col gap-1.5">
          {renderCardZone('cardsInPlay', 'Play', 'text-violet-700', 'border-violet-200')}
          {renderCardZone('cardsInHand', 'Hand', 'text-blue-700', 'border-blue-200')}
          {renderCardZone('cardsInDiscard', 'Discard', 'text-slate-600', 'border-slate-200')}
          <div
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700"
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(event) => {
              event.preventDefault();
              const draggedCard = getDraggedCardFromDataTransfer(event);
              if (!draggedCard) return;
              forgetCard(selectedState.spiritSlotId, draggedCard.zone, draggedCard.index);
            }}
          >
            Drag here to forget a card
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-white p-2">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
            Destroyed Presence ({selectedState.presenceDestroyed})
          </span>
          <button
            type="button"
            disabled={selectedState.presenceDestroyed === 0}
            onClick={() => recalcPresence(selectedState.spiritSlotId, {
              presenceDestroyed: selectedState.presenceDestroyed - 1,
              presenceRemoved: selectedState.presenceRemoved + 1,
            })}
            className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold ${
              selectedState.presenceDestroyed === 0
                ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300'
                : 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
            title="Permanently remove a destroyed presence from the game"
          >
            Remove from Game ({selectedState.presenceRemoved})
          </button>
        </div>
        <div className="flex flex-wrap gap-2 items-center min-h-[36px]">
          {selectedState.presenceDestroyed === 0 && (
            <p className="text-[10px] text-slate-400 italic">No destroyed presence</p>
          )}
          {Array.from({ length: selectedState.presenceDestroyed }, (_, i) => (
            <div
              key={i}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('piece-type', 'presence-destroyed-from-panel');
                e.dataTransfer.setData('spirit-board-id', selectedState.spiritSlotId);
              }}
              className="cursor-grab"
              title="Drag onto a board land to re-add this presence to the island"
            >
              <img
                src="/DestroyedPresence.png"
                alt="Destroyed Presence"
                style={{ width: 32, height: 32, objectFit: 'contain' }}
                draggable={false}
              />
            </div>
          ))}
        </div>
        <p className="mt-1 text-[10px] text-slate-400">
          Supply: {selectedState.presenceInSupply} · Island: {selectedState.presenceOnIsland} · Destroyed: {selectedState.presenceDestroyed} · Removed: {selectedState.presenceRemoved} / 13
        </p>
      </div>

      <div className="rounded-lg border border-sky-200 bg-sky-50 p-2">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[10px] font-bold uppercase tracking-wide text-sky-800">
            Cards shown in draft
            <div className="mt-1 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSpiritField(selectedState.spiritSlotId, 'draftSize', selectedState.draftSize - 1)}
                className="rounded border border-sky-300 bg-white px-2 py-0.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
              >
                -
              </button>
              <span className="min-w-7 text-center text-xs font-semibold text-sky-900">{selectedState.draftSize}</span>
              <button
                type="button"
                onClick={() => setSpiritField(selectedState.spiritSlotId, 'draftSize', selectedState.draftSize + 1)}
                className="rounded border border-sky-300 bg-white px-2 py-0.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
              >
                +
              </button>
            </div>
          </label>

          <label className="text-[10px] font-bold uppercase tracking-wide text-sky-800">
            Cards gained from draft
            <div className="mt-1 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSpiritField(selectedState.spiritSlotId, 'draftPicks', selectedState.draftPicks - 1)}
                className="rounded border border-sky-300 bg-white px-2 py-0.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
              >
                -
              </button>
              <span className="min-w-7 text-center text-xs font-semibold text-sky-900">{selectedState.draftPicks}</span>
              <button
                type="button"
                onClick={() => setSpiritField(selectedState.spiritSlotId, 'draftPicks', selectedState.draftPicks + 1)}
                className="rounded border border-sky-300 bg-white px-2 py-0.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
              >
                +
              </button>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};

export default SpiritPanelPage;
