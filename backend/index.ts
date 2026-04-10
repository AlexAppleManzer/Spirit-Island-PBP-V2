import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

type Request = express.Request;
type Response = express.Response;

// Config
const PORT = parseInt(process.env.PORT || '3001');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/pbpv2';

// Database pool
const pool = new Pool({ connectionString: DATABASE_URL });

// Express setup
const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// In-memory game documents (Y.Doc per game)
const gameDocs = new Map<string, Y.Doc>();

// Helper to save game state to database
const saveGameStateToDb = async (gameId: string, ydoc: Y.Doc) => {
  try {
    const gameIdNum = parseInt(gameId);
    if (isNaN(gameIdNum)) {
      console.log(`[DB] Skipping save for non-numeric game ID: ${gameId}`);
      return;
    }

    const piecesMap = ydoc.getMap('pieces');
    const pieces: any[] = [];
    
    // Serialize pieces map - properly handle Yjs types
    piecesMap.forEach((data: any, id: string) => {
      try {
        // Convert Yjs types to plain objects
        const pieceData: any = {};
        
        // Handle plain objects stored in Yjs
        if (data && typeof data === 'object') {
          pieceData.id = id;
          pieceData.type = data.type ?? '';
          pieceData.subtype = data.subtype ?? '';
          pieceData.landId = data.landId ?? 1;
          pieceData.health = data.health ?? 1;
          pieceData.damage = data.damage ?? 0;
          pieceData.count = data.count ?? 1;
          pieceData.updatedBy = data.updatedBy ?? '';
          pieceData.timestamp = data.timestamp ?? Date.now();
          
          pieces.push(pieceData);
        }
      } catch (pieceErr) {
        console.error(`[DB] Error serializing piece ${id}:`, pieceErr);
      }
    });

    const state = { pieces };

    await pool.query(
      'INSERT INTO game_snapshots (game_id, board_state) VALUES ($1, $2)',
      [gameIdNum, JSON.stringify(state)]
    );
  } catch (err) {
    console.error('Error saving game state:', err);
  }
};

// Helper to load game state from database
const loadGameStateFromDb = async (gameId: string, ydoc: Y.Doc) => {
  try {
    const gameIdNum = parseInt(gameId);
    if (isNaN(gameIdNum)) {
      console.log(`[DB] Skipping load for non-numeric game ID: ${gameId}`);
      return;
    }

    const result = await pool.query(
      'SELECT board_state FROM game_snapshots WHERE game_id = $1 ORDER BY timestamp DESC LIMIT 1',
      [gameIdNum]
    );
    
    console.log(`[DB] Load query result for game ${gameIdNum}:`, result.rows.length, 'rows');

    if (result.rows.length > 0) {
      const state = result.rows[0].board_state;
      console.log(`[DB] Loaded state for game ${gameIdNum}:`, state);
      
      if (state && state.pieces && Array.isArray(state.pieces)) {
        const piecesMap = ydoc.getMap('pieces');
        for (const piece of state.pieces) {
          const { id, ...data } = piece;
          console.log(`[DB] Loading piece ${id}:`, data);
          piecesMap.set(id, data);
        }
      }
    } else {
      console.log(`[DB] No snapshots found for game ${gameIdNum}, starting fresh`);
    }
  } catch (err) {
    console.error('Error loading game state:', err);
  }
};

const getGameDoc = async (gameId: string) => {
  if (!gameDocs.has(gameId)) {
    const ydoc = new Y.Doc();
    gameDocs.set(gameId, ydoc);
    
    // Load state from database
    await loadGameStateFromDb(gameId, ydoc);
    
    // Save to database on updates (debounced)
    let saveTimeout: any = null;
    ydoc.on('update', () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        saveGameStateToDb(gameId, ydoc);
      }, 1000);
    });
  }
  return gameDocs.get(gameId)!;
};

