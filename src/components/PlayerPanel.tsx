import React from 'react';
import { Player, PlayerColor } from '../types/game';

interface PlayerPanelProps {
  players: Player[];
  currentPlayerIndex: number;
}

const colorClasses: Record<PlayerColor, { bg: string; border: string; text: string }> = {
  red: { bg: 'bg-red-500', border: 'border-red-600', text: 'text-red-600' },
  green: { bg: 'bg-green-500', border: 'border-green-600', text: 'text-green-600' },
  yellow: { bg: 'bg-yellow-400', border: 'border-yellow-500', text: 'text-yellow-600' },
  blue: { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-600' }
};

export const PlayerPanel: React.FC<PlayerPanelProps> = ({ players, currentPlayerIndex }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {players.map((player, idx) => {
        const isActive = idx === currentPlayerIndex;
        const finishedTokens = player.tokens.filter(t => t.isFinished).length;
        const colors = colorClasses[player.color];
        
        return (
          <div
            key={player.id}
            className={`
              p-3 rounded-lg border-2 transition-all duration-300
              ${isActive 
                ? `${colors.border} ${colors.bg} text-white shadow-lg scale-105` 
                : 'border-gray-200 bg-white'
              }
            `}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-4 h-4 rounded-full ${colors.bg}`} />
              <span className={`font-bold text-sm ${isActive ? 'text-white' : colors.text}`}>
                {player.name}
              </span>
              {player.isBot && (
                <span className="text-xs opacity-70">🤖</span>
              )}
            </div>
            
            <div className="flex gap-1">
              {player.tokens.map(token => (
                <div
                  key={token.id}
                  className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs
                    ${token.isFinished 
                      ? 'bg-green-400 border-green-600 text-white' 
                      : token.isHome 
                        ? 'bg-gray-200 border-gray-400' 
                        : `${colors.bg} ${colors.border} text-white`
                    }
                  `}
                >
                  {token.isFinished ? '✓' : token.id + 1}
                </div>
              ))}
            </div>
            
            <div className="mt-2 text-xs opacity-80">
              {finishedTokens}/4 finished
            </div>
          </div>
        );
      })}
    </div>
  );
};
