import { useGameLogic } from './hooks/useGameLogic';
import { useWallet } from './hooks/useWallet';
import { GameModeSelector } from './components/GameModeSelector';
import { GameScreen } from './components/GameScreen';
import { GameSettings } from './types/game';

function App() {
  const {
    gameState,
    startGame,
    endGame,
    rollDice,
    moveToken,
    passTurn,
    getAbsolutePosition
  } = useGameLogic();

  const {
    wallet,
    isProcessing,
    error: walletError,
    deposit,
    withdraw,
    deductForGame,
    addWinnings,
    addDemoCredits
  } = useWallet();

  const handleStartGame = (mode: 'free' | 'beast', entryFee: number, playerCount: number) => {
    // Deduct entry fee for beast mode
    if (mode === 'beast') {
      const success = deductForGame(entryFee, 'game_' + Date.now());
      if (!success) return;
    }

    const settings: GameSettings = {
      mode,
      entryFee,
      playerCount
    };
    
    startGame(settings);
  };

  // Show mode selector if no game is active
  if (!gameState) {
    return (
      <GameModeSelector
        wallet={wallet}
        onStartGame={handleStartGame}
        onDeposit={deposit}
        onWithdraw={withdraw}
        isProcessing={isProcessing}
        walletError={walletError}
        onAddDemoCredits={addDemoCredits}
      />
    );
  }

  // Show game screen
  return (
    <GameScreen
      gameState={gameState}
      wallet={wallet}
      onRollDice={rollDice}
      onMoveToken={moveToken}
      onPassTurn={passTurn}
      onEndGame={endGame}
      onAddWinnings={addWinnings}
      getAbsolutePosition={getAbsolutePosition}
      onDeposit={deposit}
      onWithdraw={withdraw}
      isProcessing={isProcessing}
      walletError={walletError}
      onAddDemoCredits={addDemoCredits}
    />
  );
}

export default App;