// Middleware to verify JWT
const verifyToken = (req: Request, res: Response, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Auth endpoints
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get current user profile
app.get('/api/auth/me', verifyToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all games (list)
app.get('/api/games', verifyToken, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM games ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new game
app.post('/api/games', verifyToken, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const userId = (req as any).user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Game name is required' });
    }

    const result = await pool.query(
      'INSERT INTO games (owner_id, name, player_ids) VALUES ($1, $2, ARRAY[$1::integer]) RETURNING *',
      [userId, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get game state
app.get('/api/games/:id/state', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Join a game
app.post('/api/games/:id/join', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const gameResult = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = gameResult.rows[0];
    const playerIds = game.player_ids || [];
    if (!playerIds.includes(userId)) {
      playerIds.push(userId);
      await pool.query(
        'UPDATE games SET player_ids = $1::integer[] WHERE id = $2',
        [playerIds, id]
      );
    }

    res.json({ message: 'Joined game' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// WebSocket server for Yjs sync
const wss = new WebSocketServer({ server });
let clientIdCounter = 0;

wss.on('connection', async (ws: WebSocket, req) => {
  const url = req.url || '';
  let roomName = url.split('/').pop() || 'default';
  
  // Extract numeric game ID from roomName (e.g., "game-123" -> "123")
  const gameIdStr = roomName.replace('game-', '');
  const gameId = gameIdStr;
  
  // Assign unique client ID
  const clientId = clientIdCounter++;
  (ws as any).clientId = clientId;

  const ydoc = await getGameDoc(gameId);
  const awareness = new awarenessProtocol.Awareness(ydoc);

  const onUpdate = (update: Uint8Array) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 0); // messageSync
    encoding.writeVarUint8Array(encoder, update);
    ws.send(encoding.toUint8Array(encoder));
  };

  const onAwarenessUpdate = ({ added, updated, removed }: any) => {
    const changedClients = added.concat(updated).concat(removed);
    if (changedClients.length === 0) return;
    
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 1); // messageAwareness
    const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients);
    if (awarenessUpdate.length === 0) return;
    
    encoding.writeVarUint8Array(encoder, awarenessUpdate);
    ws.send(encoding.toUint8Array(encoder));
  };

  ydoc.on('update', onUpdate);

  // Send full state to new client using the same format as onUpdate
  const stateUpdate = Y.encodeStateAsUpdate(ydoc);
  const initEncoder = encoding.createEncoder();
  encoding.writeVarUint(initEncoder, 0); // messageSync
  encoding.writeVarUint8Array(initEncoder, stateUpdate);
  ws.send(encoding.toUint8Array(initEncoder));

  // Set up awareness handler AFTER initial sync to avoid empty state broadcasts
  awareness.on('update', onAwarenessUpdate);

  ws.on('message', (message: any) => {
    try {
      const decoder = decoding.createDecoder(message);
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case 0: // syncProtocol.messageSync
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, 0); // messageSync - prepend message type
          syncProtocol.readSyncMessage(decoder, encoder, ydoc);
          if (encoding.length(encoder) > 0) {
            ws.send(encoding.toUint8Array(encoder));
          }
          break;
        case 1: // awarenessProtocol.messageAwareness
          const clientId = (ws as any).clientId;
          awarenessProtocol.applyAwarenessUpdate(
            awareness,
            decoding.readVarUint8Array(decoder),
            clientId
          );
          // Note: The awareness.on('update') handler will automatically broadcast
          // awareness changes to all other clients, so we don't need manual broadcast here
          break;
        default:
          console.warn(`Unknown message type: ${messageType}`);
          break;
      }
    } catch (error) {
      console.error(`Error handling message:`, error);
    }
  });

  ws.on('close', () => {
    const clientId = (ws as any).clientId;
    ydoc.off('update', onUpdate);
    awareness.off('update', onAwarenessUpdate);
    awarenessProtocol.removeAwarenessStates(awareness, [clientId], 'disconnect');
  });
});