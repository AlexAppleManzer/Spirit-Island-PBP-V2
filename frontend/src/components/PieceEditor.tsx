import React, { useState, useEffect } from 'react';
import * as Y from 'yjs';

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

const PIECE_TYPES = ['explorer', 'town', 'city'];

const PIECE_CONFIG = {
  explorer: { health: 1 },
  town: { health: 2 },
  city: { health: 3 },
};

interface PieceEditorProps {
  pieceId: string;
  docRef: React.MutableRefObject<Y.Doc | null>;
  onClose: () => void;
}

const PieceEditor: React.FC<PieceEditorProps> = ({ pieceId, docRef, onClose }) => {
  const [piece, setPiece] = useState<Piece | null>(null);
  const [type, setType] = useState('explorer');
  const [subtype, setSubtype] = useState('');
  const [health, setHealth] = useState(1);
  const [damage, setDamage] = useState(0);
  const [count, setCount] = useState(1);

  useEffect(() => {
    const doc = docRef.current;
    if (!doc) return;

    const piecesMap = doc.getMap('pieces');
    const currentPiece = piecesMap.get(pieceId) as any;
    
    if (currentPiece) {
      setPiece(currentPiece);
      setType(currentPiece.type || 'explorer');
      setSubtype(currentPiece.subtype || '');
      setHealth(currentPiece.health || 1);
      setDamage(currentPiece.damage || 0);
      setCount(currentPiece.count || 1);
    }
  }, [pieceId, docRef]);

  const handleSave = () => {
    const doc = docRef.current;
    if (!doc) return;

    const piecesMap = doc.getMap('pieces');
    piecesMap.set(pieceId, {
      type,
      subtype,
      landId: piece?.landId || 1,
      health,
      damage,
      count,
      updatedBy: 'user',
      timestamp: Date.now(),
    });

    onClose();
  };

  const handleDelete = () => {
    const doc = docRef.current;
    if (!doc) return;

    const piecesMap = doc.getMap('pieces');
    piecesMap.delete(pieceId);
    onClose();
  };

  if (!piece) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl p-6 max-w-sm w-full border border-gray-200">
        <h2 className="text-xl font-bold mb-4 capitalize">Edit {type}</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => {
                const newType = e.target.value;
                setType(newType);
                const config = PIECE_CONFIG[newType as keyof typeof PIECE_CONFIG];
                if (config) {
                  setHealth(config.health);
                }
              }}
              className="w-full border rounded px-3 py-2"
            >
              {PIECE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Subtype</label>
            <input
              type="text"
              value={subtype}
              onChange={(e) => setSubtype(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., Ranged, Melee"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Health</label>
            <input
              type="number"
              value={health}
              onChange={(e) => setHealth(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full border rounded px-3 py-2"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Damage</label>
            <input
              type="number"
              value={damage}
              onChange={(e) => setDamage(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full border rounded px-3 py-2"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Count</label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full border rounded px-3 py-2"
              min="1"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleDelete}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default PieceEditor;
