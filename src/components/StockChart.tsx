import React, { useState, useCallback, useEffect, useMemo, ErrorInfo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Toggle } from '@/components/ui/toggle';
import { useStockHistory } from '@/hooks/useStockData';
import PeriodSelector from './charts/PeriodSelector';
import IntervalSelector from './charts/IntervalSelector';
import LightweightStockChart from './charts/LightweightStockChart';
import { useToast } from '@/components/ui/use-toast';
import { LineChartIcon, BarChart2Icon } from 'lucide-react';

interface StockChartProps {
  symbol: string;
  stockName: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
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

// Add an Error Boundary component
class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode, symbol: string, onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode, symbol: string, onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Chart error for ${this.props.symbol}:`, error, errorInfo);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[500px] flex items-center justify-center flex-col text-red-500">
          <p>Chart could not be displayed</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const StockChart: React.FC<StockChartProps> = ({
  symbol,
  stockName,
  currentPrice,
  change,
  changePercent,
  marketCap,
  volume
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1y');
  const [selectedInterval, setSelectedInterval] = useState<string>('1d');
  const [chartKey, setChartKey] = useState<number>(0); // Add key to force remount

  const { toast } = useToast();
  const isPositive = change >= 0;

  // Indicator visibility controls
  const [indicatorVisibility, setIndicatorVisibility] = useState<Record<string, boolean>>({
    sma20: true,  // Show all SMA lines by default
    sma50: true,
    sma100: true,
    sma150: true,
    sma200: true,
    rsi: false    // RSI off by default as it uses a different scale
  });

  const validIntervals = useMemo(() => {
    return getValidIntervalsForPeriod(selectedPeriod);
  }, [selectedPeriod]);

  useEffect(() => {
    // If the currently selected interval is not valid for this period, switch to a default
    if (!validIntervals.includes(selectedInterval)) {
      setSelectedInterval(getDefaultInterval(validIntervals, selectedInterval));
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

  const handleChartError = useCallback(() => {
    toast({
      title: "Chart Error",
      description: "There was a problem rendering the stock chart. Please try a different time period.",
      variant: "destructive",
    });
    // Force a remount of the chart component
    setChartKey(prev => prev + 1);
  }, [toast]);

  const chartData = useMemo(() => {
    // Validate that data exists and has the required dates array
    if (!data || !data.dates || !Array.isArray(data.dates) || data.dates.length === 0) {
      console.warn('Invalid or empty chart data received', data);
      return [];
    }

    // Ensure all arrays are actually arrays before mapping
    const ensureArray = (arr: any): any[] => {
      if (!arr || !Array.isArray(arr)) {
        console.warn('Non-array data found in chart data:', arr);
        return new Array(data.dates.length).fill(null);
      }
      return arr;
    };

    // Create safe arrays with same length as dates
    const safeVolume = ensureArray(data.volume);
    const safeSma20 = ensureArray(data.sma20);
    const safeSma50 = ensureArray(data.sma50);
    const safeSma100 = ensureArray(data.sma100);
    const safeSma150 = ensureArray(data.sma150);
    const safeSma200 = ensureArray(data.sma200);
    const safeRsi = ensureArray(data.rsi);
    const safeHigh = ensureArray(data.high);
    const safeLow = ensureArray(data.low);
    const safeOpen = ensureArray(data.open);
    const safeClose = ensureArray(data.close);

    // Create an empty result array
    const result: any[] = [];

    // Map data safely with index checks - handle array length differences
    const maxLength = data.dates.length;
    for (let index = 0; index < maxLength; index++) {
      try {
        // Ensure we don't go out of bounds on any array
        const safeIndex = (arr: any[], idx: number) => {
          return (arr && Array.isArray(arr) && idx >= 0 && idx < arr.length) ? arr[idx] : null;
        };

        // Use null for NaN values
        const sanitizeValue = (value: any): number | null => {
          if (value === undefined || value === null) return null;
          const num = typeof value === 'number' ? value : Number(value);
          return isNaN(num) ? null : num;
        };

        result.push({
          date: safeIndex(data.dates, index) || new Date().toISOString(), // Fallback to current date if null
          volume: sanitizeValue(safeIndex(safeVolume, index)) ?? 0,
          sma20: sanitizeValue(safeIndex(safeSma20, index)),
          sma50: sanitizeValue(safeIndex(safeSma50, index)),
          sma100: sanitizeValue(safeIndex(safeSma100, index)),
          sma150: sanitizeValue(safeIndex(safeSma150, index)),
          sma200: sanitizeValue(safeIndex(safeSma200, index)),
          rsi: sanitizeValue(safeIndex(safeRsi, index)),
          high: sanitizeValue(safeIndex(safeHigh, index)),
          low: sanitizeValue(safeIndex(safeLow, index)),
          open: sanitizeValue(safeIndex(safeOpen, index)),
          close: sanitizeValue(safeIndex(safeClose, index)),
        });
      } catch (err) {
        console.error("Error creating chart data point at index", index, err);
      }
    }

    return result;
  }, [data]);

  // Debug log outside of JSX
  useEffect(() => {
    if (chartData.length > 0) {
      console.log("StockChart: Prepared chartData:", chartData);
    }
  }, [chartData]);

  const toggleIndicator = (indicator: string) => {
    setIndicatorVisibility(prev => ({
      ...prev,
      [indicator]: !prev[indicator]
    }));
  };

  // Function to select all or none of the indicators
  const toggleAllIndicators = (showAll: boolean) => {
    setIndicatorVisibility({
      sma20: showAll,
      sma50: showAll,
      sma100: showAll,
      sma150: showAll,
      sma200: showAll,
      rsi: showAll
    });
  };

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
          <div className="flex justify-between items-center mb-4">
            <div className="text-lg font-medium">{stockName} ({symbol})</div>
            <div className="flex gap-3 items-center">
              <div className="text-sm text-gray-400">
                <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
                  {isPositive ? '+' : ''}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
                </span>
              </div>
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
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <Toggle 
              size="sm"
              variant="outline" 
              aria-label="Toggle SMA20" 
              pressed={indicatorVisibility.sma20}
              onPressedChange={() => toggleIndicator('sma20')}
            >
              <LineChartIcon className="h-4 w-4 mr-1" />
              SMA20
            </Toggle>
            <Toggle 
              size="sm"
              variant="outline" 
              aria-label="Toggle SMA50" 
              pressed={indicatorVisibility.sma50}
              onPressedChange={() => toggleIndicator('sma50')}
            >
              <LineChartIcon className="h-4 w-4 mr-1" />
              SMA50
            </Toggle>
            <Toggle 
              size="sm"
              variant="outline" 
              aria-label="Toggle SMA100" 
              pressed={indicatorVisibility.sma100}
              onPressedChange={() => toggleIndicator('sma100')}
            >
              <LineChartIcon className="h-4 w-4 mr-1" />
              SMA100
            </Toggle>
            <Toggle 
              size="sm"
              variant="outline" 
              aria-label="Toggle SMA150" 
              pressed={indicatorVisibility.sma150}
              onPressedChange={() => toggleIndicator('sma150')}
            >
              <LineChartIcon className="h-4 w-4 mr-1" />
              SMA150
            </Toggle>
            <Toggle 
              size="sm"
              variant="outline" 
              aria-label="Toggle SMA200" 
              pressed={indicatorVisibility.sma200}
              onPressedChange={() => toggleIndicator('sma200')}
            >
              <LineChartIcon className="h-4 w-4 mr-1" />
              SMA200
            </Toggle>
            <Toggle 
              size="sm"
              variant="outline" 
              aria-label="Toggle RSI" 
              pressed={indicatorVisibility.rsi}
              onPressedChange={() => toggleIndicator('rsi')}
            >
              <BarChart2Icon className="h-4 w-4 mr-1" />
              RSI
            </Toggle>
          </div>
          <div className="h-[500px] flex items-center justify-center text-gray-400">
            No data available for this period/interval.
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
            <p className="text-xs text-gray-500">Market Cap: ${marketCap.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Daily Volume: {volume.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-white">${currentPrice.toFixed(2)}</div>
            <div className={isPositive ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>
              {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
            </div>
          </div>
        </div>
        <div className="mb-2">
          {/* Indicator toggle menu - more prominent */}
          <div className="flex flex-wrap gap-2 mb-3 p-2 bg-gray-800 rounded-md border border-gray-700 shadow-sm">
            <div className="flex justify-between w-full mb-2">
              <div className="text-sm font-medium text-gray-300 flex items-center">Indicators:</div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => toggleAllIndicators(true)}
                  className="text-xs py-0 h-6 text-blue-300 hover:text-blue-200 border-blue-800 hover:bg-blue-900/30"
                >
                  Select All
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => toggleAllIndicators(false)}
                  className="text-xs py-0 h-6 text-gray-400 hover:text-gray-300 border-gray-700 hover:bg-gray-700/50"
                >
                  Select None
                </Button>
              </div>
            </div>
            <Toggle 
              size="sm"
              variant="outline" 
              aria-label="Toggle SMA20" 
              pressed={indicatorVisibility.sma20}
              onPressedChange={() => toggleIndicator('sma20')}
              className={indicatorVisibility.sma20 
                ? 'bg-green-700/50 border-green-500 text-green-200 font-semibold shadow-md' 
                : 'hover:bg-gray-700'}
            >
              <LineChartIcon className="h-4 w-4 mr-1" />
              SMA20
            </Toggle>
            <Toggle 
              size="sm"
              variant="outline" 
              aria-label="Toggle SMA50" 
              pressed={indicatorVisibility.sma50}
              onPressedChange={() => toggleIndicator('sma50')}
              className={indicatorVisibility.sma50 
                ? 'bg-blue-700/50 border-blue-500 text-blue-200 font-semibold shadow-md' 
                : 'hover:bg-gray-700'}
            >
              <LineChartIcon className="h-4 w-4 mr-1" />
              SMA50
            </Toggle>
            <Toggle 
              size="sm"
              variant="outline" 
              aria-label="Toggle SMA100" 
              pressed={indicatorVisibility.sma100}
              onPressedChange={() => toggleIndicator('sma100')}
              className={indicatorVisibility.sma100 
                ? 'bg-purple-700/50 border-purple-500 text-purple-200 font-semibold shadow-md' 
                : 'hover:bg-gray-700'}
            >
              <LineChartIcon className="h-4 w-4 mr-1" />
              SMA100
            </Toggle>
            <Toggle 
              size="sm"
              variant="outline" 
              aria-label="Toggle SMA150" 
              pressed={indicatorVisibility.sma150}
              onPressedChange={() => toggleIndicator('sma150')}
              className={indicatorVisibility.sma150 
                ? 'bg-amber-700/50 border-amber-500 text-amber-200 font-semibold shadow-md' 
                : 'hover:bg-gray-700'}
            >
              <LineChartIcon className="h-4 w-4 mr-1" />
              SMA150
            </Toggle>
            <Toggle 
              size="sm"
              variant="outline" 
              aria-label="Toggle SMA200" 
              pressed={indicatorVisibility.sma200}
              onPressedChange={() => toggleIndicator('sma200')}
              className={indicatorVisibility.sma200 
                ? 'bg-red-700/50 border-red-500 text-red-200 font-semibold shadow-md' 
                : 'hover:bg-gray-700'}
            >
              <LineChartIcon className="h-4 w-4 mr-1" />
              SMA200
            </Toggle>
            <Toggle 
              size="sm"
              variant="outline" 
              aria-label="Toggle RSI" 
              pressed={indicatorVisibility.rsi}
              onPressedChange={() => toggleIndicator('rsi')}
              className={indicatorVisibility.rsi 
                ? 'bg-pink-700/50 border-pink-500 text-pink-200 font-semibold shadow-md' 
                : 'hover:bg-gray-700'}
            >
              <BarChart2Icon className="h-4 w-4 mr-1" />
              RSI
            </Toggle>
          </div>
          
          <ChartErrorBoundary symbol={symbol} onError={handleChartError}>
            <div className="px-5 py-6">
              <LightweightStockChart
                key={chartKey} 
                data={chartData} 
                indicators={indicatorVisibility}
              />
            </div>
          </ChartErrorBoundary>
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