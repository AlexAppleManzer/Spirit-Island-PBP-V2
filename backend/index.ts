import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { getAdversary } from './data/adversaries.js';
import { calculateTerrorLevel, applyFearModifier, initializeFearState } from './utils/fearUtils.js';
import { executeEvent } from './utils/eventUtils.js';
import { createFearDeck, createInvaderDeck, getRandomLand } from './utils/deckUtils.js';
import {
  listSpiritPresenceLayouts,
  getSpiritPresenceLayout,
  setSpiritPresenceLayout,
  type PresenceSlot,
} from './data/spiritPresenceLayouts.js';

type Request = express.Request;
type Response = express.Response;
type GameStatus = 'active' | 'completed' | 'archived';

type GameDto = {
  id: string;
  name: string;
  ownerId: number;
  playerIds: number[];
  spiritCount: number;
  playerCount: number;
  status: GameStatus | string;
  currentPhase: string;
  turn: number;
  discordWebhookUrl: string | null;
  createdAt: string;
};

// Config
const PORT = parseInt(process.env.PORT || '3001');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/pbpv2';

// Database pool
const pool = new Pool({ connectionString: DATABASE_URL });

const ensureDatabaseSchema = async () => {
  await pool.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS name VARCHAR(120)');
};

// Express setup
const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

ensureDatabaseSchema().catch((error) => {
  console.error('Schema initialization failed:', error);
});

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

type TurnPhase = 'growth' | 'fast' | 'event' | 'invader' | 'slow';

const TURN_PHASES: TurnPhase[] = ['growth', 'fast', 'event', 'invader', 'slow'];

const FEAR_PER_PLAYER = 4;
const MAX_PLAYERS_PER_GAME = 6;
const BOARD_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const getSafeNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return fallback;
};

const clampMin = (value: number, min: number) => {
  return value < min ? min : value;
};

const getTerrorLevelFromFearCards = (fearCardsEarned: number) => {
  // Fallback function - uses default 3/3/3 thresholds
  // For adversary-specific logic, use fearUtils.calculateTerrorLevel instead
  if (fearCardsEarned >= 9) return 4;
  if (fearCardsEarned >= 6) return 3;
  if (fearCardsEarned >= 3) return 2;
  return 1;
};

const ensureNestedMap = (parent: Y.Map<unknown>, key: string) => {
  const existing = parent.get(key);
  if (existing instanceof Y.Map) {
    return existing as Y.Map<unknown>;
  }

  const created = new Y.Map<unknown>();
  parent.set(key, created);
  return created;
};

