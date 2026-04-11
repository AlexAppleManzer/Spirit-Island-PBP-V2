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

type WsLike = {
  readyState: number;
  send: (data: Uint8Array) => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
  close: () => void;
  clientId?: number;
};

type RoomState = {
  ydoc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  clients: Set<WsLike>;
  onDocUpdate: (update: Uint8Array, origin: unknown) => void;
  onAwarenessUpdate: ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => void;
};

const roomStates = new Map<string, RoomState>();

// Helper to save game state to database
const saveGameStateToDb = async (gameId: string, ydoc: Y.Doc) => {
  try {
    const gameIdNum = parseInt(gameId);
    if (isNaN(gameIdNum)) {
      console.debug(`[DB] Skipping save for non-numeric game ID: ${gameId}`);
      return;
    }

    const gameMap = ydoc.getMap('game');
    const boards = gameMap.get('boards') as Y.Map<any>;
    
    const state = {
      currentPhase: gameMap.get('currentPhase') || 'growth',
      round: gameMap.get('round') || 1,
      boards: {} as any,
    };

    // Serialize boards
    if (boards) {
      boards.forEach((boardData: any, boardId: string) => {
        const lands: any = {};
        const landsMap = boardData.get('lands') as Y.Map<any>;
        
        if (landsMap) {
          landsMap.forEach((piecesArray: Y.Array<any>, landId: string) => {
            const pieces: any[] = [];
            piecesArray.forEach((piece: any) => {
              pieces.push({
                type: piece.type,
                subtype: piece.subtype,
                health: piece.health,
                damage: piece.damage,
                count: piece.count,
                updatedBy: piece.updatedBy,
                timestamp: piece.timestamp,
              });
            });
            lands[landId] = pieces;
          });
        }
        
        state.boards[boardId] = {
          boardId: boardData.get('boardId'),
          playerId: boardData.get('playerId'),
          x: boardData.get('x') || 0,
          y: boardData.get('y') || 0,
          rotation: boardData.get('rotation') || 0,
          lands,
        };
      });
    }

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

    console.log(`[DB] Attempting to load state for game ${gameIdNum}`);
    const result = await pool.query(
      'SELECT board_state FROM game_snapshots WHERE game_id = $1 ORDER BY timestamp DESC LIMIT 1',
      [gameIdNum]
    );
    
    console.log(`[DB] Query returned ${result.rows.length} rows`);
    
    if (result.rows.length > 0) {
      const state = result.rows[0].board_state;
      console.log(`[DB] Loaded state:`, JSON.stringify(state).substring(0, 200));
      
      if (state && state.boards) {
        console.log(`[DB] Found ${Object.keys(state.boards).length} boards in state`);
        const gameMap = ydoc.getMap('game');
        let boards = gameMap.get('boards') as Y.Map<any>;
        
        // Create boards map if it doesn't exist
        if (!boards) {
          console.log(`[DB] Creating new boards map`);
          boards = new Y.Map();
          gameMap.set('boards', boards);
        }
        
        Object.entries(state.boards).forEach(([boardId, boardData]: any) => {
          console.log(`[DB] Loading board ${boardId}`);
          if (!boards.has(boardId)) {
            const playerBoard = new Y.Map();
            playerBoard.set('boardId', boardData.boardId);
            playerBoard.set('playerId', boardData.playerId);
            
            // Give boards on-screen default positions if they were at (0,0)
            const x = (boardData.x === 0 && boardData.y === 0) ? 300 : (boardData.x || 0);
            const y = (boardData.x === 0 && boardData.y === 0) ? 200 : (boardData.y || 0);
            
            playerBoard.set('x', x);
            playerBoard.set('y', y);
            playerBoard.set('rotation', boardData.rotation || 0);
            
            const lands = new Y.Map();
            Object.entries(boardData.lands).forEach(([landId, pieces]: any) => {
              const piecesArray = new Y.Array();
              if (Array.isArray(pieces)) {
                pieces.forEach((piece: any) => {
                  piecesArray.push([piece]);
                });
              }
              lands.set(landId, piecesArray);
            });
            
            playerBoard.set('lands', lands);
            boards.set(boardId, playerBoard);
            console.log(`[DB] Board ${boardId} loaded successfully`);
          }
        });
        
        console.log(`[DB] Load complete. Boards map now has size ${boards.size}`);
      }
    } else {
      console.log(`[DB] No snapshots found for game ${gameIdNum}`);
    }
  } catch (err) {
    console.error('Error loading game state:', err);
  }
};

