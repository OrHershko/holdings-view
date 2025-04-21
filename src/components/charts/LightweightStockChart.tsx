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
  const candles: CandlestickData[] = [];
  const volume: HistogramData[] = [];
  const rsi: LineData[] = [];
  const sma150: LineData[] = []; // Add SMA 150 array

  raw.forEach((p) => {
    const time = (new Date(p.date).getTime() / 1000) as UTCTimestamp;

    if (p.open != null && p.high != null && p.low != null && p.close != null) {
      candles.push({ time, open: p.open, high: p.high, low: p.low, close: p.close });
    }

    if (p.volume != null) {
      volume.push({
        time,
        value: p.volume,
        color: p.close >= p.open ? 'rgba(52, 211, 153, 0.5)' : 'rgba(239, 68, 68, 0.5)',
      });
    }

    if (p.rsi != null) {
      rsi.push({ time, value: p.rsi });
    }
    
    // Extract SMA 150 if available
    if (p.sma150 != null) {
      sma150.push({ time, value: p.sma150 });
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
    if (!divRef.current || data.length === 0) return;

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

    /* push data */
    const { candles, volume, rsi, sma150 } = toSeriesData(data);
    candleRef.current!.setData(candles);
    volumeRef.current!.setData(volume);
    rsiRef.current!.setData(rsi);
    sma150Ref.current!.setData(sma150); // Set SMA 150 data
    chartRef.current.timeScale().fitContent();

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
