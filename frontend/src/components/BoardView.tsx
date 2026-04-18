import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Image, Line, Text, Group, Rect, Circle } from 'react-konva';
import useImage from 'use-image';
import * as Y from 'yjs';
import { BOARDS } from '../data/boards';

interface GamePiece {
  pieceId?: string;
  type: string;
  subtype?: string;
  presenceSlotIndex?: number;
  presenceReward?: string;
  damage?: number;
  health?: number;
  count?: number;
  strife?: number;
  updatedBy?: string;
  timestamp?: number;
}

interface PieceLocation {
  boardId: string;
  landId: string;
  pieceIndex: number;
}

interface Point {
  x: number;
  y: number;
}

interface LandBounds {
  polygon: Point[];
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface LandBoundsAsset {
  version: string;
  boardImage: string;
  stageDimensions: { width: number; height: number };
  lands: Record<number, LandBounds>;
}

const DEFAULT_VIEWPORT_WIDTH = 1200;
const DEFAULT_VIEWPORT_HEIGHT = 800;
const STAGE_PADDING = 40;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.1;
const DEFAULT_BOARD_WIDTH = 800;
const DEFAULT_BOARD_HEIGHT = 535;
const PIECE_SIZE = 32;
const STACK_LAYER_OFFSET_PX = Math.round(PIECE_SIZE * 0.2);
const CLUSTER_RING_STEP_PX = Math.round(PIECE_SIZE * 1.2);

function getClusterOffset(index: number, total: number): Point {
  if (total <= 1) {
    return { x: 0, y: 0 };
  }

  const slotsInInnerRing = 6;
  const slotsInOuterRing = 12;

  if (index < slotsInInnerRing) {
    const angle = (index / slotsInInnerRing) * Math.PI * 2;
    return {
      x: Math.cos(angle) * CLUSTER_RING_STEP_PX,
      y: Math.sin(angle) * CLUSTER_RING_STEP_PX,
    };
  }

  const outerIndex = index - slotsInInnerRing;
  const angle = (outerIndex / slotsInOuterRing) * Math.PI * 2;
  return {
    x: Math.cos(angle) * CLUSTER_RING_STEP_PX * 2,
    y: Math.sin(angle) * CLUSTER_RING_STEP_PX * 2,
  };
}

function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function polygonToLinePoints(polygon: Point[]): number[] {
  const points: number[] = [];
  for (const p of polygon) {
    points.push(p.x, p.y);
  }
  return points;
}

function getPolygonCenter(polygon: Point[]): Point {
  let sumX = 0;
  let sumY = 0;
  for (const p of polygon) {
    sumX += p.x;
    sumY += p.y;
  }
  return {
    x: sumX / polygon.length,
    y: sumY / polygon.length,
  };
}

function getBoardLocalPoint(
  point: Point,
  boardX: number,
  boardY: number,
  rotationDegrees: number,
  boardWidth: number,
  boardHeight: number
): Point {
  const centerX = boardX + boardWidth / 2;
  const centerY = boardY + boardHeight / 2;
  const rad = (rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(-rad);
  const sin = Math.sin(-rad);

  const dx = point.x - centerX;
  const dy = point.y - centerY;

  return {
    x: dx * cos - dy * sin + boardWidth / 2,
    y: dx * sin + dy * cos + boardHeight / 2,
  };
}

function isPointOnIsland(localPoint: Point, lands: Record<number, LandBounds>): boolean {
  for (const bounds of Object.values(lands)) {
    const box = bounds.bounds;
    if (
      localPoint.x < box.x ||
      localPoint.x > box.x + box.width ||
      localPoint.y < box.y ||
      localPoint.y > box.y + box.height
    ) {
      continue;
    }

    if (isPointInPolygon(localPoint, bounds.polygon)) {
      return true;
    }
  }
  return false;
}

function getDefaultDamage(_type: string): number {
  return 0;
}

const SPIRIT_TOKEN_TYPES = new Set([
  'badlands', 'beast', 'deeps', 'disease', 'quake', 'vitality', 'wilds', 'strife', 'blight',
]);

function pieceHasDamage(type: string): boolean {
  return ['explorer', 'town', 'city', 'dahan'].includes(type);
}

function pieceHasStrife(type: string): boolean {
  return ['explorer', 'town', 'city'].includes(type);
}

interface BoardViewProps {
  docRef: React.MutableRefObject<Y.Doc | null>;
  onToolbarStateChange?: (state: { manageBoardsMode: boolean; zoomPercent: number }) => void;
}

export interface BoardViewHandle {
  toggleManageBoardsMode: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  centerOnBoards: () => void;
}

const BoardView = React.forwardRef<BoardViewHandle, BoardViewProps>(({ docRef, onToolbarStateChange }, ref) => {
  const stageRef = useRef(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({
    width: DEFAULT_VIEWPORT_WIDTH,
    height: DEFAULT_VIEWPORT_HEIGHT,
  });
  const [boardImageA] = useImage(BOARDS.find(b => b.nickname === 'A')?.imageUrl ?? '');
  const [boardImageB] = useImage(BOARDS.find(b => b.nickname === 'B')?.imageUrl ?? '');
  const [boardImageC] = useImage(BOARDS.find(b => b.nickname === 'C')?.imageUrl ?? '');
  const [boardImageD] = useImage(BOARDS.find(b => b.nickname === 'D')?.imageUrl ?? '');
  const [boardImageE] = useImage(BOARDS.find(b => b.nickname === 'E')?.imageUrl ?? '');
  const [boardImageF] = useImage(BOARDS.find(b => b.nickname === 'F')?.imageUrl ?? '');
  const [boardImageG] = useImage(BOARDS.find(b => b.nickname === 'G')?.imageUrl ?? '');
  const [boardImageH] = useImage(BOARDS.find(b => b.nickname === 'H')?.imageUrl ?? '');
  const boardImageByNickname = useMemo<Record<string, HTMLImageElement | undefined>>(() => ({
    A: boardImageA, B: boardImageB, C: boardImageC, D: boardImageD,
    E: boardImageE, F: boardImageF, G: boardImageG, H: boardImageH,
  }), [boardImageA, boardImageB, boardImageC, boardImageD, boardImageE, boardImageF, boardImageG, boardImageH]);

  const [explorerImage] = useImage('/InvaderExplorer.png');
  const [townImage] = useImage('/InvaderTown.png');
  const [cityImage] = useImage('/InvaderCity.png');
  const [strifeTokenImage] = useImage('/TokenStrife.png');
  const [dahanImage] = useImage('/Dahan.png');
  const [badlandsImage] = useImage('/TokenBadlands.png');
  const [beastsImage] = useImage('/TokenBeasts.png');
  const [deepsImage] = useImage('/TokenDeeps1.png');
  const [diseaseImage] = useImage('/TokenDisease.png');
  const [quakeImage] = useImage('/TokenQuake.png');
  const [vitalityImage] = useImage('/TokenVitality.png');
  const [wildsImage] = useImage('/TokenWilds.png');
  const [blightImage] = useImage('/Blight.png');
  
  const [boards, setBoards] = useState<Map<string, any>>(new Map());
  const [allBoardHitboxes, setAllBoardHitboxes] = useState<Record<string, { lands: Record<number, LandBounds>; stageDimensions: { width: number; height: number } }> | null>(null);
  const landBounds = allBoardHitboxes ? (allBoardHitboxes['A']?.lands ?? Object.values(allBoardHitboxes)[0]?.lands ?? null) : null;
  const [boardDimensions, setBoardDimensions] = useState({ width: DEFAULT_BOARD_WIDTH, height: DEFAULT_BOARD_HEIGHT });
  const [draggedPieceType, setDraggedPieceType] = useState<string | null>(null);
  const [draggingBoardId, setDraggingBoardId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPreviewPos, setDragPreviewPos] = useState<{ x: number; y: number } | null>(null);
  const [manageBoardsMode, setManageBoardsMode] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [isPanningView, setIsPanningView] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pendingPiecePointer, setPendingPiecePointer] = useState<
    (PieceLocation & { startClientX: number; startClientY: number }) | null
  >(null);
  const [draggingPiece, setDraggingPiece] = useState<(PieceLocation & { piece: GamePiece }) | null>(null);
  const [draggingPieceWorldPoint, setDraggingPieceWorldPoint] = useState<Point | null>(null);
  const [editingPiece, setEditingPiece] = useState<(PieceLocation & { piece: GamePiece }) | null>(null);
  const [editorDamage, setEditorDamage] = useState(0);
  const [editorStrife, setEditorStrife] = useState(0);
  const [showAdvancedTokens, setShowAdvancedTokens] = useState(false);
  const [spiritColors, setSpiritColors] = useState<Map<string, string>>(new Map());
  const [hoveredDropZone, setHoveredDropZone] = useState<'remove' | 'destroy' | null>(null);
  const [showBoardPicker, setShowBoardPicker] = useState(false);
  const didAutoCenterRef = useRef(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const updateViewportSize = () => {
      if (!canvasRef.current) return;
      const nextWidth = Math.max(320, Math.floor(canvasRef.current.clientWidth));
      const nextHeight = Math.max(220, Math.floor(canvasRef.current.clientHeight));
      setViewportSize((prev) => {
        if (prev.width === nextWidth && prev.height === nextHeight) {
          return prev;
        }
        return { width: nextWidth, height: nextHeight };
      });
    };

    updateViewportSize();

    const observer = new ResizeObserver(() => {
      updateViewportSize();
    });

    observer.observe(canvasRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const stageBounds = useMemo(() => {
    let minX = 0;
    let minY = 0;
    let maxRight = 0;
    let maxBottom = 0;

    boards.forEach((boardData, boardId) => {
      const x = draggingBoardId === boardId && dragPreviewPos ? dragPreviewPos.x : boardData.get('x') || 0;
      const y = draggingBoardId === boardId && dragPreviewPos ? dragPreviewPos.y : boardData.get('y') || 0;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxRight = Math.max(maxRight, x + boardDimensions.width);
      maxBottom = Math.max(maxBottom, y + boardDimensions.height);
    });

    const originX = Math.min(0, Math.floor(minX - STAGE_PADDING));
    const originY = Math.min(0, Math.floor(minY - STAGE_PADDING));

    return {
      minX,
      minY,
      maxRight,
      maxBottom,
      originX,
      originY,
      width: Math.max(viewportSize.width, Math.ceil(maxRight + STAGE_PADDING - originX)),
      height: Math.max(viewportSize.height, Math.ceil(maxBottom + STAGE_PADDING - originY)),
    };
  }, [
    boards,
    draggingBoardId,
    dragPreviewPos,
    boardDimensions.width,
    boardDimensions.height,
    viewportSize.width,
    viewportSize.height,
  ]);

  const toWorldPoint = (stagePixelX: number, stagePixelY: number) => ({
    x: stagePixelX / zoom + stageBounds.originX,
    y: stagePixelY / zoom + stageBounds.originY,
  });

  const toStagePoint = (worldX: number, worldY: number) => ({
    x: (worldX - stageBounds.originX) * zoom,
    y: (worldY - stageBounds.originY) * zoom,
  });

  const centerViewOnBoards = useCallback(() => {
    if (!canvasRef.current || boards.size === 0) return;

    const worldCenterX = (stageBounds.minX + stageBounds.maxRight) / 2;
    const worldCenterY = (stageBounds.minY + stageBounds.maxBottom) / 2;
    const stageCenterX = (worldCenterX - stageBounds.originX) * zoom;
    const stageCenterY = (worldCenterY - stageBounds.originY) * zoom;

    const maxScrollLeft = Math.max(0, stageBounds.width * zoom - viewportSize.width);
    const maxScrollTop = Math.max(0, stageBounds.height * zoom - viewportSize.height);

    canvasRef.current.scrollLeft = Math.min(
      Math.max(0, stageCenterX - viewportSize.width / 2),
      maxScrollLeft
    );
    canvasRef.current.scrollTop = Math.min(
      Math.max(0, stageCenterY - viewportSize.height / 2),
      maxScrollTop
    );
  }, [boards.size, stageBounds, zoom, canvasRef, viewportSize]);

  useEffect(() => {
    if (boards.size > 0 && !didAutoCenterRef.current) {
      centerViewOnBoards();
      didAutoCenterRef.current = true;
    }
  }, [boards.size, stageBounds, zoom, centerViewOnBoards]);

  const updateZoomAtPointer = (nextZoom: number, clientX?: number, clientY?: number) => {
    if (!canvasRef.current) return;

    const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    const prevZoom = zoom;
    if (Math.abs(clampedZoom - prevZoom) < 0.0001) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const pointerViewportX = clientX !== undefined ? clientX - rect.left : viewportSize.width / 2;
    const pointerViewportY = clientY !== undefined ? clientY - rect.top : viewportSize.height / 2;
    const pointerStageX = canvasRef.current.scrollLeft + pointerViewportX;
    const pointerStageY = canvasRef.current.scrollTop + pointerViewportY;
    const pointerWorldX = pointerStageX / prevZoom + stageBounds.originX;
    const pointerWorldY = pointerStageY / prevZoom + stageBounds.originY;

    setZoom(clampedZoom);

    requestAnimationFrame(() => {
      if (!canvasRef.current) return;

      const newStageX = (pointerWorldX - stageBounds.originX) * clampedZoom;
      const newStageY = (pointerWorldY - stageBounds.originY) * clampedZoom;
      const maxScrollLeft = Math.max(0, stageBounds.width * clampedZoom - viewportSize.width);
      const maxScrollTop = Math.max(0, stageBounds.height * clampedZoom - viewportSize.height);

      canvasRef.current.scrollLeft = Math.min(
        Math.max(0, newStageX - pointerViewportX),
        maxScrollLeft
      );
      canvasRef.current.scrollTop = Math.min(
        Math.max(0, newStageY - pointerViewportY),
        maxScrollTop
      );
    });
  };

  useEffect(() => {
    onToolbarStateChange?.({
      manageBoardsMode,
      zoomPercent: Math.round(zoom * 100),
    });
  }, [manageBoardsMode, zoom, onToolbarStateChange]);

  useImperativeHandle(ref, () => ({
    toggleManageBoardsMode: () => {
      setManageBoardsMode((prev) => !prev);
    },
    zoomIn: () => {
      updateZoomAtPointer(zoom + ZOOM_STEP);
    },
    zoomOut: () => {
      updateZoomAtPointer(zoom - ZOOM_STEP);
    },
    resetZoom: () => {
      didAutoCenterRef.current = true;
      updateZoomAtPointer(1);
    },
    centerOnBoards: () => {
      centerViewOnBoards();
    },
  }), [zoom, centerViewOnBoards]);

  useEffect(() => {
    const loadLandBounds = async () => {
      try {
        const response = await fetch('/boardHitboxes.json');
        const data: Record<string, LandBoundsAsset> = await response.json();
        setAllBoardHitboxes(
          Object.fromEntries(
            Object.entries(data).map(([nickname, asset]) => [
              nickname,
              { lands: asset.lands, stageDimensions: asset.stageDimensions },
            ])
          )
        );
        const firstAsset = Object.values(data)[0];
        if (firstAsset?.stageDimensions?.width && firstAsset?.stageDimensions?.height) {
          setBoardDimensions({
            width: firstAsset.stageDimensions.width,
            height: firstAsset.stageDimensions.height,
          });
        }
      } catch (error) {
        console.error('Failed to load board hitboxes:', error);
      }
    };
    loadLandBounds();
  }, []);

  // Subscribe to boards and their positions
  useEffect(() => {
    const doc = docRef.current;
    if (!doc) {
      return;
    }

    const gameMap = doc.getMap('game');

    const updateBoards = () => {
      const updatedBoards = new Map<string, any>();
      const nextColors = new Map<string, string>();
      const boardsMap = gameMap.get('boards') as Y.Map<any> | undefined;
      if (boardsMap) {
        boardsMap.forEach((boardData: any, boardId: string) => {
          updatedBoards.set(boardId, boardData);
        });
      }
      // Spirit colors live in game.spirits, keyed by spirit slot ID.
      const spiritsMap = gameMap.get('spirits') as Y.Map<any> | undefined;
      if (spiritsMap) {
        spiritsMap.forEach((spiritData: any, spiritSlotId: string) => {
          if (!(spiritData instanceof Y.Map)) return;
          const color = spiritData.get('presenceColor');
          if (typeof color === 'string') nextColors.set(spiritSlotId, color);
        });
      }
      setBoards(updatedBoards);
      setSpiritColors(nextColors);
    };

    // Call updateBoards immediately
    updateBoards();

    const updateHandler = () => {
      updateBoards();
    };
    gameMap.observeDeep(updateHandler);

    return () => {
      gameMap.unobserveDeep(updateHandler);
    };
  }, [docRef]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    // Support external drags (e.g. blight token dragged from GamestatePanel blight card)
    const externalPieceType = e.dataTransfer.getData('piece-type');
    const isBlightFromCard = externalPieceType === 'blight-from-card';
    const isPresenceFromPanel = externalPieceType === 'presence-from-panel';
    const isPresenceDestroyedFromPanel = externalPieceType === 'presence-destroyed-from-panel';
    const spiritBoardId = (isPresenceFromPanel || isPresenceDestroyedFromPanel) ? e.dataTransfer.getData('spirit-board-id') : '';
    const spiritSlotIndexRaw = isPresenceFromPanel ? e.dataTransfer.getData('spirit-slot-index') : '';
    const spiritSlotIndex = Number.parseInt(spiritSlotIndexRaw, 10);
    const spiritSlotRewardRaw = isPresenceFromPanel ? e.dataTransfer.getData('spirit-slot-reward') : '';
    const spiritSlotReward = spiritSlotRewardRaw.trim();
    const hasPresenceSlotIndex = Number.isInteger(spiritSlotIndex) && spiritSlotIndex >= 0;
    const activePieceType = draggedPieceType ?? (isBlightFromCard ? 'blight' : isPresenceFromPanel ? 'presence' : isPresenceDestroyedFromPanel ? 'presence' : null);

    if (!activePieceType || !landBounds || !canvasRef.current || draggingPiece) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const dropStageX = e.clientX - rect.left + canvasRef.current.scrollLeft;
    const dropStageY = e.clientY - rect.top + canvasRef.current.scrollTop;
    const { x: dropX, y: dropY } = toWorldPoint(dropStageX, dropStageY);

    const doc = docRef.current;
    if (!doc) return;

    const gameMap = doc.getMap('game');
    const boardsMap = gameMap.get('boards') as Y.Map<any>;
    if (!boardsMap) return;

    // Strife must be dropped onto an existing invader, not a land
    if (activePieceType === 'strife') {
      const invaderMatch = findInvaderAtWorldPoint({ x: dropX, y: dropY });
      if (invaderMatch) {
        const { boardId, landId, pieceIndex, piece } = invaderMatch;
        const boardData = boardsMap.get(boardId) as any;
        if (boardData) {
          const landsMap = boardData.get('lands') as Y.Map<any>;
          const piecesArray = landsMap.get(landId) as Y.Array<any>;
          if (piecesArray && pieceIndex >= 0 && pieceIndex < piecesArray.length) {
            const newStrife = (piece.strife ?? 0) + 1;
            doc.transact(() => {
              piecesArray.delete(pieceIndex, 1);
              piecesArray.insert(pieceIndex, [{ ...piece, strife: newStrife, updatedBy: 'user', timestamp: Date.now() }]);
            }, 'strife-add');
          }
        }
      }
      setDraggedPieceType(null);
      return;
    }

    let foundLand = false;
    boardsMap.forEach((boardData: any, _boardId: string) => {
      if (foundLand) return;

      const boardX = boardData.get('x') || 0;
      const boardY = boardData.get('y') || 0;

      const rotation = boardData.get('rotation') || 0;
      const localPoint = getBoardLocalPoint(
        { x: dropX, y: dropY },
        boardX,
        boardY,
        rotation,
        boardDimensions.width,
        boardDimensions.height
      );

      if (
        localPoint.x >= 0 &&
        localPoint.x <= boardDimensions.width &&
        localPoint.y >= 0 &&
        localPoint.y <= boardDimensions.height
      ) {
        const localX = localPoint.x;
        const localY = localPoint.y;
        const boardType = boardData.get('boardType') as string | undefined;
        const dropLandBounds = (allBoardHitboxes && boardType ? allBoardHitboxes[boardType]?.lands : null) ?? landBounds;
        if (!dropLandBounds) return;

        for (const [landId, bounds] of Object.entries(dropLandBounds)) {
          if (isPointInPolygon({ x: localX, y: localY }, (bounds as any).polygon)) {
            const landsMap = boardData.get('lands') as Y.Map<any>;
            const piecesArray = landsMap.get(landId) as Y.Array<any>;

            const newPiece: GamePiece = {
              pieceId: `${activePieceType}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
              type: activePieceType,
              subtype: activePieceType === 'presence' ? spiritBoardId : activePieceType,
              presenceSlotIndex: activePieceType === 'presence' && hasPresenceSlotIndex ? spiritSlotIndex : undefined,
              presenceReward: activePieceType === 'presence' && spiritSlotReward.length > 0 ? spiritSlotReward : undefined,
              damage: getDefaultDamage(activePieceType),
              count: 1,
              strife: 0,
              updatedBy: 'user',
              timestamp: Date.now(),
            };

            piecesArray.push([newPiece]);
            foundLand = true;
            break;
          }
        }
      }
    });

    // When blight is dragged from the blight card, decrement the blight counter
    if (isBlightFromCard && foundLand) {
      const currentCount = typeof gameMap.get('blightCount') === 'number'
        ? (gameMap.get('blightCount') as number)
        : 0;
      gameMap.set('blightCount', Math.max(0, currentCount - 1));
    }

    // When presence is dragged from the spirit panel, decrement presenceInSupply
    if (isPresenceFromPanel && foundLand && spiritBoardId) {
      const spiritsMap2 = gameMap.get('spirits') as Y.Map<any> | undefined;
      if (spiritsMap2) {
        const spiritData = spiritsMap2.get(spiritBoardId) as any;
        if (spiritData instanceof Y.Map) {
          const rawSupplySlots = spiritData.get('presenceSupplySlotIndices');
          const currentSupplySlots = Array.isArray(rawSupplySlots)
            ? [...new Set(rawSupplySlots.filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry)).map((entry) => Math.floor(entry)).filter((entry) => entry >= 0 && entry < 13))]
            : [];
          const nextSupplySlots = hasPresenceSlotIndex
            ? currentSupplySlots.filter((entry) => entry !== spiritSlotIndex)
            : currentSupplySlots.slice(0, Math.max(0, currentSupplySlots.length - 1));
          const current = typeof spiritData.get('presenceInSupply') === 'number'
            ? (spiritData.get('presenceInSupply') as number)
            : currentSupplySlots.length;
          doc.transact(() => {
            if (currentSupplySlots.length > 0) {
              spiritData.set('presenceSupplySlotIndices', nextSupplySlots);
              spiritData.set('presenceInSupply', nextSupplySlots.length);
            } else {
              spiritData.set('presenceInSupply', Math.max(0, current - 1));
            }
            spiritData.set('presenceOnIsland', Math.max(0, (typeof spiritData.get('presenceOnIsland') === 'number' ? spiritData.get('presenceOnIsland') as number : 0) + 1));
          });
        }
      }
    }

    // When a destroyed presence is dragged back onto the island, decrement presenceDestroyed
    if (isPresenceDestroyedFromPanel && foundLand && spiritBoardId) {
      const spiritsMapDP = gameMap.get('spirits') as Y.Map<any> | undefined;
      if (spiritsMapDP) {
        const spiritDataDP = spiritsMapDP.get(spiritBoardId) as any;
        if (spiritDataDP instanceof Y.Map) {
          doc.transact(() => {
            const currentDestroyed = typeof spiritDataDP.get('presenceDestroyed') === 'number'
              ? spiritDataDP.get('presenceDestroyed') as number
              : 0;
            const currentOnIsland = typeof spiritDataDP.get('presenceOnIsland') === 'number'
              ? spiritDataDP.get('presenceOnIsland') as number
              : 0;
            spiritDataDP.set('presenceDestroyed', Math.max(0, currentDestroyed - 1));
            spiritDataDP.set('presenceOnIsland', currentOnIsland + 1);
          });
        }
      }
    }

    setDraggedPieceType(null);
  };

  const findInvaderAtWorldPoint = (
    worldPoint: Point
  ): { boardId: string; landId: string; pieceIndex: number; piece: GamePiece } | null => {
    if (!allBoardHitboxes && !landBounds) return null;
    const doc = docRef.current;
    if (!doc) return null;

    const gameMap = doc.getMap('game');
    const boardsMap = gameMap.get('boards') as Y.Map<any> | undefined;
    if (!boardsMap) return null;

    const HIT_RADIUS = PIECE_SIZE * 1.2;
    let match: { boardId: string; landId: string; pieceIndex: number; piece: GamePiece } | null = null;

    boardsMap.forEach((boardData: any, boardId: string) => {
      if (match) return;

      const boardX = boardData.get('x') || 0;
      const boardY = boardData.get('y') || 0;
      const rotation = boardData.get('rotation') || 0;
      const ibt = boardData.get('boardType') as string | null;
      const invBounds = (allBoardHitboxes && ibt ? allBoardHitboxes[ibt]?.lands : null) ?? landBounds;

      const localPoint = getBoardLocalPoint(
        worldPoint,
        boardX, boardY, rotation,
        boardDimensions.width, boardDimensions.height
      );

      const landsMap = boardData.get('lands') as Y.Map<any> | undefined;
      if (!landsMap) return;

      landsMap.forEach((piecesArray: any, landId: string) => {
        if (match) return;

        const bounds = invBounds ? invBounds[parseInt(landId, 10)] : null;
        if (!bounds) return;

        const center = getPolygonCenter((bounds as any).polygon);

        const piecesForLand: GamePiece[] = [];
        (piecesArray as Y.Array<any>).forEach((p: any) => piecesForLand.push(p));

        const grouped = new Map<string, { piece: GamePiece; count: number; representativeIndex: number }>();
        piecesForLand.forEach((piece, idx) => {
          const pieceDamage = piece.damage ?? piece.health ?? 0;
          const pieceStrife = piece.strife ?? 0;
          const key = `${piece.type}|${pieceDamage}|${pieceStrife}`;
          const existing = grouped.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            grouped.set(key, { piece, count: 1, representativeIndex: idx });
          }
        });

        const groupedEntries = Array.from(grouped.entries());
        groupedEntries.forEach(([, info], groupIndex) => {
          if (match) return;
          if (!['explorer', 'town', 'city'].includes(info.piece.type)) return;

          const clusterOffset = getClusterOffset(groupIndex, groupedEntries.length);
          const pieceX = center.x + clusterOffset.x;
          const pieceY = center.y + clusterOffset.y;

          const dx = localPoint.x - pieceX;
          const dy = localPoint.y - pieceY;
          if (Math.sqrt(dx * dx + dy * dy) <= HIT_RADIUS) {
            match = { boardId, landId, pieceIndex: info.representativeIndex, piece: info.piece };
          }
        });
      });
    });

    return match;
  };

  const findLandAtWorldPoint = (worldPoint: Point): { boardId: string; landId: string } | null => {
    if (!allBoardHitboxes && !landBounds) return null;
    const doc = docRef.current;
    if (!doc) return null;

    const gameMap = doc.getMap('game');
    const boardsMap = gameMap.get('boards') as Y.Map<any> | undefined;
    if (!boardsMap) return null;

    let match: { boardId: string; landId: string } | null = null;

    boardsMap.forEach((boardData: any, boardId: string) => {
      if (match) return;

      const boardX = boardData.get('x') || 0;
      const boardY = boardData.get('y') || 0;
      const rotation = boardData.get('rotation') || 0;
      const bt = boardData.get('boardType') as string | null;
      const bounds4Board = (allBoardHitboxes && bt ? allBoardHitboxes[bt]?.lands : null) ?? landBounds;
      if (!bounds4Board) return;

      const localPoint = getBoardLocalPoint(
        { x: worldPoint.x, y: worldPoint.y },
        boardX,
        boardY,
        rotation,
        boardDimensions.width,
        boardDimensions.height
      );

      if (
        localPoint.x < 0 ||
        localPoint.x > boardDimensions.width ||
        localPoint.y < 0 ||
        localPoint.y > boardDimensions.height
      ) {
        return;
      }

      for (const [landId, bounds] of Object.entries(bounds4Board)) {
        if (isPointInPolygon(localPoint, (bounds as any).polygon)) {
          match = { boardId, landId };
          break;
        }
      }
    });

    return match;
  };

  const updatePieceAtLocation = (location: PieceLocation, nextPiece: GamePiece) => {
    const doc = docRef.current;
    if (!doc) return;

    const gameMap = doc.getMap('game');
    const boardsMap = gameMap.get('boards') as Y.Map<any> | undefined;
    if (!boardsMap) return;

    const boardData = boardsMap.get(location.boardId) as any;
    if (!boardData) return;

    const landsMap = boardData.get('lands') as Y.Map<any> | undefined;
    if (!landsMap) return;

    const piecesArray = landsMap.get(location.landId) as Y.Array<any> | undefined;
    if (!piecesArray) return;

    if (location.pieceIndex < 0 || location.pieceIndex >= piecesArray.length) return;

    doc.transact(() => {
      piecesArray.delete(location.pieceIndex, 1);
      piecesArray.insert(location.pieceIndex, [nextPiece]);
    }, 'piece-edit');
  };

  const deletePieceAtLocation = (location: PieceLocation) => {
    const doc = docRef.current;
    if (!doc) return;

    const gameMap = doc.getMap('game');
    const boardsMap = gameMap.get('boards') as Y.Map<any> | undefined;
    if (!boardsMap) return;

    const boardData = boardsMap.get(location.boardId) as any;
    if (!boardData) return;

    const landsMap = boardData.get('lands') as Y.Map<any> | undefined;
    if (!landsMap) return;

    const piecesArray = landsMap.get(location.landId) as Y.Array<any> | undefined;
    if (!piecesArray) return;

    if (location.pieceIndex < 0 || location.pieceIndex >= piecesArray.length) return;

    piecesArray.delete(location.pieceIndex, 1);
  };

  const addFear = (amount: number) => {
    const doc = docRef.current;
    if (!doc || amount <= 0) return;
    const gameMap = doc.getMap('game');
    doc.transact(() => {
      const getNum = (key: string, fallback: number) => {
        const v = gameMap.get(key);
        return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
      };
      let fearPool = Math.max(0, getNum('fearPool', 0));
      const fearThreshold = getNum('fearThreshold', 4);
      let fearCardsEarned = Math.max(0, getNum('fearCardsEarned', 0));
      let fearDeck = Array.isArray(gameMap.get('fearDeckCards')) ? [...(gameMap.get('fearDeckCards') as any[])] : [];
      let fearEarned = Array.isArray(gameMap.get('fearEarnedCards')) ? [...(gameMap.get('fearEarnedCards') as any[])] : [];
      fearPool += amount;
      if (fearThreshold > 0) {
        while (fearPool >= fearThreshold) {
          fearPool -= fearThreshold;
          fearCardsEarned += 1;
          const [earnedCard, ...remaining] = fearDeck;
          if (earnedCard) {
            fearEarned = [...fearEarned, earnedCard];
            fearDeck = remaining;
          }
        }
      }
      gameMap.set('fearPool', fearPool);
      gameMap.set('fearCardsEarned', fearCardsEarned);
      gameMap.set('fearDeckCards', fearDeck);
      gameMap.set('fearEarnedCards', fearEarned);
    }, 'fear-add');
  };

  const returnPresenceToDestroyedPile = (piece: GamePiece) => {
    const spiritSlotId = piece.subtype ?? '';
    if (!spiritSlotId) return;
    const doc = docRef.current;
    if (!doc) return;
    doc.transact(() => {
      const gameMap = doc.getMap('game');
      const spiritsMap = gameMap.get('spirits') as Y.Map<any> | undefined;
      if (!spiritsMap) return;
      const spiritData = spiritsMap.get(spiritSlotId) as any;
      if (!(spiritData instanceof Y.Map)) return;
      const onIsland = typeof spiritData.get('presenceOnIsland') === 'number'
        ? Math.max(0, (spiritData.get('presenceOnIsland') as number) - 1)
        : 0;
      const destroyed = typeof spiritData.get('presenceDestroyed') === 'number'
        ? (spiritData.get('presenceDestroyed') as number) + 1
        : 1;
      spiritData.set('presenceOnIsland', onIsland);
      spiritData.set('presenceDestroyed', destroyed);
    }, 'presence-destroy');
  };

  const handleDropOnZone = (zone: 'remove' | 'destroy', piece: GamePiece, location: PieceLocation) => {
    deletePieceAtLocation(location);
    if (piece.type === 'presence') {
      returnPresenceToDestroyedPile(piece);
    }
    if (zone === 'destroy') {
      const fearAmount = piece.type === 'town' ? 1 : piece.type === 'city' ? 2 : 0;
      if (fearAmount > 0) {
        addFear(fearAmount);
      }
    }
  };

  const movePiece = (from: PieceLocation, to: { boardId: string; landId: string }) => {
    const doc = docRef.current;
    if (!doc) return;

    const gameMap = doc.getMap('game');
    const boardsMap = gameMap.get('boards') as Y.Map<any> | undefined;
    if (!boardsMap) return;

    const fromBoard = boardsMap.get(from.boardId) as any;
    const toBoard = boardsMap.get(to.boardId) as any;
    if (!fromBoard || !toBoard) return;

    const fromLands = fromBoard.get('lands') as Y.Map<any> | undefined;
    const toLands = toBoard.get('lands') as Y.Map<any> | undefined;
    if (!fromLands || !toLands) return;

    const fromPieces = fromLands.get(from.landId) as Y.Array<any> | undefined;
    const toPieces = toLands.get(to.landId) as Y.Array<any> | undefined;
    if (!fromPieces || !toPieces) return;

    if (from.pieceIndex < 0 || from.pieceIndex >= fromPieces.length) return;

    const sourcePiece = fromPieces.get(from.pieceIndex) as GamePiece;
    if (!sourcePiece) return;

    const nextPiece: GamePiece = {
      ...sourcePiece,
      updatedBy: 'user',
      timestamp: Date.now(),
    };

    doc.transact(() => {
      fromPieces.delete(from.pieceIndex, 1);
      toPieces.push([nextPiece]);
    }, 'piece-move');
  };

  const rotateBoard = (boardId: string, degrees: number) => {
    const doc = docRef.current;
    if (!doc) return;

    const gameMap = doc.getMap('game');
    const boardsMap = gameMap.get('boards') as Y.Map<any>;
    if (!boardsMap) return;
    const boardData = boardsMap.get(boardId) as any;
    if (!boardData) return;

    const currentRotation = boardData.get('rotation') || 0;
    const newRotation = (currentRotation + degrees) % 360;
    boardData.set('rotation', newRotation);
  };

  const handleBoardMouseDown = (e: React.MouseEvent, boardId: string) => {
    e.preventDefault();
    const doc = docRef.current;
    if (!doc) return;

    const gameMap = doc.getMap('game');
    const boardsMap = gameMap.get('boards') as Y.Map<any>;
    if (!boardsMap) return;
    const boardData = boardsMap.get(boardId) as any;
    if (!boardData) return;
    
    const boardX = boardData.get('x') || 0;
    const boardY = boardData.get('y') || 0;

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();

    setDraggingBoardId(boardId);
    setDragPreviewPos({ x: boardX, y: boardY });
    const pointerStageX = e.clientX - rect.left + canvasRef.current.scrollLeft;
    const pointerStageY = e.clientY - rect.top + canvasRef.current.scrollTop;
    const pointerWorld = toWorldPoint(pointerStageX, pointerStageY);

    setDragOffset({
      x: pointerWorld.x - boardX,
      y: pointerWorld.y - boardY,
    });
  };

  useEffect(() => {
    if (!draggingBoardId || !canvasRef.current || !manageBoardsMode) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const pointerStageX = e.clientX - rect.left + canvasRef.current!.scrollLeft;
      const pointerStageY = e.clientY - rect.top + canvasRef.current!.scrollTop;
      const pointerWorld = toWorldPoint(pointerStageX, pointerStageY);
      const newX = pointerWorld.x - dragOffset.x;
      const newY = pointerWorld.y - dragOffset.y;

      const doc = docRef.current;
      if (!doc) return;

      const gameMap = doc.getMap('game');
      const boardsMap = gameMap.get('boards') as Y.Map<any>;
      if (!boardsMap) return;
      const boardData = boardsMap.get(draggingBoardId) as any;
      if (!boardData) return;

      // Update local preview first so dragging stays visually locked to the cursor.
      setDragPreviewPos({ x: newX, y: newY });
      boardData.set('x', newX);
      boardData.set('y', newY);
    };

    const handleMouseUp = () => {
      setDragPreviewPos(null);
      setDraggingBoardId(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingBoardId, dragOffset, docRef, manageBoardsMode, stageBounds.originX, stageBounds.originY]);

  useEffect(() => {
    if (!isPanningView || !panStart || !canvasRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;

      canvasRef.current!.scrollLeft = panStart.scrollLeft - deltaX;
      canvasRef.current!.scrollTop = panStart.scrollTop - deltaY;
    };

    const handleMouseUp = () => {
      setIsPanningView(false);
      setPanStart(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanningView, panStart]);

  useEffect(() => {
    if (!pendingPiecePointer || !canvasRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - pendingPiecePointer.startClientX;
      const deltaY = e.clientY - pendingPiecePointer.startClientY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (!draggingPiece && distance > 5) {
        const boardData = boards.get(pendingPiecePointer.boardId);
        const landsMap = boardData?.get('lands') as Y.Map<any> | undefined;
        const piecesArray = landsMap?.get(pendingPiecePointer.landId) as Y.Array<any> | undefined;
        const piece = piecesArray?.get(pendingPiecePointer.pieceIndex) as GamePiece | undefined;

        if (!piece) {
          setPendingPiecePointer(null);
          return;
        }

        setDraggingPiece({
          boardId: pendingPiecePointer.boardId,
          landId: pendingPiecePointer.landId,
          pieceIndex: pendingPiecePointer.pieceIndex,
          piece,
        });
      }

      const rect = canvasRef.current!.getBoundingClientRect();
      const pointerStageX = e.clientX - rect.left + canvasRef.current!.scrollLeft;
      const pointerStageY = e.clientY - rect.top + canvasRef.current!.scrollTop;
      const pointerWorld = toWorldPoint(pointerStageX, pointerStageY);
      setDraggingPieceWorldPoint(pointerWorld);

      // Track drop zone hover for visual feedback
      const dropZoneEl = document
        .elementsFromPoint(e.clientX, e.clientY)
        .find((el): el is HTMLElement => el instanceof HTMLElement && !!el.dataset.dropZone);
      setHoveredDropZone((dropZoneEl?.dataset.dropZone as 'remove' | 'destroy' | null) ?? null);
    };

    const handleMouseUp = (e: MouseEvent) => {
      setHoveredDropZone(null);
      if (draggingPiece) {
        // Check if dropped on a remove/destroy zone
        const dropZoneEl = document
          .elementsFromPoint(e.clientX, e.clientY)
          .find((el): el is HTMLElement => el instanceof HTMLElement && !!el.dataset.dropZone);
        const dropZone = dropZoneEl?.dataset.dropZone as 'remove' | 'destroy' | undefined;
        if (dropZone === 'remove' || dropZone === 'destroy') {
          handleDropOnZone(dropZone, draggingPiece.piece, {
            boardId: draggingPiece.boardId,
            landId: draggingPiece.landId,
            pieceIndex: draggingPiece.pieceIndex,
          });
          setPendingPiecePointer(null);
          setDraggingPiece(null);
          setDraggingPieceWorldPoint(null);
          return;
        }

        const rect = canvasRef.current!.getBoundingClientRect();
        const pointerStageX = e.clientX - rect.left + canvasRef.current!.scrollLeft;
        const pointerStageY = e.clientY - rect.top + canvasRef.current!.scrollTop;
        const pointerWorld = toWorldPoint(pointerStageX, pointerStageY);
        const targetLand = findLandAtWorldPoint(pointerWorld);

        if (targetLand) {
          movePiece(
            {
              boardId: draggingPiece.boardId,
              landId: draggingPiece.landId,
              pieceIndex: draggingPiece.pieceIndex,
            },
            targetLand
          );
        } else if (draggingPiece.piece.type === 'presence') {
          // Drag presence off a land → return it to the spirit panel
          const spiritBoardId2 = draggingPiece.piece.subtype ?? draggingPiece.boardId;
          const slotDropTarget = document
            .elementsFromPoint(e.clientX, e.clientY)
            .find((element) => {
              if (!(element instanceof HTMLElement)) {
                return false;
              }
              if (element.dataset.spiritBoardId !== spiritBoardId2) {
                return false;
              }
              return typeof element.dataset.presenceSlotIndex === 'string';
            }) as HTMLElement | undefined;
          const droppedSlotIndex = slotDropTarget
            ? Number.parseInt(slotDropTarget.dataset.presenceSlotIndex ?? '', 10)
            : Number.NaN;
          const sourceSlotIndex = typeof draggingPiece.piece.presenceSlotIndex === 'number'
            ? Math.floor(draggingPiece.piece.presenceSlotIndex)
            : Number.NaN;
          const preferredSlotIndex: number = Number.isInteger(droppedSlotIndex)
            ? droppedSlotIndex
            : sourceSlotIndex;

          deletePieceAtLocation({
            boardId: draggingPiece.boardId,
            landId: draggingPiece.landId,
            pieceIndex: draggingPiece.pieceIndex,
          });
          const doc2 = docRef.current;
          if (doc2) {
            const gameMap2 = doc2.getMap('game') as Y.Map<unknown>;
            doc2.transact(() => {
              const spirits2 = gameMap2.get('spirits') as Y.Map<unknown> | undefined;
              if (!(spirits2 instanceof Y.Map)) return;
              const spiritData2 = spirits2.get(spiritBoardId2) as Y.Map<unknown> | undefined;
              if (!(spiritData2 instanceof Y.Map)) return;
              const inSupply = typeof spiritData2.get('presenceInSupply') === 'number'
                ? (spiritData2.get('presenceInSupply') as number)
                : 0;
              const onIsland = typeof spiritData2.get('presenceOnIsland') === 'number'
                ? (spiritData2.get('presenceOnIsland') as number)
                : 0;
              const rawSupplySlots = spiritData2.get('presenceSupplySlotIndices');
              const currentSupplySlots = Array.isArray(rawSupplySlots)
                ? [...new Set(rawSupplySlots
                  .filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
                  .map((entry) => Math.floor(entry))
                  .filter((entry) => entry >= 0 && entry < 13))]
                : [];

              let nextSupplySlots = [...currentSupplySlots];
              if (nextSupplySlots.length < 13) {
                if (Number.isInteger(preferredSlotIndex) && preferredSlotIndex >= 0 && preferredSlotIndex < 13) {
                  if (!nextSupplySlots.includes(preferredSlotIndex)) {
                    nextSupplySlots.push(preferredSlotIndex);
                  }
                } else {
                  for (let slotIndex = 0; slotIndex < 13; slotIndex += 1) {
                    if (!nextSupplySlots.includes(slotIndex)) {
                      nextSupplySlots.push(slotIndex);
                      break;
                    }
                  }
                }
              }

              nextSupplySlots = [...new Set(nextSupplySlots)].sort((a, b) => a - b);

              spiritData2.set('presenceSupplySlotIndices', nextSupplySlots);
              spiritData2.set('presenceInSupply', nextSupplySlots.length || Math.max(0, inSupply + 1));
              spiritData2.set('presenceOnIsland', Math.max(0, onIsland - 1));
            });
          }
        }
      } else {
        const boardData = boards.get(pendingPiecePointer.boardId);
        const landsMap = boardData?.get('lands') as Y.Map<any> | undefined;
        const piecesArray = landsMap?.get(pendingPiecePointer.landId) as Y.Array<any> | undefined;
        const piece = piecesArray?.get(pendingPiecePointer.pieceIndex) as GamePiece | undefined;

        if (piece) {
          setEditingPiece({
            boardId: pendingPiecePointer.boardId,
            landId: pendingPiecePointer.landId,
            pieceIndex: pendingPiecePointer.pieceIndex,
            piece,
          });
          setEditorDamage(piece.damage ?? piece.health ?? getDefaultDamage(piece.type));
          setEditorStrife(piece.strife ?? 0);
        }
      }

      setPendingPiecePointer(null);
      setDraggingPiece(null);
      setDraggingPieceWorldPoint(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [pendingPiecePointer, draggingPiece, boards, stageBounds.originX, stageBounds.originY]);

  const pieceImageMap = useMemo<Record<string, any>>(() => ({
    explorer: explorerImage,
    town: townImage,
    city: cityImage,
    dahan: dahanImage,
    badlands: badlandsImage,
    beast: beastsImage,
    deeps: deepsImage,
    disease: diseaseImage,
    quake: quakeImage,
    vitality: vitalityImage,
    wilds: wildsImage,
    strife: strifeTokenImage,
    blight: blightImage,
  }), [explorerImage, townImage, cityImage, dahanImage, badlandsImage, beastsImage, deepsImage, diseaseImage, quakeImage, vitalityImage, wildsImage, strifeTokenImage, blightImage]);

  const getPieceImage = (type: string) => pieceImageMap[type];

  const usedBoardTypes = useMemo<Set<string>>(() => {
    const used = new Set<string>();
    boards.forEach((boardData) => {
      const bt = boardData.get('boardType') as string | undefined;
      if (bt) used.add(bt);
    });
    return used;
  }, [boards]);

  const createBoardWithType = (nickname: string) => {
    const doc = docRef.current;
    if (!doc) return;

    const gameMap = doc.getMap('game');
    const boardsMap = gameMap.get('boards') as Y.Map<any>;
    if (!boardsMap) {
      console.warn('Boards map is not ready yet; wait for sync before adding boards');
      return;
    }

    let sameTypeCount = 0;
    boardsMap.forEach((bd: any) => {
      if ((bd.get('boardType') as string | undefined) === nickname) sameTypeCount++;
    });
    let newBoardId = sameTypeCount === 0 ? nickname : `${nickname}${sameTypeCount + 1}`;
    let suffix = sameTypeCount + 1;
    while (boardsMap.has(newBoardId)) {
      suffix++;
      newBoardId = `${nickname}${suffix}`;
    }

    const newBoard = new Y.Map();
    newBoard.set('boardId', newBoardId);
    newBoard.set('boardType', nickname);
    newBoard.set('x', 300 + Math.random() * 100);
    newBoard.set('y', 200 + Math.random() * 100);
    newBoard.set('rotation', 0);

    const lands = new Y.Map();
    const landCount = allBoardHitboxes?.[nickname]
      ? Object.keys(allBoardHitboxes[nickname].lands).length
      : 8;
    for (let i = 1; i <= landCount; i++) {
      lands.set(i.toString(), new Y.Array());
    }
    newBoard.set('lands', lands);

    boardsMap.set(newBoardId, newBoard);
    setShowBoardPicker(false);
  };

  const pickRandomBoard = () => {
    const available = BOARDS.filter((b) => !usedBoardTypes.has(b.nickname));
    if (available.length === 0) return;
    const pick = available[Math.floor(Math.random() * available.length)];
    createBoardWithType(pick.nickname);
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-2 overflow-hidden">
      {/* Info and Controls - only show when manage mode is on */}
      {manageBoardsMode && (
      <div className="flex justify-between items-center gap-4">
        <div className="text-sm text-slate-600">
          <span className="font-semibold">{boards.size}</span> board(s) on canvas
          {draggingBoardId && (
            <span className="ml-3 rounded bg-blue-100 px-2 py-1 text-blue-700">
              Dragging board {draggingBoardId}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBoardPicker(true)}
            className="px-4 py-2 rounded bg-slate-800 text-white hover:bg-slate-700 transition"
          >
            + Add Board
          </button>
          
          {/* Board control buttons - show only when a board is selected */}
          {selectedBoardId && (
            <>
              <button
                onClick={() => rotateBoard(selectedBoardId, -30)}
                title="Rotate left 30°"
                className="px-3 py-2 rounded bg-amber-500 text-white hover:bg-amber-600 transition font-semibold"
              >
                -30°
              </button>
              <button
                onClick={() => rotateBoard(selectedBoardId, 30)}
                title="Rotate right 30°"
                className="px-3 py-2 rounded bg-amber-500 text-white hover:bg-amber-600 transition font-semibold"
              >
                +30°
              </button>
              <button
                onClick={() => rotateBoard(selectedBoardId, -90)}
                title="Rotate left 90°"
                className="px-3 py-2 rounded bg-orange-500 text-white hover:bg-orange-600 transition font-semibold"
              >
                -90°
              </button>
              <button
                onClick={() => rotateBoard(selectedBoardId, 90)}
                title="Rotate right 90°"
                className="px-3 py-2 rounded bg-orange-500 text-white hover:bg-orange-600 transition font-semibold"
              >
                +90°
              </button>
              <button
                onClick={() => {
                  const doc = docRef.current;
                  if (doc) {
                    const gameMap = doc.getMap('game');
                    const boardsMap = gameMap.get('boards') as Y.Map<any>;
                    boardsMap.delete(selectedBoardId);
                    setSelectedBoardId(null);
                  }
                }}
                title="Delete (X)"
                className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition font-semibold"
              >
                ×
              </button>
            </>
          )}
        </div>
      </div>
      )}

      {/* Canvas */}
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
      <div
        ref={canvasRef}
        className={`absolute inset-0 border rounded transition ${
          draggingBoardId || isPanningView
            ? 'cursor-grabbing'
            : 'cursor-grab'
        } ${draggedPieceType ? 'bg-blue-100' : 'bg-gray-50'} hide-scrollbar min-h-0 min-w-0`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onWheel={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const direction = e.deltaY > 0 ? -1 : 1;
          updateZoomAtPointer(zoom + direction * ZOOM_STEP, e.clientX, e.clientY);
        }}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 0,
          minWidth: 0,
          position: 'absolute',
          display: 'block',
          overflow: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        onAuxClick={(e) => {
          if (e.button === 1) {
            e.preventDefault();
          }
        }}
        onMouseDown={(e) => {
          if (!canvasRef.current) return;

          const isPanGesture = e.button === 1 || (e.button === 0 && e.shiftKey);
          if (e.button !== 0 && e.button !== 1) return;

          if (e.button === 1) {
            // Prevent browser middle-click autoscroll and use middle-drag only for pan.
            e.preventDefault();
          }

          if (draggingBoardId) return;

          if (isPanGesture) {
            setIsPanningView(true);
            setPanStart({
              x: e.clientX,
              y: e.clientY,
              scrollLeft: canvasRef.current.scrollLeft,
              scrollTop: canvasRef.current.scrollTop,
            });
            return;
          }

          const rect = canvasRef.current.getBoundingClientRect();
          const clickStageX = e.clientX - rect.left + canvasRef.current.scrollLeft;
          const clickStageY = e.clientY - rect.top + canvasRef.current.scrollTop;
          const { x: clickX, y: clickY } = toWorldPoint(clickStageX, clickStageY);

          // Only allow board management when in manage mode
          if (!manageBoardsMode) {
            // Reserve plain left-click/drag for piece interactions.
            return;
          }
          
          // Check boards in REVERSE order (top to bottom) - last rendered boards are on top
          const boardsArray = Array.from(boards.entries()).reverse();
          for (const [boardId, boardData] of boardsArray) {
            const boardX = boardData.get('x') || 0;
            const boardY = boardData.get('y') || 0;
            const rotation = boardData.get('rotation') || 0;
            const clickBoardType = (boardData.get('boardType') as string | null) ?? boardId;
            const clickBoardLandBounds = (allBoardHitboxes && clickBoardType ? allBoardHitboxes[clickBoardType]?.lands : null) ?? landBounds;

            const localPoint = getBoardLocalPoint(
              { x: clickX, y: clickY },
              boardX,
              boardY,
              rotation,
              boardDimensions.width,
              boardDimensions.height
            );

            // Only treat clicks on actual island polygons as board clicks.
            if (clickBoardLandBounds && isPointOnIsland(localPoint, clickBoardLandBounds)) {
              setSelectedBoardId(boardId);

              handleBoardMouseDown(e, boardId);
              return;
            }
          }
          
          // Click on empty space - deselect and allow panning the viewport.
          setSelectedBoardId(null);
          setIsPanningView(true);
          setPanStart({
            x: e.clientX,
            y: e.clientY,
            scrollLeft: canvasRef.current.scrollLeft,
            scrollTop: canvasRef.current.scrollTop,
          });
        }}
      >
        <Stage width={stageBounds.width * zoom} height={stageBounds.height * zoom} ref={stageRef}>
          <Layer>
            {/* Debug info */}
            {boards.size === 0 && (
              <Text text="No boards. Click +Add Board" x={20} y={20} fontSize={16} fill="red" />
            )}

            {/* Render each board */}
            {(() => {
              const boardEntries = Array.from(boards.entries());
              if (draggingBoardId) {
                const draggedIndex = boardEntries.findIndex(([id]) => id === draggingBoardId);
                if (draggedIndex >= 0) {
                  const [draggedEntry] = boardEntries.splice(draggedIndex, 1);
                  boardEntries.push(draggedEntry);
                }
              }

              return boardEntries.map(([boardId, boardData]) => {
              const boardType = (boardData.get('boardType') as string | null) ?? boardId;
              const boardHitboxEntry = allBoardHitboxes && boardType ? allBoardHitboxes[boardType] : null;
              const boardLandBounds = boardHitboxEntry?.lands ?? landBounds;
              const thisBoardImage = boardType ? boardImageByNickname[boardType] : undefined;
              const boardX = draggingBoardId === boardId && dragPreviewPos ? dragPreviewPos.x : (boardData.get('x') || 0);
              const boardY = draggingBoardId === boardId && dragPreviewPos ? dragPreviewPos.y : (boardData.get('y') || 0);
              const boardStagePos = toStagePoint(boardX, boardY);
              const rotation = boardData.get('rotation') || 0;
              const landsMap = boardData.get('lands') as Y.Map<any>;

              return (
                <Group
                  key={boardId}
                  x={boardStagePos.x + (boardDimensions.width * zoom) / 2}
                  y={boardStagePos.y + (boardDimensions.height * zoom) / 2}
                  rotation={rotation}
                  scaleX={zoom}
                  scaleY={zoom}
                  offsetX={boardDimensions.width / 2}
                  offsetY={boardDimensions.height / 2}
                >
                  {/* Board content */}
                  <Group>
                    {/* Background - either image or fallback color */}
                    {thisBoardImage ? (
                      <Image
                        image={thisBoardImage}
                        x={0}
                        y={0}
                        width={boardDimensions.width}
                        height={boardDimensions.height}
                        listening={false}
                      />
                    ) : (
                      <Rect
                        x={0}
                        y={0}
                        width={boardDimensions.width}
                        height={boardDimensions.height}
                        fill="#e2e8f0"
                        listening={false}
                      />
                    )}

                    {/* Selected board outline follows actual land shapes */}
                    {selectedBoardId === boardId && manageBoardsMode && boardLandBounds &&
                      Object.entries(boardLandBounds).map(([landId, bounds]) => (
                        <Line
                          key={`selected-land-${boardId}-${landId}`}
                          points={polygonToLinePoints((bounds as any).polygon)}
                          closed
                          stroke={draggingBoardId === boardId ? '#0f766e' : '#2563eb'}
                          strokeWidth={draggingBoardId === boardId ? 4 : 3}
                          listening={false}
                        />
                      ))}

                    {/* Land boundaries */}
                    {boardLandBounds &&
                      Object.entries(boardLandBounds).map(([landId, bounds]) => (
                        <Line
                          key={`land-${boardId}-${landId}`}
                          points={polygonToLinePoints((bounds as any).polygon)}
                          closed
                          stroke="#d1d5db"
                          strokeWidth={1}
                          listening={false}
                        />
                      ))}

                    {/* Pieces */}
                    {boardLandBounds &&
                      landsMap &&
                      Array.from(landsMap.entries()).map(([landId, piecesArray]) => {
                        const piecesForLand: any[] = [];
                        (piecesArray as Y.Array<any>).forEach((piece: any) => {
                          piecesForLand.push(piece);
                        });

                        const grouped = new Map<
                          string,
                          { piece: GamePiece; count: number; representativeIndex: number }
                        >();

                        piecesForLand.forEach((piece, idx) => {
                          const pieceDamage = piece.damage ?? piece.health ?? getDefaultDamage(piece.type);
                          const pieceStrife = piece.strife ?? 0;
                          const key = `${piece.type || 'unknown'}|${pieceDamage}|${pieceStrife}`;
                          const existing = grouped.get(key);
                          if (existing) {
                            existing.count += 1;
                          } else {
                            grouped.set(key, {
                              piece,
                              count: 1,
                              representativeIndex: idx,
                            });
                          }
                        });

                        const bounds = boardLandBounds[parseInt(landId, 10)];
                        if (!bounds) return null;

                        const center = getPolygonCenter((bounds as any).polygon);
                        const groupedEntries = Array.from(grouped.entries());

                        return groupedEntries.map(([groupKey, info], groupIndex) => {
                          const clusterOffset = getClusterOffset(groupIndex, groupedEntries.length);
                          const offsetX = clusterOffset.x;
                          const offsetY = clusterOffset.y;
                          const img = getPieceImage(info.piece.type);
                          const damageTaken = Math.max(0, info.piece.damage ?? info.piece.health ?? 0);
                          const strifeCount = Math.max(0, info.piece.strife ?? 0);
                          const damageRotation = (damageTaken % 4) * 90;

                          const isDraggingThisPiece =
                            draggingPiece &&
                            draggingPiece.boardId === boardId &&
                            draggingPiece.landId === landId &&
                            draggingPiece.pieceIndex === info.representativeIndex;

                          return (
                            <Group
                              key={`piece-group-${boardId}-${landId}-${groupKey}`}
                              x={center.x + offsetX}
                              y={center.y + offsetY}
                              rotation={-rotation}
                              opacity={isDraggingThisPiece ? 0.35 : 1}
                              onMouseDown={(evt) => {
                                evt.cancelBubble = true;
                                if (manageBoardsMode) return;
                                setPendingPiecePointer({
                                  boardId,
                                  landId,
                                  pieceIndex: info.representativeIndex,
                                  startClientX: evt.evt.clientX,
                                  startClientY: evt.evt.clientY,
                                });
                              }}
                            >
                              <Group rotation={damageRotation}>
                                {info.piece.type === 'presence' ? (
                                  <Circle
                                    radius={PIECE_SIZE / 2}
                                    fill={spiritColors.get(info.piece.subtype ?? '') ?? '#888888'}
                                    stroke="rgba(255,255,255,0.85)"
                                    strokeWidth={2}
                                    shadowBlur={4}
                                    shadowColor="rgba(0,0,0,0.4)"
                                  />
                                ) : (
                                  <>
                                    {img && info.count > 1 &&
                                      Array.from({ length: Math.min(info.count, 4) - 1 }).map((_, layerIndex, layers) => {
                                        const depth = layers.length - layerIndex;
                                        return (
                                          <Image
                                            key={`stack-layer-${boardId}-${landId}-${groupKey}-${depth}`}
                                            image={img}
                                            x={-16 + depth * STACK_LAYER_OFFSET_PX}
                                            y={-16}
                                            width={PIECE_SIZE}
                                            height={PIECE_SIZE}
                                            opacity={1}
                                          />
                                        );
                                      })}

                                    {img && <Image image={img} x={-16} y={-16} width={PIECE_SIZE} height={PIECE_SIZE} />}
                                  </>
                                )}
                              </Group>

                              {strifeTokenImage && strifeCount > 0 && (
                                <Group>
                                  <Image
                                    image={strifeTokenImage}
                                    x={-14}
                                    y={-10}
                                    width={40}
                                    height={40}
                                    opacity={0.55}
                                  />
                                  {strifeCount > 1 && (
                                    <Text
                                      text={`${strifeCount}`}
                                      x={-14}
                                      y={1}
                                      width={40}
                                      align="center"
                                      fontSize={13}
                                      fill="#ffffff"
                                      fontStyle="bold"
                                    />
                                  )}
                                </Group>
                              )}

                              {damageTaken > 0 && (
                                <Text
                                  text={`${damageTaken}`}
                                  x={-8}
                                  y={-7}
                                  width={16}
                                  align="center"
                                  fontSize={12}
                                  fill="#dc2626"
                                  fontStyle="bold"
                                />
                              )}

                              {info.count > 1 && (
                                <Group x={14} y={10}>
                                  <Rect
                                    x={0}
                                    y={0}
                                    width={16}
                                    height={14}
                                    cornerRadius={7}
                                    fill="#111827"
                                  />
                                  <Text
                                    x={0}
                                    y={2}
                                    width={16}
                                    align="center"
                                    text={`${info.count}`}
                                    fontSize={9}
                                    fill="#ffffff"
                                    fontStyle="bold"
                                  />
                                </Group>
                              )}
                            </Group>
                          );
                        });
                      })}
                  </Group>
                </Group>
              );
            });
            })()}

            {draggingPiece && draggingPieceWorldPoint && (
              <Group
                x={toStagePoint(draggingPieceWorldPoint.x, draggingPieceWorldPoint.y).x}
                y={toStagePoint(draggingPieceWorldPoint.x, draggingPieceWorldPoint.y).y}
              >
                {getPieceImage(draggingPiece.piece.type) && (
                  <Image
                    image={getPieceImage(draggingPiece.piece.type)}
                    x={-16}
                    y={-16}
                    width={32}
                    height={32}
                    opacity={0.8}
                  />
                )}
              </Group>
            )}
          </Layer>
        </Stage>
      </div>

      {/* Piece Palette Overlay */}
      <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-20">
      <div className="pointer-events-auto inline-flex max-w-full flex-col gap-2 rounded border border-slate-200/60 bg-white/85 p-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">Drag to place:</span>
          <div className="h-4 w-px bg-slate-300" />
          <span className="text-xs font-semibold text-slate-500">Drop zones:</span>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Explorer */}
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'copy';
              e.dataTransfer.setData('text/plain', 'explorer');
              setDraggedPieceType('explorer');
            }}
            onDragEnd={() => setDraggedPieceType(null)}
            title="Explorer"
            className={`p-1.5 rounded cursor-move transition border-2 ${
              draggedPieceType === 'explorer'
                ? 'border-green-500 bg-green-100'
                : 'border-slate-300 bg-white hover:border-slate-400'
            }`}
          >
            {explorerImage && <img src="/InvaderExplorer.png" alt="Explorer" style={{ width: 40, height: 40, objectFit: 'contain' }} />}
          </div>

          {/* Town */}
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'copy';
              e.dataTransfer.setData('text/plain', 'town');
              setDraggedPieceType('town');
            }}
            onDragEnd={() => setDraggedPieceType(null)}
            title="Town"
            className={`p-1.5 rounded cursor-move transition border-2 ${
              draggedPieceType === 'town'
                ? 'border-green-500 bg-green-100'
                : 'border-slate-300 bg-white hover:border-slate-400'
            }`}
          >
            {townImage && <img src="/InvaderTown.png" alt="Town" style={{ width: 40, height: 40, objectFit: 'contain' }} />}
          </div>

          {/* City */}
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'copy';
              e.dataTransfer.setData('text/plain', 'city');
              setDraggedPieceType('city');
            }}
            onDragEnd={() => setDraggedPieceType(null)}
            title="City"
            className={`p-1.5 rounded cursor-move transition border-2 ${
              draggedPieceType === 'city'
                ? 'border-green-500 bg-green-100'
                : 'border-slate-300 bg-white hover:border-slate-400'
            }`}
          >
            {cityImage && <img src="/InvaderCity.png" alt="City" style={{ width: 40, height: 40, objectFit: 'contain' }} />}
          </div>

          {/* Dahan */}
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'copy';
              e.dataTransfer.setData('text/plain', 'dahan');
              setDraggedPieceType('dahan');
            }}
            onDragEnd={() => setDraggedPieceType(null)}
            title="Dahan"
            className={`p-1.5 rounded cursor-move transition border-2 ${
              draggedPieceType === 'dahan'
                ? 'border-green-500 bg-green-100'
                : 'border-slate-300 bg-white hover:border-slate-400'
            }`}
          >
            {dahanImage && <img src="/Dahan.png" alt="Dahan" style={{ width: 40, height: 40, objectFit: 'contain' }} />}
          </div>

          {([
            { type: 'badlands', src: '/TokenBadlands.png', label: 'Badlands', img: badlandsImage },
            { type: 'beast', src: '/TokenBeasts.png', label: 'Beast', img: beastsImage },
            { type: 'disease', src: '/TokenDisease.png', label: 'Disease', img: diseaseImage },
            { type: 'wilds', src: '/TokenWilds.png', label: 'Wilds', img: wildsImage },
            { type: 'strife', src: '/TokenStrife.png', label: 'Strife', img: strifeTokenImage },
          ] as const).map(({ type, src, label, img }) => (
            <div
              key={type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/plain', type);
                setDraggedPieceType(type);
              }}
              onDragEnd={() => setDraggedPieceType(null)}
              title={label}
              className={`p-1.5 rounded cursor-move transition border-2 ${
                draggedPieceType === type
                  ? 'border-green-500 bg-green-100'
                  : 'border-slate-300 bg-white hover:border-slate-400'
              }`}
            >
              {img && <img src={src} alt={label} style={{ width: 40, height: 40, objectFit: 'contain' }} />}
            </div>
          ))}

          <button
            onClick={() => setShowAdvancedTokens((v) => !v)}
            className="px-2 py-1 rounded border-2 border-dashed border-slate-400 text-xs text-slate-500 hover:border-slate-600 hover:text-slate-700 transition cursor-pointer"
            title="Advanced tokens"
          >
            {showAdvancedTokens ? '▾ Less' : '▸ More'}
          </button>

          {showAdvancedTokens && ([
            { type: 'blight', src: '/Blight.png', label: 'Blight from the box', img: blightImage },
            { type: 'deeps', src: '/TokenDeeps1.png', label: 'Deeps', img: deepsImage },
            { type: 'quake', src: '/TokenQuake.png', label: 'Quake', img: quakeImage },
            { type: 'vitality', src: '/TokenVitality.png', label: 'Vitality', img: vitalityImage },
          ] as const).map(({ type, src, label, img }) => (
            <div
              key={type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/plain', type);
                setDraggedPieceType(type);
              }}
              onDragEnd={() => setDraggedPieceType(null)}
              title={label}
              className={`p-1.5 rounded cursor-move transition border-2 ${
                draggedPieceType === type
                  ? 'border-green-500 bg-green-100'
                  : 'border-slate-300 bg-white hover:border-slate-400'
              }`}
            >
              {img && <img src={src} alt={label} style={{ width: 40, height: 40, objectFit: 'contain' }} />}
            </div>
          ))}
          {/* Drop zones — always visible, glow when dragging a board piece */}
          <div className="ml-1 flex items-center gap-2">
            <div className="h-10 w-px bg-slate-300" />
            <div
              data-drop-zone="remove"
              className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-2 transition select-none ${
                hoveredDropZone === 'remove' && draggingPiece
                  ? 'border-orange-500 bg-orange-100 shadow-lg shadow-orange-200'
                  : draggingPiece
                  ? 'border-orange-300 bg-orange-50'
                  : 'border-slate-300 bg-white'
              }`}
              title="Drop piece here to remove from board (presence → destroyed pile)"
            >
              <span className="text-lg leading-none pointer-events-none">🗑️</span>
              <span className="text-[9px] font-semibold leading-tight text-slate-600 pointer-events-none">Remove</span>
            </div>
            <div
              data-drop-zone="destroy"
              className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-2 transition select-none ${
                hoveredDropZone === 'destroy' && draggingPiece
                  ? 'border-red-500 bg-red-100 shadow-lg shadow-red-200'
                  : draggingPiece
                  ? 'border-red-300 bg-red-50'
                  : 'border-slate-300 bg-white'
              }`}
              title="Drop piece here to destroy (+1 fear for towns, +2 fear for cities)"
            >
              <span className="text-lg leading-none pointer-events-none">💥</span>
              <span className="text-[9px] font-semibold leading-tight text-slate-600 pointer-events-none">Destroy</span>
            </div>
          </div>
        </div>
      </div>
      </div>
      </div>

      {showBoardPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Add Board</h3>
            <p className="mt-1 text-sm text-slate-500">Select a board or add a random one. Each board can only appear once.</p>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {BOARDS.map((board) => {
                const used = usedBoardTypes.has(board.nickname);
                return (
                  <button
                    key={board.nickname}
                    disabled={used}
                    onClick={() => createBoardWithType(board.nickname)}
                    className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition ${
                      used
                        ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-40'
                        : 'border-slate-300 bg-white hover:border-blue-500 hover:bg-blue-50'
                    }`}
                  >
                    <img
                      src={board.imageUrl}
                      alt={`Board ${board.nickname}`}
                      className="h-16 w-full rounded object-cover"
                    />
                    <span className="text-xs font-semibold text-slate-700">Board {board.nickname}</span>
                    {used && <span className="text-[10px] text-slate-400">In use</span>}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={pickRandomBoard}
                disabled={usedBoardTypes.size >= BOARDS.length}
                className="flex-1 rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 transition"
              >
                Random Board
              </button>
              <button
                onClick={() => setShowBoardPicker(false)}
                className="rounded bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {editingPiece && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900 capitalize">Edit {editingPiece.piece.type}</h3>
            <p className="mt-1 text-sm text-slate-600">
              Land {editingPiece.landId} ({editingPiece.boardId})
            </p>

            <div className="mt-4 space-y-3">
              {pieceHasDamage(editingPiece.piece.type) && (
                <label className="block text-sm font-medium text-slate-700">
                  Damage
                  <input
                    type="number"
                    min={0}
                    value={editorDamage}
                    onChange={(e) => setEditorDamage(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                  />
                </label>
              )}

              {pieceHasStrife(editingPiece.piece.type) && (
                <label className="block text-sm font-medium text-slate-700">
                  Strife
                  <input
                    type="number"
                    min={0}
                    value={editorStrife}
                    onChange={(e) => setEditorStrife(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                  />
                </label>
              )}

              {SPIRIT_TOKEN_TYPES.has(editingPiece.piece.type) && (
                <p className="text-sm text-slate-500 italic">No editable properties for this token.</p>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  deletePieceAtLocation(editingPiece);
                  setEditingPiece(null);
                }}
                className="rounded bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
              <button
                onClick={() => setEditingPiece(null)}
                className="rounded bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updatePieceAtLocation(editingPiece, {
                    ...editingPiece.piece,
                    damage: pieceHasDamage(editingPiece.piece.type) ? editorDamage : 0,
                    strife: pieceHasStrife(editingPiece.piece.type) ? editorStrife : 0,
                    updatedBy: 'user',
                    timestamp: Date.now(),
                  });
                  setEditingPiece(null);
                }}
                className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default BoardView;
