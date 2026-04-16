import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
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
import { getAdversary, getAdversaryLevel, listAdversaries } from './data/adversaries.js';
import { createInvaderSetupDeckForAdversary } from './data/invaderCards.js';
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
  playerUsernames: string[];
  spiritCount: number;
  playerCount: number;
  status: GameStatus | string;
  outcome: 'win' | 'loss' | null;
  currentPhase: string;
  turn: number;
  discordWebhookUrl: string | null;
  createdAt: string;
  adversaryId: string;
  adversaryLevel: number;
};

// Config
const PORT = parseInt(process.env.PORT || '3001', 10);
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env var is required');
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/pbpv2';

// Database pool
const pool = new Pool({ connectionString: DATABASE_URL });

const ensureDatabaseSchema = async () => {
  await pool.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS name VARCHAR(120)');
  await pool.query("ALTER TABLE games ADD COLUMN IF NOT EXISTS adversary_id VARCHAR(80) DEFAULT 'none'");
  await pool.query('ALTER TABLE games ADD COLUMN IF NOT EXISTS adversary_level SMALLINT DEFAULT 0');
};

// Express setup
const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

ensureDatabaseSchema().catch((error) => {
  console.error('Schema initialization failed:', error);
});

// In-memory game documents (Y.Doc per game)
const gameDocs = new Map<string, Y.Doc>();
const gameDocsPending = new Map<string, Promise<Y.Doc>>();

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

