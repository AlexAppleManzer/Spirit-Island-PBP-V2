import React, { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import BoardView, { type BoardViewHandle } from '../components/BoardView';
import GamestatePanel from '../components/GamestatePanel';
import InvaderDeckSetupPage from '../components/InvaderDeckSetupPage';
import EventDeckSetupPage from '../components/EventDeckSetupPage';
import SpiritPanelPage from '../components/SpiritPanelPage';

const MIN_LEFT_PANEL_PERCENT = 20;
const MAX_LEFT_PANEL_PERCENT = 55;
const MIN_TOP_PANEL_HEIGHT = 180;
const MIN_BOTTOM_PANEL_HEIGHT = 160;
const RESIZER_THICKNESS = 8;

type Game = {
  id: string;
  name: string;
  ownerId: number;
  playerIds: number[];
  status: string;
  currentPhase?: string;
  turn?: number;
  discordWebhookUrl?: string;
  createdAt: string;
};

interface BoardPageProps {
  gameId: string;
  game: Game;
  userId: number;
  token: string;
  onBack: () => void;
}

const BoardPage: React.FC<BoardPageProps> = ({ gameId, game, userId, token, onBack }) => {
  const [wsConnected, setWsConnected] = useState(false);
  const [docReady, setDocReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subpage, setSubpage] = useState<'board' | 'spirit' | 'invader-setup' | 'event-setup'>('board');
  const [boardToolbarState, setBoardToolbarState] = useState({ manageBoardsMode: false, zoomPercent: 100 });
  const [resizeModeEnabled, setResizeModeEnabled] = useState(false);
  const [leftPanelPercent, setLeftPanelPercent] = useState(30);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(260);
  const [savedBottomPanelHeight, setSavedBottomPanelHeight] = useState<number | null>(null);
  const [activeResizer, setActiveResizer] = useState<'vertical' | 'horizontal' | null>(null);
  const [selectedSpiritSlotId, setSelectedSpiritSlotId] = useState<string | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const boardViewRef = useRef<BoardViewHandle | null>(null);
  const boardLayoutRef = useRef<HTMLDivElement | null>(null);

  const clamp = (value: number, min: number, max: number) => {
    return Math.min(max, Math.max(min, value));
  };

  const getMaxBottomPanelHeight = () => {
    if (!boardLayoutRef.current) {
      return null;
    }

    const bounds = boardLayoutRef.current.getBoundingClientRect();
    return Math.max(
      MIN_BOTTOM_PANEL_HEIGHT,
      bounds.height - MIN_TOP_PANEL_HEIGHT - (resizeModeEnabled ? RESIZER_THICKNESS : 0)
    );
  };

  const toggleSpiritPanelHeight = () => {
    const maxBottom = getMaxBottomPanelHeight();
    if (maxBottom === null) return;

    if (savedBottomPanelHeight === null) {
      setSavedBottomPanelHeight(bottomPanelHeight);
      setBottomPanelHeight(maxBottom);
      return;
    }

    setBottomPanelHeight(clamp(savedBottomPanelHeight, MIN_BOTTOM_PANEL_HEIGHT, maxBottom));
    setSavedBottomPanelHeight(null);
  };

  useEffect(() => {
    if (!resizeModeEnabled) {
      setActiveResizer(null);
    }
  }, [resizeModeEnabled]);

  useEffect(() => {
    if (!activeResizer) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!boardLayoutRef.current) {
        return;
      }

      const bounds = boardLayoutRef.current.getBoundingClientRect();
      if (activeResizer === 'vertical') {
        const nextPercent = ((event.clientX - bounds.left) / bounds.width) * 100;
        setLeftPanelPercent(clamp(nextPercent, MIN_LEFT_PANEL_PERCENT, MAX_LEFT_PANEL_PERCENT));
        return;
      }

      const maxBottom = Math.max(
        MIN_BOTTOM_PANEL_HEIGHT,
        bounds.height - MIN_TOP_PANEL_HEIGHT - (resizeModeEnabled ? RESIZER_THICKNESS : 0)
      );
      const nextBottom = bounds.bottom - event.clientY;
      setBottomPanelHeight(clamp(nextBottom, MIN_BOTTOM_PANEL_HEIGHT, maxBottom));
    };

    const handleMouseUp = () => {
      setActiveResizer(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeResizer, resizeModeEnabled]);

  useEffect(() => {
    // If provider already exists for this game, reuse it
    if (providerRef.current !== null) {
      console.log('[BoardPage] Provider already exists, skipping recreation');
      setWsConnected(providerRef.current.wsconnected);
      setDocReady(true);

      const statusHandler = (event: any) => {
        console.log('[BoardPage] WebSocket status:', event.status);
        setWsConnected(providerRef.current!.wsconnected);
      };

      providerRef.current.on('status', statusHandler);

      return () => {
        providerRef.current?.off('status', statusHandler);
      };
    }

    const roomName = `game-${gameId}`;

    const doc = new Y.Doc();
    const backendWsUrl = (import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001').replace(/^http/, 'ws');
    const provider = new WebsocketProvider(backendWsUrl, roomName, doc);
    docRef.current = doc;
    providerRef.current = provider;

    console.log('[BoardPage] Creating WebSocket provider for', roomName);
    setWsConnected(provider.wsconnected);

    const statusHandler = (event: any) => {
      console.log('[BoardPage] WebSocket status:', event.status);
      setWsConnected(provider.wsconnected);
    };

    // Wait for the initial sync to complete before showing the board.
    // After sync, verify the server actually sent game state (boards must exist).
    // If the server has no state the board would silently appear empty — error
    // instead so the problem is visible.
    const syncedHandler = (isSynced: boolean) => {
      if (!isSynced) return;
      const gameMap = doc.getMap('game');
      const boards = gameMap.get('boards');
      if (!(boards instanceof Y.Map)) {
        setError('Game state not found on server. The game may not have been initialized correctly. Please ask the owner to recreate the game.');
        return;
      }
      setDocReady(true);
    };

    provider.on('status', statusHandler);
    provider.on('synced', syncedHandler);

    return () => {
      console.log('[BoardPage] Effect cleanup for', roomName);
      provider.off('status', statusHandler);
      provider.off('synced', syncedHandler);
    };
  }, [gameId]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden px-3 py-2">
            <button
              onClick={onBack}
              className="shrink-0 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] text-slate-700 hover:bg-slate-100"
            >
              Back to Lobby
            </button>

            <span className="min-w-0 flex-1 truncate text-base font-semibold text-slate-800">{game.name}</span>

            <div className="shrink-0 rounded-full border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium" title={wsConnected ? 'Connected' : 'Connecting...'}>
              {wsConnected ? (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  On
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500"></span>
                  Off
                </span>
              )}
            </div>

          <div className="flex min-w-0 items-center gap-1">
            <div className="min-w-0 flex-1 overflow-x-auto hide-scrollbar">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setSubpage('board')}
                  className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                    subpage === 'board' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  Board
                </button>
                <button
                  type="button"
                  onClick={() => setSubpage('spirit')}
                  className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                    subpage === 'spirit' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  Manage Spirits
                </button>
                <button
                  type="button"
                  onClick={() => setSubpage('invader-setup')}
                  className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                    subpage === 'invader-setup' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  Invader Setup
                </button>
                <button
                  type="button"
                  onClick={() => setSubpage('event-setup')}
                  className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                    subpage === 'event-setup' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  Event Setup
                </button>
              </div>
            </div>

            {subpage === 'board' ? (
              <div className="shrink-0 inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setResizeModeEnabled((current) => !current)}
                  className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                    resizeModeEnabled ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  Resize Windows {resizeModeEnabled ? 'On' : 'Off'}
                </button>
                <button
                  type="button"
                  onClick={() => boardViewRef.current?.toggleManageBoardsMode()}
                  className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                    boardToolbarState.manageBoardsMode
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  Manage Boards {boardToolbarState.manageBoardsMode ? '✓' : ''}
                </button>
                <button
                  type="button"
                  onClick={() => boardViewRef.current?.zoomOut()}
                  className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-white"
                  title="Zoom out"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => boardViewRef.current?.resetZoom()}
                  className="rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-white"
                  title="Reset zoom"
                >
                  {boardToolbarState.zoomPercent}%
                </button>
                <button
                  type="button"
                  onClick={() => boardViewRef.current?.zoomIn()}
                  className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-white"
                  title="Zoom in"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => boardViewRef.current?.centerOnBoards()}
                  className="rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-white"
                  title="Center on boards"
                >
                  Center
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>


      {/* Board Area */}
      <main className="min-h-0 flex-1 overflow-hidden p-0">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
            <div className="w-full max-w-md rounded-lg bg-red-50 p-5 text-red-700">
              <p className="font-semibold">Failed to load game</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
            <button
              onClick={onBack}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Back to Lobby
            </button>
          </div>
        ) : !docReady ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Connecting…
          </div>
        ) : subpage === 'board' ? (
          <div
            ref={boardLayoutRef}
            className="grid h-full min-h-0"
            style={{
              gridTemplateRows: `minmax(0, 1fr) ${resizeModeEnabled ? RESIZER_THICKNESS : 0}px ${bottomPanelHeight}px`,
            }}
          >
            <div
              className="grid min-h-0 min-w-0"
              style={{
                gridTemplateColumns: `${leftPanelPercent}% ${resizeModeEnabled ? RESIZER_THICKNESS : 0}px minmax(0, 1fr)`,
              }}
            >
              <div className="h-full min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow">
                <GamestatePanel
                  docRef={docRef}
                  selectedSpiritId={selectedSpiritSlotId}
                  isOwner={game.ownerId === userId}
                  gameId={gameId}
                  token={token}
                />
              </div>
              <div
                role="separator"
                aria-label="Resize side panels"
                className={`h-full ${resizeModeEnabled ? 'cursor-col-resize bg-slate-200 hover:bg-slate-300' : ''}`}
                onMouseDown={(event) => {
                  if (!resizeModeEnabled) return;
                  event.preventDefault();
                  setActiveResizer('vertical');
                }}
              />
              <div className="min-h-0 min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-2 shadow">
                <BoardView ref={boardViewRef} docRef={docRef} onToolbarStateChange={setBoardToolbarState} />
              </div>
            </div>

            <div
              role="separator"
              aria-label="Resize top and bottom panels"
              className={`${resizeModeEnabled ? 'cursor-row-resize bg-slate-200 hover:bg-slate-300' : ''}`}
              onMouseDown={(event) => {
                if (!resizeModeEnabled) return;
                event.preventDefault();
                setActiveResizer('horizontal');
              }}
            />

            <div className="min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow">
              <div className="h-full overflow-y-auto p-2">
                <SpiritPanelPage
                  docRef={docRef}
                  mode="full"
                  onToggleSpiritPanelHeight={toggleSpiritPanelHeight}
                  spiritPanelExpanded={savedBottomPanelHeight !== null}
                  resizeModeEnabled={resizeModeEnabled}
                  onSelectedSpiritChange={setSelectedSpiritSlotId}
                />
              </div>
            </div>
          </div>
        ) : subpage === 'spirit' ? (
          <SpiritPanelPage docRef={docRef} mode="manage" />
        ) : subpage === 'invader-setup' ? (
          <InvaderDeckSetupPage docRef={docRef} />
        ) : (
          <EventDeckSetupPage docRef={docRef} />
        )}
      </main>

    </div>
  );
};

export default BoardPage;
