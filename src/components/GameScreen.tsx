import React, { useState } from 'react';
import { GameState, Wallet, Token } from '../types/game';
import { LudoBoard } from './LudoBoard';
import { Dice } from './Dice';
import { PlayerPanel } from './PlayerPanel';
import { WalletModal } from './WalletModal';

interface GameScreenProps {
  gameState: GameState;
  wallet: Wallet;
  onRollDice: () => void;
  onMoveToken: (tokenId: number) => void;
  onPassTurn: () => void;
  onEndGame: () => void;
  onAddWinnings: (amount: number, gameId: string) => void;
  getAbsolutePosition: (token: Token) => number;
  onDeposit: (amount: number, phone: string) => Promise<boolean>;
  onWithdraw: (amount: number, phone: string) => Promise<boolean>;
  isProcessing: boolean;
  walletError: string | null;
  onAddDemoCredits: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  gameState,
  wallet,
  onRollDice,
  onMoveToken,
  onPassTurn,
  onEndGame,
  onAddWinnings,
  getAbsolutePosition,
  onDeposit,
  onWithdraw,
  isProcessing,
  walletError,
  onAddDemoCredits
}) => {
  const [showWallet, setShowWallet] = useState(false);
  const [hasClaimedPrize, setHasClaimedPrize] = useState(false);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isHumanTurn = !currentPlayer.isBot;
  const hasRolled = gameState.diceValue !== null;
  const canRoll = isHumanTurn && !hasRolled && !gameState.isRolling;
  const mustPass = hasRolled && gameState.movableTokens.length === 0 && isHumanTurn;

  const handleClaimPrize = () => {
    if (gameState.winner && !gameState.winner.isBot && gameState.mode === 'beast') {
      onAddWinnings(gameState.prizePool, 'game_' + Date.now());
      setHasClaimedPrize(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={onEndGame}
              className="text-white/70 hover:text-white text-sm"
            >
              ← Exit
            </button>
            <span className="text-white font-bold">
              {gameState.mode === 'free' ? '🎮 Free Mode' : '🔥 Beast Mode'}
            </span>
          </div>
          
          {gameState.mode === 'beast' && (
            <div className="text-center">
              <div className="text-xs text-white/70">Prize Pool</div>
              <div className="text-lg font-bold text-green-400">
                KES {gameState.prizePool.toLocaleString()}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowWallet(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg flex items-center gap-2 text-sm"
          >
            💰 KES {wallet.balance.toLocaleString()}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Player Panels */}
        <div className="mb-4">
          <PlayerPanel 
            players={gameState.players}
            currentPlayerIndex={gameState.currentPlayerIndex}
          />
        </div>

        {/* Main Game Area */}
        <div className="flex flex-col lg:flex-row gap-6 items-center justify-center">
          {/* Ludo Board */}
          <div className="flex-shrink-0">
            <LudoBoard
              gameState={gameState}
              onTokenClick={onMoveToken}
              getAbsolutePosition={getAbsolutePosition}
            />
          </div>

          {/* Controls */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-white min-w-[250px]">
            {/* Current Turn */}
            <div className="text-center mb-6">
              <div className="text-sm text-white/70 mb-1">Current Turn</div>
              <div className="text-xl font-bold flex items-center justify-center gap-2">
                <div className={`w-4 h-4 rounded-full ${
                  currentPlayer.color === 'red' ? 'bg-red-500' :
                  currentPlayer.color === 'green' ? 'bg-green-500' :
                  currentPlayer.color === 'yellow' ? 'bg-yellow-400' :
                  'bg-blue-500'
                }`} />
                {currentPlayer.name}
                {currentPlayer.isBot && ' 🤖'}
              </div>
            </div>

            {/* Dice */}
            <div className="flex justify-center mb-6">
              <Dice
                value={gameState.diceValue}
                isRolling={gameState.isRolling}
                onRoll={onRollDice}
                disabled={!canRoll}
                canRoll={canRoll}
              />
            </div>

            {/* Instructions */}
            <div className="text-center text-sm text-white/70">
              {gameState.isRolling && 'Rolling...'}
              {!gameState.isRolling && !hasRolled && isHumanTurn && 'Roll the dice!'}
              {!gameState.isRolling && hasRolled && gameState.movableTokens.length > 0 && isHumanTurn && 
                'Click a highlighted token to move'}
              {mustPass && 'No valid moves available'}
              {!isHumanTurn && 'Waiting for bot...'}
            </div>

            {/* Pass Turn Button */}
            {mustPass && (
              <button
                onClick={onPassTurn}
                className="w-full mt-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Pass Turn →
              </button>
            )}

            {/* Game Info */}
            {gameState.consecutiveSixes > 0 && (
              <div className="mt-4 text-center text-yellow-400 text-sm">
                ⚠️ Consecutive 6s: {gameState.consecutiveSixes}/3
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Winner Modal */}
      {gameState.winner && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-8 max-w-md w-full text-center animate-bounce-in">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {gameState.winner.isBot ? 'Bot Wins!' : 'You Win!'}
            </h2>
            <p className="text-white/90 text-lg mb-4">
              {gameState.winner.name} is the champion!
            </p>

            {gameState.mode === 'beast' && (
              <div className="bg-black/20 rounded-xl p-4 mb-6">
                {gameState.winner.isBot ? (
                  <p className="text-white">Better luck next time!</p>
                ) : (
                  <>
                    <div className="text-white/70 text-sm">Prize Won</div>
                    <div className="text-3xl font-bold text-white">
                      KES {gameState.prizePool.toLocaleString()}
                    </div>
                    {!hasClaimedPrize && (
                      <button
                        onClick={handleClaimPrize}
                        className="mt-3 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-bold"
                      >
                        💰 Claim Prize
                      </button>
                    )}
                    {hasClaimedPrize && (
                      <p className="text-green-300 mt-2">✓ Prize added to wallet!</p>
                    )}
                  </>
                )}
              </div>
            )}

            <button
              onClick={onEndGame}
              className="bg-white text-orange-600 px-8 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}

      {/* Wallet Modal */}
      <WalletModal
        wallet={wallet}
        isOpen={showWallet}
        onClose={() => setShowWallet(false)}
        onDeposit={onDeposit}
        onWithdraw={onWithdraw}
        isProcessing={isProcessing}
        error={walletError}
        onAddDemoCredits={onAddDemoCredits}
      />
    </div>
  );
};
