import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist } from '@/hooks/useStockData';
import { useToast } from './ui/use-toast';

interface WatchlistCardProps {
  onSelectStock: (symbol: string) => void;
}

const WatchlistCard: React.FC<WatchlistCardProps> = ({ onSelectStock }) => {
  const [newSymbol, setNewSymbol] = useState('');
  const { data: watchlist, isLoading, error } = useWatchlist();
  const { toast } = useToast();

  const addMutation = useAddToWatchlist();
  const removeMutation = useRemoveFromWatchlist();

  const handleAdd = () => {
    if (!newSymbol.trim()) return;
    addMutation.mutate(newSymbol.trim().toUpperCase(), {
      onSuccess: () => {
        setNewSymbol('');
        toast({ title: "Added to Watchlist", description: `${newSymbol.toUpperCase()} added.`});
      },
      onError: (error: any) => {
         toast({ title: "Error", description: error.message || "Failed to add stock.", variant: "destructive"});
      }
    });
  };

  const handleRemove = (symbol: string) => {
    removeMutation.mutate(symbol, {
       onSuccess: () => {
         toast({ title: "Removed from Watchlist", description: `${symbol} removed.`});
       },
       onError: (error: any) => {
          toast({ title: "Error", description: error.message || "Failed to remove stock.", variant: "destructive"});
       }
    });
  };

  return (
    <Card className="ios-card">
      <CardHeader>
        <CardTitle>Watchlist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Add Symbol (e.g., MSFT)"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            className="flex-grow"
          />
          <Button
            size="icon"
            onClick={handleAdd}
            disabled={addMutation.isPending || !newSymbol.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        {isLoading && (
          <div className="text-center py-4">
            <Loader2 className="h-6 w-6 animate-spin inline-block text-ios-gray" />
          </div>
        )}
        {error && <p className="text-center text-red-500">Error loading watchlist.</p>}
        {!isLoading && !error && watchlist && watchlist.length === 0 && (
          <p className="text-center text-ios-gray">Your watchlist is empty.</p>
        )}
        {!isLoading && !error && watchlist && watchlist.length > 0 && (
          <div className="space-y-2">
            {watchlist.map((stock) => {
              const isPositiveChange = stock.change ? stock.change >= 0 : true;
              return (
                <div
                  key={stock.symbol}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50 cursor-pointer group"
                >
                  <div onClick={() => onSelectStock(stock.symbol)} className="flex-grow">
                    <p className="font-medium">{stock.symbol}</p>
                    {stock.name && <p className="text-xs text-ios-gray">{stock.name}</p>}
                  </div>
                  <div className="text-right mx-4" onClick={() => onSelectStock(stock.symbol)}>
                    {stock.price !== undefined && stock.price !== null ? (
                        <>
                          <p className="font-medium">${stock.price.toFixed(2)}</p>
                          {stock.changePercent !== undefined && stock.changePercent !== null ? (
                              <div className={`flex items-center justify-end text-xs ${isPositiveChange ? 'text-ios-green' : 'text-ios-red'}`}>
                                {isPositiveChange ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                <span>{isPositiveChange ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                              </div>
                          ) : (
                             <p className="text-xs text-ios-gray">-</p>
                          )}
                        </>
                    ) : (
                        <p className="text-xs text-ios-gray">Loading...</p>
                    )}
                  </div>
                   <Button
                     variant="ghost"
                     size="icon"
                     onClick={(e) => {
                       e.stopPropagation();
                       handleRemove(stock.symbol);
                     }}
                     disabled={removeMutation.isPending && removeMutation.variables === stock.symbol}
                     className="text-ios-gray hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                   >
                      {removeMutation.isPending && removeMutation.variables === stock.symbol ? (
                         <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                         <Trash2 className="h-4 w-4" />
                      )}
                   </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WatchlistCard;
