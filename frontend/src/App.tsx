import { useCallback, useEffect, useMemo, useState } from 'react';
import BoardPage from './pages/BoardPage';
import SpiritPresenceLayoutEditor from './components/SpiritPresenceLayoutEditor';

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
  playerUsernames?: string[];
  spiritCount?: number;
  playerCount?: number;
  status: string;
  outcome?: 'win' | 'loss' | null;
  currentPhase?: string;
  turn?: number;
  discordWebhookUrl?: string;
  createdAt: string;
  adversaryId?: string;
  adversaryLevel?: number;
};

type AdversaryLevel = {
  level: number;
  difficulty: number;
  fearThresholds: number[];
  invaderDeckOrder: string;
  setupNotes?: string;
};

type AdversaryDef = {
  id: string;
  name: string;
  description: string;
  levels: AdversaryLevel[];
};

type LobbyView = 'list' | 'create' | 'spirit-editor';

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('authToken'));
  const [user, setUser] = useState<User | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [lobbyView, setLobbyView] = useState<LobbyView>('list');
  const [adversaries, setAdversaries] = useState<AdversaryDef[]>([]);

  // Create-game form state
  const [newGameName, setNewGameName] = useState('');
  const [newGameWebhook, setNewGameWebhook] = useState('');
  const [newGameSpiritCount, setNewGameSpiritCount] = useState(2);
  const [newGameAdversaryId, setNewGameAdversaryId] = useState('none');
  const [newGameAdversaryLevel, setNewGameAdversaryLevel] = useState(0);

  // Manage players state
  const [managingGameId, setManagingGameId] = useState<string | null>(null);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);

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

  const refreshGames = useCallback(async () => {
    const response = await fetch(`${BACKEND_URL}/api/games`, {
      headers: { 'Content-Type': 'application/json', ...(authHeaders ?? {}) },
    });
    if (response.ok) {
      const data = await response.json();
      setGames(data);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (!token) return;

    void refreshGames();
  }, [token, refreshGames]);

  // Fetch adversary list once on login (no auth required)
  useEffect(() => {
    if (!token) return;

    fetch(`${BACKEND_URL}/api/adversaries`)
      .then((r) => r.json())
      .then((data: AdversaryDef[]) => setAdversaries(data))
      .catch(() => {});
  }, [token]);

  // Handle invite token in URL: ?invite=<token>
  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');
    if (!inviteToken) return;

    // Clear the token from the URL immediately
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    window.history.replaceState({}, '', url.toString());

    const joinViaToken = async () => {
      const response = await fetch(`${BACKEND_URL}/api/join/${inviteToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.game) {
          setGames((prev) => {
            const exists = prev.find((g) => g.id === data.game.id);
            return exists ? prev.map((g) => (g.id === data.game.id ? data.game : g)) : [...prev, data.game];
          });
          setSelectedGameId(data.game.id);
        }
      } else {
        const data = await response.json();
        setError(data.error ?? 'Invalid or expired invite link');
      }
    };

    void joinViaToken();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const clearAuth = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    setSelectedGameId(null);
    setGames([]);
    setAdversaries([]);
    setLobbyView('list');
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
      setError(data.error ?? data.message ?? 'Authentication failed');
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
      body: JSON.stringify({
        name: newGameName,
        discordWebhookUrl: newGameWebhook || undefined,
        spiritCount: newGameSpiritCount,
        adversaryId: newGameAdversaryId,
        adversaryLevel: newGameAdversaryLevel,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.message ?? data.error ?? 'Unable to create game');
      return;
    }

    const created = await response.json();
    setGames((current) => [...current, created]);
    // Reset form and return to list
    setNewGameName('');
    setNewGameWebhook('');
    setNewGameSpiritCount(2);
    setNewGameAdversaryId('none');
    setNewGameAdversaryLevel(0);
    setLobbyView('list');
  };

  const handleLeaveGame = async (gameId: string) => {
    setError(null);
    const game = games.find((g) => g.id === gameId);
    if (game && game.ownerId === user?.id) {
      setError('You are the owner. Delete the game instead of leaving.');
      return;
    }
    const response = await fetch(`${BACKEND_URL}/api/games/${gameId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(authHeaders ?? {}) },
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.message ?? data.error ?? 'Unable to leave game');
      return;
    }

    await refreshGames();
    if (selectedGameId === gameId) {
      setSelectedGameId(null);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!window.confirm('Delete this game? This cannot be undone.')) return;
    setError(null);
    const response = await fetch(`${BACKEND_URL}/api/games/${gameId}`, {
      method: 'DELETE',
      headers: { ...(authHeaders ?? {}) },
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? 'Unable to delete game');
      return;
    }
    setGames((prev) => prev.filter((g) => g.id !== gameId));
    if (selectedGameId === gameId) setSelectedGameId(null);
  };

  const handleAddPlayer = async (gameId: string) => {
    setInviteError(null);
    if (!inviteUsername.trim()) return;
    const response = await fetch(`${BACKEND_URL}/api/games/${gameId}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(authHeaders ?? {}) },
      body: JSON.stringify({ username: inviteUsername.trim() }),
    });
    const data = await response.json();
    if (!response.ok) {
      setInviteError(data.error ?? 'Unable to add player');
      return;
    }
    setGames((prev) => prev.map((g) => (g.id === gameId ? data : g)));
    setInviteUsername('');
  };

  const handleRemovePlayer = async (gameId: string, playerId: number) => {
    setInviteError(null);
    const response = await fetch(`${BACKEND_URL}/api/games/${gameId}/players/${playerId}`, {
      method: 'DELETE',
      headers: { ...(authHeaders ?? {}) },
    });
    const data = await response.json();
    if (!response.ok) {
      setInviteError(data.error ?? 'Unable to remove player');
      return;
    }
    setGames((prev) => prev.map((g) => (g.id === gameId ? data : g)));
  };

  const handleCopyInviteLink = async (gameId: string) => {
    const response = await fetch(`${BACKEND_URL}/api/games/${gameId}/invite-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(authHeaders ?? {}) },
      body: JSON.stringify({}),
    });
    if (!response.ok) return;
    const data = await response.json();
    const link = `${window.location.origin}${window.location.pathname}?invite=${data.token}`;
    await navigator.clipboard.writeText(link);
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

  // Show board page if a game is selected
  if (selectedGameId && games.length > 0) {
    const selectedGame = games.find((g) => g.id === selectedGameId);
    if (selectedGame) {
      // Spectator guard: must be a player to enter the game
      if (!selectedGame.playerIds.includes(user?.id ?? -1)) {
        return (
          <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
            <div className="rounded-xl bg-white p-8 shadow text-center space-y-4">
              <p className="text-lg font-semibold text-slate-800">You are not a member of this game.</p>
              <p className="text-sm text-slate-500">Ask the game owner to invite you.</p>
              <button
                onClick={() => setSelectedGameId(null)}
                className="rounded bg-slate-800 px-4 py-2 text-sm text-white"
              >
                Back to lobby
              </button>
            </div>
          </div>
        );
      }
      return (
        <BoardPage
          gameId={selectedGameId}
          game={selectedGame}
          userId={user?.id ?? 0}
          token={token ?? ''}
          onBack={() => {
            setSelectedGameId(null);
          }}
        />
      );
    }
  }

  // Show spirit editor page
  if (lobbyView === 'spirit-editor') {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <button
            onClick={() => setLobbyView('list')}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            ← Back to lobby
          </button>
          <SpiritPresenceLayoutEditor />
        </div>
      </div>
    );
  }

  // Show lobby
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

        <section className="flex flex-col gap-6 max-w-lg">
          <div className="rounded-xl bg-white p-6 shadow">
            {lobbyView === 'list' ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Games</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLobbyView('spirit-editor')}
                      className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Spirit Editor
                    </button>
                    <button
                      onClick={() => { setError(null); setLobbyView('create'); }}
                      className="rounded bg-slate-800 px-3 py-2 text-sm text-white"
                    >
                      + New Game
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {games.length === 0 && (
                    <p className="text-sm text-slate-500">No active games yet.</p>
                  )}
                  {games.map((game) => {
                    const adv = adversaries.find((a) => a.id === game.adversaryId);
                    const lvl = adv?.levels.find((l) => l.level === (game.adversaryLevel ?? 0));
                    const adversaryLabel =
                      adv && adv.id !== 'none'
                        ? `${adv.name} L${game.adversaryLevel ?? 0} · Fear: ${lvl?.fearThresholds.join('/') ?? '?'}`
                        : null;
                    const isOwner = game.ownerId === user?.id;
                    const isMember = game.playerIds.includes(user?.id ?? -1);
                    const isManaging = managingGameId === game.id;
                    return (
                      <div key={game.id} className="rounded border p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold">{game.name}</p>
                              {game.outcome === 'win' && (
                                <span className="text-xs font-semibold text-green-700 bg-green-100 rounded px-2 py-0.5">Victory</span>
                              )}
                              {game.outcome === 'loss' && (
                                <span className="text-xs font-semibold text-red-700 bg-red-100 rounded px-2 py-0.5">Defeat</span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">
                              Phase: {game.currentPhase ?? 'growth'} · Turn {game.turn ?? 1}
                            </p>
                            <p className="text-xs text-slate-500">
                              Spirits: {game.spiritCount ?? game.playerCount ?? game.playerIds.length}/6
                            </p>
                            {adversaryLabel && (
                              <p className="text-xs text-slate-400">{adversaryLabel}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            {isMember && (
                              <>
                                <button
                                  onClick={() => setSelectedGameId(game.id)}
                                  className="rounded bg-slate-800 px-3 py-2 text-sm text-white"
                                >
                                  Open
                                </button>
                                {!isOwner && (
                                  <button
                                    onClick={() => handleLeaveGame(game.id)}
                                    className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
                                  >
                                    Leave
                                  </button>
                                )}
                              </>
                            )}
                            {isOwner && (
                              <>
                                <button
                                  onClick={() => {
                                    setManagingGameId(isManaging ? null : game.id);
                                    setInviteUsername('');
                                    setInviteError(null);
                                  }}
                                  className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  {isManaging ? 'Done' : 'Manage'}
                                </button>
                                <button
                                  onClick={() => handleDeleteGame(game.id)}
                                  className="rounded border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Manage Players Panel (owner-only) */}
                        {isOwner && isManaging && (
                          <div className="border-t pt-2 space-y-2">
                            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Players</p>
                            {game.playerIds.map((pid, idx) => {
                              const uname = game.playerUsernames?.[idx] ?? String(pid);
                              return (
                                <div key={pid} className="flex items-center justify-between gap-2">
                                  <span className="text-sm text-slate-700">{uname}</span>
                                  {pid !== user?.id && (
                                    <button
                                      onClick={() => handleRemovePlayer(game.id, pid)}
                                      className="text-xs text-red-500 hover:text-red-700"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                            <div className="flex gap-2 pt-1">
                              <input
                                value={inviteUsername}
                                onChange={(e) => setInviteUsername(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && void handleAddPlayer(game.id)}
                                placeholder="Username"
                                className="flex-1 rounded border px-2 py-1 text-sm"
                              />
                              <button
                                onClick={() => void handleAddPlayer(game.id)}
                                className="rounded bg-slate-800 px-3 py-1 text-sm text-white"
                              >
                                Add
                              </button>
                              <button
                                onClick={() => void handleCopyInviteLink(game.id)}
                                className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                                title="Copy invite link to clipboard"
                              >
                                Copy Link
                              </button>
                            </div>
                            {inviteError && (
                              <p className="text-xs text-red-600">{inviteError}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* ── Create Game Screen ────────────────────────────────── */
              <>
                <button
                  onClick={() => { setError(null); setLobbyView('list'); }}
                  className="mb-4 text-sm text-slate-500 hover:text-slate-800"
                >
                  ← Back to games
                </button>
                <h2 className="text-lg font-semibold mb-4">New Game</h2>
                <div className="space-y-4">
                  {/* Game name */}
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Game Name</span>
                    <input
                      value={newGameName}
                      onChange={(e) => setNewGameName(e.target.value)}
                      className="mt-1 block w-full rounded border px-3 py-2"
                      placeholder="e.g. Saturday PBP Game"
                    />
                  </label>

                  {/* Player / spirit count */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Players</span>
                      <span className="text-sm font-semibold text-slate-900">{newGameSpiritCount}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={6}
                      step={1}
                      value={newGameSpiritCount}
                      onChange={(e) => setNewGameSpiritCount(Number(e.target.value))}
                      className="mt-1 w-full accent-slate-800"
                    />
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>1</span><span>6</span>
                    </div>
                  </div>

                  {/* Adversary picker */}
                  <div>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Adversary</span>
                      <select
                        value={newGameAdversaryId}
                        onChange={(e) => {
                          setNewGameAdversaryId(e.target.value);
                          setNewGameAdversaryLevel(0);
                        }}
                        className="mt-1 block w-full rounded border px-3 py-2 bg-white"
                      >
                        {adversaries.map((adv) => (
                          <option key={adv.id} value={adv.id}>
                            {adv.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {/* Level picker — hidden for 'none' */}
                  {newGameAdversaryId !== 'none' && (() => {
                    const adv = adversaries.find((a) => a.id === newGameAdversaryId);
                    const maxLevel = adv ? adv.levels.length - 1 : 6;
                    const selectedLvl = adv?.levels.find((l) => l.level === newGameAdversaryLevel);
                    return (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">Level</span>
                          <span className="text-sm font-semibold text-slate-900">{newGameAdversaryLevel}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={maxLevel}
                          step={1}
                          value={newGameAdversaryLevel}
                          onChange={(e) => setNewGameAdversaryLevel(Number(e.target.value))}
                          className="mt-1 w-full accent-slate-800"
                        />
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>0</span><span>{maxLevel}</span>
                        </div>
                        {selectedLvl && (
                          <div className="mt-2 rounded bg-slate-50 border p-3 text-xs text-slate-600 space-y-1">
                            <p>
                              <span className="font-medium">Difficulty:</span> +{selectedLvl.difficulty} ·{' '}
                              <span className="font-medium">Fear:</span>{' '}
                              {selectedLvl.fearThresholds.join('/')} ·{' '}
                              <span className="font-medium">Invader cards:</span>{' '}
                              {selectedLvl.invaderDeckOrder.length}
                            </p>
                            <p>
                              <span className="font-medium">Deck order:</span>{' '}
                              {selectedLvl.invaderDeckOrder}
                            </p>
                            {selectedLvl.setupNotes && (
                              <p className="text-slate-500 italic">{selectedLvl.setupNotes}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Discord webhook (optional) */}
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">
                      Discord Webhook{' '}
                      <span className="text-slate-400 font-normal">(optional)</span>
                    </span>
                    <input
                      value={newGameWebhook}
                      onChange={(e) => setNewGameWebhook(e.target.value)}
                      className="mt-1 block w-full rounded border px-3 py-2"
                      placeholder="https://discord.com/api/webhooks/..."
                    />
                  </label>

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <button
                    onClick={handleCreateGame}
                    className="w-full rounded bg-slate-800 px-4 py-2 text-white font-medium"
                  >
                    Create Game
                  </button>
                </div>
              </>
            )}
          </div>

        </section>
      </div>
    </div>
  );
}

export default App;

