import React from 'react';

interface DiceProps {
  value: number | null;
  isRolling: boolean;
  onRoll: () => void;
  disabled: boolean;
  canRoll: boolean;
}

const diceFaces: Record<number, React.ReactNode> = {
  1: (
    <div className="grid place-items-center h-full">
      <div className="w-3 h-3 bg-gray-800 rounded-full" />
    </div>
  ),
  2: (
    <div className="grid grid-cols-2 gap-4 p-2 h-full items-center">
      <div className="w-3 h-3 bg-gray-800 rounded-full justify-self-start" />
      <div className="w-3 h-3 bg-gray-800 rounded-full justify-self-end" />
    </div>
  ),
  3: (
    <div className="relative h-full p-2">
      <div className="w-3 h-3 bg-gray-800 rounded-full absolute top-2 left-2" />
      <div className="w-3 h-3 bg-gray-800 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="w-3 h-3 bg-gray-800 rounded-full absolute bottom-2 right-2" />
    </div>
  ),
  4: (
    <div className="grid grid-cols-2 gap-2 p-2 h-full">
      <div className="w-3 h-3 bg-gray-800 rounded-full" />
      <div className="w-3 h-3 bg-gray-800 rounded-full justify-self-end" />
      <div className="w-3 h-3 bg-gray-800 rounded-full self-end" />
      <div className="w-3 h-3 bg-gray-800 rounded-full justify-self-end self-end" />
    </div>
  ),
  5: (
    <div className="relative h-full p-2">
      <div className="w-3 h-3 bg-gray-800 rounded-full absolute top-2 left-2" />
      <div className="w-3 h-3 bg-gray-800 rounded-full absolute top-2 right-2" />
      <div className="w-3 h-3 bg-gray-800 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="w-3 h-3 bg-gray-800 rounded-full absolute bottom-2 left-2" />
      <div className="w-3 h-3 bg-gray-800 rounded-full absolute bottom-2 right-2" />
    </div>
  ),
  6: (
    <div className="grid grid-cols-2 gap-1 p-2 h-full">
      <div className="w-3 h-3 bg-gray-800 rounded-full" />
      <div className="w-3 h-3 bg-gray-800 rounded-full justify-self-end" />
      <div className="w-3 h-3 bg-gray-800 rounded-full" />
      <div className="w-3 h-3 bg-gray-800 rounded-full justify-self-end" />
      <div className="w-3 h-3 bg-gray-800 rounded-full" />
      <div className="w-3 h-3 bg-gray-800 rounded-full justify-self-end" />
    </div>
  )
};

export const Dice: React.FC<DiceProps> = ({ value, isRolling, onRoll, disabled, canRoll }) => {
  const displayValue = isRolling ? Math.floor(Math.random() * 6) + 1 : (value || 1);

  return (
    <div className="flex flex-col items-center gap-3">
      <div 
        className={`
          w-16 h-16 bg-white rounded-xl shadow-lg border-2 border-gray-300
          ${isRolling ? 'animate-bounce' : ''}
          transition-transform duration-200
        `}
      >
        {diceFaces[displayValue]}
      </div>
      
      {canRoll && (
        <button
          onClick={onRoll}
          disabled={disabled || isRolling}
          className={`
            px-6 py-2 rounded-lg font-bold text-white
            ${disabled || isRolling 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-95'
            }
            transition-all duration-200 shadow-lg
          `}
        >
          {isRolling ? 'Rolling...' : 'Roll Dice 🎲'}
        </button>
      )}
    </div>
  );
};
