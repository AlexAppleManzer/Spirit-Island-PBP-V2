import React, { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import BoardView from '../components/BoardView';

type Game = {
  id: string;
  name: string;
  ownerId: number;
  playerIds: number[];
  status: string;
  currentPhase: string;
  round: number;
  discordWebhookUrl?: string;
  createdAt: string;
};

interface BoardPageProps {
  gameId: string;
  game: Game;
  onBack: () => void;
}

const BoardPage: React.FC<BoardPageProps> = ({ gameId, game, onBack }) => {
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  useEffect(() => {
    // If provider already exists for this game, reuse it
    if (providerRef.current !== null) {
      console.log('[BoardPage] Provider already exists, skipping recreation');
      setWsConnected(providerRef.current.wsconnected);
      
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
    const provider = new WebsocketProvider('ws://localhost:3001', roomName, doc);
    docRef.current = doc;
    providerRef.current = provider;
    
    console.log('[BoardPage] Creating WebSocket provider for', roomName);
    setWsConnected(provider.wsconnected);

    const statusHandler = (event: any) => {
      console.log('[BoardPage] WebSocket status:', event.status);
      setWsConnected(provider.wsconnected);
    };

    provider.on('status', statusHandler);

    return () => {
      console.log('[BoardPage] Effect cleanup for', roomName);
      provider.off('status', statusHandler);
    };
  }, [gameId]);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="border-b bg-white shadow">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <button
                onClick={onBack}
                className="mb-2 text-sm text-slate-600 underline hover:text-slate-900"
              >
                ← Back to Lobby
              </button>
              <h1 className="text-3xl font-bold text-slate-900">{game.name}</h1>
              <p className="text-sm text-slate-500">
                Phase: <span className="font-semibold">{game.currentPhase}</span> · Round{' '}
                <span className="font-semibold">{game.round}</span>
              </p>
            </div>
            <div className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium">
              {wsConnected ? (
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500"></span>
                  Connecting...
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Board Area */}
      <main className="mx-auto max-w-7xl px-6 py-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="rounded-lg bg-white p-6 shadow">
          <BoardView docRef={docRef} />
        </div>
      </main>
    </div>
  );
};

export default BoardPage;
