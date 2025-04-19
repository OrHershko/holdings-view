import React from 'react';
import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';

interface VolumeChartProps {
  data: any[];
  CustomTooltip: React.FC<any>;
}

const VolumeChart: React.FC<VolumeChartProps> = ({ data, CustomTooltip }) => {
  return (
    <Card className="p-4 bg-[#1E1E1E] border-gray-800 h-full">
      <div className="mb-2">
        <h3 className="text-lg font-medium text-white">Volume Analysis</h3>
        <p className="text-sm text-gray-400">
          Shows trading volume over time. High volume can indicate strong price movements
          and market interest.
        </p>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#9CA3AF' }}
              tickLine={{ stroke: '#4B5563' }}
              axisLine={{ stroke: '#4B5563' }}
            />
            <YAxis 
              yAxisId="volume"
              orientation="right"
              tick={{ fill: '#9CA3AF' }}
              tickLine={{ stroke: '#4B5563' }}
              axisLine={{ stroke: '#4B5563' }}
            />
            <Tooltip content={CustomTooltip} />
            <Bar
              dataKey="volume"
              fill="#6B7280"
              yAxisId="volume"
              name="Volume"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default VolumeChart;
