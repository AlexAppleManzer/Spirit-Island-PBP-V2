import { useEffect, useMemo, useRef, useState } from 'react';
import { SPIRITS } from '../data/spirits';

type Slot = { x: number; y: number };

type Layout = {
  spiritId: string;
  slots: Slot[];
  updatedAt: string;
};

const BACKEND_URL = 'http://localhost:3001';
const LAYOUT_MODEL_SIZE = 440;
const DISK_RADIUS = 12;

const DEFAULT_LAYOUT = (): Slot[] => {
  const slots: Slot[] = [];
  const radius = 170;
  for (let i = 0; i < 13; i += 1) {
    const angle = (i / 13) * Math.PI * 2;
    slots.push({
      x: Math.round(220 + Math.cos(angle) * radius),
      y: Math.round(220 + Math.sin(angle) * radius),
    });
  }
  return slots;
};

const SpiritPresenceLayoutEditor: React.FC = () => {
  const [selectedSpiritId, setSelectedSpiritId] = useState(SPIRITS[0]?.id ?? '');
  const [layouts, setLayouts] = useState<Record<string, Layout>>({});
  const [slots, setSlots] = useState<Slot[]>(DEFAULT_LAYOUT());
  const [draggingSlotIndex, setDraggingSlotIndex] = useState<number | null>(null);
  const [panelImageAspectRatio, setPanelImageAspectRatio] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const panelCanvasRef = useRef<HTMLDivElement | null>(null);

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
        list.forEach((layout: Layout) => {
          if (layout?.spiritId) {
            nextLayouts[layout.spiritId] = layout;
          }
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
      setSlots(selected.slots.map((slot) => ({ x: slot.x, y: slot.y })));
      return;
    }

    setSlots(DEFAULT_LAYOUT());
  }, [layouts, selectedSpiritId]);

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

  const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
  };

  const getPointerPosition = (event: React.PointerEvent) => {
    const container = panelCanvasRef.current;
    if (!container) return null;

    const rect = container.getBoundingClientRect();
    const relativeX = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
    const relativeY = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0;

    const minX = DISK_RADIUS / Math.max(rect.width, 1);
    const maxX = 1 - minX;
    const minY = DISK_RADIUS / Math.max(rect.height, 1);
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
        body: JSON.stringify({ slots }),
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
          <h2 className="text-xl font-semibold text-slate-900">Spirit Presence Layout Editor</h2>
          <p className="text-sm text-slate-500">Drag the 13 presence disks directly on the spirit panel. Saved layouts are outside game instances.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
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
              onClick={() => setSlots(DEFAULT_LAYOUT())}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Reset Circle Layout
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
                  style={{ left: `${(slot.x / LAYOUT_MODEL_SIZE) * 100}%`, top: `${(slot.y / LAYOUT_MODEL_SIZE) * 100}%` }}
                  aria-label={`Presence slot ${index + 1}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-500">
              Drag any disk to reposition. Coordinates are clamped to the spirit panel image and cannot move off-panel.
            </p>

            <div className="grid w-full grid-cols-2 gap-2 text-xs text-slate-600 md:grid-cols-3">
              {slots.map((slot, index) => (
                <div key={`slot-coord-${index + 1}`} className="rounded border border-slate-200 bg-white px-2 py-1">
                  S{index + 1}: ({slot.x}, {slot.y})
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
