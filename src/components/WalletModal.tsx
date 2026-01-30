import React, { useState } from 'react';
import { Wallet, WalletTransaction } from '../types/game';
import { validatePhoneNumber } from '../services/mpesa';

interface WalletModalProps {
  wallet: Wallet;
  isOpen: boolean;
  onClose: () => void;
  onDeposit: (amount: number, phone: string) => Promise<boolean>;
  onWithdraw: (amount: number, phone: string) => Promise<boolean>;
  isProcessing: boolean;
  error: string | null;
  onAddDemoCredits: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  wallet,
  isOpen,
  onClose,
  onDeposit,
  onWithdraw,
  isProcessing,
  error,
  onAddDemoCredits
}) => {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(wallet.phoneNumber || '');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const success = activeTab === 'deposit' 
      ? await onDeposit(numAmount, phone)
      : await onWithdraw(numAmount, phone);

    if (success) {
      setAmount('');
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-KE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const depositAmounts = [100, 250, 500, 1000, 2500, 5000];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 text-white">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">💰 M-Pesa Wallet</h2>
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl">
              ×
            </button>
          </div>
          <div className="mt-3 text-center">
            <div className="text-sm opacity-80">Balance</div>
            <div className="text-3xl font-bold">KES {wallet.balance.toLocaleString()}</div>
            {wallet.pendingBalance > 0 && (
              <div className="text-sm opacity-80">
                + KES {wallet.pendingBalance.toLocaleString()} pending
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {(['deposit', 'withdraw', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors
                ${activeTab === tab 
                  ? 'text-green-600 border-b-2 border-green-600' 
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab === 'deposit' && '📥 '}
              {tab === 'withdraw' && '📤 '}
              {tab === 'history' && '📋 '}
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {activeTab === 'history' ? (
            <div className="space-y-2">
              {wallet.transactions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No transactions yet</p>
              ) : (
                wallet.transactions.map((tx: WalletTransaction) => (
                  <div 
                    key={tx.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-sm">{tx.description}</div>
                      <div className="text-xs text-gray-500">{formatDate(tx.timestamp)}</div>
                    </div>
                    <div className={`font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.amount >= 0 ? '+' : ''}KES {tx.amount.toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* M-Pesa Logo */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="text-xl font-bold text-green-700">M-PESA</span>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  M-Pesa Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                {phone && !validatePhoneNumber(phone) && (
                  <p className="text-red-500 text-xs mt-1">Enter a valid Kenyan phone number</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (KES)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={activeTab === 'deposit' ? 'Min: 10' : 'Min: 50'}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  min={activeTab === 'deposit' ? 10 : 50}
                />
              </div>

              {/* Quick amounts for deposit */}
              {activeTab === 'deposit' && (
                <div className="grid grid-cols-3 gap-2">
                  {depositAmounts.map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmount(amt.toString())}
                      className="py-2 border rounded-lg hover:bg-green-50 hover:border-green-500 transition-colors text-sm font-medium"
                    >
                      KES {amt}
                    </button>
                  ))}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isProcessing || !validatePhoneNumber(phone) || !amount}
                className={`
                  w-full py-3 rounded-lg font-bold text-white
                  ${isProcessing 
                    ? 'bg-gray-400' 
                    : 'bg-green-600 hover:bg-green-700'
                  }
                  transition-colors
                `}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  activeTab === 'deposit' ? '📥 Deposit via M-Pesa' : '📤 Withdraw to M-Pesa'
                )}
              </button>

              {/* Info */}
              <p className="text-xs text-center text-gray-500">
                {activeTab === 'deposit' 
                  ? "You'll receive an STK push on your phone to complete the payment"
                  : "Funds will be sent directly to your M-Pesa account"
                }
              </p>
            </form>
          )}
        </div>

        {/* Demo Credits Button */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onAddDemoCredits}
            className="w-full py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          >
            🎁 Add Demo Credits (KES 500) - For Testing
          </button>
        </div>
      </div>
    </div>
  );
};