const ensureGameDefaults = (gameMap: Y.Map<unknown>, spiritCountFallback: number, adversaryId?: string, adversaryLevel?: number) => {
  const legacyRound = getSafeNumber(gameMap.get('round'), 1);
  const turn = getSafeNumber(gameMap.get('turn'), legacyRound);
  gameMap.set('turn', clampMin(turn, 1));

  const rawPhase = gameMap.get('currentPhase');
  const normalizedPhase =
    typeof rawPhase === 'string' && TURN_PHASES.includes(rawPhase as TurnPhase)
      ? (rawPhase as TurnPhase)
      : 'growth';
  gameMap.set('currentPhase', normalizedPhase);

  const safeSpiritFallback = clampMin(spiritCountFallback, 0);
  const spiritCount = clampMin(
    getSafeNumber(gameMap.get('spiritCount'), getSafeNumber(gameMap.get('playerCount'), safeSpiritFallback)),
    0
  );
  gameMap.set('spiritCount', spiritCount);

  if (!gameMap.has('boards')) {
    const boards = new Y.Map<unknown>();
    // Pre-create one empty board per player so they exist before spirits are assigned.
    for (let i = 0; i < spiritCount; i += 1) {
      const boardId = BOARD_LETTERS[i] ?? `P${i + 1}`;
      const board = new Y.Map<unknown>();
      board.set('boardId', boardId);
      board.set('playerId', i + 1);
      board.set('x', 120 + (i % 3) * 220);
      board.set('y', 100 + Math.floor(i / 3) * 170);
      board.set('rotation', 0);
      const lands = new Y.Map<unknown>();
      for (let j = 1; j <= 8; j += 1) {
        lands.set(String(j), new Y.Array());
      }
      board.set('lands', lands);
      boards.set(boardId, board);
    }
    gameMap.set('boards', boards);
  }
  gameMap.set('playerCount', spiritCount);
  gameMap.set('fearThreshold', FEAR_PER_PLAYER * spiritCount);

  // Initialize gameConfig with adversary and fear thresholds
  let gameConfig = gameMap.get('gameConfig');
  if (!(gameConfig instanceof Y.Map)) {
    gameConfig = new Y.Map();
    gameMap.set('gameConfig', gameConfig);
  }

  // Resolve adversary id — provided arg wins, then existing gameConfig, then 'none'
  const selectedAdversaryId =
    adversaryId ??
    ((gameConfig as Y.Map<unknown>).get('adversary') as string | undefined) ??
    'none';

  // Resolve adversary level — provided arg wins, then existing gameConfig, then 0
  const rawStoredLevel = (gameConfig as Y.Map<unknown>).get('adversaryLevel');
  const selectedAdversaryLevel =
    adversaryLevel ??
    (typeof rawStoredLevel === 'number' ? rawStoredLevel : 0);

  // Look up per-level data; fall back to 'none' level 0 if anything is missing
  let levelData = getAdversaryLevel(selectedAdversaryId, selectedAdversaryLevel);
  if (!levelData) {
    levelData = getAdversaryLevel('none', 0)!;
  }

  (gameConfig as Y.Map<unknown>).set('adversary', selectedAdversaryId);
  (gameConfig as Y.Map<unknown>).set('adversaryLevel', selectedAdversaryLevel);
  (gameConfig as Y.Map<unknown>).set('fearThresholds', [...levelData.fearThresholds]);
  (gameConfig as Y.Map<unknown>).set('initialInvaderCardCount', levelData.invaderDeckOrder.length);
  (gameConfig as Y.Map<unknown>).set('invaderDeckOrder', levelData.invaderDeckOrder);

  // Initialize invader deck from adversary order — only when adversary is explicitly provided
  // (i.e. at game creation). getGameDoc calls ensureGameDefaults without adversary args before
  // loading saved state, so we must not pre-empt the adversary-aware call that follows.
  if (!Array.isArray(gameMap.get('invaderDeckCards')) && adversaryId !== undefined) {
    const { deck, removed } = createInvaderSetupDeckForAdversary(levelData.invaderDeckOrder);
    gameMap.set('invaderDeckCards', deck);
    gameMap.set('invaderRemovedCards', removed);
    gameMap.set('invaderDiscardCards', []);
  }

  // Initialize fear state based on adversary level thresholds
  const fearCardsEarned = clampMin(getSafeNumber(gameMap.get('fearCardsEarned'), 0), 0);
  const terrorLevel = calculateTerrorLevel(fearCardsEarned, levelData.fearThresholds);
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
  decks.set('invader', clampMin(getSafeNumber(decks.get('invader'), levelData.invaderDeckOrder.length), 0));
  decks.set('fear', levelData.fearThresholds[levelData.fearThresholds.length - 1] || 9);
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

const mapGameRowToDto = async (row: Record<string, any>): Promise<GameDto> => {
  const ids = normalizePlayerIds(row.player_ids);
  const spiritCount = ids.length;
  let playerUsernames: string[] = [];
  if (ids.length > 0) {
    const usernameResult = await pool.query(
      'SELECT id, username FROM users WHERE id = ANY($1)',
      [ids]
    );
    const usernameMap = new Map(
      (usernameResult.rows as Array<{ id: number; username: string }>).map((r) => [r.id, r.username])
    );
    playerUsernames = ids.map((id) => usernameMap.get(id) ?? String(id));
  }
  const rawOutcome = row.outcome;
  const outcome: 'win' | 'loss' | null =
    rawOutcome === 'win' ? 'win' : rawOutcome === 'loss' ? 'loss' : null;
  return {
    id: String(row.id),
    name: (typeof row.name === 'string' && row.name.trim()) || `Game ${row.id}`,
    ownerId: toInt(row.owner_id) ?? 0,
    playerIds: ids,
    playerUsernames,
    spiritCount,
    playerCount: spiritCount,
    status: (row.status as GameStatus) || 'active',
    outcome,
    currentPhase: (row.current_phase as string) || 'growth',
    turn: toInt(row.round) ?? 1,
    discordWebhookUrl: typeof row.discord_webhook_url === 'string' ? row.discord_webhook_url : null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    adversaryId: typeof row.adversary_id === 'string' ? row.adversary_id : 'none',
    adversaryLevel: toInt(row.adversary_level) ?? 0,
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
    const gameIdNum = parseInt(gameId, 10);
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
        
        const ss = boardData.get('spiritState');
        const getss = (field: string) => ss?.get?.(field);
        state.boards[boardId] = {
          boardId: boardData.get('boardId'),
          playerId: boardData.get('playerId'),
          positionInitialized: boardData.get('positionInitialized') === true,
          x: boardData.get('x') || 0,
          y: boardData.get('y') || 0,
          rotation: boardData.get('rotation') || 0,
          spiritState: {
            spiritId: typeof getss('spiritId') === 'string' ? getss('spiritId') : null,
            energy: getSafeNumber(getss('energy'), 0),
            gainMarkedTurn: getSafeNumber(getss('gainMarkedTurn'), 0),
            gainMarkedRound: getSafeNumber(getss('gainMarkedRound'), 0),
            paidMarkedTurn: getSafeNumber(getss('paidMarkedTurn'), 0),
            paidMarkedRound: getSafeNumber(getss('paidMarkedRound'), 0),
            paidAmount: getSafeNumber(getss('paidAmount'), 0),
            presenceSupplySlotIndices: Array.isArray(getss('presenceSupplySlotIndices')) ? getss('presenceSupplySlotIndices') : null,
            presenceInSupply: clampMin(getSafeNumber(getss('presenceInSupply'), 13), 0),
            presenceOnIsland: clampMin(getSafeNumber(getss('presenceOnIsland'), 0), 0),
            presenceDestroyed: clampMin(getSafeNumber(getss('presenceDestroyed'), 0), 0),
            presenceRemoved: clampMin(getSafeNumber(getss('presenceRemoved'), 0), 0),
            presenceColor: typeof getss('presenceColor') === 'string' ? getss('presenceColor') : '#facc15',
            cardsInPlay: Array.isArray(getss('cardsInPlay')) ? getss('cardsInPlay') : [],
            cardsInHand: Array.isArray(getss('cardsInHand')) ? getss('cardsInHand') : [],
            cardsInDiscard: Array.isArray(getss('cardsInDiscard')) ? getss('cardsInDiscard') : [],
            draftSize: getSafeNumber(getss('draftSize'), 4),
            draftPicks: getSafeNumber(getss('draftPicks'), 1),
            pendingDraftType: getss('pendingDraftType') ?? null,
            pendingDraftCardIds: Array.isArray(getss('pendingDraftCardIds')) ? getss('pendingDraftCardIds') : [],
            pendingDraftPicksRemaining: getSafeNumber(getss('pendingDraftPicksRemaining'), 0),
            ready: getss('ready') === true,
          },
          lands,
        };
      });
    }

    await pool.query(
      `INSERT INTO game_snapshots (game_id, board_state, timestamp)
       VALUES ($1, $2, NOW())
       ON CONFLICT (game_id) DO UPDATE
         SET board_state = EXCLUDED.board_state, timestamp = EXCLUDED.timestamp`,
      [gameIdNum, JSON.stringify(state)]
    );
  } catch (err) {
    console.error('Error saving game state:', err);
  }
};

