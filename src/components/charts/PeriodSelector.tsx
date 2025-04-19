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
  // Determine active/inactive button styles based on isPositive
  const baseStyle = "flex-1 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900";
  const activeStyle = isPositive
    ? "bg-ios-green/20 text-ios-green border border-ios-green/50 shadow-sm"
    : "bg-ios-red/20 text-ios-red border border-ios-red/50 shadow-sm";
  const inactiveStyle = "text-ios-light-gray hover:bg-gray-700/50 border border-transparent";
  const ringColor = isPositive ? "focus:ring-ios-green" : "focus:ring-ios-red";

  return (
    <div className="flex-1"> {/* Allow selector to take space */}
      <p className="text-xs text-ios-gray mb-1 text-center sm:text-left">Period</p>
      <div className="flex justify-between gap-1 sm:gap-2 bg-gray-800/50 p-1 rounded-lg">
        {periods.map((p) => (
          <button
            key={p.value}
            onClick={() => onPeriodChange(p.value)}
            className={`${baseStyle} ${ringColor} ${selectedPeriod === p.value ? activeStyle : inactiveStyle}`}
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