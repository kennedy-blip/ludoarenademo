import { useState, useCallback } from 'react';
import { Wallet, WalletTransaction } from '../types/game';
import { mpesaService, formatPhoneNumber, validatePhoneNumber } from '../services/mpesa';

const STORAGE_KEY = 'ludo_wallet';

const loadWallet = (): Wallet => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const wallet = JSON.parse(saved);
    wallet.transactions = wallet.transactions.map((t: WalletTransaction) => ({
      ...t,
      timestamp: new Date(t.timestamp)
    }));
    return wallet;
  }
  return {
    balance: 0,
    pendingBalance: 0,
    transactions: [],
    phoneNumber: ''
  };
};

export const useWallet = () => {
  const [wallet, setWallet] = useState<Wallet>(loadWallet);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveWallet = (newWallet: Wallet) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newWallet));
    setWallet(newWallet);
  };

  const setPhoneNumber = useCallback((phone: string) => {
    const newWallet = { ...wallet, phoneNumber: phone };
    saveWallet(newWallet);
  }, [wallet]);

  const deposit = useCallback(async (amount: number, phoneNumber: string): Promise<boolean> => {
    setError(null);
    
    if (!validatePhoneNumber(phoneNumber)) {
      setError('Invalid phone number. Use format 07XXXXXXXX or 254XXXXXXXXX');
      return false;
    }

    if (amount < 10) {
      setError('Minimum deposit is KES 10');
      return false;
    }

    setIsProcessing(true);

    try {
      // Initiate STK Push
      const stkResponse = await mpesaService.initiateSTKPush({
        phoneNumber: formatPhoneNumber(phoneNumber),
        amount,
        accountReference: 'LudoArena',
        transactionDesc: 'Wallet Top Up'
      });

      if (stkResponse.ResponseCode !== '0') {
        throw new Error(stkResponse.ResponseDescription);
      }

      // Create pending transaction
      const transaction: WalletTransaction = {
        id: stkResponse.CheckoutRequestID,
        type: 'deposit',
        amount,
        description: `M-Pesa deposit from ${phoneNumber}`,
        timestamp: new Date(),
        status: 'pending',
        mpesaRef: stkResponse.CheckoutRequestID
      };

      const newWallet = {
        ...wallet,
        phoneNumber,
        pendingBalance: wallet.pendingBalance + amount,
        transactions: [transaction, ...wallet.transactions]
      };
      saveWallet(newWallet);

      // Check for payment confirmation
      const status = await mpesaService.checkSTKPushStatus(stkResponse.CheckoutRequestID);

      if (status.status === 'completed') {
        // Update transaction and balance
        const completedWallet = {
          ...newWallet,
          balance: newWallet.balance + amount,
          pendingBalance: newWallet.pendingBalance - amount,
          transactions: newWallet.transactions.map(t =>
            t.id === transaction.id ? { ...t, status: 'completed' as const } : t
          )
        };
        saveWallet(completedWallet);
        setIsProcessing(false);
        return true;
      } else {
        throw new Error('Payment was not completed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deposit failed');
      setIsProcessing(false);
      return false;
    }
  }, [wallet]);

  const withdraw = useCallback(async (amount: number, phoneNumber: string): Promise<boolean> => {
    setError(null);

    if (!validatePhoneNumber(phoneNumber)) {
      setError('Invalid phone number');
      return false;
    }

    if (amount < 50) {
      setError('Minimum withdrawal is KES 50');
      return false;
    }

    if (amount > wallet.balance) {
      setError('Insufficient balance');
      return false;
    }

    setIsProcessing(true);

    try {
      // Deduct from balance first
      const transaction: WalletTransaction = {
        id: 'wd_' + Date.now(),
        type: 'withdrawal',
        amount: -amount,
        description: `M-Pesa withdrawal to ${phoneNumber}`,
        timestamp: new Date(),
        status: 'pending'
      };

      const newWallet = {
        ...wallet,
        balance: wallet.balance - amount,
        transactions: [transaction, ...wallet.transactions]
      };
      saveWallet(newWallet);

      // Initiate B2C
      const result = await mpesaService.initiateB2C({
        phoneNumber: formatPhoneNumber(phoneNumber),
        amount,
        remarks: 'Ludo Arena Withdrawal',
        occasion: 'Withdrawal'
      });

      if (result.success) {
        const completedWallet = {
          ...newWallet,
          transactions: newWallet.transactions.map(t =>
            t.id === transaction.id ? { ...t, status: 'completed' as const } : t
          )
        };
        saveWallet(completedWallet);
        setIsProcessing(false);
        return true;
      } else {
        // Refund on failure
        const refundWallet = {
          ...wallet,
          transactions: newWallet.transactions.map(t =>
            t.id === transaction.id ? { ...t, status: 'failed' as const } : t
          )
        };
        saveWallet(refundWallet);
        throw new Error(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Withdrawal failed');
      setIsProcessing(false);
      return false;
    }
  }, [wallet]);

  const deductForGame = useCallback((amount: number, gameId: string): boolean => {
    if (amount > wallet.balance) {
      setError('Insufficient balance');
      return false;
    }

    const transaction: WalletTransaction = {
      id: 'game_' + gameId,
      type: 'game_entry',
      amount: -amount,
      description: `Beast Mode entry fee`,
      timestamp: new Date(),
      status: 'completed'
    };

    const newWallet = {
      ...wallet,
      balance: wallet.balance - amount,
      transactions: [transaction, ...wallet.transactions]
    };
    saveWallet(newWallet);
    return true;
  }, [wallet]);

  const addWinnings = useCallback((amount: number, gameId: string) => {
    const transaction: WalletTransaction = {
      id: 'win_' + gameId,
      type: 'game_win',
      amount,
      description: `Beast Mode winnings! 🏆`,
      timestamp: new Date(),
      status: 'completed'
    };

    const newWallet = {
      ...wallet,
      balance: wallet.balance + amount,
      transactions: [transaction, ...wallet.transactions]
    };
    saveWallet(newWallet);
  }, [wallet]);

  const refund = useCallback((amount: number, gameId: string) => {
    const transaction: WalletTransaction = {
      id: 'refund_' + gameId,
      type: 'refund',
      amount,
      description: `Game cancelled - refund`,
      timestamp: new Date(),
      status: 'completed'
    };

    const newWallet = {
      ...wallet,
      balance: wallet.balance + amount,
      transactions: [transaction, ...wallet.transactions]
    };
    saveWallet(newWallet);
  }, [wallet]);

  // Demo: Add free credits for testing
  const addDemoCredits = useCallback((amount: number = 500) => {
    const transaction: WalletTransaction = {
      id: 'demo_' + Date.now(),
      type: 'deposit',
      amount,
      description: `Demo credits (for testing)`,
      timestamp: new Date(),
      status: 'completed'
    };

    const newWallet = {
      ...wallet,
      balance: wallet.balance + amount,
      transactions: [transaction, ...wallet.transactions]
    };
    saveWallet(newWallet);
  }, [wallet]);

  return {
    wallet,
    isProcessing,
    error,
    setPhoneNumber,
    deposit,
    withdraw,
    deductForGame,
    addWinnings,
    refund,
    addDemoCredits,
    clearError: () => setError(null)
  };
};
