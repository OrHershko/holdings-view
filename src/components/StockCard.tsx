import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Pencil } from 'lucide-react';
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
  onClick: () => void;
  onEdit: () => void;
  id: string;
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
  onClick,
  onEdit,
  id
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
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };
  
  return (
    <div ref={setNodeRef} style={style}>
      <Card className="ios-card hover:shadow-md transition-shadow duration-200">
        <div {...attributes} {...listeners} className="cursor-grab">
          <CardContent className="p-4" onClick={onClick}>
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
        </div>
        <div className="px-4 pb-4">
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
      </Card>
    </div>
  );
};

export default StockCard;
