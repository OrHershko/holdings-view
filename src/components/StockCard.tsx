import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Pencil, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  preMarketPrice: number;
  postMarketPrice: number;
  marketState?: string;
  onClick: () => void;
  onEdit: () => void;
  id: string;
  isSavingOrder?: boolean;
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
  preMarketPrice,
  postMarketPrice,
  marketState,
  onClick,
  onEdit,
  id,
  isSavingOrder = false
}) => {

  const isPositiveChange = change >= 0;
  const isPositiveGain = gain >= 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };
  
  return (
    <div ref={setNodeRef} style={style} className="min-w-[320px]">
      <Card className="ios-card hover:shadow-md transition-shadow duration-200 flex flex-row items-stretch">
        <div 
          {...attributes} 
          {...listeners} 
          className="p-2 flex items-center justify-center cursor-grab text-ios-gray hover:bg-gray-700/50 rounded-l-lg rounded-r-none border-b-0 border-r border-gray-200 dark:border-gray-700 touch-action-none"
        >
          <GripVertical className="h-5 w-5" />
        </div>

        <button 
          className="flex-grow text-left" 
          onClick={onClick} 
          aria-label={`View details for ${symbol}`}
          type="button"
        >
          <CardContent className="p-4 pt-3 pb-3">
            {/* Main content row with stock info and prices side by side */}
            <div className="flex items-start">
              {/* Stock symbol and name */}
              <div className="flex-grow">
                <h3 className="font-medium">{symbol}</h3>
                <p className="text-xs text-ios-gray">{name}</p>
              </div>
            </div>
            
            <div className="mt-2 grid grid-cols-1 xs:grid-cols-2 gap-x-4 sm:gap-x-8 md:gap-x-12 gap-y-2 text-xs">
              <div>
                <p className="text-ios-gray">Shares</p>
                <p>{shares}</p>
              </div>
              <div>
                <p className="text-ios-gray">Average Cost</p>
                <p>${typeof averageCost === 'number' ? averageCost.toFixed(2) : '--'}</p>
              </div>
              <div>
                <p className="text-ios-gray">Value</p>
                <p>${typeof value === 'number' ? value.toFixed(2) : '--'}</p>
              </div>
              <div>
                <p className="text-ios-gray">Total Gain/Loss</p>
                <p className={isPositiveGain ? 'text-ios-green' : 'text-ios-red'}>
                  {isPositiveGain ? '+' : ''}{typeof gainPercent === 'number' ? gainPercent.toFixed(2) : '--'}%
                </p>
              </div>
            </div>
          </CardContent>
        </button>

        {/* Container for Price information and Edit Button */}
        <div className="flex flex-col justify-between px-3 pt-3 pb-3 border-t-0 border-l border-gray-200 dark:border-gray-700 w-auto max-w-xs">
          {/* Price information section */}
          <div>
          <div className="flex justify-end mb-3">
            <div className="text-right">
              <p className="text-xs text-ios-gray font-medium">Current Price</p>
              <p className="font-medium">${typeof currentPrice === 'number' ? currentPrice.toFixed(2) : '--'}</p>
              <div className={`flex items-center justify-end text-xs ${isPositiveChange ? 'text-ios-green' : 'text-ios-red'}`}>
                {isPositiveChange ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                <span>{isPositiveChange ? '+' : ''}{typeof change === 'number' ? change.toFixed(2) : '--'} ({typeof changePercent === 'number' ? changePercent.toFixed(2) : '--'}%)</span>
              </div>
            </div>
          </div>
          
          {/* Pre/Post market section - only show if applicable */}
            {((marketState === 'PRE' && preMarketPrice > 0) || (marketState === 'POST' && postMarketPrice > 0)) && (
              <div className="flex justify-end mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
              {marketState === 'PRE' && preMarketPrice > 0 && (
                <div className="text-right">
                  <p className="text-xs text-ios-gray font-medium">Pre-Market</p>
                  <p className="font-medium">${typeof preMarketPrice === 'number' ? preMarketPrice.toFixed(2) : '--'}</p>
                  <div className={`flex items-center justify-end text-xs ${preMarketPrice > currentPrice ? 'text-ios-green' : 'text-ios-red'}`}>
                    {preMarketPrice > currentPrice ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    <span>
                      {preMarketPrice > currentPrice ? '+' : ''}
                      {(preMarketPrice - currentPrice).toFixed(2)} 
                      ({((preMarketPrice / currentPrice - 1) * 100).toFixed(2)}%)
                    </span>
                  </div>
                </div>
              )}
              
              {marketState === 'POST' && postMarketPrice > 0 && (
                <div className="text-right">
                  <p className="text-xs text-ios-gray font-medium">After Hours</p>
                  <p className="font-medium">${typeof postMarketPrice === 'number' ? postMarketPrice.toFixed(2) : '--'}</p>
                  <div className={`flex items-center justify-end text-xs ${postMarketPrice > currentPrice ? 'text-ios-green' : 'text-ios-red'}`}>
                    {postMarketPrice > currentPrice ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    <span>
                      {postMarketPrice > currentPrice ? '+' : ''}
                      {(postMarketPrice - currentPrice).toFixed(2)} 
                      ({((postMarketPrice / currentPrice - 1) * 100).toFixed(2)}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
            )}
        </div>
          {/* Edit Button - Pushed to the bottom */}
          <div className="flex items-end mt-auto pt-2"> {/* Added pt-2 for spacing when content above is short */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEditClick}
              className="text-ios-gray hover:text-white w-full"
          >
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StockCard;
