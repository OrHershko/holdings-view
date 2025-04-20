import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useStockHistory } from '@/hooks/useStockData';
import PeriodSelector from './charts/PeriodSelector';
import IntervalSelector from './charts/IntervalSelector';
import LightweightStockChart from './charts/LightweightStockChart';
import { useToast } from '@/components/ui/use-toast';

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
  { value: '5y', label: '5Y' },
  { value: 'max', label: 'Max' },
];

// Define allowed intervals for UI selection
const AVAILABLE_INTERVALS = [
  { value: '1m', label: '1m' },
  { value: '2m', label: '2m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '60m', label: '1h' },
  { value: '1d', label: '1d' },
  { value: '1wk', label: '1wk' },
  { value: '1mo', label: '1mo' },
];

// Function to get valid intervals based on selected period (simplified based on Yahoo limits)
const getValidIntervalsForPeriod = (period: string): string[] => {
  switch (period) {
    case '1d':
    case '5d':
      return ['1m', '2m', '5m', '15m', '30m', '60m'];
    case '1mo':
      return ['2m', '5m', '15m', '30m', '60m', '90m', '1d'];
    case '6mo':
    case '1y':
    case '5y':
    case 'max':
      return ['60m', '1d', '1wk', '1mo', '3mo'];
    default:
      return ['1d', '1wk', '1mo'];
  }
};

// Function to get a default valid interval if the current one becomes invalid
const getDefaultInterval = (validIntervals: string[], preferredInterval: string = '1d'): string => {
  if (validIntervals.includes(preferredInterval)) {
    return preferredInterval;
  }
  if (validIntervals.includes('1d')) return '1d';
  if (validIntervals.includes('60m')) return '60m';
  return validIntervals[0] || '1d';
};

const StockChart: React.FC<StockChartProps> = ({
  symbol,
  stockName,
  currentPrice,
  change,
  changePercent
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1y');
  const [selectedInterval, setSelectedInterval] = useState<string>('1d');

  const { toast } = useToast();
  const isPositive = change >= 0;

  const validIntervals = useMemo(() => getValidIntervalsForPeriod(selectedPeriod), [selectedPeriod]);

  useEffect(() => {
    if (!validIntervals.includes(selectedInterval)) {
      const defaultInterval = getDefaultInterval(validIntervals, selectedInterval);
      console.log(`Interval ${selectedInterval} invalid for period ${selectedPeriod}. Switching to default: ${defaultInterval}`);
      setSelectedInterval(defaultInterval);
    }
  }, [selectedPeriod, selectedInterval, validIntervals]);

  const { data, isLoading, error, refetch } = useStockHistory(symbol, selectedPeriod, selectedInterval);

  useEffect(() => {
    if (validIntervals.includes(selectedInterval)) {
      console.log(`Data fetch triggered for ${symbol} with period: ${selectedPeriod}, interval: ${selectedInterval}`);
      refetch();
    }
  }, [symbol, selectedPeriod, selectedInterval, validIntervals, refetch]);

  const handlePeriodChange = useCallback((newPeriod: string) => {
    console.log(`Changing period to ${newPeriod}`);
    setSelectedPeriod(newPeriod);
  }, []);

  const handleIntervalChange = useCallback((newInterval: string) => {
    console.log(`Changing interval to ${newInterval}`);
    setSelectedInterval(newInterval);
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
      <Card className="ios-card w-full max-w-[95vw] mx-auto">
        <CardContent className="p-4">
          <div className="h-[500px] flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading chart data...</div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between mt-4 gap-4">
            <PeriodSelector
              periods={AVAILABLE_PERIODS}
              selectedPeriod={selectedPeriod}
              isPositive={isPositive}
              onPeriodChange={handlePeriodChange}
            />
            <IntervalSelector
              intervals={AVAILABLE_INTERVALS}
              selectedInterval={selectedInterval}
              validIntervals={validIntervals}
              isPositive={isPositive}
              onIntervalChange={handleIntervalChange}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="ios-card w-full max-w-[95vw] mx-auto">
        <CardContent className="p-4">
          <div className="h-[500px] flex items-center justify-center text-red-500">
            Error loading chart data. Check console for details.
          </div>
          <div className="flex flex-col sm:flex-row justify-between mt-4 gap-4">
            <PeriodSelector
              periods={AVAILABLE_PERIODS}
              selectedPeriod={selectedPeriod}
              isPositive={isPositive}
              onPeriodChange={handlePeriodChange}
            />
            <IntervalSelector
              intervals={AVAILABLE_INTERVALS}
              selectedInterval={selectedInterval}
              validIntervals={validIntervals}
              isPositive={isPositive}
              onIntervalChange={handleIntervalChange}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || chartData.length === 0) {
    return (
      <Card className="ios-card w-full max-w-[95vw] mx-auto">
        <CardContent className="p-4">
          <div className="h-[500px] flex items-center justify-center text-gray-400">
            No data available for this period/interval.
          </div>
          <div className="flex flex-col sm:flex-row justify-between mt-4 gap-4">
            <PeriodSelector
              periods={AVAILABLE_PERIODS}
              selectedPeriod={selectedPeriod}
              isPositive={isPositive}
              onPeriodChange={handlePeriodChange}
            />
            <IntervalSelector
              intervals={AVAILABLE_INTERVALS}
              selectedInterval={selectedInterval}
              validIntervals={validIntervals}
              isPositive={isPositive}
              onIntervalChange={handleIntervalChange}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

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
        <div className="mb-4">
          <LightweightStockChart
            data={chartData}
          />
        </div>
        <div className="flex flex-col sm:flex-row justify-between mt-4 gap-4">
          <PeriodSelector
            periods={AVAILABLE_PERIODS}
            selectedPeriod={selectedPeriod}
            isPositive={isPositive}
            onPeriodChange={handlePeriodChange}
          />
          <IntervalSelector
            intervals={AVAILABLE_INTERVALS}
            selectedInterval={selectedInterval}
            validIntervals={validIntervals}
            isPositive={isPositive}
            onIntervalChange={handleIntervalChange}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default StockChart;