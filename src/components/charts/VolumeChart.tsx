
import React from 'react';
import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';

interface VolumeChartProps {
  data: any[];
  CustomTooltip: React.FC<any>;
}

const VolumeChart: React.FC<VolumeChartProps> = ({ data, CustomTooltip }) => {
  return (
    <Card className="p-4 bg-[#1E1E1E] border-gray-800">
      <div className="mb-2">
        <h3 className="text-lg font-medium text-white">Volume</h3>
        <p className="text-sm text-gray-400">
          Trading volume indicates market activity and liquidity.
          Higher volumes often signal strong price movements.
        </p>
      </div>
      <div className="h-[200px]">
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
