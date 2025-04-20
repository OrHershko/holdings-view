
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { usePortfolio } from '@/hooks/useStockData';

const PortfolioSummary: React.FC = () => {
  const { data, isLoading } = usePortfolio();
  
  if (isLoading) {
    return (
      <Card className="bg-[#1A1A1A]/80 backdrop-blur-md border border-gray-800 animate-pulse">
        <CardContent className="pt-6 pb-6">
          <div className="h-24 bg-gray-800 rounded-md"></div>
        </CardContent>
      </Card>
    );
  }
  
  if (!data) return null;
  
  const { summary } = data;
  
  return (
    <Card className="bg-[#1A1A1A]/80 backdrop-blur-md border border-gray-800">
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
            <div className="flex space-x-1 bg-black/30 backdrop-blur-md rounded-full p-1">
              <PeriodButton label="1D" active />
              <PeriodButton label="7D" />
              <PeriodButton label="1M" />
              <PeriodButton label="YTD" />
              <PeriodButton label="1Y" />
              <PeriodButton label="All" />
            </div>
          </div>
          
          <div className="h-32 mt-2 flex items-end">
            <div className="w-full h-full relative">
              <svg className="absolute bottom-0 left-0 right-0" height="100%" width="100%" viewBox="0 0 500 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(139, 92, 246, 0.3)" />
                    <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,80 L20,75 L40,70 L60,65 L80,75 L100,60 L120,65 L140,55 L160,60 L180,50 L200,55 L220,40 L240,45 L260,30 L280,35 L300,25 L320,30 L340,20 L360,25 L380,15 L400,20 L420,10 L440,15 L460,5 L480,10 L500,15 L500,100 L0,100 Z"
                  fill="url(#areaGradient)"
                />
                <path
                  d="M0,80 L20,75 L40,70 L60,65 L80,75 L100,60 L120,65 L140,55 L160,60 L180,50 L200,55 L220,40 L240,45 L260,30 L280,35 L300,25 L320,30 L340,20 L360,25 L380,15 L400,20 L420,10 L440,15 L460,5 L480,10 L500,15"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mt-4">
            <div className="bg-black/30 backdrop-blur-md rounded-xl p-4">
              <span className="text-sm text-gray-400">Daily Updated</span>
              <div className="text-2xl font-bold text-white mt-1">${summary.totalGain.toFixed(2)}</div>
              <div className="text-green-400 text-sm">+${(summary.totalGain * 0.05).toFixed(2)} today</div>
            </div>
            <div className="bg-black/30 backdrop-blur-md rounded-xl p-4">
              <span className="text-sm text-gray-400">Remaining</span>
              <div className="text-2xl font-bold text-white mt-1">${(summary.totalValue - summary.totalGain).toFixed(2)}</div>
              <div className="text-gray-400 text-sm">ends in 3d 5h</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const PeriodButton = ({ label, active = false }) => (
  <button
    className={`period-button ${active ? 'period-button-active' : 'period-button-inactive'}`}
  >
    {label}
  </button>
);

export default PortfolioSummary;
