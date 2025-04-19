import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useStockHistory } from '@/hooks/useStockData';
import TimeframeSelector from './charts/TimeframeSelector';
import PriceChart from './charts/PriceChart';
import VolumeChart from './charts/VolumeChart';
import RSIChart from './charts/RSIChart';
import { useToast } from '@/components/ui/use-toast';

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
  const { data, isLoading, error } = useStockHistory(symbol, timeframe);
  const { toast } = useToast();
  const isPositive = change >= 0;

  React.useEffect(() => {
    if (error) {
      toast({
        title: "Error fetching data",
        description: "Could not load the chart data. Please try again later.",
        variant: "destructive",
      });
    }
  }, [error, toast]);
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1E1E1E] p-3 rounded shadow-lg border border-gray-800 text-xs">
          <p className="font-medium text-gray-300">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className="ios-card w-full max-w-[95vw] mx-auto">
        <CardContent className="p-4">
          <div className="h-[500px] flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const chartData = data.dates.map((date, index) => ({
    date,
    price: data.prices[index],
    volume: data.volume?.[index] || 0,
    sma20: data.sma20?.[index] || null,
    sma50: data.sma50?.[index] || null,
    rsi: data.rsi?.[index] || null,
    macd: data.macd?.[index] || null,
    signal: data.signal?.[index] || null,
    histogram: data.histogram?.[index] || null,
    high: data.high?.[index] || null,
    low: data.low?.[index] || null,
    open: data.open?.[index] || null,
    close: data.close?.[index] || null,
  }));
  
  return (
    <Card className="ios-card w-full max-w-[95vw] mx-auto">
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-1 md:col-span-2">
            <PriceChart data={chartData} isPositive={isPositive} CustomTooltip={CustomTooltip} />
          </div>
          <div>
            <VolumeChart data={chartData} CustomTooltip={CustomTooltip} />
          </div>
          <div>
            <RSIChart data={chartData} CustomTooltip={CustomTooltip} />
          </div>
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
