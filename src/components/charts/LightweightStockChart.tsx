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
} from 'lightweight-charts';

interface Props {
  data: any[];     
  timeframe: string;
}

/* ---------- helper ---------- */
const toSeriesData = (raw: any[]) => {
  const candles: CandlestickData[] = [];
  const volume: HistogramData[] = [];
  const rsi: LineData[] = [];

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
  });

  return { candles, volume, rsi };
};

/* ---------- component ---------- */
const LightweightStockChart: React.FC<Props> = ({ data, timeframe }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'>>();
  const volumeRef = useRef<ISeriesApi<'Histogram'>>();
  const rsiRef = useRef<ISeriesApi<'Line'>>();

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
      rsiRef.current.createPriceLine({ price: 70, color: '#EF4444', lineStyle: 2, lineWidth: 1 });
      rsiRef.current.createPriceLine({ price: 30, color: '#34D399', lineStyle: 2, lineWidth: 1 });
    }

    /* push data */
    const { candles, volume, rsi } = toSeriesData(data);
    candleRef.current!.setData(candles);
    volumeRef.current!.setData(volume);
    rsiRef.current!.setData(rsi);
    chartRef.current.timeScale().fitContent();

    /* resize */
    const onResize = () => {
      if (chartRef.current && divRef.current) {
        chartRef.current.resize(divRef.current.clientWidth, 500);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [data, timeframe]);

  /* cleanup once */
  useEffect(() => () => chartRef.current?.remove(), []);

  return <div ref={divRef} style={{ width: '100%' }} />;
};

export default LightweightStockChart;
