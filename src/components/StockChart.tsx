import React, { useState, useCallback, useEffect, useMemo } from 'react'; // Added useMemo
import { Card, CardContent } from '@/components/ui/card';
import { useStockHistory } from '@/hooks/useStockData';
import TimeframeSelector from './charts/TimeframeSelector';
import LightweightStockChart from './charts/LightweightStockChart';
import { useToast } from '@/components/ui/use-toast';

interface StockChartProps {
  symbol: string;
  stockName: string;
  currentPrice: number;
  change: number;
  changePercent: number;
}

// Define a type for the API parameters
interface ApiParams {
  period: string;
  interval: string;
}

// Updated mapping function to return both period and interval
const mapTimeframeToApiParams = (timeframe: string): ApiParams => {
  switch (timeframe) {
    // Intraday examples (adjust period/interval based on desired view & limits)
    case '15m': return { period: '5d', interval: '15m' }; // 5 days of 15-min data
    case '1h': return { period: '1mo', interval: '60m' }; // 1 month of 1-hour data (adjust period if needed)
    // Daily/Weekly examples
    case '1d': return { period: '1mo', interval: '1d' }; // 1 month of daily data
    case '1w': return { period: '6mo', interval: '1wk' }; // 6 months of weekly data
    case '1m': return { period: '1y', interval: '1mo' }; // 1 year of monthly data
    case '6m': return { period: '5y', interval: '1mo' }; // 5 years of monthly data
    // Corrected '1y' case to use 'max' period, which is allowed by the backend pattern
    case '1y': return { period: 'max', interval: '1mo' }; // Use 'max' period instead of '10y'
    // Default fallback (e.g., for 'max' if you add it)
    default: return { period: '1y', interval: '1d' };
  }
};

const StockChart: React.FC<StockChartProps> = ({
  symbol,
  stockName,
  currentPrice,
  change,
  changePercent
}) => {
  const [timeframe, setTimeframe] = useState<string>('1y'); // UI timeframe state

  // Get both period and interval using the mapping function
  const { period: apiPeriod, interval: apiInterval } = useMemo(
    () => mapTimeframeToApiParams(timeframe),
    [timeframe]
  );

  // Use both period and interval in the hook
  const { data, isLoading, error, refetch } = useStockHistory(symbol, apiPeriod, apiInterval);

  const { toast } = useToast();
  const isPositive = change >= 0;

  // useEffect to refetch when symbol, period, or interval changes
  useEffect(() => {
    console.log(`Data fetch triggered for ${symbol} with period: ${apiPeriod}, interval: ${apiInterval}`);
    refetch(); // refetch is stable, but including it clarifies intent
  }, [symbol, apiPeriod, apiInterval, refetch]); // Add apiInterval to dependency array

  const handleTimeframeChange = useCallback((newTimeframe: string) => {
    console.log(`Changing UI timeframe from ${timeframe} to ${newTimeframe}`);
    setTimeframe(newTimeframe);
    // No need to manually call refetch here, the useEffect above will handle it
  }, [timeframe]); // Keep dependency only on UI timeframe

  // Ensure chartData mapping uses the correct fields from the updated service response
  const chartData = useMemo(() => {
      if (!data?.dates) return [];
      return data.dates.map((date, index) => ({
        date, // Already a string from the service
        volume: data.volume?.[index] ?? 0,
        sma20: data.sma20?.[index] ?? null, // Keep if backend calculates them
        sma50: data.sma50?.[index] ?? null, // Keep if backend calculates them
        rsi: data.rsi?.[index] ?? null,     // Keep if backend calculates them
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
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="ios-card w-full max-w-[95vw] mx-auto">
        <CardContent className="p-4">
          <div className="h-[500px] flex items-center justify-center text-red-500">
            Error loading chart data.
          </div>
          <TimeframeSelector
            timeframe={timeframe}
            isPositive={isPositive}
            onTimeframeChange={handleTimeframeChange}
          />
        </CardContent>
      </Card>
    );
  }

  if (!data || chartData.length === 0) {
    return (
      <Card className="ios-card w-full max-w-[95vw] mx-auto">
        <CardContent className="p-4">
          <div className="h-[500px] flex items-center justify-center text-gray-400">
            No data available for this timeframe/interval.
          </div>
          <TimeframeSelector
            timeframe={timeframe}
            isPositive={isPositive}
            onTimeframeChange={handleTimeframeChange}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="ios-card w-full max-w-[95vw] mx-auto">
      <CardContent className="p-4">
        {/* Header */}
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

        {/* Chart */}
        <div className="mb-4">
          <LightweightStockChart
            data={chartData}
            timeframe={timeframe} // Pass UI timeframe for potential internal logic
          />
        </div>

        {/* Timeframe Selector */}
        <TimeframeSelector
          timeframe={timeframe}
          isPositive={isPositive}
          onTimeframeChange={handleTimeframeChange}
        />
      </CardContent>
    </Card>
  );
};

export default StockChart;