const ensureGameDefaults = (gameMap: Y.Map<unknown>, spiritCountFallback: number, adversaryId?: string) => {
  const legacyRound = getSafeNumber(gameMap.get('round'), 1);
  const turn = getSafeNumber(gameMap.get('turn'), legacyRound);
  gameMap.set('turn', clampMin(turn, 1));

  const rawPhase = gameMap.get('currentPhase');
  const normalizedPhase =
    typeof rawPhase === 'string' && TURN_PHASES.includes(rawPhase as TurnPhase)
      ? (rawPhase as TurnPhase)
      : 'growth';
  gameMap.set('currentPhase', normalizedPhase);

  if (!gameMap.has('boards')) {
    gameMap.set('boards', new Y.Map());
  }

  const safeSpiritFallback = clampMin(spiritCountFallback, 0);
  const spiritCount = clampMin(
    getSafeNumber(gameMap.get('spiritCount'), getSafeNumber(gameMap.get('playerCount'), safeSpiritFallback)),
    0
  );
  gameMap.set('spiritCount', spiritCount);
  gameMap.set('playerCount', spiritCount);
  gameMap.set('fearThreshold', FEAR_PER_PLAYER * spiritCount);

  // Initialize gameConfig with adversary and fear thresholds
  let gameConfig = gameMap.get('gameConfig');
  if (!(gameConfig instanceof Y.Map)) {
    gameConfig = new Y.Map();
    gameMap.set('gameConfig', gameConfig);
  }

  // Set adversary if provided, or use existing, or default to Brandenburg-Prussia
  let adversary = null;
  let selectedAdversaryId = adversaryId || (gameConfig as Y.Map<unknown>).get('adversary') as string || 'brandenburg-prussia';
  adversary = getAdversary(selectedAdversaryId);
  
  if (!adversary) {
    adversary = getAdversary('brandenburg-prussia')!;
    selectedAdversaryId = 'brandenburg-prussia';
  }

  (gameConfig as Y.Map<unknown>).set('adversary', selectedAdversaryId);
  (gameConfig as Y.Map<unknown>).set('fearThresholds', [...adversary.fearThresholds]);
  (gameConfig as Y.Map<unknown>).set('initialInvaderCardCount', adversary.initialInvaderCardCount);

  // Initialize fear state based on adversary thresholds
  const fearCardsEarned = clampMin(getSafeNumber(gameMap.get('fearCardsEarned'), 0), 0);
  const terrorLevel = calculateTerrorLevel(fearCardsEarned, adversary.fearThresholds);
  gameMap.set('fearCardsEarned', fearCardsEarned);
  gameMap.set('terrorLevel', terrorLevel);
  gameMap.set('fearPool', clampMin(getSafeNumber(gameMap.get('fearPool'), 0), 0));

  if (!gameMap.has('blightCard')) {
    gameMap.set('blightCard', 'Unknown Blight Card');
  }
  const defaultBlight = spiritCount * 2 + 1;
  const blightCount = clampMin(getSafeNumber(gameMap.get('blightCount'), defaultBlight), 0);
  gameMap.set('blightCount', blightCount);

  // Update invader track to use lands instead of counts
  const invaderTrack = ensureNestedMap(gameMap, 'invaderTrack');
  
  // Initialize invader lands arrays if they don't exist
  if (!(invaderTrack.get('exploredLands') instanceof Y.Array)) {
    invaderTrack.set('exploredLands', new Y.Array());
  }
  if (!(invaderTrack.get('buildLands') instanceof Y.Array)) {
    invaderTrack.set('buildLands', new Y.Array());
  }
  if (!(invaderTrack.get('ravageLands') instanceof Y.Array)) {
    invaderTrack.set('ravageLands', new Y.Array());
  }

  // Keep legacy count fields for compatibility
  const exploreLands = invaderTrack.get('exploredLands') as Y.Array<number>;
  const buildLands = invaderTrack.get('buildLands') as Y.Array<number>;
  const ravageLands = invaderTrack.get('ravageLands') as Y.Array<number>;
  
  invaderTrack.set('explore', exploreLands.length);
  invaderTrack.set('build', buildLands.length);
  invaderTrack.set('ravage', ravageLands.length);

  const decks = ensureNestedMap(gameMap, 'decks');
  decks.set('invader', clampMin(getSafeNumber(decks.get('invader'), adversary.initialInvaderCardCount), 0));
  decks.set('fear', adversary.fearThresholds[adversary.fearThresholds.length - 1] || 9);
  decks.set('event', clampMin(getSafeNumber(decks.get('event'), 0), 0));

  const discards = ensureNestedMap(gameMap, 'discards');
  if (!(discards.get('invader') instanceof Y.Array)) {
    discards.set('invader', new Y.Array());
  }
  if (!(discards.get('fear') instanceof Y.Array)) {
    discards.set('fear', new Y.Array());
  }
  if (!(discards.get('event') instanceof Y.Array)) {
    discards.set('event', new Y.Array());
  }
  if (!(discards.get('blight') instanceof Y.Array)) {
    discards.set('blight', new Y.Array());
  }
};

const getInitialPlayerCountFromDb = async (gameId: string) => {
  const gameIdNum = parseInt(gameId, 10);
  if (Number.isNaN(gameIdNum)) {
    return 1;
  }

  try {
    const result = await pool.query('SELECT player_ids FROM games WHERE id = $1', [gameIdNum]);
    if (result.rows.length === 0) {
      return 1;
    }
    const playerIds = result.rows[0]?.player_ids;
    if (Array.isArray(playerIds) && playerIds.length > 0) {
      return playerIds.length;
    }
  } catch (err) {
    console.error('Error reading player count from DB:', err);
  }

  return 1;
};

const toInt = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

const normalizePlayerIds = (playerIds: unknown): number[] => {
  if (!Array.isArray(playerIds)) {
    return [];
  }

  const ids = playerIds
    .map((value) => toInt(value))
    .filter((value): value is number => value !== null);

  return Array.from(new Set(ids));
};

