
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
  // Simplified style for dark theme
  const baseStyle = "flex-1 py-1 text-xs font-medium rounded-md transition-colors duration-150 focus:outline-none";
  const activeStyle = "bg-gray-700 text-white";
  const inactiveStyle = "text-gray-400 hover:bg-gray-800";

  return (
    <div className="flex-1">
      <div className="flex justify-between gap-1 bg-gray-800/50 p-1 rounded-lg">
        {periods.map((p) => (
          <button
            key={p.value}
            onClick={() => onPeriodChange(p.value)}
            className={`${baseStyle} ${selectedPeriod === p.value ? activeStyle : inactiveStyle}`}
            aria-pressed={selectedPeriod === p.value}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PeriodSelector;
