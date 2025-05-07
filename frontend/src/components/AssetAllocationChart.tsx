import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PortfolioHolding } from '@/api/stockApi';


interface AssetAllocationChartProps {
  holdings: PortfolioHolding[];
}

const COLORS = {
  stocks: '#0088FE',
  etf: '#FF8042',
  crypto: '#FFBB28',
  cash: '#00C49F'
};

interface ChartLegendProps {
  payload?: any[];
  data: Array<{ name: string; percentage: string }>;
}

const ChartLegend: React.FC<ChartLegendProps> = ({ payload, data }) => (
  <ul className="list-none m-0 p-0">
    {payload?.map((entry: any) => (
      <li key={entry.value} className="flex items-center mb-2">
        <span
          className="inline-block w-3 h-3 mr-2 rounded-full"
          style={{ backgroundColor: entry.color }}
        />
        <span className="text-sm">
          {entry.value} {data.find(d => d.name === entry.value)?.percentage}%
        </span>
      </li>
    ))}
  </ul>
);

const AssetAllocationChart: React.FC<AssetAllocationChartProps> = ({ holdings }) => {

  const cashHoldings = holdings.filter(h => h.type === 'cash');
  const cashValue = cashHoldings.length > 0 ? cashHoldings[0].shares : 0;
  
  const modifiedHoldings = holdings.map(holding => {
    if (holding.type === 'cash') {
      return {
        ...holding,
        value: holding.shares
      };
    }
    return holding;
  });

  const totalValue = modifiedHoldings.reduce((sum, holding) => sum + holding.value, 0);

  const assetTypes = {
    stocks: modifiedHoldings.filter(h => h.type === 'stock').reduce((sum, h) => sum + h.value, 0),
    ETF: modifiedHoldings.filter(h => h.type === 'etf').reduce((sum, h) => sum + h.value, 0),
    crypto: modifiedHoldings.filter(h => h.type === 'crypto').reduce((sum, h) => sum + h.value, 0),
    cash: cashValue 
  };

  const data = Object.entries(assetTypes).map(([type, value]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value,
    percentage: ((value / totalValue) * 100).toFixed(1)
  }));

  data.sort((a, b) => b.value - a.value);

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percentage }: any) => {
    if (percentage === '0.0') return null;

    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill={COLORS[name.toLowerCase() as keyof typeof COLORS]}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
      >
        {`${name} ${percentage}%`}
      </text>
    );
  };

  return (
    <div className="text-center">
        <span className="text-xl text-ios-white">Asset Allocation</span>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={false}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry) => (
                <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [
                `$${value.toLocaleString()} (${((value / totalValue) * 100).toFixed(1)}%)`,
                name
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        {data.map((asset) => (
          <div key={asset.name} className="flex items-center">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: COLORS[asset.name.toLowerCase() as keyof typeof COLORS] }}
            />
            <span className="font-medium">{asset.name}</span>
            <span className="ml-auto">{asset.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssetAllocationChart; 