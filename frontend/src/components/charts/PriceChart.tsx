import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface PriceChartProps {
  data: any[];
  isPositive: boolean;
  timeframe?: string; 
  onZoom?: (start: Date, end: Date) => void;
  CustomTooltip?: React.FC<any>;
}

const PriceChart: React.FC<PriceChartProps> = ({ 
  data, 
  isPositive, 
  timeframe = '1m',
  onZoom,
  CustomTooltip 
}) => {
  const [chartError, setChartError] = useState<string | null>(null);
  
  // ⭐ Track user's zoom state
  const zoomState = useRef<{ min: number; max: number } | null>(null);
  const chartInstance = useRef<any>(null);
  const userZooming = useRef(false);
  
  // Track data changes for debugging
  useEffect(() => {
    console.log(`Chart data updated, points: ${data?.length}, timeframe: ${timeframe}`);
  }, [data, timeframe]);

  // Use useMemo to create chart options and series only when dependencies change
  const { chartOptions, chartSeries } = useMemo(() => {
    try {
      if (!data || data.length === 0) {
        return { chartOptions: {}, chartSeries: [] };
      }

      // Format data for ApexCharts candlestick format
      const seriesData = data.map(item => ({
        x: new Date(item.date),
        y: [
          parseFloat(item.open || 0), 
          parseFloat(item.high || 0), 
          parseFloat(item.low || 0), 
          parseFloat(item.close || 0)
        ]
      }));

      // Optional SMA data
      const sma20Data = data
  .filter(item => item.sma20 != null)
  .map(item => ({
    x: new Date(item.date).getTime(),   // טיים־סטמפ עדיף
    y: parseFloat(item.sma20)          // מספר בודד, לא מערך
  }));

  const sma50Data = data
  .filter(item => item.sma50 != null)
  .map(item => ({
    x: new Date(item.date).getTime(),   // טיים־סטמפ עדיף
    y: parseFloat(item.sma50)          // מספר בודד, לא מערך
  }));
      
      // Customize label formats based on timeframe without setting min/max
      const getTimeframeOptions = () => {
        switch(timeframe) {
          case '1d':
            return {
              labels: {
                datetimeFormatter: {
                  hour: 'HH:mm',
                  minute: 'HH:mm'
                }
              }
            };
          case '1w':
            return {
              labels: {
                format: 'dd MMM'
              }
            };
          case '1m':
          case '1mo': // Support both formats
            return {
              labels: {
                format: 'dd MMM'
              }
            };
          case '6m':
            return {
              labels: {
                format: 'MMM yyyy'
              }
            };
          case '1y':
            return {
              labels: {
                format: 'MMM yyyy'
              }
            };
          default:
            return {};
        }
      };
      // Chart options - WITHOUT forced min/max on xaxis
      const options: ApexOptions = {
        colors: ['#34D399', '#60A5FA', '#F59E0B'], // Green, Blue, Orange
        chart: {
          id: `stock-chart-${timeframe}`,
          type: 'candlestick' as const,
          height: 450,
          foreColor: '#D1D5DB',
          toolbar: {
            show: true,
            tools: {
              download: false,
              selection: true,
              zoom: true,
              zoomin: true,
              zoomout: true,
              pan: true,
              reset: true
            },
            autoSelected: 'zoom'
          },
          animations: {
            enabled: false
          },
          background: '#1E1E1E',
          events: {
            zoomed: function(chartContext: any, { xaxis }: { xaxis: { min: number, max: number }}) {
              if (onZoom && xaxis && xaxis.min && xaxis.max) {
                // Convert timestamps back to Date objects and notify parent
                const startDate = new Date(xaxis.min);
                const endDate = new Date(xaxis.max);
                
                // Only call onZoom when there's a meaningful zoom range
                if (startDate.getTime() !== endDate.getTime()) {
                  onZoom(startDate, endDate);
                }
              }
              // ⭐ Update zoom state
              zoomState.current = xaxis;
            }
          },
          selection: {
            enabled: true,
            type: 'x',
            fill: {
              color: '#6B7280',
              opacity: 0.3
            }
          },
          zoom: {
            enabled: true,
            type: 'x',
            autoScaleYaxis: true,
            zoomedArea: {
              fill: {
                color: '#6B7280',
                opacity: 0.3
              },
              stroke: {
                color: '#374151',
                opacity: 0.4,
                width: 1
              }
            }
          }
        },
        grid: {
          borderColor: '#374151',
          strokeDashArray: 2
        },
        xaxis: {
          type: 'datetime',
          labels: {
            style: {
              colors: '#9CA3AF',
            },
            ...getTimeframeOptions().labels
          },
          axisBorder: {
            color: '#4B5563'
          },
          axisTicks: {
            color: '#4B5563'
          }
          // NO min, max or range properties - let ApexCharts handle zoom
        },
        yaxis: {
          tooltip: {
            enabled: true
          },
          labels: {
            style: {
              colors: '#9CA3AF',
            },
            formatter: (value: number) => `$${value.toFixed(2)}`
          },
          forceNiceScale: true
        },
        plotOptions: {
          candlestick: {
            colors: {
              upward: '#34D399', // Green for up candles
              downward: '#EF4444' // Red for down candles
            },
            wick: {
              useFillColor: true
            }
          }
        },
        tooltip: {
          theme: 'dark',
          x: {
            format: 'MMM dd, yyyy HH:mm'
          },
          y: {
            formatter: (value: number) => `$${value.toFixed(2)}`
          }
        },
        stroke: {
          curve: 'smooth',
          width: [1, 2, 2]
        },
        legend: {
          show: true,
          position: 'top',
          horizontalAlign: 'left',
          labels: {
            colors: '#D1D5DB'
          }
        }
      };
      
      // Chart series
      const series = [
        {
          name: 'Price',
          type: 'candlestick',
          data: seriesData
        }
      ];
      
      // Add SMA lines if available
      if (sma20Data.length > 0) {
        series.push({
          name: 'SMA 20',
          type: 'line',
          data: sma20Data
        });
      }
      
      if (sma50Data.length > 0) {
        series.push({
          name: 'SMA 50',
          type: 'line',
          data: sma50Data
        });
      }
      return { chartOptions: options, chartSeries: series };
    } catch (error) {
      console.error("Error processing chart data:", error);
      setChartError("Failed to prepare chart data");
      return { chartOptions: {}, chartSeries: [] };
    }
  }, [data, timeframe, onZoom]); // Only recalculate when these props change

  if (!data || data.length === 0) {
    return (
      <Card className="p-4 bg-[#1E1E1E] border-gray-800">
        <div className="h-[450px] flex items-center justify-center text-gray-400">
          No price data available
        </div>
      </Card>
    );
  }
  
  if (chartError) {
    return (
      <Card className="p-4 bg-[#1E1E1E] border-gray-800">
        <div className="h-[450px] flex items-center justify-center text-red-500">
          {chartError}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-[#1E1E1E] border-gray-800">
      <div className="mb-2">
        <h3 className="text-lg font-medium text-white">Price Analysis</h3>
        <p className="text-sm text-gray-400">
          Interactive candlestick chart showing price movement 
          <span className="ml-1 px-2 py-0.5 bg-gray-700 text-xs rounded-full">
            {timeframe.toUpperCase()}
          </span>
        </p>
      </div>
      <div style={{ height: '450px', width: '100%' }}>
        {/* No suspense or lazy loading - just render the chart directly */}
        <ReactApexChart 
          ref={chartInstance} 
          options={chartOptions} 
          series={chartSeries} 
          type="candlestick" 
          height={450} 
        />
      </div>
      {/* Removed manual zoom buttons which weren't needed */}
    </Card>
  );
};

export default PriceChart;