import React, { useEffect, useRef } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  CandlestickData,
  HistogramData,
  LineData,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
} from 'lightweight-charts';

interface Props {
  data: any[];
  indicators?: Record<string, boolean>; // Optional indicator visibility controls
}

/* ---------- helper ---------- */
const toSeriesData = (raw: any[], showIndicators?: Record<string, boolean>) => {
  // Ensure raw is actually an array
  if (!Array.isArray(raw)) {
    console.error('Chart data is not an array:', raw);
    return { candles: [], volume: [], rsi: [], sma150: [] };
  }

  // Create empty arrays for chart data
  const candles: CandlestickData[] = [];
  const volume: HistogramData[] = [];
  const rsi: LineData[] = [];
  const sma150: LineData[] = []; // Add SMA 150 array

  try {
    // Process each data point defensively
    for (let i = 0; i < raw.length; i++) {
      const p = raw[i];
      if (!p || typeof p !== 'object') {
        console.warn('Invalid data point:', p);
        continue; // Skip this point
      }

      // Ensure we have a valid date
      let time: UTCTimestamp;
      try {
        if (!p.date) {
          console.warn('Missing date in data point:', p);
          continue; // Skip point without date
        }
        
        const timestamp = new Date(p.date).getTime() / 1000;
        
        if (isNaN(timestamp)) {
          console.warn('Invalid date:', p.date);
          continue; // Skip this point
        }
        
        time = timestamp as UTCTimestamp;
      } catch (e) {
        console.warn('Error parsing date:', p.date, e);
        continue; // Skip this point
      }

      // Only add candle if all required values are present and are numbers
      try {
        if (
          p.open != null && !isNaN(Number(p.open)) &&
          p.high != null && !isNaN(Number(p.high)) &&
          p.low != null && !isNaN(Number(p.low)) &&
          p.close != null && !isNaN(Number(p.close))
        ) {
          candles.push({
            time,
            open: Number(p.open),
            high: Number(p.high),
            low: Number(p.low),
            close: Number(p.close)
          });
        }
      } catch (candleError) {
        console.warn('Error adding candle point:', candleError);
      }

      // Only add volume if it's a valid number
      try {
        if (p.volume != null && !isNaN(Number(p.volume))) {
          const closeValue = p.close != null ? Number(p.close) : 0;
          const openValue = p.open != null ? Number(p.open) : 0;
          
          volume.push({
            time,
            value: Number(p.volume),
            color: (closeValue >= openValue) ? 'rgba(52, 211, 153, 0.5)' : 'rgba(239, 68, 68, 0.5)',
          });
        }
      } catch (volumeError) {
        console.warn('Error adding volume point:', volumeError);
      }

      // Only add RSI if it's a valid number
      try {
        if (p.rsi != null && !isNaN(Number(p.rsi))) {
          rsi.push({ time, value: Number(p.rsi) });
        }
      } catch (rsiError) {
        console.warn('Error adding RSI point:', rsiError);
      }
      
      // Only add SMA 150 if it's a valid number
      try {
        if (p.sma150 != null && !isNaN(Number(p.sma150))) {
          sma150.push({ time, value: Number(p.sma150) });
        }
      } catch (smaError) {
        console.warn('Error adding SMA point:', smaError);
      }
    }
  } catch (error) {
    console.error('Error processing chart data:', error);
  }

  // Final sanity check - ensure all return values are definitely arrays
  return { 
    candles: Array.isArray(candles) ? candles : [],  
    volume: Array.isArray(volume) ? volume : [], 
    rsi: Array.isArray(rsi) ? rsi : [], 
    sma20: Array.isArray(raw) && showIndicators?.sma20 ? extractSmaData(raw, 'sma20') : [],
    sma50: Array.isArray(raw) && showIndicators?.sma50 ? extractSmaData(raw, 'sma50') : [],
    sma100: Array.isArray(raw) && showIndicators?.sma100 ? extractSmaData(raw, 'sma100') : [],
    sma150: Array.isArray(raw) && showIndicators?.sma150 ? extractSmaData(raw, 'sma150') : [],
    sma200: Array.isArray(raw) && showIndicators?.sma200 ? extractSmaData(raw, 'sma200') : []
  };
};

