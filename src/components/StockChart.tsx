
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useStockHistory } from '@/hooks/useStockData';
import PeriodSelector from './charts/PeriodSelector';
import LightweightStockChart from './charts/LightweightStockChart';
import { useToast } from '@/hooks/use-toast';

interface StockChartProps {
  symbol: string;
  stockName: string;
  currentPrice: number;
  change: number;
  changePercent: number;
}

// Define allowed periods for UI selection
const AVAILABLE_PERIODS = [
  { value: '1d', label: '1D' },
  { value: '5d', label: '5D' },
  { value: '1mo', label: '1M' },
  { value: '6mo', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'max', label: 'All' },
];

// Default interval based on period
const getDefaultIntervalForPeriod = (period: string): string => {
  switch (period) {
    case '1d': return '5m';
    case '5d': return '15m';
    case '1mo': return '1h';
    case '6mo': case '1y': return '1d';
    case 'max': return '1wk';
    default: return '1d';
  }
};

const StockChart: React.FC<StockChartProps> = ({
  symbol,
  stockName,
  currentPrice,
  change,
  changePercent
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1mo');
  const [selectedInterval, setSelectedInterval] = useState<string>(getDefaultIntervalForPeriod('1mo'));
  
  const { toast } = useToast();
  const isPositive = change >= 0;
  
  // Update interval when period changes
  useEffect(() => {
    setSelectedInterval(getDefaultIntervalForPeriod(selectedPeriod));
  }, [selectedPeriod]);

  const { data, isLoading, error, refetch } = useStockHistory(symbol, selectedPeriod, selectedInterval);

  useEffect(() => {
    refetch();
  }, [symbol, selectedPeriod, selectedInterval, refetch]);

  const handlePeriodChange = useCallback((newPeriod: string) => {
    setSelectedPeriod(newPeriod);
  }, []);

  const chartData = useMemo(() => {
    if (!data?.dates) return [];
    return data.dates.map((date, index) => ({
      date,
      volume: data.volume?.[index] ?? 0,
      sma20: data.sma20?.[index] ?? null,
      sma50: data.sma50?.[index] ?? null,
      rsi: data.rsi?.[index] ?? null,
      high: data.high?.[index] ?? null,
      low: data.low?.[index] ?? null,
      open: data.open?.[index] ?? null,
      close: data.close?.[index] ?? null,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card className="bg-[#1A1A1A]/80 backdrop-blur-md border border-gray-800">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="text-sm text-gray-400">Today's Market</h2>
              <p className="text-sm text-white">Loading chart data...</p>
            </div>
            <PeriodSelector
              periods={AVAILABLE_PERIODS}
              selectedPeriod={selectedPeriod}
              isPositive={isPositive}
              onPeriodChange={handlePeriodChange}
            />
          </div>
          <div className="h-[300px] flex items-center justify-center animate-pulse">
            <div className="bg-gray-800 h-full w-full rounded-md"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-[#1A1A1A]/80 backdrop-blur-md border border-gray-800">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="text-sm text-gray-400">Today's Market</h2>
              <p className="text-sm text-red-400">Error loading chart data</p>
            </div>
            <PeriodSelector
              periods={AVAILABLE_PERIODS}
              selectedPeriod={selectedPeriod}
              isPositive={isPositive}
              onPeriodChange={handlePeriodChange}
            />
          </div>
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-gray-400">Error: Check console for details</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1A1A1A]/80 backdrop-blur-md border border-gray-800">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-sm text-gray-400">Today's Market</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-medium text-white">{symbol}</span>
              <span className={isPositive ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>
                {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
          <PeriodSelector
            periods={AVAILABLE_PERIODS}
            selectedPeriod={selectedPeriod}
            isPositive={isPositive}
            onPeriodChange={handlePeriodChange}
          />
        </div>
        
        <div className="h-[300px] w-full">
          {chartData.length > 0 ? (
            <LightweightStockChart
              data={chartData}
              height={300}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No data available for this period
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StockChart;
