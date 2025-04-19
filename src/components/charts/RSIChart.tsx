import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';

interface RSIChartProps {
  data: any[];
  CustomTooltip: React.FC<any>;
}

const RSIChart: React.FC<RSIChartProps> = ({ data, CustomTooltip }) => {
  return (
    <Card className="p-4 bg-[#1E1E1E] border-gray-800 h-full">
      <div className="mb-2">
        <h3 className="text-lg font-medium text-white">Relative Strength Index (RSI)</h3>
        <p className="text-sm text-gray-400">
          RSI measures momentum and identifies overbought (&gt;70) or oversold (&lt;30) conditions.
          Values range from 0 to 100.
        </p>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#9CA3AF' }}
              tickLine={{ stroke: '#4B5563' }}
              axisLine={{ stroke: '#4B5563' }}
            />
            <YAxis 
              domain={[0, 100]}
              orientation="right"
              tick={{ fill: '#9CA3AF' }}
              tickLine={{ stroke: '#4B5563' }}
              axisLine={{ stroke: '#4B5563' }}
            />
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <ReferenceLine y={70} stroke="#EF4444" strokeDasharray="3 3" />
            <ReferenceLine y={30} stroke="#34D399" strokeDasharray="3 3" />
            <Tooltip content={CustomTooltip} />
            <Line
              type="monotone"
              dataKey="rsi"
              stroke="#8B5CF6"
              dot={false}
              name="RSI"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default RSIChart;
