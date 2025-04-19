
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useStockHistory, StockHistoryData } from '@/hooks/useStockData';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ComposedChart, Bar, Area, ReferenceLine, CartesianGrid,
  Legend
} from 'recharts';

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

  // Format chart data with technical indicators, safely handling optional properties
  const chartData = data ? data.dates.map((date, index) => ({
    date,
    price: data.prices[index],
    volume: data.volume?.[index] || 0,
    sma20: data.sma20?.[index] || 0,
    sma50: data.sma50?.[index] || 0,
    rsi: data.rsi?.[index] || 0,
    macd: data.macd?.[index] || 0,
    signal: data.signal?.[index] || 0,
    histogram: data.histogram?.[index] || 0,
    high: data.high?.[index] || 0,
    low: data.low?.[index] || 0,
    open: data.open?.[index] || 0,
    close: data.close?.[index] || 0,
  })) : [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1E1E1E] p-3 rounded shadow-lg border border-gray-800 text-xs">
          <p className="font-medium text-gray-300">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value?.toFixed(2)}
            </p>
          ))}
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
            <h2 className="text-lg font-medium text-white">{symbol}</h2>
            <p className="text-sm text-gray-400">{stockName}</p>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-white">${currentPrice.toFixed(2)}</div>
            <div className={isPositive ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>
              {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="h-[500px] flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading chart...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Price Chart with Candlesticks */}
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#9CA3AF' }} 
                    tickLine={{ stroke: '#4B5563' }}
                    axisLine={{ stroke: '#4B5563' }}
                  />
                  <YAxis 
                    yAxisId="price"
                    orientation="right"
                    tick={{ fill: '#9CA3AF' }}
                    tickLine={{ stroke: '#4B5563' }}
                    axisLine={{ stroke: '#4B5563' }}
                    domain={['auto', 'auto']}
                  />
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  
                  {/* Candlesticks */}
                  {data?.high && data?.low && (
                    <Bar
                      dataKey="high"
                      fill={isPositive ? "#34D399" : "#EF4444"}
                      stroke={isPositive ? "#34D399" : "#EF4444"}
                      yAxisId="price"
                    />
                  )}
                  
                  {/* Moving Averages */}
                  {data?.sma20 && (
                    <Line
                      type="monotone"
                      dataKey="sma20"
                      stroke="#60A5FA"
                      dot={false}
                      yAxisId="price"
                      name="SMA 20"
                    />
                  )}
                  {data?.sma50 && (
                    <Line
                      type="monotone"
                      dataKey="sma50"
                      stroke="#F59E0B"
                      dot={false}
                      yAxisId="price"
                      name="SMA 50"
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Volume Chart */}
            {data?.volume && (
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#9CA3AF' }}
                      tickLine={{ stroke: '#4B5563' }}
                      axisLine={{ stroke: '#4B5563' }}
                    />
                    <YAxis 
                      yAxisId="volume"
                      orientation="right"
                      tick={{ fill: '#9CA3AF' }}
                      tickLine={{ stroke: '#4B5563' }}
                      axisLine={{ stroke: '#4B5563' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="volume"
                      fill="#6B7280"
                      yAxisId="volume"
                      name="Volume"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* RSI Chart */}
            {data?.rsi && (
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#9CA3AF' }}
                      tickLine={{ stroke: '#4B5563' }}
                      axisLine={{ stroke: '#4B5563' }}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      orientation="right"
                      tick={{ fill: '#9CA3AF' }}
                      tickLine={{ stroke: '#4B5563' }}
                      axisLine={{ stroke: '#4B5563' }}
                    />
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <ReferenceLine y={70} stroke="#EF4444" strokeDasharray="3 3" />
                    <ReferenceLine y={30} stroke="#34D399" strokeDasharray="3 3" />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="rsi"
                      stroke="#8B5CF6"
                      dot={false}
                      name="RSI"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-between mt-4">
          {timeframes.map((tf) => (
            <button
              key={tf.value}
              className={`px-3 py-1 rounded-full text-sm ${
                timeframe === tf.value 
                  ? (isPositive ? 'bg-green-500 text-white' : 'bg-red-500 text-white')
                  : 'bg-gray-800 text-gray-300'
              }`}
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
