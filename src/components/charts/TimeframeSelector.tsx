
import React from 'react';

interface TimeframeSelectorProps {
  timeframe: string;
  isPositive: boolean;
  onTimeframeChange: (timeframe: string) => void;
}

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({ 
  timeframe, 
  isPositive, 
  onTimeframeChange 
}) => {
  const timeframes = [
    { value: '1d', label: '1D' },
    { value: '1w', label: '1W' },
    { value: '1m', label: '1M' },
    { value: '6m', label: '6M' },
    { value: '1y', label: '1Y' },
  ];

  return (
    <div className="flex justify-between mt-4 gap-2">
      {timeframes.map((tf) => (
        <button
          key={tf.value}
          className={`px-3 py-1 rounded-full text-sm ${
            timeframe === tf.value 
              ? (isPositive ? 'bg-green-500 text-white' : 'bg-red-500 text-white')
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
          onClick={() => onTimeframeChange(tf.value)}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
};

export default TimeframeSelector;
