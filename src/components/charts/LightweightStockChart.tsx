
import React, { useEffect, useRef } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  CandlestickData,
  HistogramData,
  LineData,
} from 'lightweight-charts';

interface Props {
  data: any[];     
}

/* ---------- helper ---------- */
const toSeriesData = (raw: any[]) => {
  const candles: CandlestickData[] = [];
  const volume: HistogramData[] = [];
  const line: LineData[] = []; // Area chart line

  raw.forEach((p) => {
    const time = (new Date(p.date).getTime() / 1000) as UTCTimestamp;

    if (p.open != null && p.high != null && p.low != null && p.close != null) {
      candles.push({ time, open: p.open, high: p.high, low: p.low, close: p.close });
      
      // Also add to line series for area chart
      line.push({ time, value: p.close });
    }

    if (p.volume != null) {
      volume.push({
        time,
        value: p.volume,
        color: p.close >= p.open ? 'rgba(147, 51, 234, 0.3)' : 'rgba(147, 51, 234, 0.15)',
      });
    }
  });

  return { candles, volume, line };
};

/* ---------- component ---------- */
const LightweightStockChart: React.FC<Props> = ({ data }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const areaRef = useRef<ISeriesApi<'Area'>>();
  const volumeRef = useRef<ISeriesApi<'Histogram'>>();

  /* build / update */
  useEffect(() => {
    if (!divRef.current || data.length === 0) return;

    /* create once */
    if (!chartRef.current) {
      chartRef.current = createChart(divRef.current, {
        width: divRef.current.clientWidth,
        height: 300,
        layout: { 
          background: { color: '#1A1A1A' }, 
          textColor: '#666' 
        },
        grid: { 
          vertLines: { color: '#222' }, 
          horzLines: { color: '#222' } 
        },
        rightPriceScale: { 
          borderColor: '#333',
          scaleMargins: {
            top: 0.1,
            bottom: 0.2,
          },
        },
        timeScale: { 
          borderColor: '#333', 
          timeVisible: true, 
          secondsVisible: false,
        },
        crosshair: { 
          mode: 1,
          vertLine: {
            color: '#444',
            width: 1,
            style: 1,
            labelBackgroundColor: '#333',
          },
          horzLine: {
            color: '#444',
            width: 1,
            style: 1,
            labelBackgroundColor: '#333',
          },
        },
      });

      /* series */
      areaRef.current = chartRef.current.addAreaSeries({
        topColor: 'rgba(147, 51, 234, 0.4)',
        bottomColor: 'rgba(147, 51, 234, 0.0)',
        lineColor: 'rgba(147, 51, 234, 1)',
        lineWidth: 2,
      });

      volumeRef.current = chartRef.current.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
      
      chartRef.current.priceScale('volume').applyOptions({ 
        scaleMargins: { top: 0.8, bottom: 0 },
        visible: false,
      });
    }

    /* push data */
    const { line, volume } = toSeriesData(data);
    areaRef.current!.setData(line);
    volumeRef.current!.setData(volume);
    
    // Fit content on initial load or data change
    chartRef.current.timeScale().fitContent();

    /* resize */
    const onResize = () => {
      if (chartRef.current && divRef.current) {
        chartRef.current.resize(divRef.current.clientWidth, 300);
        chartRef.current.timeScale().fitContent();
      }
    };
    
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [data]);

  /* cleanup once */
  useEffect(() => () => chartRef.current?.remove(), []);

  return <div ref={divRef} style={{ width: '100%', height: '300px' }} />;
};

export default LightweightStockChart;
