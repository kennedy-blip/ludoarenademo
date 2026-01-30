import React from 'react';
import { cn } from '../utils/cn';
import { PlayerColor } from '../types/game';
import { PLAYER_COLORS } from '../constants/board';

interface TokenProps {
  color: PlayerColor;
  isMoveable: boolean;
  isSelected: boolean;
  onClick: () => void;
  small?: boolean;
  count?: number;
}

export const Token: React.FC<TokenProps> = ({
  color,
  isMoveable,
  isSelected,
  onClick,
  small = false,
  count = 1,
}) => {
  const colorConfig = PLAYER_COLORS[color];

  return (
    <button
      onClick={onClick}
      disabled={!isMoveable}
      className={cn(
        'rounded-full border-2 border-white shadow-md transition-all duration-200 relative',
        colorConfig.bg,
        small ? 'w-5 h-5' : 'w-8 h-8',
        isMoveable && 'animate-pulse cursor-pointer hover:scale-110 ring-2 ring-yellow-400',
        isSelected && 'ring-4 ring-yellow-400 scale-110',
        !isMoveable && 'cursor-default'
      )}
    >
      {count > 1 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full text-xs font-bold flex items-center justify-center text-gray-800">
          {count}
        </span>
      )}
    </button>
  );
};
