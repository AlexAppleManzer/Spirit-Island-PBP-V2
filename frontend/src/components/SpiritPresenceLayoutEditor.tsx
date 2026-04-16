import { useEffect, useMemo, useRef, useState } from 'react';
import { SPIRITS } from '../data/spirits';
import { ELEMENT_ORDER, type ElementName } from '../data/deckCard';

type PresenceEffect =
  | { kind: 'set-energy-base'; value: number }
  | { kind: 'add-energy'; value: number }
  | { kind: 'set-card-plays-base'; value: number }
  | { kind: 'add-card-plays'; value: number }
  | { kind: 'add-element'; element: ElementName; value: number };

type Slot = { x: number; y: number; reward?: string; effects: PresenceEffect[] };

type Layout = {
  spiritId: string;
  slots: Slot[];
  baseEnergyGain: number;
  baseCardPlays: number;
  baseElements: Partial<Record<ElementName, number>>;
  updatedAt: string;
};

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001';
const LAYOUT_MODEL_SIZE = 440;

const DEFAULT_BASE_ENERGY_GAIN = 0;
const DEFAULT_BASE_CARD_PLAYS = 1;
const EMPTY_BASE_ELEMENTS: Partial<Record<ElementName, number>> = {};

const EFFECT_LABELS: Record<PresenceEffect['kind'], string> = {
  'set-energy-base': 'Set Energy Base',
  'add-energy': 'Add Energy',
  'set-card-plays-base': 'Set Card Plays Base',
  'add-card-plays': 'Add Card Plays',
  'add-element': 'Add Permanent Element',
};

const EFFECT_OPTIONS: Array<{ value: PresenceEffect['kind']; label: string }> = [
  { value: 'set-energy-base', label: EFFECT_LABELS['set-energy-base'] },
  { value: 'add-energy', label: EFFECT_LABELS['add-energy'] },
  { value: 'set-card-plays-base', label: EFFECT_LABELS['set-card-plays-base'] },
  { value: 'add-card-plays', label: EFFECT_LABELS['add-card-plays'] },
  { value: 'add-element', label: EFFECT_LABELS['add-element'] },
];

const clampInt = (value: number, min: number, max: number) => {
  const next = Math.floor(Number.isFinite(value) ? value : min);
  return Math.max(min, Math.min(max, next));
};

const sanitizeEffects = (raw: unknown): PresenceEffect[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  const parsed: PresenceEffect[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const effect = entry as { kind?: string; value?: unknown; element?: unknown };
    const value = clampInt(Number(effect.value), 0, 20);

    if (effect.kind === 'set-energy-base' || effect.kind === 'add-energy' || effect.kind === 'set-card-plays-base' || effect.kind === 'add-card-plays') {
      parsed.push({ kind: effect.kind, value });
      continue;
    }

    if (effect.kind === 'add-element') {
      const element = typeof effect.element === 'string' && ELEMENT_ORDER.includes(effect.element as ElementName)
        ? (effect.element as ElementName)
        : 'sun';
      parsed.push({ kind: 'add-element', element, value });
    }
  }

  return parsed;
};

const createDefaultEffect = (): PresenceEffect => ({ kind: 'add-energy', value: 1 });

const normalizeBaseElements = (raw: unknown): Partial<Record<ElementName, number>> => {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const result: Partial<Record<ElementName, number>> = {};
  const source = raw as Record<string, unknown>;
  for (const element of ELEMENT_ORDER) {
    const next = clampInt(Number(source[element]), 0, 20);
    if (next > 0) {
      result[element] = next;
    }
  }
  return result;
};

const sanitizeSlot = (raw: unknown): Slot | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const slot = raw as { x?: unknown; y?: unknown; reward?: unknown; effects?: unknown };
  if (typeof slot.x !== 'number' || typeof slot.y !== 'number') {
    return null;
  }
  const reward = typeof slot.reward === 'string' && slot.reward.trim().length > 0
    ? slot.reward.trim()
    : undefined;
  return {
    x: Math.round(slot.x),
    y: Math.round(slot.y),
    reward,
    effects: sanitizeEffects(slot.effects),
  };
};

