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
}

/* ---------- helper ---------- */
const toSeriesData = (raw: any[]) => {
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
    sma150: Array.isArray(sma150) ? sma150 : [] 
  };
};

/* ---------- component ---------- */
const LightweightStockChart: React.FC<Props> = ({ data }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'>>();
  const volumeRef = useRef<ISeriesApi<'Histogram'>>();
  const rsiRef = useRef<ISeriesApi<'Line'>>();
  const sma150Ref = useRef<ISeriesApi<'Line'>>(); // Add SMA 150 ref

  /* build / update */
  useEffect(() => {
    if (!divRef.current) return;
    
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
        if (sma150Ref.current) try { sma150Ref.current.setData([]); } catch (e) { console.error(e); }
        return;
      }

      /* create once */
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
            color: '#8B5CF6',
            lineWidth: 1,
            priceScaleId: 'rsi',
          });
          chartRef.current.priceScale('rsi').applyOptions({ scaleMargins: { top: 0.7, bottom: 0.1 } });
          rsiRef.current.createPriceLine({ price: 70, color: '#EF4444', lineStyle: LineStyle.Dashed, lineWidth: 1 });
          rsiRef.current.createPriceLine({ price: 30, color: '#34D399', lineStyle: LineStyle.Dashed, lineWidth: 1 });
          
          // Add SMA 150 series
          sma150Ref.current = chartRef.current.addSeries(LineSeries, {
            color: '#F59E0B', // Amber color for SMA 150
            lineWidth: 2,
            title: 'SMA 150', // Add title for the series
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
        const { candles, volume, rsi, sma150 } = toSeriesData(safeData);
        
        // Create empty arrays if any of the results are undefined or not arrays
        const safeCandles = Array.isArray(candles) ? candles : [];
        const safeVolume = Array.isArray(volume) ? volume : [];
        const safeRsi = Array.isArray(rsi) ? rsi : [];
        const safeSma150 = Array.isArray(sma150) ? sma150 : [];
        
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
        
        if (rsiRef.current) {
          try {
            rsiRef.current.setData(safeRsi);
          } catch (e) {
            console.error("Error setting RSI data:", e);
          }
        }
        
        if (sma150Ref.current) {
          try {
            sma150Ref.current.setData(safeSma150);
          } catch (e) {
            console.error("Error setting SMA150 data:", e);
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
      if (chartRef.current && divRef.current) {
        try {
          chartRef.current.resize(divRef.current.clientWidth, 500);
        } catch (e) {
          console.error("Error resizing chart:", e);
        }
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [data]);

  /* cleanup once */
  useEffect(() => () => {
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (e) {
        console.error("Error removing chart:", e);
      }
    }
  }, []);

  return <div ref={divRef} style={{ width: '100%' }} />;
};

export default LightweightStockChart;
