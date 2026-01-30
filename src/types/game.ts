export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export interface Token {
  id: number;
  color: PlayerColor;
  position: number; // -1 = home, 0-51 = board, 52-56 = home stretch, 57 = finished
  isHome: boolean;
  isFinished: boolean;
}

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  tokens: Token[];
  isBot: boolean;
  phoneNumber?: string;
}

export interface WalletTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'game_entry' | 'game_win' | 'refund';
  amount: number;
  description: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed';
  mpesaRef?: string;
}

export interface Wallet {
  balance: number;
  pendingBalance: number;
  transactions: WalletTransaction[];
  phoneNumber: string;
}

export interface GameState {
  mode: 'free' | 'beast';
  entryFee: number;
  prizePool: number;
  platformFee: number;
  players: Player[];
  currentPlayerIndex: number;
  diceValue: number | null;
  isRolling: boolean;
  canRollAgain: boolean;
  consecutiveSixes: number;
  selectedToken: number | null;
  winner: Player | null;
  gameStatus: 'waiting' | 'playing' | 'finished';
  movableTokens: number[];
}

export interface GameSettings {
  mode: 'free' | 'beast';
  entryFee: number;
  playerCount: number;
}
