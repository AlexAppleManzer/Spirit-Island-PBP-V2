import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image, Line, Circle, Text, Group } from 'react-konva';
import useImage from 'use-image';
import * as Y from 'yjs';
import PieceEditor from './PieceEditor';

interface Piece {
  type: string;
  subtype: string;
  landId: number;
  health: number;
  damage: number;
  count: number;
  updatedBy?: string;
  timestamp?: number;
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

const STAGE_WIDTH = 800;
const STAGE_HEIGHT = 480;

const PIECE_TYPES = ['explorer', 'town', 'city'];

const PIECE_CONFIG = {
  explorer: { health: 1, emoji: '/InvaderExplorer.png' },
  town: { health: 2, emoji: '/InvaderTown.png' },
  city: { health: 3, emoji: '/InvaderCity.png' },
};

// Point-in-polygon algorithm using ray casting
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

// Helper to convert polygon points to flat array for Line component
function polygonToLinePoints(polygon: Point[]): number[] {
  const points: number[] = [];
  for (const p of polygon) {
    points.push(p.x, p.y);
  }
  return points;
}

interface BoardViewProps {
  docRef: React.MutableRefObject<Y.Doc | null>;
}

const BoardView: React.FC<BoardViewProps> = ({ docRef }) => {
  const stageRef = useRef(null);
  const [boardImage] = useImage('/board.png');
  const [explorerImage] = useImage('/InvaderExplorer.png');
  const [townImage] = useImage('/InvaderTown.png');
  const [cityImage] = useImage('/InvaderCity.png');
  
  // Game state
  const [pieces, setPieces] = useState<Map<string, Piece>>(new Map());
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [selectedLandId, setSelectedLandId] = useState<number | null>(null);
  const [draggedPieceType, setDraggedPieceType] = useState<string | null>(null);
  const [landBounds, setLandBounds] = useState<Record<number, LandBounds> | null>(null);

  // Load land bounds from asset
  useEffect(() => {
    const loadLandBounds = async () => {
      try {
        const response = await fetch('/landBounds.json');
        const data: LandBoundsAsset = await response.json();
        setLandBounds(data.lands);
      } catch (error) {
        console.error('Failed to load land bounds:', error);
      }
    };
    loadLandBounds();
  }, []);

  // Subscribe to Yjs pieces map
  useEffect(() => {
    let doc = docRef.current;
    if (!doc) {
      // Set up a timer to check periodically if doc is ready
      const checkInterval = setInterval(() => {
        doc = docRef.current;
        if (doc) {
          clearInterval(checkInterval);
          console.log('[BoardView] Doc is now ready, setting up observer');
          setupObserver(doc);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }
    
    console.log('[BoardView] Doc ready on mount, setting up observer');
    setupObserver(doc);

    function setupObserver(doc: Y.Doc) {
      const piecesMap = doc.getMap('pieces');
      
      // Update from existing pieces
      const updatePieces = () => {
        const newPieces = new Map<string, Piece>();
        piecesMap.forEach((piece: any, id: string) => {
          newPieces.set(id, piece as Piece);
        });
        console.log('[BoardView] Pieces updated:', Array.from(newPieces.entries()));
        setPieces(newPieces);
      };

      updatePieces();

      // Listen for changes
      const observer = () => updatePieces();
      piecesMap.observe(observer);

      return () => {
        piecesMap.unobserve(observer);
      };
    }
  }, []);

  const handleBackgroundClick = (e: any) => {
    // Deselect land and piece when clicking empty background
    const stage = stageRef.current as any;
    if (!stage) return;
    
    if (e.target === e.currentTarget) {
      setSelectedLandId(null);
      setSelectedPieceId(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedPieceType || !landBounds) return;

    const stage = stageRef.current as any;
    if (!stage) return;

    // Get the canvas position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find which land was dropped on using point-in-polygon
    for (let landId = 1; landId <= 8; landId++) {
      const land = landBounds[landId];
      if (!land) continue;

      if (isPointInPolygon({ x, y }, land.polygon)) {
        // Add piece to this land
        const doc = docRef.current;
        if (!doc) return;

        const piecesMap = doc.getMap('pieces');
        const pieceId = `${draggedPieceType}-${Date.now()}-${Math.random()}`;
        const config = PIECE_CONFIG[draggedPieceType as keyof typeof PIECE_CONFIG];
        
        piecesMap.set(pieceId, {
          type: draggedPieceType,
          subtype: '',
          landId,
          health: config.health,
          damage: 0,
          count: 1,
          updatedBy: 'user',
          timestamp: Date.now(),
        });

        setDraggedPieceType(null);
        return;
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-white">
      <div className="bg-blue-100 border-2 border-blue-400 p-3 rounded">
        <p className="text-sm font-bold">Board View</p>
        <p className="text-xs text-gray-600">Drag pieces from the menu to lands to add them</p>
      </div>

      <div className="flex gap-4">
        {/* Piece Menu */}
        <div className="w-40 bg-gray-50 border rounded p-4 flex flex-col gap-2">
          <p className="text-sm font-bold text-gray-700">Available Pieces</p>
          {PIECE_TYPES.map((type) => (
            <div
              key={type}
              draggable
              onDragStart={() => setDraggedPieceType(type)}
              onDragEnd={() => setDraggedPieceType(null)}
              className={`p-3 rounded border-2 cursor-move transition ${
                draggedPieceType === type
                  ? 'border-green-500 bg-green-100'
                  : 'border-gray-300 bg-white hover:border-gray-400'
              }`}
            >
              <p className="text-sm font-medium capitalize">{type}</p>
              <p className="text-xs text-gray-500">Drag to add</p>
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`relative ${draggedPieceType ? 'bg-blue-50' : ''}`}
        >
          <Stage 
            width={STAGE_WIDTH} 
            height={STAGE_HEIGHT} 
            ref={stageRef}
            onClick={handleBackgroundClick}
            style={{ border: '2px solid #333', backgroundColor: '#f5f5f5', cursor: 'pointer' }}
          >
            <Layer>
              {boardImage && (
                <Image
                  image={boardImage}
                  x={0}
                  y={0}
                  width={STAGE_WIDTH}
                  height={STAGE_HEIGHT}
                />
              )}

              {/* Render land polygons */}
              {landBounds && Object.entries(landBounds).map(([landId, land]) => {
                const landIdNum = parseInt(landId);
                const isSelected = selectedLandId === landIdNum;
                const linePoints = polygonToLinePoints(land.polygon);
                
                return (
                  <Line
                    key={`land-${landId}`}
                    points={linePoints}
                    closed
                    stroke={isSelected ? '#ffff00' : '#ff0000'}
                    strokeWidth={isSelected ? 4 : 3}
                    fill={isSelected ? 'rgba(255, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.1)'}
                    onClick={() => setSelectedLandId(isSelected ? null : landIdNum)}
                  />
                );
              })}

              {/* Render pieces */}
              {landBounds && Array.from(pieces.entries()).map(([id, piece]) => {
                const land = landBounds[piece.landId];
                if (!land) return null;

                // Calculate center of polygon
                const centerX = land.bounds.x + land.bounds.width / 2;
                const centerY = land.bounds.y + land.bounds.height / 2;
                
                let pieceImage: any = null;
                if (piece.type === 'explorer' && explorerImage) pieceImage = explorerImage;
                else if (piece.type === 'town' && townImage) pieceImage = townImage;
                else if (piece.type === 'city' && cityImage) pieceImage = cityImage;

                return (
                  <Group
                    key={id}
                    x={centerX}
                    y={centerY}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      setSelectedPieceId(id);
                      setSelectedLandId(piece.landId);
                    }}
                  >
                    {pieceImage && (
                      <Image image={pieceImage} x={-15} y={-15} width={30} height={30} />
                    )}
                    <Circle radius={5} fill={selectedPieceId === id ? 'blue' : 'red'} />
                    <Text
                      text={piece.count?.toString() || '1'}
                      fontSize={12}
                      fill="white"
                      align="center"
                      y={-6}
                    />
                  </Group>
                );
              })}
            </Layer>
          </Stage>
        </div>
      </div>

      {selectedPieceId && (
        <PieceEditor
          pieceId={selectedPieceId}
          docRef={docRef}
          onClose={() => setSelectedPieceId(null)}
        />
      )}
    </div>
  );
};

export default BoardView;