const DEFAULT_LAYOUT = (): Slot[] => {
  const slots: Slot[] = [];
  const radius = 170;
  for (let i = 0; i < 13; i += 1) {
    const angle = (i / 13) * Math.PI * 2;
    slots.push({
      x: Math.round(220 + Math.cos(angle) * radius),
      y: Math.round(220 + Math.sin(angle) * radius),
      effects: [],
    });
  }
  return slots;
};

const SpiritPresenceLayoutEditor: React.FC = () => {
  const [selectedSpiritId, setSelectedSpiritId] = useState(SPIRITS[0]?.id ?? '');
  const [layouts, setLayouts] = useState<Record<string, Layout>>({});
  const [slots, setSlots] = useState<Slot[]>(DEFAULT_LAYOUT());
  const [baseEnergyGain, setBaseEnergyGain] = useState(DEFAULT_BASE_ENERGY_GAIN);
  const [baseCardPlays, setBaseCardPlays] = useState(DEFAULT_BASE_CARD_PLAYS);
  const [baseElements, setBaseElements] = useState<Partial<Record<ElementName, number>>>(EMPTY_BASE_ELEMENTS);
  const [draggingSlotIndex, setDraggingSlotIndex] = useState<number | null>(null);
  const [panelImageAspectRatio, setPanelImageAspectRatio] = useState(1);
  const [panelPixelSize, setPanelPixelSize] = useState({ width: 980, height: 420 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const panelCanvasRef = useRef<HTMLDivElement | null>(null);

  const markerDiameterPx = Math.round(
    Math.max(14, Math.min(64, Math.max(24, Math.min(panelPixelSize.width, panelPixelSize.height) * 0.12)) - 10)
  );
  const markerRadiusPx = markerDiameterPx / 2;
  const markerBorderPx = Math.max(2, Math.round(markerDiameterPx * 0.1));
  const markerFontPx = Math.max(10, Math.round(markerDiameterPx * 0.3));

  const token = localStorage.getItem('authToken');

  const headers = useMemo(() => {
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [token]);

  useEffect(() => {
    const loadLayouts = async () => {
      setLoading(true);
      setMessage(null);
      try {
        const response = await fetch(`${BACKEND_URL}/api/spirits/layouts`, {
          headers,
        });

        if (!response.ok) {
          throw new Error('Unable to load spirit layouts.');
        }

        const data = await response.json();
        const nextLayouts: Record<string, Layout> = {};
        const list = Array.isArray(data?.layouts) ? data.layouts : [];
        list.forEach((layoutRaw: unknown) => {
          if (!layoutRaw || typeof layoutRaw !== 'object') {
            return;
          }
          const layout = layoutRaw as Partial<Layout> & { slots?: unknown[] };
          if (!layout.spiritId) {
            return;
          }
          const parsedSlots = Array.isArray(layout.slots)
            ? layout.slots.map((slot) => sanitizeSlot(slot)).filter((slot): slot is Slot => slot !== null)
            : [];
          nextLayouts[layout.spiritId] = {
            spiritId: layout.spiritId,
            slots: parsedSlots,
            baseEnergyGain: Number.isFinite(Number(layout.baseEnergyGain))
              ? clampInt(Number(layout.baseEnergyGain), 0, 20)
              : DEFAULT_BASE_ENERGY_GAIN,
            baseCardPlays: Number.isFinite(Number(layout.baseCardPlays))
              ? clampInt(Number(layout.baseCardPlays), 0, 20)
              : DEFAULT_BASE_CARD_PLAYS,
            baseElements: normalizeBaseElements(layout.baseElements),
            updatedAt: typeof layout.updatedAt === 'string' ? layout.updatedAt : new Date(0).toISOString(),
          };
        });
        setLayouts(nextLayouts);
      } catch (error) {
        setMessage((error as Error).message);
      } finally {
        setLoading(false);
      }
    };

    void loadLayouts();
  }, [headers]);

  useEffect(() => {
    const selected = layouts[selectedSpiritId];
    if (selected?.slots?.length === 13) {
      setSlots(selected.slots.map((slot) => ({ x: slot.x, y: slot.y, reward: slot.reward, effects: [...slot.effects] })));
      setBaseEnergyGain(clampInt(selected.baseEnergyGain, 0, 20));
      setBaseCardPlays(clampInt(selected.baseCardPlays, 0, 20));
      setBaseElements(normalizeBaseElements(selected.baseElements));
      return;
    }

    setSlots(DEFAULT_LAYOUT());
    setBaseEnergyGain(DEFAULT_BASE_ENERGY_GAIN);
    setBaseCardPlays(DEFAULT_BASE_CARD_PLAYS);
    setBaseElements(EMPTY_BASE_ELEMENTS);
  }, [layouts, selectedSpiritId]);

  useEffect(() => {
    const container = panelCanvasRef.current;
    if (!container) {
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

    observer.observe(container);
    return () => observer.disconnect();
  }, [selectedSpiritId, panelImageAspectRatio]);

  const updateSlotPosition = (index: number, x: number, y: number) => {
    setSlots((current) => {
      const next = [...current];
      const slot = next[index];
      if (!slot) return current;
      next[index] = {
        ...slot,
        x,
        y,
      };
      return next;
    });
  };

  const updateSlotReward = (index: number, reward: string) => {
    setSlots((current) => {
      const next = [...current];
      const slot = next[index];
      if (!slot) return current;

      const trimmed = reward.trim();
      next[index] = {
        ...slot,
        reward: trimmed.length > 0 ? trimmed : undefined,
        effects: slot.effects ?? [],
      };
      return next;
    });
  };

  const updateBaseElement = (element: ElementName, value: number) => {
    const next = clampInt(value, 0, 20);
    setBaseElements((current) => {
      const clone = { ...current };
      if (next > 0) {
        clone[element] = next;
      } else {
        delete clone[element];
      }
      return clone;
    });
  };

  const updateSlotEffects = (index: number, mutator: (effects: PresenceEffect[]) => PresenceEffect[]) => {
    setSlots((current) => {
      const next = [...current];
      const slot = next[index];
      if (!slot) return current;
      next[index] = {
        ...slot,
        effects: mutator([...slot.effects]),
      };
      return next;
    });
  };

  const addEffectToSlot = (index: number) => {
    updateSlotEffects(index, (effects) => [...effects, createDefaultEffect()]);
  };

  const removeEffectFromSlot = (slotIndex: number, effectIndex: number) => {
    updateSlotEffects(slotIndex, (effects) => effects.filter((_, i) => i !== effectIndex));
  };

  const updateSlotEffectKind = (slotIndex: number, effectIndex: number, kind: PresenceEffect['kind']) => {
    updateSlotEffects(slotIndex, (effects) => {
      const existing = effects[effectIndex];
      if (!existing) return effects;
      if (kind === 'add-element') {
        effects[effectIndex] = { kind, element: 'sun', value: existing.value };
      } else {
        effects[effectIndex] = { kind, value: existing.value };
      }
      return effects;
    });
  };

  const updateSlotEffectValue = (slotIndex: number, effectIndex: number, value: number) => {
    updateSlotEffects(slotIndex, (effects) => {
      const existing = effects[effectIndex];
      if (!existing) return effects;
      const safe = clampInt(value, 0, 20);
      if (existing.kind === 'add-element') {
        effects[effectIndex] = { ...existing, value: safe };
      } else {
        effects[effectIndex] = { ...existing, value: safe };
      }
      return effects;
    });
  };

  const updateSlotEffectElement = (slotIndex: number, effectIndex: number, element: ElementName) => {
    updateSlotEffects(slotIndex, (effects) => {
      const existing = effects[effectIndex];
      if (!existing || existing.kind !== 'add-element') return effects;
      effects[effectIndex] = { ...existing, element };
      return effects;
    });
  };

  const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
  };

  const getPointerPosition = (event: React.PointerEvent) => {
    const container = panelCanvasRef.current;
    if (!container) return null;

    const rect = container.getBoundingClientRect();
    const relativeX = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
    const relativeY = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0;

    const minX = markerRadiusPx / Math.max(rect.width, 1);
    const maxX = 1 - minX;
    const minY = markerRadiusPx / Math.max(rect.height, 1);
    const maxY = 1 - minY;

    const clampedX = clamp(relativeX, minX, maxX);
    const clampedY = clamp(relativeY, minY, maxY);

    const x = Math.round(clampedX * LAYOUT_MODEL_SIZE);
    const y = Math.round(clampedY * LAYOUT_MODEL_SIZE);
    return { x, y };
  };

  const startDraggingSlot = (event: React.PointerEvent, index: number) => {
    event.preventDefault();
    const position = getPointerPosition(event);
    if (position) {
      updateSlotPosition(index, position.x, position.y);
    }
    setDraggingSlotIndex(index);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const handleCanvasPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (draggingSlotIndex === null) return;
    const position = getPointerPosition(event);
    if (!position) return;
    updateSlotPosition(draggingSlotIndex, position.x, position.y);
  };

  const stopDraggingSlot = () => {
    if (draggingSlotIndex !== null) {
      setDraggingSlotIndex(null);
    }
  };

  const saveLayout = async () => {
    if (!selectedSpiritId) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/spirits/${selectedSpiritId}/layout`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          slots: slots.map((slot) => ({
            x: slot.x,
            y: slot.y,
            reward: slot.reward,
            effects: slot.effects,
          })),
          baseEnergyGain,
          baseCardPlays,
          baseElements,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save layout.');
      }

      const layout = data?.layout as Layout;
      setLayouts((current) => ({
        ...current,
        [layout.spiritId]: layout,
      }));
      setMessage('Layout saved. This spirit template will be reused in future games.');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const selectedSpirit = SPIRITS.find((spirit) => spirit.id === selectedSpiritId);
  const normalizedId = selectedSpiritId.toLowerCase();
  const lastSaved = layouts[normalizedId]?.updatedAt ?? layouts[selectedSpiritId]?.updatedAt ?? null;

  return (
    <section className="rounded-xl bg-white p-6 shadow">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Spirit Progression Editor</h2>
          <p className="text-sm text-slate-500">Configure base spirit stats plus per-slot permanent effects. Drag the 13 disks directly on the panel image.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Spirit</label>
            <select
              className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
              value={selectedSpiritId}
              onChange={(event) => setSelectedSpiritId(event.target.value)}
            >
              {SPIRITS.map((spirit) => (
                <option key={spirit.id} value={spirit.id}>
                  {spirit.name}
                </option>
              ))}
            </select>
          </div>

          {selectedSpirit ? (
            <div className="rounded border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-900">{selectedSpirit.name}</p>
              <p className="text-xs text-slate-500">{selectedSpirit.expansion} · {selectedSpirit.complexity}</p>
              {lastSaved ? <p className="mt-1 text-xs text-slate-500">Last saved: {new Date(lastSaved).toLocaleString()}</p> : null}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSlots(DEFAULT_LAYOUT());
                setBaseEnergyGain(DEFAULT_BASE_ENERGY_GAIN);
                setBaseCardPlays(DEFAULT_BASE_CARD_PLAYS);
                setBaseElements(EMPTY_BASE_ELEMENTS);
              }}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Reset Template
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={saveLayout}
              className="rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Layout'}
            </button>
          </div>

          {loading ? <p className="text-xs text-slate-500">Loading layouts...</p> : null}
          {message ? <p className="text-xs text-slate-600">{message}</p> : null}

          <div className="rounded border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Base Spirit Stats</p>
            <div className="mt-2 grid gap-2">
              <label className="text-xs font-semibold text-slate-700">
                Base Energy / Turn
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={baseEnergyGain}
                  onChange={(event) => setBaseEnergyGain(clampInt(Number(event.target.value), 0, 20))}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Base Card Plays
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={baseCardPlays}
                  onChange={(event) => setBaseCardPlays(clampInt(Number(event.target.value), 0, 20))}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                />
              </label>
              <div>
                <p className="text-xs font-semibold text-slate-700">Base Permanent Elements</p>
                <div className="mt-1 grid grid-cols-2 gap-1.5">
                  {ELEMENT_ORDER.map((element) => (
                    <label key={`base-${element}`} className="rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-[10px] font-semibold uppercase text-slate-600">
                      {element}
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={baseElements[element] ?? 0}
                        onChange={(event) => updateBaseElement(element, Number(event.target.value))}
                        className="mt-1 w-full rounded border border-slate-300 bg-white px-1 py-0.5 text-xs normal-case text-slate-700"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">Presence Slots (Drag to Position)</h3>
          <div className="flex flex-col gap-4">
            <div
              ref={panelCanvasRef}
              className="relative mx-auto w-full max-w-[980px] overflow-hidden rounded-lg border border-slate-300 bg-white"
              style={{ aspectRatio: `${panelImageAspectRatio}` }}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={stopDraggingSlot}
              onPointerCancel={stopDraggingSlot}
              onPointerLeave={stopDraggingSlot}
            >
              {selectedSpirit?.panel?.faceUrl ? (
                <img
                  src={selectedSpirit.panel.faceUrl}
                  alt={`${selectedSpirit.name} spirit panel`}
                  className="h-full w-full object-cover"
                  draggable={false}
                  onLoad={(event) => {
                    const image = event.currentTarget;
                    if (image.naturalWidth > 0 && image.naturalHeight > 0) {
                      setPanelImageAspectRatio(image.naturalWidth / image.naturalHeight);
                    }
                  }}
                />
              ) : null}

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

              {slots.map((slot, index) => (
                <button
                  key={`slot-${index + 1}`}
                  type="button"
                  onPointerDown={(event) => startDraggingSlot(event, index)}
                  className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[10px] font-bold text-white shadow-md ${
                    draggingSlotIndex === index
                      ? 'cursor-grabbing border-white bg-emerald-600'
                      : 'cursor-grab border-slate-100 bg-slate-800/90'
                  }`}
                  style={{
                    left: `${(slot.x / LAYOUT_MODEL_SIZE) * 100}%`,
                    top: `${(slot.y / LAYOUT_MODEL_SIZE) * 100}%`,
                    width: markerDiameterPx,
                    height: markerDiameterPx,
                    borderWidth: markerBorderPx,
                    fontSize: markerFontPx,
                  }}
                  aria-label={`Presence slot ${index + 1}${slot.reward ? ` (${slot.reward})` : ''}`}
                  title={slot.effects.length > 0
                    ? `Slot ${index + 1}: ${slot.effects.map((effect) => EFFECT_LABELS[effect.kind]).join(', ')}`
                    : slot.reward
                    ? `Slot ${index + 1}: ${slot.reward}`
                    : `Slot ${index + 1}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-500">
              Drag any disk to reposition. Coordinates are clamped to the spirit panel image and cannot move off-panel.
            </p>

            <div className="grid w-full grid-cols-1 gap-2 text-xs text-slate-600 md:grid-cols-2">
              {slots.map((slot, index) => (
                <div
                  key={`slot-coord-${index + 1}`}
                  className="rounded border border-slate-200 bg-white px-2 py-1.5"
                >
                  <p className="font-semibold text-slate-700 text-xs">S{index + 1}: ({slot.x}, {slot.y})</p>
                  <input
                    type="text"
                    value={slot.reward ?? ''}
                    onChange={(event) => updateSlotReward(index, event.target.value)}
                    placeholder="Optional note"
                    className="mt-1 w-full rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-700"
                  />
                  <div className="mt-1 space-y-1">
                    {slot.effects.map((effect, effectIndex) => (
                      <div key={`summary-${index}-effect-${effectIndex}`} className="flex flex-wrap items-center gap-1">
                        <select
                          value={effect.kind}
                          onChange={(event) => updateSlotEffectKind(index, effectIndex, event.target.value as PresenceEffect['kind'])}
                          className="rounded border border-slate-300 bg-white px-1 py-0.5 text-[10px]"
                        >
                          {EFFECT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        {effect.kind === 'add-element' ? (
                          <select
                            value={effect.element}
                            onChange={(event) => updateSlotEffectElement(index, effectIndex, event.target.value as ElementName)}
                            className="rounded border border-slate-300 bg-white px-1 py-0.5 text-[10px]"
                          >
                            {ELEMENT_ORDER.map((element) => (
                              <option key={`summ-eff-el-${element}`} value={element}>{element}</option>
                            ))}
                          </select>
                        ) : null}
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={effect.value}
                          onChange={(event) => updateSlotEffectValue(index, effectIndex, Number(event.target.value))}
                          className="w-10 rounded border border-slate-300 bg-white px-1 py-0.5 text-[10px]"
                        />
                        <button
                          type="button"
                          onClick={() => removeEffectFromSlot(index, effectIndex)}
                          className="rounded border border-rose-300 bg-rose-50 px-1 py-0.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addEffectToSlot(index)}
                      className="rounded border border-indigo-300 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      + Add Effect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SpiritPresenceLayoutEditor;
