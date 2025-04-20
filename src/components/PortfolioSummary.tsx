
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { usePortfolio } from '@/hooks/useStockData';

const PortfolioSummary: React.FC = () => {
  const { data, isLoading } = usePortfolio();
  
  if (isLoading) {
    return (
      <Card className="bg-[#1A1A1A] border-none animate-pulse">
        <CardContent className="pt-6 pb-6">
          <div className="h-24 bg-gray-800 rounded-md"></div>
        </CardContent>
      </Card>
    );
  }
  
  if (!data) return null;
  
  const { summary } = data;
  
  return (
    <Card className="bg-[#1A1A1A] border-none">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-sm text-gray-400">Total Balance</h2>
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-white">${summary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="ml-2 flex items-center text-green-400 text-sm">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {summary.dayChangePercent.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="flex space-x-1">
              <PeriodButton label="1H" active />
              <PeriodButton label="1D" />
              <PeriodButton label="1W" />
              <PeriodButton label="1M" />
              <PeriodButton label="1Y" />
              <PeriodButton label="All" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-400">Yearly Return</span>
              <div className="text-xl font-medium text-white">${summary.totalGain.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-sm text-gray-400">Monthly Return</span>
              <div className="text-xl font-medium text-white">${(summary.totalGain / 12).toFixed(2)}</div>
            </div>
          </div>
        </div>
        
        {/* Chart Area (placeholder) */}
        <div className="h-32 mt-4 flex items-end">
          <div className="w-full h-full bg-gradient-to-t from-purple-600/20 to-transparent relative">
            <svg className="absolute bottom-0 left-0 right-0" height="100%" width="100%" viewBox="0 0 500 100" preserveAspectRatio="none">
              <path
                d="M0,100 L20,90 L40,95 L60,85 L80,90 L100,80 L120,85 L140,75 L160,80 L180,70 L200,75 L220,65 L240,70 L260,60 L280,65 L300,55 L320,60 L340,50 L360,55 L380,45 L400,50 L420,40 L440,45 L460,35 L480,40 L500,30 L500,100 L0,100 Z"
                fill="rgba(147, 51, 234, 0.2)"
                stroke="rgba(147, 51, 234, 0.8)"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>Apr</span>
          <span>May</span>
          <span>Jun</span>
          <span>Jul</span>
          <span>Aug</span>
          <span>Sep</span>
          <span>Oct</span>
          <span>Nov</span>
          <span>Dec</span>
          <span>Jan</span>
          <span>Feb</span>
          <span>Mar</span>
        </div>
      </CardContent>
    </Card>
  );
};

const PeriodButton = ({ label, active = false }) => (
  <button
    className={`px-2 py-1 text-xs rounded-md ${
      active 
        ? 'bg-purple-700 text-white' 
        : 'text-gray-400 hover:bg-gray-800'
    }`}
  >
    {label}
  </button>
);

export default PortfolioSummary;