const mapGameRowToDto = (row: Record<string, any>): GameDto => {
  const ids = normalizePlayerIds(row.player_ids);
  const spiritCount = ids.length;
  return {
    id: String(row.id),
    name: (typeof row.name === 'string' && row.name.trim()) || `Game ${row.id}`,
    ownerId: toInt(row.owner_id) ?? 0,
    playerIds: ids,
    spiritCount,
    playerCount: spiritCount,
    status: (row.status as GameStatus) || 'active',
    currentPhase: (row.current_phase as string) || 'growth',
    turn: toInt(row.round) ?? 1,
    discordWebhookUrl: typeof row.discord_webhook_url === 'string' ? row.discord_webhook_url : null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
};

const getNextBoardId = (existingBoardIds: string[]) => {
  for (let i = 0; i < BOARD_LETTERS.length; i++) {
    const candidate = BOARD_LETTERS[i] ?? `P${i + 1}`;
    if (!existingBoardIds.includes(candidate)) {
      return candidate;
    }
  }

  return `P${existingBoardIds.length + 1}`;
};

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
    
    const invaderTrack = gameMap.get('invaderTrack') as Y.Map<unknown> | undefined;
    const decks = gameMap.get('decks') as Y.Map<unknown> | undefined;
    const discards = gameMap.get('discards') as Y.Map<unknown> | undefined;

    const state = {
      currentPhase: (gameMap.get('currentPhase') as string) || 'growth',
      turn: getSafeNumber(gameMap.get('turn'), getSafeNumber(gameMap.get('round'), 1)),
      spiritCount: clampMin(getSafeNumber(gameMap.get('spiritCount'), getSafeNumber(gameMap.get('playerCount'), 0)), 0),
      fearPool: clampMin(getSafeNumber(gameMap.get('fearPool'), 0), 0),
      fearCardsEarned: clampMin(getSafeNumber(gameMap.get('fearCardsEarned'), 0), 0),
      terrorLevel: clampMin(getSafeNumber(gameMap.get('terrorLevel'), 1), 1),
      fearThreshold: clampMin(getSafeNumber(gameMap.get('fearThreshold'), FEAR_PER_PLAYER), FEAR_PER_PLAYER),
      blightCard: (gameMap.get('blightCard') as string) || 'Unknown Blight Card',
      blightCount: clampMin(getSafeNumber(gameMap.get('blightCount'), 3), 0),
      invaderTrack: {
        ravage: clampMin(getSafeNumber(invaderTrack?.get('ravage'), 0), 0),
        build: clampMin(getSafeNumber(invaderTrack?.get('build'), 0), 0),
        explore: clampMin(getSafeNumber(invaderTrack?.get('explore'), 1), 0),
      },
      decks: {
        invader: clampMin(getSafeNumber(decks?.get('invader'), 12), 0),
        fear: clampMin(getSafeNumber(decks?.get('fear'), 9), 0),
        event: clampMin(getSafeNumber(decks?.get('event'), 0), 0),
      },
      discards: {
        invader: clampMin(getSafeNumber(discards?.get('invader'), 0), 0),
        fear: clampMin(getSafeNumber(discards?.get('fear'), 0), 0),
        event: clampMin(getSafeNumber(discards?.get('event'), 0), 0),
        blight: clampMin(getSafeNumber(discards?.get('blight'), 0), 0),
      },
      boards: {} as Record<string, unknown>,
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
          spiritState: {
            energy: getSafeNumber(boardData.get('spiritState')?.get?.('energy'), 0),
            presenceInSupply: clampMin(getSafeNumber(boardData.get('spiritState')?.get?.('presenceInSupply'), 13), 0),
            presenceOnIsland: clampMin(getSafeNumber(boardData.get('spiritState')?.get?.('presenceOnIsland'), 0), 0),
            presenceDestroyed: clampMin(getSafeNumber(boardData.get('spiritState')?.get?.('presenceDestroyed'), 0), 0),
            presenceRemoved: clampMin(getSafeNumber(boardData.get('spiritState')?.get?.('presenceRemoved'), 0), 0),
            presenceColor: typeof boardData.get('spiritState')?.get?.('presenceColor') === 'string'
              ? boardData.get('spiritState').get('presenceColor')
              : '#facc15',
          },
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
      
      if (state && typeof state === 'object') {
        const gameMap = ydoc.getMap('game');

        if (typeof state.currentPhase === 'string') {
          gameMap.set('currentPhase', state.currentPhase);
        }

        const loadedTurn = getSafeNumber(state.turn, getSafeNumber(state.round, 1));
        gameMap.set('turn', clampMin(loadedTurn, 1));

        const loadedSpiritCount = clampMin(getSafeNumber(state.spiritCount, getSafeNumber(state.playerCount, 0)), 0);
        gameMap.set('spiritCount', loadedSpiritCount);
        gameMap.set('playerCount', loadedSpiritCount);
        gameMap.set('fearPool', clampMin(getSafeNumber(state.fearPool, 0), 0));
        gameMap.set('fearCardsEarned', clampMin(getSafeNumber(state.fearCardsEarned, 0), 0));
        gameMap.set('terrorLevel', clampMin(getSafeNumber(state.terrorLevel, 1), 1));
        gameMap.set('fearThreshold', clampMin(getSafeNumber(state.fearThreshold, FEAR_PER_PLAYER), FEAR_PER_PLAYER));

        if (typeof state.blightCard === 'string') {
          gameMap.set('blightCard', state.blightCard);
        }
        gameMap.set('blightCount', clampMin(getSafeNumber(state.blightCount, 3), 0));

        const invaderTrack = ensureNestedMap(gameMap, 'invaderTrack');
        invaderTrack.set('ravage', clampMin(getSafeNumber(state.invaderTrack?.ravage, 0), 0));
        invaderTrack.set('build', clampMin(getSafeNumber(state.invaderTrack?.build, 0), 0));
        invaderTrack.set('explore', clampMin(getSafeNumber(state.invaderTrack?.explore, 1), 0));

        const decks = ensureNestedMap(gameMap, 'decks');
        decks.set('invader', clampMin(getSafeNumber(state.decks?.invader, 12), 0));
        decks.set('fear', clampMin(getSafeNumber(state.decks?.fear, 9), 0));
        decks.set('event', clampMin(getSafeNumber(state.decks?.event, 0), 0));

        const discards = ensureNestedMap(gameMap, 'discards');
        discards.set('invader', clampMin(getSafeNumber(state.discards?.invader, 0), 0));
        discards.set('fear', clampMin(getSafeNumber(state.discards?.fear, 0), 0));
        discards.set('event', clampMin(getSafeNumber(state.discards?.event, 0), 0));
        discards.set('blight', clampMin(getSafeNumber(state.discards?.blight, 0), 0));
      }

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

            const spiritState = new Y.Map();
            const loadedSpiritState = boardData.spiritState && typeof boardData.spiritState === 'object'
              ? boardData.spiritState
              : {};
            spiritState.set('energy', getSafeNumber(loadedSpiritState.energy, 0));
            spiritState.set('presenceInSupply', clampMin(getSafeNumber(loadedSpiritState.presenceInSupply, 13), 0));
            spiritState.set('presenceOnIsland', clampMin(getSafeNumber(loadedSpiritState.presenceOnIsland, 0), 0));
            spiritState.set('presenceDestroyed', clampMin(getSafeNumber(loadedSpiritState.presenceDestroyed, 0), 0));
            spiritState.set('presenceRemoved', clampMin(getSafeNumber(loadedSpiritState.presenceRemoved, 0), 0));
            spiritState.set(
              'presenceColor',
              typeof loadedSpiritState.presenceColor === 'string' ? loadedSpiritState.presenceColor : '#facc15'
            );
            playerBoard.set('spiritState', spiritState);
            
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
    const initialPlayerCount = await getInitialPlayerCountFromDb(gameId);
    ensureGameDefaults(gameMap, initialPlayerCount);
    
    // Load state from database
    await loadGameStateFromDb(gameId, ydoc);
    ensureGameDefaults(gameMap, initialPlayerCount);
    
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

    const spiritState = new Y.Map();
    spiritState.set('energy', 0);
    spiritState.set('presenceInSupply', 13);
    spiritState.set('presenceOnIsland', 0);
    spiritState.set('presenceDestroyed', 0);
    spiritState.set('presenceRemoved', 0);
    spiritState.set('presenceColor', '#facc15');
    playerBoard.set('spiritState', spiritState);
    
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
    const result = await pool.query(
      "SELECT * FROM games WHERE status = 'active' ORDER BY created_at DESC LIMIT 50"
    );
    res.json(result.rows.map((row: Record<string, any>) => mapGameRowToDto(row)));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new game
app.post('/api/games', verifyToken, async (req: Request, res: Response) => {
  try {
    const { name, discordWebhookUrl, adversaryId } = req.body;
    const userId = (req as any).user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Game name is required' });
    }

    const normalizedWebhook =
      typeof discordWebhookUrl === 'string' && discordWebhookUrl.trim().length > 0
        ? discordWebhookUrl.trim()
        : null;

    const result = await pool.query(
      'INSERT INTO games (owner_id, name, player_ids, discord_webhook_url) VALUES ($1, $2, ARRAY[$1::integer], $3) RETURNING *',
      [userId, name.trim(), normalizedWebhook]
    );

    const createdGame = result.rows[0];
    const ydoc = await getGameDoc(String(createdGame.id));
    // Pass adversaryId if provided
    const selectedAdversaryId = typeof adversaryId === 'string' ? adversaryId : undefined;
    ensureGameDefaults(ydoc.getMap('game'), 0, selectedAdversaryId);

    res.status(201).json(mapGameRowToDto(createdGame));
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

    const game = result.rows[0];
    const userId = (req as any).user.id;
    const playerIds = normalizePlayerIds(game.player_ids);
    if (!playerIds.includes(userId)) {
      return res.status(403).json({ error: 'You are not a member of this game' });
    }

    res.json(mapGameRowToDto(game));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Join a game
app.post('/api/games/:id/join', verifyToken, async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      return res.status(400).json({ error: 'Game id is required' });
    }
    const userId = (req as any).user.id;

    const gameResult = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = gameResult.rows[0] as Record<string, any>;
    const playerIds = normalizePlayerIds(game.player_ids);

    if (!playerIds.includes(userId) && playerIds.length >= MAX_PLAYERS_PER_GAME) {
      return res.status(409).json({ error: `Game is full (max ${MAX_PLAYERS_PER_GAME} players)` });
    }

    let updatedPlayerIds = playerIds;
    if (!playerIds.includes(userId)) {
      updatedPlayerIds = [...playerIds, userId];
      await pool.query(
        'UPDATE games SET player_ids = $1::integer[] WHERE id = $2',
        [updatedPlayerIds, id]
      );
    }

    // Initialize board for this player in Yjs if missing.
    const ydoc = await getGameDoc(id);
    const gameMap = ydoc.getMap('game');
    const boards = gameMap.get('boards') as Y.Map<any>;

    let boardIdForUser: string | undefined;
    const existingBoardIds: string[] = [];
    if (boards) {
      boards.forEach((boardData: any, boardId: string) => {
        existingBoardIds.push(boardId);
        if (toInt(boardData.get('playerId')) === userId) {
          boardIdForUser = boardId;
        }
      });
    }

    if (!boardIdForUser) {
      const nextBoardId = getNextBoardId(existingBoardIds);
      initializePlayerBoard(ydoc, userId, nextBoardId);
      boardIdForUser = nextBoardId;
    }

    ensureGameDefaults(gameMap, updatedPlayerIds.length);
    gameMap.set('spiritCount', updatedPlayerIds.length);
    gameMap.set('playerCount', updatedPlayerIds.length);
    gameMap.set('fearThreshold', FEAR_PER_PLAYER * updatedPlayerIds.length);

    const refreshedGame = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
    res.json({
      message: 'Joined game',
      boardId: boardIdForUser,
      game: mapGameRowToDto(refreshedGame.rows[0]),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Leave a game
app.post('/api/games/:id/leave', verifyToken, async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      return res.status(400).json({ error: 'Game id is required' });
    }

    const userId = (req as any).user.id;
    const gameResult = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = gameResult.rows[0] as Record<string, any>;
    const currentPlayerIds = normalizePlayerIds(game.player_ids);
    if (!currentPlayerIds.includes(userId)) {
      return res.status(200).json({ message: 'User is not part of this game' });
    }

    const updatedPlayerIds = currentPlayerIds.filter((idValue) => idValue !== userId);
    const nextStatus = updatedPlayerIds.length === 0 ? 'completed' : game.status;

    const updateResult = await pool.query(
      'UPDATE games SET player_ids = $1::integer[], status = $2 WHERE id = $3 RETURNING *',
      [updatedPlayerIds, nextStatus, id]
    );

    const ydoc = await getGameDoc(id);
    const gameMap = ydoc.getMap('game');
    const boards = gameMap.get('boards') as Y.Map<any> | undefined;
    if (boards) {
      const boardIdsToDelete: string[] = [];
      boards.forEach((boardData: any, boardId: string) => {
        if (toInt(boardData.get('playerId')) === userId) {
          boardIdsToDelete.push(boardId);
        }
      });
      boardIdsToDelete.forEach((boardId) => boards.delete(boardId));
    }

    ensureGameDefaults(gameMap, Math.max(1, updatedPlayerIds.length));
    gameMap.set('spiritCount', Math.max(1, updatedPlayerIds.length));
    gameMap.set('playerCount', Math.max(1, updatedPlayerIds.length));
    gameMap.set('fearThreshold', FEAR_PER_PLAYER * Math.max(1, updatedPlayerIds.length));

    res.json({
      message: 'Left game',
      game: mapGameRowToDto(updateResult.rows[0]),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get list of adversaries
app.get('/api/adversaries', (req: Request, res: Response) => {
  try {
    const { ADVERSARIES } = require('./data/adversaries');
    const adversaries = Object.values(ADVERSARIES).map((adv: any) => ({
      id: adv.id,
      name: adv.name,
      difficulty: adv.difficulty,
      description: adv.description,
      fearThresholds: adv.fearThresholds,
    }));
    res.json(adversaries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get persistent spirit presence layouts (outside game instances)
app.get('/api/spirits/layouts', verifyToken, (req: Request, res: Response) => {
  try {
    res.json({ layouts: listSpiritPresenceLayouts() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Set a persistent spirit presence layout (must contain 13 slots)
app.put('/api/spirits/:spiritId/layout', verifyToken, (req: Request, res: Response) => {
  try {
    const spiritId = Array.isArray(req.params.spiritId) ? req.params.spiritId[0] : req.params.spiritId;
    if (!spiritId) {
      return res.status(400).json({ error: 'Missing spiritId parameter.' });
    }
    const slots = Array.isArray(req.body?.slots) ? req.body.slots : [];
    const layout = setSpiritPresenceLayout(
      spiritId,
      slots as PresenceSlot[],
      req.body?.baseEnergyGain,
      req.body?.baseCardPlays,
      req.body?.baseElements,
    );
    res.json({ layout });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/spirits/:spiritId/layout', verifyToken, (req: Request, res: Response) => {
  try {
    const spiritId = Array.isArray(req.params.spiritId) ? req.params.spiritId[0] : req.params.spiritId;
    if (!spiritId) {
      return res.status(400).json({ error: 'Missing spiritId parameter.' });
    }
    const layout = getSpiritPresenceLayout(spiritId);
    res.json({ layout });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Execute an event card
app.post('/api/games/:id/event-execute', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { eventId } = req.body;
    const userId = (req as any).user.id;

    // Verify user is in the game
    const gameResult = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = gameResult.rows[0];
    const playerIds = normalizePlayerIds(game.player_ids);
    if (!playerIds.includes(userId)) {
      return res.status(403).json({ error: 'You are not a member of this game' });
    }

    if (!eventId || typeof eventId !== 'string') {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    const ydoc = await getGameDoc(id);
    const gameMap = ydoc.getMap('game');

    const result = executeEvent(gameMap, eventId);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Draw a land to explore
app.post('/api/games/:id/invader-draw-to-explore', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const userId = (req as any).user.id;

    // Verify user is in the game
    const gameResult = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = gameResult.rows[0];
    const playerIds = normalizePlayerIds(game.player_ids);
    if (!playerIds.includes(userId)) {
      return res.status(403).json({ error: 'You are not a member of this game' });
    }

    const ydoc = await getGameDoc(id);
    const gameMap = ydoc.getMap('game');
    const invaderTrack = gameMap.get('invaderTrack') as Y.Map<unknown>;

    // Get or create explore lands array
    let exploreLands = invaderTrack?.get('exploredLands') as Y.Array<number>;
    if (!(exploreLands instanceof Y.Array)) {
      exploreLands = new Y.Array();
      invaderTrack?.set('exploredLands', exploreLands);
    }

    // Draw a random land
    const drawnLand = getRandomLand();
    exploreLands.push([drawnLand]);

    // Update the count
    invaderTrack?.set('explore', exploreLands.length);

    res.json({
      success: true,
      drawnLand,
      exploreLands: exploreLands.toArray(),
      message: `Drew land ${drawnLand} to explore`,
    });
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

wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
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

    ws.on('error', (error: Error) => {
      console.error(`[WS] WebSocket error for client ${clientId}:`, error);
    });

    console.log(`[WS] Connection established for game ${gameId}, client ${clientId}`);
  } catch (error) {
    console.error(`[WS] Error in connection handler:`, error);
    ws.close();
  }
});