import React from 'react';
import { GameState, Token, PlayerColor, Player } from '../types/game';

interface LudoBoardProps {
  gameState: GameState;
  onTokenClick: (tokenId: number) => void;
  getAbsolutePosition: (token: Token) => number;
}

const BOARD_SIZE = 15;
const CELL_SIZE = 'w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8';

const colorClasses: Record<PlayerColor, { bg: string; token: string; light: string }> = {
  red: { bg: 'bg-red-500', token: 'bg-red-600 border-red-800', light: 'bg-red-100' },
  green: { bg: 'bg-green-500', token: 'bg-green-600 border-green-800', light: 'bg-green-100' },
  yellow: { bg: 'bg-yellow-400', token: 'bg-yellow-500 border-yellow-700', light: 'bg-yellow-100' },
  blue: { bg: 'bg-blue-500', token: 'bg-blue-600 border-blue-800', light: 'bg-blue-100' }
};

// Board path coordinates (52 cells around the board)
const PATH_COORDS: [number, number][] = [
  // Red start (left side going up)
  [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  // Top row left to right
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  // Turn down
  [0, 7], [0, 6],
  // Top row right to left from green
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  // Green start (top going right)
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  // Turn right
  [7, 0], [8, 0],
  // Right side going down
  [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  // Yellow start
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  // Turn down
  [14, 7], [14, 8],
  // Right side going up from yellow
  [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  // Blue start (bottom going left)
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  // Turn left
  [7, 14], [6, 14]
];

// Home stretch paths (6 cells each leading to center)
const HOME_STRETCH: Record<PlayerColor, [number, number][]> = {
  red: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  yellow: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]]
};

// Home base positions (where tokens start)
const HOME_BASES: Record<PlayerColor, [number, number][]> = {
  red: [[1, 11], [2, 11], [1, 12], [2, 12]],
  green: [[1, 1], [2, 1], [1, 2], [2, 2]],
  yellow: [[11, 1], [12, 1], [11, 2], [12, 2]],
  blue: [[11, 11], [12, 11], [11, 12], [12, 12]]
};

const SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47];

export const LudoBoard: React.FC<LudoBoardProps> = ({
  gameState,
  onTokenClick,
  getAbsolutePosition
}) => {
  const getTokenPosition = (token: Token): [number, number] | null => {
    if (token.isFinished) {
      // Center position
      return [7, 7];
    }
    
    if (token.isHome) {
      // Home base
      const bases = HOME_BASES[token.color];
      return bases[token.id];
    }
    
    // On the board
    if (token.position >= 52) {
      // Home stretch
      const stretchIndex = token.position - 52;
      return HOME_STRETCH[token.color][stretchIndex];
    }
    
    // Main path
    const absolutePos = getAbsolutePosition(token);
    return PATH_COORDS[absolutePos];
  };

  const renderCell = (row: number, col: number) => {
    const isCenter = row >= 6 && row <= 8 && col >= 6 && col <= 8;
    
    // Home bases
    const isRedHome = row >= 0 && row <= 5 && col >= 9 && col <= 14;
    const isGreenHome = row >= 0 && row <= 5 && col >= 0 && col <= 5;
    const isYellowHome = row >= 9 && row <= 14 && col >= 0 && col <= 5;
    const isBlueHome = row >= 9 && row <= 14 && col >= 9 && col <= 14;

    // Check if this is a path cell
    const pathIndex = PATH_COORDS.findIndex(([r, c]) => r === row && c === col);
    const isPath = pathIndex !== -1;
    const isSafe = isPath && SAFE_SPOTS.includes(pathIndex);

    // Home stretch cells
    let homeStretchColor: PlayerColor | null = null;
    for (const color of ['red', 'green', 'yellow', 'blue'] as PlayerColor[]) {
      if (HOME_STRETCH[color].some(([r, c]) => r === row && c === col)) {
        homeStretchColor = color;
        break;
      }
    }

    // Find tokens at this position
    const tokensHere: { token: Token; player: Player }[] = [];
    gameState.players.forEach((player: Player) => {
      player.tokens.forEach((token: Token) => {
        const pos = getTokenPosition(token);
        if (pos && pos[0] === row && pos[1] === col) {
          tokensHere.push({ token, player });
        }
      });
    });

    let cellBg = 'bg-white';
    
    if (isCenter) {
      // Center triangles
      if (row === 6 && col === 6) cellBg = 'bg-green-500';
      else if (row === 6 && col === 7) cellBg = 'bg-green-500';
      else if (row === 6 && col === 8) cellBg = 'bg-yellow-400';
      else if (row === 7 && col === 6) cellBg = 'bg-red-500';
      else if (row === 7 && col === 7) cellBg = 'bg-gray-200';
      else if (row === 7 && col === 8) cellBg = 'bg-yellow-400';
      else if (row === 8 && col === 6) cellBg = 'bg-red-500';
      else if (row === 8 && col === 7) cellBg = 'bg-blue-500';
      else if (row === 8 && col === 8) cellBg = 'bg-blue-500';
    } else if (homeStretchColor) {
      cellBg = colorClasses[homeStretchColor].light;
    } else if (isRedHome) {
      cellBg = 'bg-red-500';
    } else if (isGreenHome) {
      cellBg = 'bg-green-500';
    } else if (isYellowHome) {
      cellBg = 'bg-yellow-400';
    } else if (isBlueHome) {
      cellBg = 'bg-blue-500';
    } else if (isPath) {
      // Starting positions for each color
      if (pathIndex === 0) cellBg = colorClasses.red.light;
      else if (pathIndex === 13) cellBg = colorClasses.green.light;
      else if (pathIndex === 26) cellBg = colorClasses.yellow.light;
      else if (pathIndex === 39) cellBg = colorClasses.blue.light;
    }

    return (
      <div
        key={`${row}-${col}`}
        className={`${CELL_SIZE} ${cellBg} border border-gray-300 relative flex items-center justify-center`}
      >
        {isSafe && !tokensHere.length && (
          <span className="text-gray-400 text-xs">★</span>
        )}
        
        {/* Render tokens */}
        {tokensHere.map(({ token, player }, idx) => {
          const isMovable = gameState.movableTokens.includes(token.id) && 
                           player.id === gameState.players[gameState.currentPlayerIndex].id;
          
          return (
            <button
              key={`${token.color}-${token.id}`}
              onClick={() => isMovable && onTokenClick(token.id)}
              className={`
                absolute w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2
                ${colorClasses[token.color].token}
                ${isMovable ? 'animate-pulse ring-2 ring-white cursor-pointer z-10' : ''}
                ${token.isFinished ? 'opacity-60' : ''}
                ${idx > 0 ? 'ml-1 mt-1' : ''}
                shadow-md transition-all duration-200
              `}
              disabled={!isMovable}
            >
              <span className="text-white text-xs font-bold">{token.id + 1}</span>
            </button>
          );
        })}
      </div>
    );
  };

  // Generate the board grid
  const renderBoard = () => {
    const cells = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        cells.push(renderCell(row, col));
      }
    }
    return cells;
  };

  return (
    <div className="bg-amber-100 p-2 rounded-lg shadow-xl">
      <div 
        className="grid gap-0 border-2 border-gray-800 rounded"
        style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
      >
        {renderBoard()}
      </div>
    </div>
  );
};