// Helper to load game state from database
const loadGameStateFromDb = async (gameId: string, ydoc: Y.Doc) => {
  try {
    const gameIdNum = parseInt(gameId, 10);
    if (isNaN(gameIdNum)) {
      console.log(`[DB] Skipping load for non-numeric game ID: ${gameId}`);
      return;
    }

    const result = await pool.query(
      'SELECT board_state FROM game_snapshots WHERE game_id = $1 ORDER BY timestamp DESC LIMIT 1',
      [gameIdNum]
    );

    if (result.rows.length > 0) {
      const state = result.rows[0].board_state;
      
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
            
            const positionInitialized = boardData.positionInitialized === true;
            const x = positionInitialized ? (boardData.x || 0) : 300;
            const y = positionInitialized ? (boardData.y || 0) : 200;

            playerBoard.set('positionInitialized', true);
            playerBoard.set('x', x);
            playerBoard.set('y', y);
            playerBoard.set('rotation', boardData.rotation || 0);

            const spiritState = new Y.Map();
            const loadedSpiritState = boardData.spiritState && typeof boardData.spiritState === 'object'
              ? boardData.spiritState
              : {};
            if (typeof loadedSpiritState.spiritId === 'string' && loadedSpiritState.spiritId.length > 0) {
              spiritState.set('spiritId', loadedSpiritState.spiritId);
            }
            spiritState.set('energy', getSafeNumber(loadedSpiritState.energy, 0));
            spiritState.set('gainMarkedTurn', getSafeNumber(loadedSpiritState.gainMarkedTurn, 0));
            spiritState.set('gainMarkedRound', getSafeNumber(loadedSpiritState.gainMarkedRound, 0));
            spiritState.set('paidMarkedTurn', getSafeNumber(loadedSpiritState.paidMarkedTurn, 0));
            spiritState.set('paidMarkedRound', getSafeNumber(loadedSpiritState.paidMarkedRound, 0));
            spiritState.set('paidAmount', getSafeNumber(loadedSpiritState.paidAmount, 0));
            if (Array.isArray(loadedSpiritState.presenceSupplySlotIndices)) {
              spiritState.set('presenceSupplySlotIndices', loadedSpiritState.presenceSupplySlotIndices);
            }
            spiritState.set('presenceInSupply', clampMin(getSafeNumber(loadedSpiritState.presenceInSupply, 13), 0));
            spiritState.set('presenceOnIsland', clampMin(getSafeNumber(loadedSpiritState.presenceOnIsland, 0), 0));
            spiritState.set('presenceDestroyed', clampMin(getSafeNumber(loadedSpiritState.presenceDestroyed, 0), 0));
            spiritState.set('presenceRemoved', clampMin(getSafeNumber(loadedSpiritState.presenceRemoved, 0), 0));
            spiritState.set(
              'presenceColor',
              typeof loadedSpiritState.presenceColor === 'string' ? loadedSpiritState.presenceColor : '#facc15'
            );
            spiritState.set('cardsInPlay', Array.isArray(loadedSpiritState.cardsInPlay) ? loadedSpiritState.cardsInPlay : []);
            spiritState.set('cardsInHand', Array.isArray(loadedSpiritState.cardsInHand) ? loadedSpiritState.cardsInHand : []);
            spiritState.set('cardsInDiscard', Array.isArray(loadedSpiritState.cardsInDiscard) ? loadedSpiritState.cardsInDiscard : []);
            spiritState.set('draftSize', getSafeNumber(loadedSpiritState.draftSize, 4));
            spiritState.set('draftPicks', getSafeNumber(loadedSpiritState.draftPicks, 1));
            spiritState.set('pendingDraftType', loadedSpiritState.pendingDraftType ?? null);
            spiritState.set('pendingDraftCardIds', Array.isArray(loadedSpiritState.pendingDraftCardIds) ? loadedSpiritState.pendingDraftCardIds : []);
            spiritState.set('pendingDraftPicksRemaining', getSafeNumber(loadedSpiritState.pendingDraftPicksRemaining, 0));
            spiritState.set('ready', loadedSpiritState.ready === true);
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

const getGameDoc = async (gameId: string): Promise<Y.Doc> => {
  const existing = gameDocs.get(gameId);
  if (existing) return existing;

  const inFlight = gameDocsPending.get(gameId);
  if (inFlight) return inFlight;

  const promise = (async () => {
    const ydoc = new Y.Doc();

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

    gameDocs.set(gameId, ydoc);
    gameDocsPending.delete(gameId);
    return ydoc;
  })();

  gameDocsPending.set(gameId, promise);
  return promise;
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

  // Evict from gameDocs if no other room still references this game
  const gameId = getGameIdFromRoomName(roomName);
  const stillReferenced = [...roomStates.keys()].some(
    (name) => getGameIdFromRoomName(name) === gameId
  );
  if (!stillReferenced) {
    gameDocs.delete(gameId);
    gameDocsPending.delete(gameId);
  }
};

// Helper to initialize a player's board
const initializePlayerBoard = (ydoc: Y.Doc, playerId: number, boardId: string) => {
  const gameMap = ydoc.getMap('game');
  const boards = gameMap.get('boards') as Y.Map<any>;
  
  if (!boards.has(boardId)) {
    const playerBoard = new Y.Map();
    playerBoard.set('boardId', boardId);
    playerBoard.set('playerId', playerId);
    playerBoard.set('positionInitialized', true);
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
app.post('/api/auth/register', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    if (typeof username !== 'string' || username.length > 50) {
      return res.status(400).json({ error: 'Username must be 50 characters or fewer' });
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (err: any) {
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'Username or email already in use' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/api/auth/login', authRateLimit, async (req: Request, res: Response) => {
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
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal error' });
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
      "SELECT * FROM games WHERE status != 'archived' ORDER BY created_at DESC LIMIT 50"
    );
    res.json(await Promise.all(result.rows.map((row: Record<string, any>) => mapGameRowToDto(row))));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new game
app.post('/api/games', verifyToken, async (req: Request, res: Response) => {
  try {
    const { name, discordWebhookUrl, adversaryId, adversaryLevel, spiritCount } = req.body;
    const userId = (req as any).user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Game name is required' });
    }

    const normalizedWebhook =
      typeof discordWebhookUrl === 'string' && discordWebhookUrl.trim().length > 0
        ? discordWebhookUrl.trim()
        : null;

    const isValidDiscordWebhook = (url: string) =>
      /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(url);
    if (normalizedWebhook && !isValidDiscordWebhook(normalizedWebhook)) {
      return res.status(400).json({ error: 'Invalid Discord webhook URL' });
    }

    // Validate and normalize adversary selection
    const selectedAdversaryId =
      typeof adversaryId === 'string' && getAdversary(adversaryId) ? adversaryId : 'none';
    const rawLevel = typeof adversaryLevel === 'number' ? adversaryLevel : 0;
    const selectedAdversaryLevel = Math.min(6, Math.max(0, Math.floor(rawLevel)));

    // Validate and normalize spirit count (1–6, default 1)
    const rawSpiritCount = typeof spiritCount === 'number' ? spiritCount : 1;
    const selectedSpiritCount = Math.min(6, Math.max(1, Math.floor(rawSpiritCount)));

    const result = await pool.query(
      'INSERT INTO games (owner_id, name, player_ids, discord_webhook_url, adversary_id, adversary_level) VALUES ($1, $2, ARRAY[$1::integer], $3, $4, $5) RETURNING *',
      [userId, name.trim(), normalizedWebhook, selectedAdversaryId, selectedAdversaryLevel]
    );

    const createdGame = result.rows[0];
    const ydoc = await getGameDoc(String(createdGame.id));
    ensureGameDefaults(ydoc.getMap('game'), selectedSpiritCount, selectedAdversaryId, selectedAdversaryLevel);

    res.status(201).json(await mapGameRowToDto(createdGame));
  } catch (err: any) {
    console.error('Create game error:', err);
    res.status(500).json({ error: 'Internal error' });
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

    res.json(await mapGameRowToDto(game));
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

    // Only auto-create a board on join if the game has no boards at all.
    // Games created with a player count pre-have their boards from ensureGameDefaults.
    if (!boardIdForUser && existingBoardIds.length === 0) {
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
      game: await mapGameRowToDto(refreshedGame.rows[0]),
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
      game: await mapGameRowToDto(updateResult.rows[0]),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mark game outcome (owner-only)
app.patch('/api/games/:id/outcome', verifyToken, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user.id;
    const { outcome } = req.body as { outcome: unknown };

    if (outcome !== 'win' && outcome !== 'loss' && outcome !== null) {
      return res.status(400).json({ error: 'outcome must be "win", "loss", or null' });
    }

    const gameResult = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    const game = gameResult.rows[0] as Record<string, any>;
    if (toInt(game.owner_id) !== userId) {
      return res.status(403).json({ error: 'Only the game owner can set the outcome' });
    }

    const newStatus = outcome === null ? 'active' : 'completed';
    const updateResult = await pool.query(
      'UPDATE games SET outcome = $1, status = $2 WHERE id = $3 RETURNING *',
      [outcome, newStatus, id]
    );

    // Sync to Yjs so connected clients see it immediately
    const ydoc = await getGameDoc(id);
    ydoc.getMap('game').set('outcome', outcome ?? '');

    res.json(await mapGameRowToDto(updateResult.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a game (owner-only)
app.delete('/api/games/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const gameResult = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    const game = gameResult.rows[0] as Record<string, any>;
    if (toInt(game.owner_id) !== userId) {
      return res.status(403).json({ error: 'Only the game owner can delete this game' });
    }

    // Cascade delete dependent rows first (FK constraints)
    await pool.query('DELETE FROM game_invite_tokens WHERE game_id = $1', [id]);
    await pool.query('DELETE FROM game_checkpoints WHERE game_id = $1', [id]);
    await pool.query('DELETE FROM game_snapshots WHERE game_id = $1', [id]);
    await pool.query('DELETE FROM games WHERE id = $1', [id]);

    // Clean up in-memory Yjs room if open
    const room = roomStates.get(String(id));
    if (room) {
      room.ydoc.destroy();
      roomStates.delete(String(id));
    }

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Search users by username (for owner-initiated invites)
app.get('/api/users/search', verifyToken, async (req: Request, res: Response) => {
  try {
    const { username } = req.query as { username?: string };
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'username query param is required' });
    }
    const result = await pool.query(
      'SELECT id, username FROM users WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const row = result.rows[0] as { id: number; username: string };
    res.json({ id: row.id, username: row.username });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add a player to a game (owner-initiated invite)
app.post('/api/games/:id/players', verifyToken, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const ownerId = (req as any).user.id;
    const { username } = req.body as { username?: string };

    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'username is required' });
    }

    const gameResult = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    const game = gameResult.rows[0] as Record<string, any>;
    if (toInt(game.owner_id) !== ownerId) {
      return res.status(403).json({ error: 'Only the game owner can invite players' });
    }

    const userResult = await pool.query(
      'SELECT id, username FROM users WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const invitedUser = userResult.rows[0] as { id: number; username: string };

    const playerIds = normalizePlayerIds(game.player_ids);
    if (playerIds.includes(invitedUser.id)) {
      return res.status(409).json({ error: 'User is already in this game' });
    }
    if (playerIds.length >= MAX_PLAYERS_PER_GAME) {
      return res.status(409).json({ error: `Game is full (max ${MAX_PLAYERS_PER_GAME} players)` });
    }

    const updatedPlayerIds = [...playerIds, invitedUser.id];
    await pool.query(
      'UPDATE games SET player_ids = $1::integer[] WHERE id = $2',
      [updatedPlayerIds, id]
    );

    // Init board in Yjs for the new player (same as join logic)
    const ydoc = await getGameDoc(id);
    const gameMap = ydoc.getMap('game');
    const boards = gameMap.get('boards') as Y.Map<any>;
    const existingBoardIds: string[] = [];
    let boardIdForUser: string | undefined;
    if (boards) {
      boards.forEach((boardData: any, boardId: string) => {
        existingBoardIds.push(boardId);
        if (toInt(boardData.get('playerId')) === invitedUser.id) {
          boardIdForUser = boardId;
        }
      });
    }
    if (!boardIdForUser && existingBoardIds.length === 0) {
      const nextBoardId = getNextBoardId(existingBoardIds);
      initializePlayerBoard(ydoc, invitedUser.id, nextBoardId);
    }

    const refreshedGame = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
    res.json(await mapGameRowToDto(refreshedGame.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Remove a player from a game (owner-only)
app.delete('/api/games/:id/players/:playerId', verifyToken, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { playerId } = req.params;
    const ownerId = (req as any).user.id;
    const targetId = toInt(playerId);
    if (targetId === null) {
      return res.status(400).json({ error: 'Invalid playerId' });
    }

    const gameResult = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    const game = gameResult.rows[0] as Record<string, any>;
    if (toInt(game.owner_id) !== ownerId) {
      return res.status(403).json({ error: 'Only the game owner can remove players' });
    }
    if (targetId === ownerId) {
      return res.status(400).json({ error: 'Owner cannot remove themselves; use Leave instead' });
    }

    const currentPlayerIds = normalizePlayerIds(game.player_ids);
    if (!currentPlayerIds.includes(targetId)) {
      return res.status(404).json({ error: 'Player not in this game' });
    }

    const updatedPlayerIds = currentPlayerIds.filter((pid) => pid !== targetId);
    const updateResult = await pool.query(
      'UPDATE games SET player_ids = $1::integer[] WHERE id = $2 RETURNING *',
      [updatedPlayerIds, id]
    );

    // Remove board from Yjs
    const ydoc = await getGameDoc(id);
    const gameMap = ydoc.getMap('game');
    const boards = gameMap.get('boards') as Y.Map<any> | undefined;
    if (boards) {
      const toDelete: string[] = [];
      boards.forEach((boardData: any, boardId: string) => {
        if (toInt(boardData.get('playerId')) === targetId) toDelete.push(boardId);
      });
      toDelete.forEach((bid) => boards.delete(bid));
    }

    res.json(await mapGameRowToDto(updateResult.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create an invite token for a game (owner-only)
app.post('/api/games/:id/invite-token', verifyToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { expiresInHours, singleUse } = req.body as { expiresInHours?: number; singleUse?: boolean };

    const gameResult = await pool.query('SELECT * FROM games WHERE id = $1', [id]);
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    const game = gameResult.rows[0] as Record<string, any>;
    if (toInt(game.owner_id) !== userId) {
      return res.status(403).json({ error: 'Only the game owner can create invite tokens' });
    }

    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = typeof expiresInHours === 'number'
      ? new Date(Date.now() + expiresInHours * 3600 * 1000)
      : null;
    const isSingleUse = singleUse === true;

    await pool.query(
      'INSERT INTO game_invite_tokens (token, game_id, created_by, expires_at, single_use) VALUES ($1, $2, $3, $4, $5)',
      [token, id, userId, expiresAt, isSingleUse]
    );

    res.json({ token });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Join via invite token
app.post('/api/join/:token', verifyToken, async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const userId = (req as any).user.id;

    const tokenResult = await pool.query(
      'SELECT * FROM game_invite_tokens WHERE token = $1',
      [token]
    );
    if (tokenResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invite link not found' });
    }
    const invite = tokenResult.rows[0] as Record<string, any>;

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Invite link has expired' });
    }
    if (invite.single_use && invite.used_by !== null) {
      return res.status(410).json({ error: 'Invite link has already been used' });
    }

    const gameId = String(invite.game_id);
    const gameResult = await pool.query('SELECT * FROM games WHERE id = $1', [gameId]);
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
        [updatedPlayerIds, gameId]
      );
    }

    if (invite.single_use) {
      await pool.query(
        'UPDATE game_invite_tokens SET used_by = $1 WHERE token = $2',
        [userId, token]
      );
    }

    // Init Yjs board
    const ydoc = await getGameDoc(gameId);
    const gameMap = ydoc.getMap('game');
    const boards = gameMap.get('boards') as Y.Map<any>;
    const existingBoardIds: string[] = [];
    let boardIdForUser: string | undefined;
    if (boards) {
      boards.forEach((boardData: any, boardId: string) => {
        existingBoardIds.push(boardId);
        if (toInt(boardData.get('playerId')) === userId) boardIdForUser = boardId;
      });
    }
    if (!boardIdForUser && existingBoardIds.length === 0) {
      const nextBoardId = getNextBoardId(existingBoardIds);
      initializePlayerBoard(ydoc, userId, nextBoardId);
    }

    const refreshedGame = await pool.query('SELECT * FROM games WHERE id = $1', [gameId]);
    res.json({ message: 'Joined game', game: await mapGameRowToDto(refreshedGame.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get list of adversaries (full per-level data for the create-game screen)
app.get('/api/adversaries', (_req: Request, res: Response) => {
  res.json(listAdversaries());
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
      await loadGameStateFromDb(gameId, ydoc);
      boardsMap = gameMap.get('boards') as Y.Map<any>;
    }
    
    const awareness = room.awareness;

    ws.on('message', (message: any) => {
      try {
        const decoder = decoding.createDecoder(message);
        const messageType = decoding.readVarUint(decoder);

        switch (messageType) {
          case 0: // syncProtocol.messageSync
            const responseEncoder = encoding.createEncoder();
            encoding.writeVarUint(responseEncoder, 0); // messageSync
            syncProtocol.readSyncMessage(decoder, responseEncoder, ydoc, wsClient);
            const response = encoding.toUint8Array(responseEncoder);
            if (response.length > 1 && ws.readyState === 1) { // > 1 because we wrote the message type
              ws.send(response);
            }
            break;
          case 1: // awarenessProtocol.messageAwareness
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