import React, { useState } from 'react';
import { Wallet, WalletTransaction } from '../types/game';
import { WalletModal } from './WalletModal';

interface GameModeSelectorProps {
  wallet: Wallet;
  onStartGame: (mode: 'free' | 'beast', entryFee: number, playerCount: number) => void;
  onDeposit: (amount: number, phone: string) => Promise<boolean>;
  onWithdraw: (amount: number, phone: string) => Promise<boolean>;
  isProcessing: boolean;
  walletError: string | null;
  onAddDemoCredits: () => void;
}

const ENTRY_FEES = [50, 100, 250, 500, 1000, 2500];

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  wallet,
  onStartGame,
  onDeposit,
  onWithdraw,
  isProcessing,
  walletError,
  onAddDemoCredits
}) => {
  const [selectedMode, setSelectedMode] = useState<'free' | 'beast' | null>(null);
  const [entryFee, setEntryFee] = useState(100);
  const [playerCount, setPlayerCount] = useState(4);
  const [showWallet, setShowWallet] = useState(false);

  const canAffordBeast = wallet.balance >= entryFee;
  const prizePool = entryFee * playerCount;
  const platformFee = prizePool * 0.1;
  const winnerGets = prizePool - platformFee;

  const handleStartGame = () => {
    if (selectedMode === 'beast' && !canAffordBeast) {
      setShowWallet(true);
      return;
    }
    onStartGame(selectedMode!, entryFee, playerCount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🎲 Ludo Arena
          </h1>
          <button
            onClick={() => setShowWallet(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <span className="text-lg">💰</span>
            <span className="font-bold">KES {wallet.balance.toLocaleString()}</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Play Ludo, Win Big! 🏆
          </h2>
          <p className="text-xl text-white/70">
            Choose your mode and compete against smart bots
          </p>
        </div>

        {/* Mode Selection */}
        {!selectedMode ? (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Free Mode */}
            <button
              onClick={() => setSelectedMode('free')}
              className="bg-gradient-to-br from-blue-500 to-blue-700 p-6 rounded-2xl text-white text-left hover:scale-105 transition-transform shadow-xl"
            >
              <div className="text-4xl mb-4">🎮</div>
              <h3 className="text-2xl font-bold mb-2">Free Mode</h3>
              <p className="text-white/80 mb-4">
                Practice your skills and play for fun. No money, no pressure!
              </p>
              <ul className="space-y-2 text-sm text-white/70">
                <li>✓ Play against AI bots</li>
                <li>✓ No entry fee required</li>
                <li>✓ Perfect for practice</li>
                <li>✓ Unlimited games</li>
              </ul>
              <div className="mt-6 bg-white/20 rounded-lg py-2 px-4 text-center font-bold">
                Play Free →
              </div>
            </button>

            {/* Beast Mode */}
            <button
              onClick={() => setSelectedMode('beast')}
              className="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-2xl text-white text-left hover:scale-105 transition-transform shadow-xl relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                WIN CASH!
              </div>
              <div className="text-4xl mb-4">🔥</div>
              <h3 className="text-2xl font-bold mb-2">Beast Mode</h3>
              <p className="text-white/80 mb-4">
                Put your money where your skills are. Win real money!
              </p>
              <ul className="space-y-2 text-sm text-white/70">
                <li>💰 Win real money via M-Pesa</li>
                <li>🏆 Winner takes the prize pool</li>
                <li>⚡ Instant payouts</li>
                <li>🛡️ Secure transactions</li>
              </ul>
              <div className="mt-6 bg-white/20 rounded-lg py-2 px-4 text-center font-bold">
                Play for Cash →
              </div>
            </button>
          </div>
        ) : (
          /* Game Setup */
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-white">
            <button
              onClick={() => setSelectedMode(null)}
              className="text-white/70 hover:text-white mb-4 flex items-center gap-2"
            >
              ← Back to modes
            </button>

            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
              {selectedMode === 'free' ? '🎮 Free Mode' : '🔥 Beast Mode'}
            </h3>

            {/* Player Count */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3">Number of Players</label>
              <div className="flex gap-3">
                {[2, 3, 4].map(count => (
                  <button
                    key={count}
                    onClick={() => setPlayerCount(count)}
                    className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                      playerCount === count
                        ? 'bg-white text-purple-900'
                        : 'bg-white/20 hover:bg-white/30'
                    }`}
                  >
                    {count} Players
                  </button>
                ))}
              </div>
            </div>

            {/* Entry Fee (Beast Mode only) */}
            {selectedMode === 'beast' && (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-3">Entry Fee (KES)</label>
                  <div className="grid grid-cols-3 gap-3">
                    {ENTRY_FEES.map(fee => (
                      <button
                        key={fee}
                        onClick={() => setEntryFee(fee)}
                        className={`py-3 rounded-lg font-bold transition-all ${
                          entryFee === fee
                            ? 'bg-green-500 text-white'
                            : 'bg-white/20 hover:bg-white/30'
                        }`}
                      >
                        KES {fee}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prize Breakdown */}
                <div className="bg-black/30 rounded-xl p-4 mb-6">
                  <h4 className="font-bold mb-3 text-lg">💰 Prize Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Entry Fee × {playerCount} players</span>
                      <span>KES {prizePool.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-red-400">
                      <span>Platform Fee (10%)</span>
                      <span>- KES {platformFee.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-white/20 pt-2 flex justify-between font-bold text-green-400 text-lg">
                      <span>Winner Gets 🏆</span>
                      <span>KES {winnerGets.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Balance Warning */}
                {!canAffordBeast && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
                    <p className="text-red-300 text-sm">
                      Insufficient balance. You need KES {entryFee.toLocaleString()} to join.
                      <button
                        onClick={() => setShowWallet(true)}
                        className="underline ml-2 font-bold"
                      >
                        Top up now
                      </button>
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Start Button */}
            <button
              onClick={handleStartGame}
              disabled={selectedMode === 'beast' && !canAffordBeast}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                selectedMode === 'free' || canAffordBeast
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg'
                  : 'bg-gray-500 cursor-not-allowed text-white/50'
              }`}
            >
              {selectedMode === 'free' 
                ? '🎮 Start Free Game'
                : canAffordBeast
                  ? `🔥 Pay KES ${entryFee} & Start Game`
                  : '💰 Deposit to Play'
              }
            </button>
          </div>
        )}

        {/* Recent Transactions */}
        {wallet.transactions.length > 0 && (
          <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
            <div className="space-y-2">
              {wallet.transactions.slice(0, 5).map((tx: WalletTransaction) => (
                <div key={tx.id} className="flex justify-between text-sm text-white/70">
                  <span>{tx.description}</span>
                  <span className={tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {tx.amount >= 0 ? '+' : ''}KES {tx.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

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
