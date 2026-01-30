import { PlayerColor } from '../types/game';

// Starting positions for each color on the main track
export const START_POSITIONS: Record<PlayerColor, number> = {
  red: 1,
  green: 14,
  yellow: 27,
  blue: 40,
};

// Home stretch entry positions (where tokens enter the home column)
export const HOME_ENTRY: Record<PlayerColor, number> = {
  red: 51,
  green: 12,
  yellow: 25,
  blue: 38,
};

// Safe positions on the board (stars)
export const SAFE_POSITIONS = [1, 9, 14, 22, 27, 35, 40, 48];

// Board coordinates for rendering
export const BOARD_SIZE = 15;
export const CELL_SIZE = 40;

// Color configurations
export const PLAYER_COLORS: Record<PlayerColor, { bg: string; light: string; dark: string; text: string }> = {
  red: { bg: 'bg-red-500', light: 'bg-red-100', dark: 'bg-red-600', text: 'text-red-600' },
  green: { bg: 'bg-green-500', light: 'bg-green-100', dark: 'bg-green-600', text: 'text-green-600' },
  yellow: { bg: 'bg-yellow-400', light: 'bg-yellow-100', dark: 'bg-yellow-500', text: 'text-yellow-600' },
  blue: { bg: 'bg-blue-500', light: 'bg-blue-100', dark: 'bg-blue-600', text: 'text-blue-600' },
};

// Bet amounts for Beast Mode
export const BET_OPTIONS = [10, 25, 50, 100, 250, 500];

// Platform commission percentage
export const PLATFORM_COMMISSION = 10; // 10%
