import React from 'react';

interface IntervalOption {
  value: string;
  label: string;
}

interface IntervalSelectorProps {
  intervals: IntervalOption[];
  selectedInterval: string;
  validIntervals: string[]; // List of currently valid interval values
  isPositive: boolean;
  onIntervalChange: (newInterval: string) => void;
}

const IntervalSelector: React.FC<IntervalSelectorProps> = ({
  intervals,
  selectedInterval,
  validIntervals,
  isPositive,
  onIntervalChange
}) => {
  // Determine active/inactive/disabled button styles
  const baseStyle = "flex-1 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-40 disabled:pointer-events-none";
  const activeStyle = isPositive
    ? "bg-ios-green/20 text-ios-green border border-ios-green/50 shadow-sm"
    : "bg-ios-red/20 text-ios-red border border-ios-red/50 shadow-sm";
  const inactiveStyle = "text-ios-light-gray hover:bg-gray-700/50 border border-transparent";
  const ringColor = isPositive ? "focus:ring-ios-green" : "focus:ring-ios-red";

  return (
    <div className="flex-1"> {/* Allow selector to take space */}
      <p className="text-xs text-ios-gray mb-1 text-center sm:text-left">Interval</p>
      <div className="flex justify-between gap-1 sm:gap-2 bg-gray-800/50 p-1 rounded-lg">
        {intervals.map((i) => {
          const isValid = validIntervals.includes(i.value);
          const isActive = selectedInterval === i.value;

          return (
            <button
              key={i.value}
              onClick={() => onIntervalChange(i.value)}
              disabled={!isValid} // Disable button if interval is not valid for the selected period
              className={`${baseStyle} ${ringColor} ${isActive && isValid ? activeStyle : inactiveStyle}`}
              aria-pressed={isActive && isValid}
            >
              {i.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default IntervalSelector;