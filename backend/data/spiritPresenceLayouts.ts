import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type PresenceSlot = {
  x: number;
  y: number;
  reward?: string;
  effects?: PresenceEffect[];
};

const ELEMENT_NAMES = ['sun', 'moon', 'fire', 'air', 'water', 'earth', 'plant', 'animal'] as const;
type ElementName = (typeof ELEMENT_NAMES)[number];

export type PresenceEffect =
  | { kind: 'set-energy-base'; value: number }
  | { kind: 'add-energy'; value: number }
  | { kind: 'set-card-plays-base'; value: number }
  | { kind: 'add-card-plays'; value: number }
  | { kind: 'add-element'; element: ElementName; value: number };

type ElementCounts = Partial<Record<ElementName, number>>;

export type SpiritPresenceLayout = {
  spiritId: string;
  slots: PresenceSlot[];
  baseEnergyGain: number;
  baseCardPlays: number;
  baseElements: ElementCounts;
  updatedAt: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LAYOUT_FILE_PATH = path.join(__dirname, 'spiritPresenceLayouts.json');

const isValidNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value);
};

const normalizeInt = (value: unknown, fallback: number, min: number, max: number) => {
  if (!isValidNumber(value)) {
    return fallback;
  }
  const next = Math.floor(value);
  return Math.min(max, Math.max(min, next));
};

const isElementName = (value: unknown): value is ElementName => {
  return typeof value === 'string' && (ELEMENT_NAMES as readonly string[]).includes(value);
};

const isValidPresenceEffect = (value: unknown): value is PresenceEffect => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const effect = value as Partial<PresenceEffect> & { kind?: unknown; element?: unknown; value?: unknown };
  if (!isValidNumber(effect.value)) {
    return false;
  }

  if (
    effect.kind === 'set-energy-base'
    || effect.kind === 'add-energy'
    || effect.kind === 'set-card-plays-base'
    || effect.kind === 'add-card-plays'
  ) {
    return true;
  }

  if (effect.kind === 'add-element') {
    return isElementName(effect.element);
  }

  return false;
};

const normalizePresenceEffect = (value: PresenceEffect): PresenceEffect => {
  if (value.kind === 'add-element') {
    return {
      kind: 'add-element',
      element: value.element,
      value: normalizeInt(value.value, 0, 0, 20),
    };
  }

  return {
    kind: value.kind,
    value: normalizeInt(value.value, 0, 0, 20),
  };
};

const normalizeElementCounts = (value: unknown): ElementCounts => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const source = value as Record<string, unknown>;
  const result: ElementCounts = {};
  for (const element of ELEMENT_NAMES) {
    const amount = normalizeInt(source[element], 0, 0, 20);
    if (amount > 0) {
      result[element] = amount;
    }
  }
  return result;
};

const isValidSlot = (value: unknown): value is PresenceSlot => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const slot = value as PresenceSlot;
  const hasValidEffects =
    slot.effects === undefined || (Array.isArray(slot.effects) && slot.effects.every((effect) => isValidPresenceEffect(effect)));
  const hasValidReward = slot.reward === undefined || typeof slot.reward === 'string';
  return isValidNumber(slot.x) && isValidNumber(slot.y) && hasValidReward && hasValidEffects;
};

const normalizeSpiritId = (spiritId: string) => {
  return spiritId
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const loadLayouts = (): Record<string, SpiritPresenceLayout> => {
  try {
    if (!fs.existsSync(LAYOUT_FILE_PATH)) {
      return {};
    }

    const raw = JSON.parse(fs.readFileSync(LAYOUT_FILE_PATH, 'utf-8'));
    if (!raw || typeof raw !== 'object') {
      return {};
    }

    const normalized: Record<string, SpiritPresenceLayout> = {};

    Object.entries(raw as Record<string, unknown>).forEach(([spiritId, value]) => {
      if (!value || typeof value !== 'object') {
        return;
      }

      const layout = value as Partial<SpiritPresenceLayout>;
      const slots = Array.isArray(layout.slots) ? layout.slots.filter(isValidSlot) : [];
      normalized[spiritId] = {
        spiritId,
        slots: slots.map((slot) => {
          const reward = typeof slot.reward === 'string' ? slot.reward : undefined;
          const effects = Array.isArray(slot.effects) ? slot.effects.map((effect) => normalizePresenceEffect(effect)) : [];
          return {
            x: slot.x,
            y: slot.y,
            ...(reward ? { reward } : {}),
            ...(effects.length > 0 ? { effects } : {}),
          };
        }),
        baseEnergyGain: normalizeInt(layout.baseEnergyGain, 0, 0, 20),
        baseCardPlays: normalizeInt(layout.baseCardPlays, 1, 0, 20),
        baseElements: normalizeElementCounts(layout.baseElements),
        updatedAt: typeof layout.updatedAt === 'string' ? layout.updatedAt : new Date(0).toISOString(),
      };
    });

    return normalized;
  } catch {
    return {};
  }
};

const saveLayouts = (layouts: Record<string, SpiritPresenceLayout>) => {
  fs.writeFileSync(LAYOUT_FILE_PATH, JSON.stringify(layouts, null, 2), 'utf-8');
};

let layoutsCache = loadLayouts();

export const listSpiritPresenceLayouts = () => {
  return Object.values(layoutsCache);
};

export const getSpiritPresenceLayout = (spiritId: string) => {
  const normalized = normalizeSpiritId(spiritId);
  return layoutsCache[normalized] ?? null;
};

export const setSpiritPresenceLayout = (
  spiritId: string,
  slots: PresenceSlot[],
  baseEnergyGainRaw: unknown,
  baseCardPlaysRaw: unknown,
  baseElementsRaw: unknown,
) => {
  const normalized = normalizeSpiritId(spiritId);
  const baseEnergyGain = normalizeInt(baseEnergyGainRaw, 0, 0, 20);
  const baseCardPlays = normalizeInt(baseCardPlaysRaw, 1, 0, 20);
  const baseElements = normalizeElementCounts(baseElementsRaw);
  const cleanedSlots = Array.isArray(slots)
    ? slots.filter(isValidSlot).map((slot) => {
      const reward = typeof slot.reward === 'string' ? slot.reward.trim() : '';
      const effects = Array.isArray(slot.effects) ? slot.effects.map((effect) => normalizePresenceEffect(effect)) : [];
      return {
        x: slot.x,
        y: slot.y,
        ...(reward.length > 0 ? { reward } : {}),
        ...(effects.length > 0 ? { effects } : {}),
      };
    })
    : [];

  if (cleanedSlots.length !== 13) {
    throw new Error('Spirit presence layouts must contain exactly 13 slots.');
  }

  const layout: SpiritPresenceLayout = {
    spiritId: normalized,
    slots: cleanedSlots,
    baseEnergyGain,
    baseCardPlays,
    baseElements,
    updatedAt: new Date().toISOString(),
  };

  layoutsCache = {
    ...layoutsCache,
    [normalized]: layout,
  };

  saveLayouts(layoutsCache);
  return layout;
};
