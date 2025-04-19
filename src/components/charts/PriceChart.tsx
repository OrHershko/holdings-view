
import React from 'react';
import { ComposedChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Bar, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';

interface PriceChartProps {
  data: any[];
  isPositive: boolean;
  CustomTooltip: React.FC<any>;
}

const PriceChart: React.FC<PriceChartProps> = ({ data, isPositive, CustomTooltip }) => {
  return (
    <Card className="p-4 bg-[#1E1E1E] border-gray-800">
      <div className="mb-2">
        <h3 className="text-lg font-medium text-white">Price Analysis</h3>
        <p className="text-sm text-gray-400">
          Shows price movement with technical indicators. SMA20 (blue) and SMA50 (orange)
          help identify trends and potential support/resistance levels.
        </p>
      </div>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#9CA3AF' }} 
              tickLine={{ stroke: '#4B5563' }}
              axisLine={{ stroke: '#4B5563' }}
            />
            <YAxis 
              yAxisId="price"
              orientation="right"
              tick={{ fill: '#9CA3AF' }}
              tickLine={{ stroke: '#4B5563' }}
              axisLine={{ stroke: '#4B5563' }}
              domain={['auto', 'auto']}
            />
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <Tooltip content={CustomTooltip} />
            <Bar
              dataKey="high"
              fill={isPositive ? "#34D399" : "#EF4444"}
              stroke={isPositive ? "#34D399" : "#EF4444"}
              yAxisId="price"
            />
            <Line
              type="monotone"
              dataKey="sma20"
              stroke="#60A5FA"
              dot={false}
              yAxisId="price"
              name="SMA 20"
            />
            <Line
              type="monotone"
              dataKey="sma50"
              stroke="#F59E0B"
              dot={false}
              yAxisId="price"
              name="SMA 50"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default PriceChart;
