
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useStockHistory } from '@/hooks/useStockData';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface StockChartProps {
  symbol: string;
  stockName: string;
  currentPrice: number;
  change: number;
  changePercent: number;
}

const StockChart: React.FC<StockChartProps> = ({ 
  symbol, 
  stockName, 
  currentPrice, 
  change, 
  changePercent 
}) => {
  const [timeframe, setTimeframe] = useState<string>('1m');
  const { data, isLoading } = useStockHistory(symbol, timeframe);
  
  const isPositive = change >= 0;
  
  const timeframes = [
    { value: '1d', label: '1D' },
    { value: '1w', label: '1W' },
    { value: '1m', label: '1M' },
    { value: '6m', label: '6M' },
    { value: '1y', label: '1Y' },
  ];

  // Format chart data
  const chartData = data ? data.dates.map((date, index) => ({
    date,
    price: data.prices[index]
  })) : [];

  // Format the tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 rounded shadow-ios text-xs">
          <p className="font-medium">{label}</p>
          <p className="text-ios-blue">${payload[0].value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card className="ios-card">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-lg font-medium">{symbol}</h2>
            <p className="text-sm text-ios-gray">{stockName}</p>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">${currentPrice.toFixed(2)}</div>
            <div className={isPositive ? 'text-ios-green text-sm' : 'text-ios-red text-sm'}>
              {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="h-60 flex items-center justify-center">
            <div className="animate-pulse text-ios-gray">Loading chart...</div>
          </div>
        ) : (
          <div className="h-60 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  tickFormatter={(value) => {
                    if (timeframe === '1d') return value.split('T')[1]?.substring(0, 5) || value;
                    return value.split('-').slice(1).join('/');
                  }}
                />
                <YAxis 
                  domain={['dataMin - 5', 'dataMax + 5']} 
                  tick={{ fontSize: 10 }} 
                  tickLine={false}
                  axisLine={false}
                  orientation="right"
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke={isPositive ? '#34C759' : '#FF3B30'} 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, fill: isPositive ? '#34C759' : '#FF3B30' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        
        <div className="flex justify-between mt-4">
          {timeframes.map((tf) => (
            <button
              key={tf.value}
              className={`px-3 py-1 rounded-full text-sm ${timeframe === tf.value ? (isPositive ? 'bg-ios-green text-white' : 'bg-ios-red text-white') : 'bg-ios-light-gray text-ios-gray'}`}
              onClick={() => setTimeframe(tf.value)}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default StockChart;
