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

  const candles: CandlestickData[] = [];
  const volume: HistogramData[] = [];
  const rsi: LineData[] = [];
  const sma150: LineData[] = []; // Add SMA 150 array

  raw.forEach((p) => {
    if (!p || typeof p !== 'object') {
      console.warn('Invalid data point:', p);
      return; // Skip this point
    }

    // Ensure we have a valid date
    let time: UTCTimestamp;
    try {
      time = (new Date(p.date).getTime() / 1000) as UTCTimestamp;
      if (isNaN(time)) {
        console.warn('Invalid date:', p.date);
        return; // Skip this point
      }
    } catch (e) {
      console.warn('Error parsing date:', p.date, e);
      return; // Skip this point
    }

    // Only add candle if all required values are present and are numbers
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

    // Only add volume if it's a valid number
    if (p.volume != null && !isNaN(Number(p.volume))) {
      volume.push({
        time,
        value: Number(p.volume),
        color: (p.close >= p.open) ? 'rgba(52, 211, 153, 0.5)' : 'rgba(239, 68, 68, 0.5)',
      });
    }

    // Only add RSI if it's a valid number
    if (p.rsi != null && !isNaN(Number(p.rsi))) {
      rsi.push({ time, value: Number(p.rsi) });
    }
    
    // Only add SMA 150 if it's a valid number
    if (p.sma150 != null && !isNaN(Number(p.sma150))) {
      sma150.push({ time, value: Number(p.sma150) });
    }
  });

  return { candles, volume, rsi, sma150 };
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
    
    // Log received data prop
    console.log("LightweightStockChart: Received data prop:", data);

    // Validate data
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('No valid chart data provided:', data);
      // Clear chart if data becomes invalid/empty
      candleRef.current?.setData([]);
      volumeRef.current?.setData([]);
      rsiRef.current?.setData([]);
      sma150Ref.current?.setData([]);
      return;
    }

    /* create once */
    if (!chartRef.current) {
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
    }

    try {
      /* push data */
      const { candles, volume, rsi, sma150 } = toSeriesData(data);
      
      // Log data before setting it on the chart series
      console.log("LightweightStockChart: Setting candle data:", candles);
      console.log("LightweightStockChart: Setting volume data:", volume);
      console.log("LightweightStockChart: Setting rsi data:", rsi);
      console.log("LightweightStockChart: Setting sma150 data:", sma150);

      // Only set data if we have valid arrays with at least one element
      if (candleRef.current && candles.length > 0) {
        candleRef.current.setData(candles);
      } else if (candleRef.current) {
        candleRef.current.setData([]); // Clear if empty
      }
      
      if (volumeRef.current && volume.length > 0) {
        volumeRef.current.setData(volume);
      } else if (volumeRef.current) {
        volumeRef.current.setData([]); // Clear if empty
      }
      
      if (rsiRef.current && rsi.length > 0) {
        rsiRef.current.setData(rsi);
      } else if (rsiRef.current) {
        rsiRef.current.setData([]); // Clear if empty
      }
      
      if (sma150Ref.current && sma150.length > 0) {
        sma150Ref.current.setData(sma150);
      } else if (sma150Ref.current) {
        sma150Ref.current.setData([]); // Clear if empty
      }
      
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    } catch (error) {
      console.error('Error setting chart data:', error);
    }

    /* resize */
    const onResize = () => {
      if (chartRef.current && divRef.current) {
        chartRef.current.resize(divRef.current.clientWidth, 500);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [data]);

  /* cleanup once */
  useEffect(() => () => chartRef.current?.remove(), []);

  return <div ref={divRef} style={{ width: '100%' }} />;
};

export default LightweightStockChart;
