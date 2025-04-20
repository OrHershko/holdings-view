
import React, { useRef, useEffect, useState } from 'react';
import { createChart, ColorType, IChartApi, SeriesType } from 'lightweight-charts';

interface ChartData {
  date: string | Date;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number;
  sma20?: number | null;
  sma50?: number | null;
  rsi?: number | null;
}

interface LightweightStockChartProps {
  data: ChartData[];
  height?: number;
}

const LightweightStockChart: React.FC<LightweightStockChartProps> = ({ 
  data,
  height = 300 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Clean up on unmount
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!chartContainerRef.current || !data.length) return;

    setIsLoading(true);

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.7)',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.3)',
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.3)',
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: 'rgba(197, 203, 206, 0.5)',
          width: 1,
          style: 1,
          labelBackgroundColor: 'rgba(197, 203, 206, 0.5)',
        },
        horzLine: {
          color: 'rgba(197, 203, 206, 0.5)',
          width: 1,
          style: 1,
          labelBackgroundColor: 'rgba(197, 203, 206, 0.5)',
        },
      },
    });

    chartRef.current = chart;

    // Prepare data
    const lineData = data.map(d => ({
      time: typeof d.date === 'string' ? d.date : d.date.toISOString().split('T')[0],
      value: d.close || 0
    }));

    // Add line series
    const lineSeries = chart.addLineSeries({
      color: '#8b5cf6',
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });
    lineSeries.setData(lineData);

    // Add area series using line series with fill
    const areaSeries = chart.addLineSeries({
      color: '#8b5cf6',
      lineWidth: 0,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
      lineType: 2, // Step line
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      // Use fill as a workaround for area series
      topColor: 'rgba(139, 92, 246, 0.2)',
      bottomColor: 'rgba(139, 92, 246, 0.0)',
    });
    areaSeries.setData(lineData);

    // Add volume histogram using bar series
    if (data.some(d => d.volume !== undefined && d.volume !== null)) {
      const volumeData = data.map(d => ({
        time: typeof d.date === 'string' ? d.date : d.date.toISOString().split('T')[0],
        value: d.volume || 0,
        color: (d.close || 0) >= (d.open || 0) ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255, 82, 82, 0.5)'
      }));
      
      const volumeSeries = chart.addHistogramSeries({
        color: 'rgba(76, 175, 80, 0.5)',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
      });
      volumeSeries.setData(volumeData);
      
      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.8, // Position volume in the bottom 20% of the chart
          bottom: 0,
        },
      });
    }

    // Add SMA lines if available
    if (data.some(d => d.sma20 !== undefined && d.sma20 !== null)) {
      const sma20Data = data
        .filter(d => d.sma20 !== null && d.sma20 !== undefined)
        .map(d => ({
          time: typeof d.date === 'string' ? d.date : d.date.toISOString().split('T')[0],
          value: d.sma20 || 0
        }));
      
      const sma20Series = chart.addLineSeries({
        color: '#2196F3',
        lineWidth: 1,
        priceLineVisible: false,
      });
      sma20Series.setData(sma20Data);
    }

    if (data.some(d => d.sma50 !== undefined && d.sma50 !== null)) {
      const sma50Data = data
        .filter(d => d.sma50 !== null && d.sma50 !== undefined)
        .map(d => ({
          time: typeof d.date === 'string' ? d.date : d.date.toISOString().split('T')[0],
          value: d.sma50 || 0
        }));
      
      const sma50Series = chart.addLineSeries({
        color: '#FF9800',
        lineWidth: 1,
        priceLineVisible: false,
      });
      sma50Series.setData(sma50Data);
    }

    chart.timeScale().fitContent();
    setIsLoading(false);

    // Handle resize
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [data]);

  if (!data.length) {
    return <div>No data available</div>;
  }

  return (
    <div className="w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
        </div>
      )}
      <div 
        ref={chartContainerRef} 
        className="w-full h-full"
        style={{ height: `${height}px` }}
      />
    </div>
  );
};

export default LightweightStockChart;
