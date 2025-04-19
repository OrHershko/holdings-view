
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useStockHistory } from '@/hooks/useStockData';
import TimeframeSelector from './charts/TimeframeSelector';
import PriceChart from './charts/PriceChart';
import VolumeChart from './charts/VolumeChart';
import RSIChart from './charts/RSIChart';

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

  if (isLoading) {
    return (
      <Card className="ios-card">
        <CardContent className="p-4">
          <div className="h-[500px] flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

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
  
  return (
    <Card className="ios-card">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-4">
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
        
        <div className="space-y-4">
          <PriceChart data={chartData} isPositive={isPositive} CustomTooltip={CustomTooltip} />
          <VolumeChart data={chartData} CustomTooltip={CustomTooltip} />
          <RSIChart data={chartData} CustomTooltip={CustomTooltip} />
        </div>
        
        <TimeframeSelector 
          timeframe={timeframe} 
          isPositive={isPositive} 
          onTimeframeChange={setTimeframe} 
        />
      </CardContent>
    </Card>
  );
};

export default StockChart;
