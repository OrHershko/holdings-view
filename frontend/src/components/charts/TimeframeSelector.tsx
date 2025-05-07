import React from 'react';

interface TimeframeSelectorProps {
  timeframe: string;
  isPositive: boolean;
  onTimeframeChange: (newTimeframe: string) => void;
}

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  timeframe,
  isPositive,
  onTimeframeChange
}) => {
  // Ensure these values match the keys in mapTimeframeToApiParams in StockChart.tsx
  const timeframes = [
    { value: '15m', label: '15M' }, // Maps to 5d/15m
    { value: '1h',  label: '1H'  }, // Maps to 1mo/60m
    { value: '1d',  label: '1D'  }, // Maps to 1mo/1d
    { value: '1w',  label: '1W'  }, // Maps to 6mo/1wk
    { value: '1m',  label: '1M'  }, // Maps to 1y/1mo
    { value: '6m',  label: '6M'  }, // Maps to 5y/1mo
    { value: '1y',  label: '1Y'  }, // Maps to 10y/1mo
  ];

  // Determine active/inactive button styles based on isPositive
  const baseStyle = "flex-1 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900";
  const activeStyle = isPositive
    ? "bg-ios-green/20 text-ios-green border border-ios-green/50 shadow-sm"
    : "bg-ios-red/20 text-ios-red border border-ios-red/50 shadow-sm";
  const inactiveStyle = "text-ios-light-gray hover:bg-gray-700/50 border border-transparent";
  const ringColor = isPositive ? "focus:ring-ios-green" : "focus:ring-ios-red";


  return (
    <div className="flex justify-between mt-4 gap-1 sm:gap-2"> {/* Adjusted gap */}
      {timeframes.map((tf) => (
        <button
          key={tf.value}
          onClick={() => onTimeframeChange(tf.value)}
          className={`${baseStyle} ${ringColor} ${timeframe === tf.value ? activeStyle : inactiveStyle}`}
          aria-pressed={timeframe === tf.value}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
};

export default TimeframeSelector;
