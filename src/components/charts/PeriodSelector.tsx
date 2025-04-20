
import React from 'react';

interface PeriodOption {
  value: string;
  label: string;
}

interface PeriodSelectorProps {
  periods: PeriodOption[];
  selectedPeriod: string;
  isPositive: boolean;
  onPeriodChange: (newPeriod: string) => void;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  periods,
  selectedPeriod,
  isPositive,
  onPeriodChange
}) => {
  return (
    <div className="flex space-x-1 bg-black/30 backdrop-blur-md rounded-full p-1">
      {periods.map((p) => (
        <button
          key={p.value}
          onClick={() => onPeriodChange(p.value)}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors duration-150 
            ${selectedPeriod === p.value 
              ? 'bg-purple-700 text-white' 
              : 'text-gray-400 hover:bg-gray-800'
            }`}
          aria-pressed={selectedPeriod === p.value}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
};

export default PeriodSelector;