const getGameDoc = async (gameId: string) => {
  if (!gameDocs.has(gameId)) {
    const ydoc = new Y.Doc();
    gameDocs.set(gameId, ydoc);
    
    // Initialize game structure
    const gameMap = ydoc.getMap('game');
    if (!gameMap.has('currentPhase')) {
      gameMap.set('currentPhase', 'growth');
      gameMap.set('round', 1);
    }
    if (!gameMap.has('boards')) {
      gameMap.set('boards', new Y.Map());
    }
    
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

const getRoomNameFromUrl = (url: string) => {
  const path = url.split('?')[0] || '';
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return normalized || 'default';
};

const getGameIdFromRoomName = (roomName: string) => {
  return roomName.startsWith('game-') ? roomName.replace('game-', '') : roomName;
};

const getOrCreateRoomState = async (roomName: string): Promise<RoomState> => {
  const existing = roomStates.get(roomName);
  if (existing) return existing;

  const gameId = getGameIdFromRoomName(roomName);
  const ydoc = await getGameDoc(gameId);
  const awareness = new awarenessProtocol.Awareness(ydoc);
  const clients = new Set<WsLike>();

  const onDocUpdate = (update: Uint8Array, origin: unknown) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 0); // messageSync
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);

    clients.forEach((client) => {
      if (client.readyState !== 1) return;
      if (origin === client) return;
      client.send(message);
    });
  };

  const onAwarenessUpdate = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
    const changedClients = added.concat(updated).concat(removed);
    if (changedClients.length === 0) return;

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 1); // messageAwareness
    const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients);
    if (awarenessUpdate.length === 0) return;
    encoding.writeVarUint8Array(encoder, awarenessUpdate);
    const message = encoding.toUint8Array(encoder);

    clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  };

  ydoc.on('update', onDocUpdate);
  awareness.on('update', onAwarenessUpdate);

  const state: RoomState = {
    ydoc,
    awareness,
    clients,
    onDocUpdate,
    onAwarenessUpdate,
  };
  roomStates.set(roomName, state);
  return state;
};

const cleanupRoomStateIfEmpty = (roomName: string) => {
  const room = roomStates.get(roomName);
  if (!room || room.clients.size > 0) return;

  room.ydoc.off('update', room.onDocUpdate);
  room.awareness.off('update', room.onAwarenessUpdate);
  roomStates.delete(roomName);
};

