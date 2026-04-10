import { useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import BoardView from './components/BoardView';
import PieceEditor from './components/PieceEditor';

const BACKEND_URL = 'http://localhost:3001';

type User = {
  id: number;
  username: string;
  email: string;
};

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

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('authToken'));
  const [user, setUser] = useState<User | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [newGameName, setNewGameName] = useState('');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [gameState, setGameState] = useState<Record<string, unknown> | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  const authHeaders = useMemo(() => {
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const fetchProfile = async () => {
      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { 'Content-Type': 'application/json', ...(authHeaders ?? {}) },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    };

    fetchProfile();
  }, [token, authHeaders]);

  useEffect(() => {
    if (!token) return;

    const fetchGames = async () => {
      const response = await fetch(`${BACKEND_URL}/api/games`, {
        headers: { 'Content-Type': 'application/json', ...(authHeaders ?? {}) },
      });
      if (response.ok) {
        const data = await response.json();
        setGames(data);
      }
    };

    fetchGames();
  }, [token, authHeaders]);

  useEffect(() => {
    if (!token || !selectedGameId) {
      setGameState(null);
      return;
    }

    const fetchGameState = async () => {
      const response = await fetch(`${BACKEND_URL}/api/games/${selectedGameId}/state`, {
        headers: { 'Content-Type': 'application/json', ...(authHeaders ?? {}) },
      });
      if (response.ok) {
        const data = await response.json();
        setGameState(data);
      }
    };

    fetchGameState();
  }, [token, selectedGameId, authHeaders]);

  useEffect(() => {
    if (!roomName) {
      setWsConnected(false);
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (docRef.current) {
        docRef.current.destroy();
        docRef.current = null;
      }
      return;
    }

    const doc = new Y.Doc();
    const provider = new WebsocketProvider('ws://localhost:3001', roomName, doc);
    docRef.current = doc;
    providerRef.current = provider;
    setWsConnected(provider.wsconnected);

    const statusHandler = () => {
      setWsConnected(provider.wsconnected);
    };

    provider.on('status', statusHandler);
    provider.connect();

    return () => {
      provider.off('status', statusHandler);
      provider.destroy();
      doc.destroy();
      providerRef.current = null;
      docRef.current = null;
    };
  }, [roomName]);

  const clearAuth = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    setSelectedGameId(null);
    setRoomName(null);
    setGames([]);
  };

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const endpoint = isSigningUp ? 'register' : 'login';
    const body = isSigningUp
      ? { username, email, password }
      : { email, password };

    const response = await fetch(`${BACKEND_URL}/api/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.message ?? 'Authentication failed');
      return;
    }

    const data = await response.json();
    if (isSigningUp) {
      setIsSigningUp(false);
      setError('Registration successful. Please log in.');
      return;
    }

    setToken(data.token);
    localStorage.setItem('authToken', data.token);
    setUser(data.user);
    setEmail('');
    setPassword('');
    setUsername('');
  };

  const handleCreateGame = async () => {
    if (!newGameName.trim()) {
      setError('Game name is required');
      return;
    }

    const response = await fetch(`${BACKEND_URL}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(authHeaders ?? {}) },
      body: JSON.stringify({ name: newGameName }),
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.message ?? 'Unable to create game');
      return;
    }

    const created = await response.json();
    setGames((current) => [...current, created]);
    setNewGameName('');
  };

  const handleJoinGame = async (gameId: string) => {
    setError(null);
    const response = await fetch(`${BACKEND_URL}/api/games/${gameId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(authHeaders ?? {}) },
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.message ?? 'Unable to join game');
      return;
    }

    setSelectedGameId(gameId);
    setRoomName(`game-${gameId}`);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
          <h1 className="text-2xl font-bold mb-4">Spirit Island Core Demo</h1>
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isSigningUp && (
              <label className="block">
                <span className="text-sm font-medium">Username</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="mt-1 block w-full rounded border px-3 py-2"
                  placeholder="Username"
                />
              </label>
            )}
            <label className="block">
              <span className="text-sm font-medium">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 block w-full rounded border px-3 py-2"
                placeholder="Email"
                type="email"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 block w-full rounded border px-3 py-2"
                placeholder="Password"
                type="password"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="w-full rounded bg-slate-800 px-4 py-2 text-white"
            >
              {isSigningUp ? 'Register' : 'Login'}
            </button>
          </form>
          <button
            type="button"
            className="mt-4 text-sm text-slate-600 underline"
            onClick={() => {
              setIsSigningUp((current) => !current);
              setError(null);
            }}
          >
            {isSigningUp ? 'Already have an account? Log in' : 'Create a new account'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-xl bg-white p-6 shadow">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-500">Signed in as</p>
              <h1 className="text-2xl font-bold text-slate-900">{user?.username}</h1>
            </div>
            <button
              onClick={clearAuth}
              className="rounded bg-slate-800 px-4 py-2 text-white"
            >
              Sign out
            </button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="text-lg font-semibold mb-4">Games</h2>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  value={newGameName}
                  onChange={(event) => setNewGameName(event.target.value)}
                  className="flex-1 rounded border px-3 py-2"
                  placeholder="New game name"
                />
                <button
                  onClick={handleCreateGame}
                  className="rounded bg-slate-800 px-3 py-2 text-white"
                >
                  Create
                </button>
              </div>
              <div className="space-y-2">
                {games.length === 0 && (
                  <p className="text-sm text-slate-500">No active games yet.</p>
                )}
                {games.map((game) => (
                  <div key={game.id} className="rounded border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{game.name}</p>
                        <p className="text-sm text-slate-500">
                          Phase: {game.currentPhase} · Round {game.round}
                        </p>
                      </div>
                      <button
                        onClick={() => handleJoinGame(game.id)}
                        className="rounded bg-slate-800 px-3 py-2 text-sm text-white"
                      >
                        Join
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Game room</h2>
                <p className="text-sm text-slate-500">
                  {selectedGameId ? `Connected to ${selectedGameId}` : 'Join a game to connect.'}
                </p>
              </div>
              <div className="rounded-full border px-3 py-1 text-sm">
                {wsConnected ? 'WebSocket connected' : 'Disconnected'}
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            {selectedGameId ? (
              <div className="mt-6 space-y-4">
                <BoardView docRef={docRef} />
              </div>
            ) : (
              <div className="mt-6 rounded border border-dashed border-slate-300 p-6 text-slate-600">
                Join a game to open the collaborative board room.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;