// Helper function to extract SMA data
const extractSmaData = (data: any[], smaType: string): LineData[] => {
  if (!Array.isArray(data)) return [];
  
  const result: LineData[] = [];
  
  data.forEach(p => {
    if (p && p.date && p[smaType] != null && !isNaN(Number(p[smaType]))) {
      const time = typeof p.date === 'number' ? p.date as UTCTimestamp : new Date(p.date).getTime() / 1000 as UTCTimestamp;
      result.push({ time, value: Number(p[smaType]) });
    }
  });
  
  return result;
};

/* ---------- component ---------- */
const LightweightStockChart: React.FC<Props> = ({ data, indicators }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'>>();
  const volumeRef = useRef<ISeriesApi<'Histogram'>>();
  const rsiRef = useRef<ISeriesApi<'Line'>>();
  
  // SMA refs
  const sma20Ref = useRef<ISeriesApi<'Line'>>();
  const sma50Ref = useRef<ISeriesApi<'Line'>>();
  const sma100Ref = useRef<ISeriesApi<'Line'>>();
  const sma150Ref = useRef<ISeriesApi<'Line'>>();
  const sma200Ref = useRef<ISeriesApi<'Line'>>();

  /* build / update */
  useEffect(() => {
    if (!divRef.current) return;
    
    // Log indicator visibility changes
    console.log("Indicator visibility changed:", indicators);
    
    try {
      // Log received data prop
      console.log("LightweightStockChart: Received data prop type:", Array.isArray(data) ? 'array' : typeof data);

      // Validate data - ensure it's an array
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn('No valid chart data provided:', data);
        // Clear chart if data becomes invalid/empty
        if (candleRef.current) try { candleRef.current.setData([]); } catch (e) { console.error(e); }
        if (volumeRef.current) try { volumeRef.current.setData([]); } catch (e) { console.error(e); }
        if (rsiRef.current) try { rsiRef.current.setData([]); } catch (e) { console.error(e); }
        if (sma20Ref.current) try { sma20Ref.current.setData([]); } catch (e) { console.error(e); }
        if (sma50Ref.current) try { sma50Ref.current.setData([]); } catch (e) { console.error(e); }
        if (sma100Ref.current) try { sma100Ref.current.setData([]); } catch (e) { console.error(e); }
        if (sma150Ref.current) try { sma150Ref.current.setData([]); } catch (e) { console.error(e); }
        if (sma200Ref.current) try { sma200Ref.current.setData([]); } catch (e) { console.error(e); }
        return;
      }

      // Chart already exists, no need to recreate it
      
      // Create new chart
      if (!chartRef.current) {
        try {
          chartRef.current = createChart(divRef.current, {
            width: divRef.current.clientWidth,
            height: 500,
            layout: { background: { color: '#1E1E1E' }, textColor: '#D1D5DB' },
            grid: { vertLines: { color: '#374151' }, horzLines: { color: '#374151' } },
            rightPriceScale: { borderColor: '#4B5563' },
            timeScale: { borderColor: '#4B5563', timeVisible: true, secondsVisible: false },
            crosshair: { mode: 1 },
          });

          /* series */
          candleRef.current = chartRef.current.addSeries(CandlestickSeries, {
            upColor: '#34D399',
            downColor: '#EF4444',
            borderVisible: false,
            wickUpColor: '#34D399',
            wickDownColor: '#EF4444',
          });

          volumeRef.current = chartRef.current.addSeries(HistogramSeries, {
            priceFormat: { type: 'volume' },
            priceScaleId: 'vol',
            lastValueVisible: false,
            priceLineVisible: false,
          });
          chartRef.current.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

          rsiRef.current = chartRef.current.addSeries(LineSeries, {
            color: '#EC4899', // Bright pink for RSI (matches the toggle button)
            lineWidth: 1,     // Slightly thicker line for better visibility
            priceScaleId: 'rsi',
          });
          chartRef.current.priceScale('rsi').applyOptions({ scaleMargins: { top: 0.7, bottom: 0.1 } });
          rsiRef.current.createPriceLine({ price: 70, color: '#EF4444', lineStyle: LineStyle.Dashed, lineWidth: 1 });
          rsiRef.current.createPriceLine({ price: 30, color: '#34D399', lineStyle: LineStyle.Dashed, lineWidth: 1 });
          
          // Always create all SMA series but set visibility based on indicators
          // SMA 20
          sma20Ref.current = chartRef.current.addSeries(LineSeries, {
            color: '#10B981', // Green for SMA 20
            lineWidth: 1,
            title: 'SMA 20',
            visible: !!indicators?.sma20
          });
          
          // SMA 50
          sma50Ref.current = chartRef.current.addSeries(LineSeries, {
            color: '#3B82F6', // Blue for SMA 50
            lineWidth: 1,
            title: 'SMA 50',
            visible: !!indicators?.sma50
          });
          
          // SMA 100
          sma100Ref.current = chartRef.current.addSeries(LineSeries, {
            color: '#8B5CF6', // Purple for SMA 100
            lineWidth: 1,
            title: 'SMA 100',
            visible: !!indicators?.sma100
          });
          
          // SMA 150
          sma150Ref.current = chartRef.current.addSeries(LineSeries, {
            color: '#F59E0B', // Amber color for SMA 150
            lineWidth: 1,
            title: 'SMA 150',
            visible: !!indicators?.sma150
          });
          
          // SMA 200
          sma200Ref.current = chartRef.current.addSeries(LineSeries, {
            color: '#EF4444', // Red for SMA 200
            lineWidth: 1,
            title: 'SMA 200',
            visible: !!indicators?.sma200
          });
        } catch (chartSetupError) {
          console.error("Error creating chart:", chartSetupError);
          return;
        }
      }

      try {
        // Create a defensive copy of data to ensure we're working with an array
        const safeData = Array.isArray(data) ? [...data] : [];
        
        console.log("Processing data:", safeData.length, "points");
        
        // Process the data very defensively using our helper
        const { candles, volume, rsi, sma20, sma50, sma100, sma150, sma200 } = toSeriesData(safeData, indicators);
        
        // Create empty arrays if any of the results are undefined or not arrays
        const safeCandles = Array.isArray(candles) ? candles : [];
        const safeVolume = Array.isArray(volume) ? volume : [];
        const safeRsi = Array.isArray(rsi) ? rsi : [];
        const safeSma20 = Array.isArray(sma20) ? sma20 : [];
        const safeSma50 = Array.isArray(sma50) ? sma50 : [];
        const safeSma100 = Array.isArray(sma100) ? sma100 : [];
        const safeSma150 = Array.isArray(sma150) ? sma150 : [];
        const safeSma200 = Array.isArray(sma200) ? sma200 : [];
        
        // Log data before setting it on the chart series
        console.log("Prepared candle data:", safeCandles.length, "points");
        console.log("Prepared volume data:", safeVolume.length, "points");
        
        // Now set the data on each series with try/catch for each operation
        if (candleRef.current) {
          try {
            candleRef.current.setData(safeCandles);
          } catch (e) {
            console.error("Error setting candle data:", e);
          }
        }
        
        if (volumeRef.current) {
          try {
            volumeRef.current.setData(safeVolume);
          } catch (e) {
            console.error("Error setting volume data:", e);
          }
        }
        
        // Always set RSI data regardless of visibility
        if (rsiRef.current) {
          try {
            rsiRef.current.setData(safeRsi);
          } catch (e) {
            console.error("Error setting RSI data:", e);
          }
        }
        
        // Always set SMA data regardless of visibility
        if (sma20Ref.current) {
          try {
            sma20Ref.current.setData(safeSma20);
          } catch (e) {
            console.error("Error setting SMA20 data:", e);
          }
        }
        
        if (sma50Ref.current) {
          try {
            sma50Ref.current.setData(safeSma50);
          } catch (e) {
            console.error("Error setting SMA50 data:", e);
          }
        }
        
        if (sma100Ref.current) {
          try {
            sma100Ref.current.setData(safeSma100);
          } catch (e) {
            console.error("Error setting SMA100 data:", e);
          }
        }
        
        if (sma150Ref.current) {
          try {
            sma150Ref.current.setData(safeSma150);
          } catch (e) {
            console.error("Error setting SMA150 data:", e);
          }
        }
        
        if (sma200Ref.current) {
          try {
            sma200Ref.current.setData(safeSma200);
          } catch (e) {
            console.error("Error setting SMA200 data:", e);
          }
        }
        
        if (chartRef.current) {
          try {
            chartRef.current.timeScale().fitContent();
          } catch (e) {
            console.error("Error fitting content to time scale:", e);
          }
        }
      } catch (error) {
        console.error('Error setting chart data:', error);
      }
    } catch (outerError) {
      console.error("Unexpected error in chart effect:", outerError);
    }
    
    /* resize */
    const onResize = () => {
      try {
        if (chartRef.current && divRef.current) {
          chartRef.current.applyOptions({ width: divRef.current.clientWidth });
        }
      } catch (e) {
        console.error("Error during resize:", e);
      }
    };

    window.addEventListener('resize', onResize);

    return () => {
      try {
        window.removeEventListener('resize', onResize);
      } catch (e) {
        console.error("Error removing resize listener:", e);
      }
    };
  }, [data]);
  
  /* Handle indicator visibility changes */
  useEffect(() => {
    if (!chartRef.current) return;
    
    try {
      // Handle RSI series visibility
      if (rsiRef.current) {
        rsiRef.current.applyOptions({
          visible: !!indicators?.rsi
        });
      }
      
      // Handle SMA series visibility
      if (sma20Ref.current) {
        sma20Ref.current.applyOptions({
          visible: !!indicators?.sma20
        });
      }
      
      if (sma50Ref.current) {
        sma50Ref.current.applyOptions({
          visible: !!indicators?.sma50
        });
      }
      
      if (sma100Ref.current) {
        sma100Ref.current.applyOptions({
          visible: !!indicators?.sma100
        });
      }
      
      if (sma150Ref.current) {
        sma150Ref.current.applyOptions({
          visible: !!indicators?.sma150
        });
      }
      
      if (sma200Ref.current) {
        sma200Ref.current.applyOptions({
          visible: !!indicators?.sma200
        });
      }
    } catch (e) {
      console.error("Error updating indicator visibility:", e);
    }
  }, [indicators]); // Only run when indicators change

  /* cleanup once */
  useEffect(() => {
    return () => {
      try {
        if (chartRef.current) {
          // Properly clean up all series first
          if (candleRef.current) candleRef.current = undefined;
          if (volumeRef.current) volumeRef.current = undefined;
          if (rsiRef.current) rsiRef.current = undefined;
          if (sma20Ref.current) sma20Ref.current = undefined;
          if (sma50Ref.current) sma50Ref.current = undefined;
          if (sma100Ref.current) sma100Ref.current = undefined;
          if (sma150Ref.current) sma150Ref.current = undefined;
          if (sma200Ref.current) sma200Ref.current = undefined;

          // Then remove the chart
          chartRef.current.remove();
          chartRef.current = null;
        }
      } catch (e) {
        console.error("Error during chart cleanup:", e);
      }
    };
  }, []);

  return <div ref={divRef} style={{ width: '100%' }} />;
};

export default LightweightStockChart;
