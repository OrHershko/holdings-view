import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { usePortfolio } from '@/hooks/useStockData';
import AssetAllocationChart from './AssetAllocationChart';

const PortfolioSummary: React.FC = () => {
  const { data: portfolioData } = usePortfolio();

  if (!portfolioData) return null;

  const { totalValue, totalGain, totalGainPercent, dayChange, dayChangePercent } = portfolioData.summary;
  const isPositiveGain = totalGain >= 0;
  const isPositiveDayChange = dayChange >= 0;

  // Mock data for asset types (you'll need to update this based on your actual data)
  const holdingsWithTypes = portfolioData.holdings.map(holding => ({
    ...holding,
    type: 'stock' as const // Default to stock, you'll need to determine the actual type
  }));

  return (
    <Card className="ios-card">
      <CardContent className="space-y-6">
        <div className="text-center">
          <span className="text-s text-ios-gray">Portfolio Value</span>
          <div className="mt-2">
            <div className="text-3xl font-ios-bold">
              ${totalValue.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="text-center">
          <span className="text-s text-ios-gray text-center">Total Change</span>
          <div className="mt-2">
            <div className={`text-s text-center flex items-center justify-center ${isPositiveGain ? 'text-ios-green' : 'text-ios-red'}`}>
              {isPositiveGain ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
              <span>${Math.abs(totalGain).toLocaleString()} ({totalGainPercent.toFixed(2)}%)</span>
            </div>
          </div>
        </div>
        <div className="text-center">
          <span className="text-s text-ios-gray text-center">Today Change</span>
          <div className="mt-2">
            <div className={`text-s text-center flex items-center justify-center ${isPositiveDayChange ? 'text-ios-green' : 'text-ios-red'}`}>
              {isPositiveDayChange ? (<TrendingUp className="h-4 w-4 mr-1 p" />) : (<TrendingDown className="h-4 w-4 mr-1" />)}
            <span>${Math.abs(dayChange).toLocaleString()} ({dayChangePercent.toFixed(2)}%)</span>
            </div>
          </div>
        </div>
        {/* Conditionally render Asset Allocation */} 
        {holdingsWithTypes.length > 0 && (
          <div>
            <AssetAllocationChart holdings={holdingsWithTypes} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PortfolioSummary;
