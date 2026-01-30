import { useState, useCallback, useEffect } from 'react';
import { GameState, Player, Token, PlayerColor, GameSettings } from '../types/game';

const COLORS: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];
const BOT_NAMES = ['Bot Alpha', 'Bot Beta', 'Bot Gamma', 'Bot Delta'];

// Starting positions for each color on the main track
const START_POSITIONS: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39
};

// Safe spots (stars) where tokens can't be captured
const SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47];

const createTokens = (color: PlayerColor): Token[] => {
  return Array.from({ length: 4 }, (_, i) => ({
    id: i,
    color,
    position: -1,
    isHome: true,
    isFinished: false
  }));
};

const createPlayer = (color: PlayerColor, name: string, isBot: boolean): Player => ({
  id: `player_${color}`,
  name,
  color,
  tokens: createTokens(color),
  isBot
});

const createInitialState = (settings: GameSettings): GameState => {
  const players: Player[] = [];
  
  // Human player is always red
  players.push(createPlayer('red', 'You', false));
  
  // Add bots
  for (let i = 1; i < settings.playerCount; i++) {
    players.push(createPlayer(COLORS[i], BOT_NAMES[i - 1], true));
  }

  const platformFee = settings.mode === 'beast' ? settings.entryFee * settings.playerCount * 0.1 : 0;
  const prizePool = settings.mode === 'beast' ? settings.entryFee * settings.playerCount - platformFee : 0;

  return {
    mode: settings.mode,
    entryFee: settings.entryFee,
    prizePool,
    platformFee,
    players,
    currentPlayerIndex: 0,
    diceValue: null,
    isRolling: false,
    canRollAgain: false,
    consecutiveSixes: 0,
    selectedToken: null,
    winner: null,
    gameStatus: 'playing',
    movableTokens: []
  };
};

