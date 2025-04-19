import React, { useState, useCallback, useEffect } from 'react';
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

// Map UI timeframes to API expected values if needed
const mapTimeframeToApiFormat = (timeframe: string): string => {
  // If your API expects specific formats, map them here
  const mappings: Record<string, string> = {
    '1d': '1d',
    '1w': '1w',
    '1m': '1mo', // Ensure this maps to what API expects
    '6m': '6mo',
    '1y': '1y'
  };
  return mappings[timeframe] || timeframe;
};

const StockChart: React.FC<StockChartProps> = ({ 
  symbol, 
  stockName, 
  currentPrice, 
  change, 
  changePercent 
}) => {
  const [timeframe, setTimeframe] = useState<string>('1y');
  const [zoomedRange, setZoomedRange] = useState<{start: Date, end: Date} | null>(null);
  const apiTimeframe = mapTimeframeToApiFormat(timeframe);
  
  // Pass the mapped timeframe to the API
  const { data, isLoading, error, refetch } = useStockHistory(symbol, apiTimeframe);
  const { toast } = useToast();
  const isPositive = change >= 0;
  
  // Force refetch when either symbol or timeframe changes
  useEffect(() => {
    refetch();
    console.log(`Data fetch triggered for ${symbol} with timeframe ${apiTimeframe}`);
  }, [symbol, apiTimeframe, refetch]);
  
  // Handle timeframe changes and reset zoom
  const handleTimeframeChange = useCallback((newTimeframe: string) => {
    console.log(`Changing timeframe from ${timeframe} to ${newTimeframe}`);
    setTimeframe(newTimeframe);
    setZoomedRange(null);
  }, [timeframe]);
  
  // Handle chart zoom events
  const handleChartZoom = useCallback((start: Date, end: Date) => {
    setZoomedRange({ start, end });
    
    // Calculate approximate timeframe from zoom range
    const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    console.log(`Chart zoomed to range: ${durationDays.toFixed(1)} days`);
    
    // Optional: Fetch more granular data if needed
    // For now, we'll just track the zoom state
  }, []);

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
      const candleData = payload.find((p: any) => p.dataKey === 'close')?.payload; 
      
      return (
        <div className="bg-[#1E1E1E] p-3 rounded shadow-lg border border-gray-800 text-xs text-white">
          <p className="font-medium text-gray-300 mb-2">{label}</p>
          
          {candleData && (
            <div className="mb-2">
              <p>Open: <span className="font-semibold">${candleData.open?.toFixed(2)}</span></p>
              <p>High: <span className="font-semibold">${candleData.high?.toFixed(2)}</span></p>
              <p>Low: <span className="font-semibold">${candleData.low?.toFixed(2)}</span></p>
              <p>Close: <span className="font-semibold">${candleData.close?.toFixed(2)}</span></p>
            </div>
          )}

          {payload.map((entry: any, index: number) => {
            if (entry.dataKey === 'close' && candleData) {
              return null;
            }
            if (entry.value !== undefined && entry.value !== null) {
              return (
                <p key={index} style={{ color: entry.color }}>
                  {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                </p>
              );
            }
            return null;
          })}
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
            <PriceChart 
              data={chartData} 
              isPositive={isPositive} 
              timeframe={timeframe}
              onZoom={handleChartZoom}
              CustomTooltip={CustomTooltip} 
            />
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
          onTimeframeChange={handleTimeframeChange} 
        />
        
        {zoomedRange && (
          <div className="mt-2 text-xs text-gray-400">
            <span>Zoomed view: {zoomedRange.start.toLocaleDateString()} - {zoomedRange.end.toLocaleDateString()}</span>
            <button 
              className="ml-2 underline hover:text-white"
              onClick={() => handleTimeframeChange(timeframe)}
            >
              Reset zoom
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StockChart;
