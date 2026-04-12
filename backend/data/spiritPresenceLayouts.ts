import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type PresenceSlot = {
  x: number;
  y: number;
};

export type SpiritPresenceLayout = {
  spiritId: string;
  slots: PresenceSlot[];
  updatedAt: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LAYOUT_FILE_PATH = path.join(__dirname, 'spiritPresenceLayouts.json');

const isValidNumber = (value: unknown) => {
  return typeof value === 'number' && Number.isFinite(value);
};

const isValidSlot = (value: unknown): value is PresenceSlot => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const slot = value as PresenceSlot;
  return isValidNumber(slot.x) && isValidNumber(slot.y);
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

    const entries = Object.entries(raw as Record<string, unknown>)
      .map(([spiritId, value]) => {
        if (!value || typeof value !== 'object') {
          return null;
        }
        const layout = value as Partial<SpiritPresenceLayout>;
        const slots = Array.isArray(layout.slots) ? layout.slots.filter(isValidSlot) : [];
        return {
          spiritId,
          slots,
          updatedAt: typeof layout.updatedAt === 'string' ? layout.updatedAt : new Date(0).toISOString(),
        };
      })
      .filter((entry): entry is SpiritPresenceLayout => entry !== null);

    return Object.fromEntries(entries.map((entry) => [entry.spiritId, entry]));
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

export const setSpiritPresenceLayout = (spiritId: string, slots: PresenceSlot[]) => {
  const normalized = normalizeSpiritId(spiritId);
  const cleanedSlots = Array.isArray(slots) ? slots.filter(isValidSlot) : [];

  if (cleanedSlots.length !== 13) {
    throw new Error('Spirit presence layouts must contain exactly 13 slots.');
  }

  const layout: SpiritPresenceLayout = {
    spiritId: normalized,
    slots: cleanedSlots,
    updatedAt: new Date().toISOString(),
  };

  layoutsCache = {
    ...layoutsCache,
    [normalized]: layout,
  };

  saveLayouts(layoutsCache);
  return layout;
};
