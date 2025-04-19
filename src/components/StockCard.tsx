
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StockCardProps {
  symbol: string;
  name: string;
  shares: number;
  averageCost: number;
  currentPrice: number;
  change: number;
  changePercent: number;
  value: number;
  gain: number;
  gainPercent: number;
  onClick: () => void;
}

const StockCard: React.FC<StockCardProps> = ({
  symbol,
  name,
  shares,
  averageCost,
  currentPrice,
  change,
  changePercent,
  value,
  gain,
  gainPercent,
  onClick
}) => {
  const isPositiveChange = change >= 0;
  const isPositiveGain = gain >= 0;
  
  return (
    <Card className="ios-card cursor-pointer hover:shadow-md transition-shadow duration-200" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium">{symbol}</h3>
            <p className="text-xs text-ios-gray">{name}</p>
          </div>
          <div className="text-right">
            <p className="font-medium">${currentPrice.toFixed(2)}</p>
            <div className={`flex items-center text-xs ${isPositiveChange ? 'text-ios-green' : 'text-ios-red'}`}>
              {isPositiveChange ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              <span>{isPositiveChange ? '+' : ''}{changePercent.toFixed(2)}%</span>
            </div>
          </div>
        </div>
        
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-ios-gray">Shares</p>
            <p>{shares}</p>
          </div>
          <div>
            <p className="text-ios-gray">Average Cost</p>
            <p>${averageCost.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-ios-gray">Value</p>
            <p>${value.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-ios-gray">Total Gain/Loss</p>
            <p className={isPositiveGain ? 'text-ios-green' : 'text-ios-red'}>
              {isPositiveGain ? '+' : ''}{gainPercent.toFixed(2)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StockCard;