export const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);

  const startGame = useCallback((settings: GameSettings) => {
    setGameState(createInitialState(settings));
  }, []);

  const endGame = useCallback(() => {
    setGameState(null);
  }, []);

  const getCurrentPlayer = useCallback((): Player | null => {
    if (!gameState) return null;
    return gameState.players[gameState.currentPlayerIndex];
  }, [gameState]);

  const getAbsolutePosition = useCallback((token: Token): number => {
    if (token.isHome || token.isFinished) return -1;
    const startPos = START_POSITIONS[token.color];
    return (startPos + token.position) % 52;
  }, []);

  const canMoveToken = useCallback((token: Token, diceValue: number): boolean => {
    if (token.isFinished) return false;
    
    if (token.isHome) {
      return diceValue === 6;
    }
    
    // Check if token can reach home
    const newPosition = token.position + diceValue;
    if (newPosition > 56) return false; // Can't overshoot home
    
    return true;
  }, []);

  const getMovableTokens = useCallback((player: Player, diceValue: number): number[] => {
    return player.tokens
      .filter(token => canMoveToken(token, diceValue))
      .map(token => token.id);
  }, [canMoveToken]);

  const rollDice = useCallback(() => {
    if (!gameState || gameState.isRolling || gameState.gameStatus !== 'playing') return;

    setGameState(prev => prev ? { ...prev, isRolling: true, selectedToken: null } : null);

    setTimeout(() => {
      const value = Math.floor(Math.random() * 6) + 1;
      
      setGameState(prev => {
        if (!prev) return null;
        
        const currentPlayer = prev.players[prev.currentPlayerIndex];
        const movable = getMovableTokens(currentPlayer, value);
        
        // Check for three consecutive sixes
        let newConsecutiveSixes = value === 6 ? prev.consecutiveSixes + 1 : 0;
        
        if (newConsecutiveSixes >= 3) {
          // Three sixes - lose turn
          const nextPlayerIndex = (prev.currentPlayerIndex + 1) % prev.players.length;
          return {
            ...prev,
            diceValue: value,
            isRolling: false,
            consecutiveSixes: 0,
            canRollAgain: false,
            currentPlayerIndex: nextPlayerIndex,
            movableTokens: []
          };
        }

        return {
          ...prev,
          diceValue: value,
          isRolling: false,
          movableTokens: movable,
          consecutiveSixes: newConsecutiveSixes
        };
      });
    }, 800);
  }, [gameState, getMovableTokens]);

  const moveToken = useCallback((tokenId: number) => {
    if (!gameState || !gameState.diceValue) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const token = currentPlayer.tokens.find(t => t.id === tokenId);
    
    if (!token || !gameState.movableTokens.includes(tokenId)) return;

    setGameState(prev => {
      if (!prev || !prev.diceValue) return prev;

      const newPlayers = prev.players.map(player => {
        if (player.id !== currentPlayer.id) return player;

        const newTokens = player.tokens.map(t => {
          if (t.id !== tokenId) return t;

          let newPosition: number;
          let newIsHome = false;
          let newIsFinished = false;

          if (t.isHome) {
            // Move out of home base
            newPosition = 0;
          } else {
            newPosition = t.position + prev.diceValue!;
            if (newPosition === 56) {
              newIsFinished = true;
            }
          }

          return {
            ...t,
            position: newPosition,
            isHome: newIsHome,
            isFinished: newIsFinished
          };
        });

        return { ...player, tokens: newTokens };
      });

      // Check for captures
      const movedToken = newPlayers[prev.currentPlayerIndex].tokens.find(t => t.id === tokenId)!;
      let captured = false;

      if (!movedToken.isFinished && !movedToken.isHome) {
        const absolutePos = (START_POSITIONS[movedToken.color] + movedToken.position) % 52;
        
        // Don't capture on safe spots
        if (!SAFE_SPOTS.includes(absolutePos)) {
          newPlayers.forEach((player, playerIdx) => {
            if (playerIdx === prev.currentPlayerIndex) return;
            
            player.tokens.forEach(t => {
              if (t.isHome || t.isFinished) return;
              const otherAbsolutePos = (START_POSITIONS[t.color] + t.position) % 52;
              
              if (otherAbsolutePos === absolutePos) {
                // Capture!
                t.position = -1;
                t.isHome = true;
                captured = true;
              }
            });
          });
        }
      }

      // Check for winner
      const playerTokens = newPlayers[prev.currentPlayerIndex].tokens;
      const allFinished = playerTokens.every(t => t.isFinished);
      
      if (allFinished) {
        return {
          ...prev,
          players: newPlayers,
          winner: newPlayers[prev.currentPlayerIndex],
          gameStatus: 'finished',
          diceValue: null,
          movableTokens: []
        };
      }

      // Determine if player gets another turn
      const canRollAgain = prev.diceValue === 6 || captured;
      const nextPlayerIndex = canRollAgain 
        ? prev.currentPlayerIndex 
        : (prev.currentPlayerIndex + 1) % prev.players.length;

      return {
        ...prev,
        players: newPlayers,
        diceValue: null,
        canRollAgain,
        currentPlayerIndex: nextPlayerIndex,
        movableTokens: [],
        consecutiveSixes: canRollAgain ? prev.consecutiveSixes : 0
      };
    });
  }, [gameState]);

  const passTurn = useCallback(() => {
    if (!gameState) return;
    
    setGameState(prev => {
      if (!prev) return null;
      
      const nextPlayerIndex = (prev.currentPlayerIndex + 1) % prev.players.length;
      
      return {
        ...prev,
        diceValue: null,
        currentPlayerIndex: nextPlayerIndex,
        movableTokens: [],
        canRollAgain: false,
        consecutiveSixes: 0
      };
    });
  }, [gameState]);

  // Bot AI
  useEffect(() => {
    if (!gameState || gameState.gameStatus !== 'playing') return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer.isBot) return;

    // Bot rolls dice
    if (gameState.diceValue === null && !gameState.isRolling) {
      const timeout = setTimeout(() => {
        rollDice();
      }, 1000);
      return () => clearTimeout(timeout);
    }

    // Bot moves token
    if (gameState.diceValue !== null && gameState.movableTokens.length > 0) {
      const timeout = setTimeout(() => {
        // Simple AI: prioritize getting tokens out, then moving furthest token
        const movableTokens = currentPlayer.tokens.filter(t => 
          gameState.movableTokens.includes(t.id)
        );

        let chosenToken: Token | null = null;

        // Priority 1: Get a token out if rolled 6
        if (gameState.diceValue === 6) {
          const homeToken = movableTokens.find(t => t.isHome);
          if (homeToken) chosenToken = homeToken;
        }

        // Priority 2: Can finish a token
        if (!chosenToken) {
          chosenToken = movableTokens.find(t => 
            !t.isHome && t.position + gameState.diceValue! === 56
          ) || null;
        }

        // Priority 3: Can capture opponent
        if (!chosenToken) {
          for (const token of movableTokens) {
            if (token.isHome) continue;
            const newPos = token.position + gameState.diceValue!;
            if (newPos >= 52) continue; // In home stretch
            
            const absolutePos = (START_POSITIONS[token.color] + newPos) % 52;
            if (SAFE_SPOTS.includes(absolutePos)) continue;
            
            const canCapture = gameState.players.some((p, idx) => {
              if (idx === gameState.currentPlayerIndex) return false;
              return p.tokens.some(t => {
                if (t.isHome || t.isFinished) return false;
                const otherPos = (START_POSITIONS[t.color] + t.position) % 52;
                return otherPos === absolutePos;
              });
            });
            
            if (canCapture) {
              chosenToken = token;
              break;
            }
          }
        }

        // Priority 4: Move the furthest token
        if (!chosenToken) {
          chosenToken = movableTokens.reduce((best, current) => {
            if (!best) return current;
            if (current.isHome) return best;
            if (best.isHome) return current;
            return current.position > best.position ? current : best;
          }, null as Token | null);
        }

        if (chosenToken) {
          moveToken(chosenToken.id);
        }
      }, 1200);
      return () => clearTimeout(timeout);
    }

    // Bot passes turn if no moves available
    if (gameState.diceValue !== null && gameState.movableTokens.length === 0) {
      const timeout = setTimeout(() => {
        passTurn();
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [gameState, rollDice, moveToken, passTurn]);

  return {
    gameState,
    startGame,
    endGame,
    getCurrentPlayer,
    rollDice,
    moveToken,
    passTurn,
    getAbsolutePosition
  };
};
