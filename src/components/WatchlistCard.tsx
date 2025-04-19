
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useWatchlist } from '@/hooks/useStockData';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface WatchlistCardProps {
  onSelectStock: (symbol: string) => void;
}

const WatchlistCard: React.FC<WatchlistCardProps> = ({ onSelectStock }) => {
  const { data, isLoading } = useWatchlist();
  
  if (isLoading) {
    return (
      <Card className="ios-card animate-pulse">
        <CardContent className="pt-4">
          <div className="flex justify-between mb-4">
            <h2 className="text-lg font-medium">Watchlist</h2>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-ios-light-gray rounded-md"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!data || data.length === 0) return null;
  
  return (
    <Card className="ios-card">
      <CardContent className="p-4">
        <div className="flex justify-between mb-4">
          <h2 className="text-lg font-medium">Watchlist</h2>
          <button className="text-ios-blue text-sm">Edit</button>
        </div>
        
        <div className="space-y-3">
          {data.map((stock) => (
            <div 
              key={stock.symbol}
              className="flex justify-between items-center py-2 border-b border-ios-light-gray last:border-0 cursor-pointer"
              onClick={() => onSelectStock(stock.symbol)}
            >
              <div>
                <p className="font-medium">{stock.symbol}</p>
                <p className="text-xs text-ios-gray truncate max-w-[160px]">{stock.name}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">${stock.price.toFixed(2)}</p>
                <div className={`flex items-center text-xs ${stock.change >= 0 ? 'text-ios-green' : 'text-ios-red'}`}>
                  {stock.change >= 0 ? 
                    <ArrowUp className="h-3 w-3 mr-1" /> : 
                    <ArrowDown className="h-3 w-3 mr-1" />
                  }
                  <span>
                    {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <button className="w-full mt-4 text-ios-blue text-sm py-2 border border-ios-blue rounded-lg">
          Add to Watchlist
        </button>
      </CardContent>
    </Card>
  );
};

export default WatchlistCard;
