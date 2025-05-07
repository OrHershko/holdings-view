import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, Briefcase } from 'lucide-react';
import AssetAllocationChart from './AssetAllocationChart';
import type { PortfolioHolding, PortfolioSummary as PortfolioSummaryType } from '@/api/stockApi'; // Import types

interface PortfolioSummaryProps {
  portfolioSummary: PortfolioSummaryType;
  holdings: PortfolioHolding[];
}

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ portfolioSummary, holdings }) => {
  if (!portfolioSummary) return null;

  const { totalValue, totalGain, totalGainPercent, dayChange, dayChangePercent } = portfolioSummary;
  const isPositiveGain = totalGain >= 0;
  const isPositiveDayChange = dayChange >= 0;
  
  const cashHolding = holdings.find(h => h.type === 'cash');
  const cashValue = cashHolding ? cashHolding.shares : 0;

  return (
    <Card className="ios-card">
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-5 mt-2">
            <div className="text-center">
              <span className="text-s text-ios-gray">Total Portfolio Value</span>
              <div className="mt-2 flex items-center justify-center">
                <Briefcase className="h-5 w-4 mr-2 text-ios-blue flex-shrink-0" />
                <div className="text-3xl font-ios-bold truncate">
                  ${totalValue.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="text-center">
              <span className="text-s text-ios-gray">Cash Balance</span>
              <div className="mt-2 flex items-center justify-center">
                <Wallet className="h-4 w-4 mr-2 text-ios-blue flex-shrink-0" />
                <div className="text-3xl font-ios-white">
                  ${cashValue.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-8 mt-2">
            <div className="text-center">
              <span className="text-s text-ios-gray text-center">Today Portfolio Value Change</span>
              <div className="mt-2">
                <div className={`text-s text-center flex items-center justify-center ${isPositiveDayChange ? 'text-ios-green' : 'text-ios-red'}`}>
                  {isPositiveDayChange ? (<TrendingUp className="h-4 w-4 mr-1 flex-shrink-0" />) : (<TrendingDown className="h-4 w-4 mr-1 flex-shrink-0" />)}
                <span className="truncate">${Math.abs(dayChange).toLocaleString()} ({dayChangePercent.toFixed(2)}%)</span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <span className="text-s text-ios-gray text-center">Total Portfolio Value Change</span>
              <div className="mt-2">
                <div className={`text-s text-center flex items-center justify-center ${isPositiveGain ? 'text-ios-green' : 'text-ios-red'}`}>
                  {isPositiveGain ? <TrendingUp className="h-4 w-4 mr-1 flex-shrink-0" /> : <TrendingDown className="h-4 w-4 mr-1 flex-shrink-0" />}
                  <span className="truncate">${Math.abs(totalGain).toLocaleString()} ({totalGainPercent.toFixed(2)}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Conditionally render Asset Allocation */} 
        {holdings.length > 0 && totalValue > 0 && (
          <div>
            <AssetAllocationChart holdings={holdings} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PortfolioSummary;
