import React from 'react';
import { cn } from '../utils/cn';
import { Player } from '../types/game';
import { PLAYER_COLORS } from '../constants/board';

interface WinnerModalProps {
  winner: Player;
  gameMode: 'free' | 'beast';
  prizePool: number;
  onPlayAgain: () => void;
  onGoHome: () => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  winner,
  gameMode,
  prizePool,
  onPlayAgain,
  onGoHome,
}) => {
  const colorConfig = PLAYER_COLORS[winner.color];
  const isHumanWinner = !winner.isBot;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 text-center transform animate-bounce-in">
        {/* Confetti Effect */}
        <div className="text-6xl mb-4">
          {isHumanWinner ? '🎉🏆🎉' : '🤖🏆🤖'}
        </div>
        
        <h2 className={cn('text-3xl font-bold mb-2', colorConfig.text)}>
          {isHumanWinner ? 'YOU WIN!' : `${winner.name} Wins!`}
        </h2>
        
        {gameMode === 'beast' && (
          <div className="my-6 p-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl">
            <div className="text-sm text-gray-600 mb-1">
              {isHumanWinner ? 'Prize Money Won' : 'Prize Pool'}
            </div>
            <div className={cn(
              'text-4xl font-bold',
              isHumanWinner ? 'text-green-600' : 'text-gray-400'
            )}>
              ${prizePool.toFixed(2)}
            </div>
            {isHumanWinner && (
              <div className="text-sm text-green-600 mt-2">
                ✓ Added to your wallet
              </div>
            )}
            {!isHumanWinner && (
              <div className="text-sm text-red-500 mt-2">
                Better luck next time!
              </div>
            )}
          </div>
        )}
        
        {gameMode === 'free' && (
          <div className="my-6">
            <p className="text-gray-600">
              {isHumanWinner 
                ? 'Great game! You dominated the board!' 
                : 'The bot got lucky this time. Try again!'}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onGoHome}
            className="flex-1 py-3 px-6 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold transition-colors"
          >
            Home
          </button>
          <button
            onClick={onPlayAgain}
            className={cn(
              'flex-1 py-3 px-6 rounded-xl font-semibold transition-colors text-white',
              gameMode === 'beast' 
                ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
            )}
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};