// Helper to initialize a player's board
const initializePlayerBoard = (ydoc: Y.Doc, playerId: number, boardId: string) => {
  const gameMap = ydoc.getMap('game');
  const boards = gameMap.get('boards') as Y.Map<any>;
  
  if (!boards.has(boardId)) {
    const playerBoard = new Y.Map();
    playerBoard.set('boardId', boardId);
    playerBoard.set('playerId', playerId);
    playerBoard.set('x', Math.random() * 200); // Random initial position
    playerBoard.set('y', Math.random() * 200);
    
    // Initialize 8 lands with empty arrays for pieces
    const lands = new Y.Map();
    for (let i = 1; i <= 8; i++) {
      lands.set(i.toString(), new Y.Array());
    }
    playerBoard.set('lands', lands);
    
    boards.set(boardId, playerBoard);
  }
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
    const playerIndex = playerIds.length;
    
    if (!playerIds.includes(userId)) {
      playerIds.push(userId);
      await pool.query(
        'UPDATE games SET player_ids = $1::integer[] WHERE id = $2',
        [playerIds, id]
      );
    }

    // Initialize board for this player in Yjs
    const ydoc = await getGameDoc(id.toString());
    const boardLetters = 'ABCDEFGHIJ'.split('');
    const boardId = boardLetters[playerIndex] || `P${playerIndex}`;
    initializePlayerBoard(ydoc, userId, boardId);

    res.json({ message: 'Joined game', boardId });
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
  try {
    const url = req.url || '';
    const roomName = getRoomNameFromUrl(url);
    const gameId = getGameIdFromRoomName(roomName);
    
    console.debug(`[WS] New connection for game: ${gameId}`);
    
    // Assign unique client ID
    const clientId = clientIdCounter++;
    const wsClient = ws as unknown as WsLike;
    wsClient.clientId = clientId;

    const room = await getOrCreateRoomState(roomName);
    room.clients.add(wsClient);
    const ydoc = room.ydoc;
    
    // Load existing game state from database if boards map is empty
    const gameMap = ydoc.getMap('game');
    let boardsMap = gameMap.get('boards') as Y.Map<any>;
    
    if (!boardsMap || boardsMap.size === 0) {
      console.log(`[WS] Loading game state from database for game ${gameId}`);
      await loadGameStateFromDb(gameId, ydoc);
      // Get the boards map again after loading
      boardsMap = gameMap.get('boards') as Y.Map<any>;
      console.log(`[WS] After loading: boards map size = ${boardsMap?.size || 0}`);
      
      // Debug: print actual state
      const stateUpdate = Y.encodeStateAsUpdate(ydoc);
      console.log(`[WS] Encoded state size: ${stateUpdate.length} bytes`);
    }
    
    const awareness = room.awareness;

    ws.on('message', (message: any) => {
      try {
        console.log(`[WS] Client ${clientId} received message of size ${message.length}`);
        const decoder = decoding.createDecoder(message);
        const messageType = decoding.readVarUint(decoder);
        console.log(`[WS] Message type: ${messageType}`);

        switch (messageType) {
          case 0: // syncProtocol.messageSync
            console.log(`[WS] Processing sync message from client ${clientId}`);
            const responseEncoder = encoding.createEncoder();
            encoding.writeVarUint(responseEncoder, 0); // messageSync
            
            // Let syncProtocol handle the sync - this modifies the encoder with the response
            syncProtocol.readSyncMessage(decoder, responseEncoder, ydoc, wsClient);
            
            // Send response if there's anything to send
            const response = encoding.toUint8Array(responseEncoder);
            console.log(`[WS] Sending sync response of size ${response.length}`);
            if (response.length > 1 && ws.readyState === 1) { // > 1 because we wrote the message type
              ws.send(response);
            }
            break;
          case 1: // awarenessProtocol.messageAwareness
            console.log(`[WS] Processing awareness update from client ${clientId}`);
            awarenessProtocol.applyAwarenessUpdate(
              awareness,
              decoding.readVarUint8Array(decoder),
              wsClient
            );
            break;
          default:
            console.warn(`[WS] Unknown message type: ${messageType}`);
        }
      } catch (error) {
        console.error(`[WS] Error handling message from client ${clientId}:`, error);
      }
    });

    ws.on('close', () => {
      console.log(`[WS] Client ${clientId} disconnected`);
      room.clients.delete(wsClient);
      awarenessProtocol.removeAwarenessStates(awareness, [clientId], 'disconnect');
      cleanupRoomStateIfEmpty(roomName);
    });

    ws.on('error', (error) => {
      console.error(`[WS] WebSocket error for client ${clientId}:`, error);
    });

    console.log(`[WS] Connection established for game ${gameId}, client ${clientId}`);
  } catch (error) {
    console.error(`[WS] Error in connection handler:`, error);
    ws.close();
  }
});