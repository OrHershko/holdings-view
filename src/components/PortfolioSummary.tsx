
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { usePortfolio } from '@/hooks/useStockData';

const PortfolioSummary: React.FC = () => {
  const { data, isLoading } = usePortfolio();
  
  if (isLoading) {
    return (
      <Card className="ios-card animate-pulse">
        <CardContent className="pt-6 pb-6">
          <div className="h-24 bg-ios-light-gray rounded-md"></div>
        </CardContent>
      </Card>
    );
  }
  
  if (!data) return null;
  
  const { summary } = data;
  const isPositiveDay = summary.dayChange >= 0;
  
  return (
    <Card className="ios-card animate-slide-up">
      <CardContent className="p-4">
        <h2 className="text-lg font-medium mb-4">Portfolio Summary</h2>
        
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-baseline">
            <span className="text-3xl font-bold">${summary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <div className={`flex items-center ${isPositiveDay ? 'text-ios-green' : 'text-ios-red'}`}>
              {isPositiveDay ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
              <span className="font-medium">
                ${Math.abs(summary.dayChange).toFixed(2)} ({Math.abs(summary.dayChangePercent).toFixed(2)}%)
              </span>
            </div>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-ios-gray">Total Gain/Loss</span>
            <span className={summary.totalGain >= 0 ? 'text-ios-green' : 'text-ios-red'}>
              ${summary.totalGain.toFixed(2)} ({summary.totalGainPercent.toFixed(2)}%)
            </span>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-ios-light-gray">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Asset Allocation</span>
          </div>
          <div className="h-4 bg-ios-light-gray rounded-full overflow-hidden">
            <div className="flex h-full">
              <div className="bg-ios-blue h-full" style={{ width: '40%' }}></div>
              <div className="bg-ios-green h-full" style={{ width: '30%' }}></div>
              <div className="bg-ios-orange h-full" style={{ width: '20%' }}></div>
              <div className="bg-ios-light-blue h-full" style={{ width: '10%' }}></div>
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-ios-gray">
            <span>Stocks: 70%</span>
            <span>ETFs: 20%</span>
            <span>Cash: 10%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PortfolioSummary;
