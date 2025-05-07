import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, TrendingUp, TrendingDown, Loader2, GripVertical } from 'lucide-react';
import { useAddToWatchlist, useRemoveFromWatchlist, useReorderWatchlist, WatchlistItem } from '@/hooks/usePostgresData';
import { useToast } from './ui/use-toast';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';

interface WatchlistCardProps {
  onSelectStock: (symbol: string) => void;
  watchlistItems: WatchlistItem[];
  isGuest?: boolean;
  onAddGuestWatchlistItem?: (symbol: string) => void;
  onRemoveGuestWatchlistItem?: (symbol: string) => void;
  onReorderGuestWatchlist?: (orderedSymbols: string[]) => void;
  isWatchlistReordering?: boolean;
}

const WatchlistCard: React.FC<WatchlistCardProps> = ({
  onSelectStock,
  watchlistItems,
  isGuest,
  onAddGuestWatchlistItem,
  onRemoveGuestWatchlistItem,
  onReorderGuestWatchlist,
  isWatchlistReordering
}) => {
  const [newSymbol, setNewSymbol] = useState('');
  const isLoading = false;
  const error = null;

  const { toast } = useToast();
  const [localOrder, setLocalOrder] = useState<string[]>([]);

  const addMutation = useAddToWatchlist();
  const removeMutation = useRemoveFromWatchlist();
  const reorderMutation = useReorderWatchlist();
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (watchlistItems && watchlistItems.length >= 0) {
      setLocalOrder(watchlistItems.map(item => item.symbol));
    }
  }, [watchlistItems]);
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = localOrder.indexOf(String(active.id));
    const newIndex = localOrder.indexOf(String(over.id));
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    const newOrder = arrayMove(localOrder, oldIndex, newIndex);
    setLocalOrder(newOrder);
    
    if (isGuest && onReorderGuestWatchlist) {
      onReorderGuestWatchlist(newOrder);
    } else if (!isGuest) {
      try {
        reorderMutation.mutate(newOrder);
      } catch (err) {
        console.error("Reorder failed for user, rolling back UI", err);
        setLocalOrder(arrayMove(newOrder, newIndex, oldIndex)); 
      }
    } else {
      console.warn('WatchlistCard: Guest mode but onReorderGuestWatchlist not provided.');
      setLocalOrder(arrayMove(newOrder, newIndex, oldIndex)); 
    }
  };

  const handleAdd = () => {
    if (!newSymbol.trim()) return;
    const symbol = newSymbol.trim().toUpperCase();

    if (isGuest && onAddGuestWatchlistItem) {
      onAddGuestWatchlistItem(symbol);
      setNewSymbol('');
    } else if (!isGuest) {
      const symbolExists = watchlistItems?.some(item => item.symbol === symbol);
      if (symbolExists) {
        toast({ 
          title: "Already in Watchlist", 
          description: `${symbol} is already in your watchlist.`
        });
        setNewSymbol('');
        return;
      }
      addMutation.mutate(symbol, {
        onSuccess: () => {
          setNewSymbol('');
          toast({ title: "Added to Watchlist", description: `${symbol} added.`});
        },
        onError: (error: any) => {
          if (error.message?.includes('already in watchlist')) {
            toast({ title: "Already in Watchlist", description: `${symbol} is already in your watchlist.`});
          } else {
            toast({ title: "Error", description: error.message || "Failed to add stock.", variant: "destructive"});
          }
        }
      });
    } else {
      console.warn('WatchlistCard: Guest mode but onAddGuestWatchlistItem not provided.');
    }
  };

  const handleRemove = (symbol: string) => {
    if (isGuest && onRemoveGuestWatchlistItem) {
      onRemoveGuestWatchlistItem(symbol);
    } else if (!isGuest) {
      removeMutation.mutate(symbol, {
         onSuccess: () => {
           toast({ title: "Removed from Watchlist", description: `${symbol} removed.`});
         },
         onError: (error: any) => {
            toast({ title: "Error", description: error.message || "Failed to remove stock.", variant: "destructive"});
         }
      });
    } else {
      console.warn('WatchlistCard: Guest mode but onRemoveGuestWatchlistItem not provided.');
    }
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
            disabled={(isGuest ? false : addMutation.isPending) || !newSymbol.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {(isGuest ? false : addMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
        
        {isLoading && (
          <div className="text-center py-4">
            <Loader2 className="h-6 w-6 animate-spin inline-block text-ios-gray" />
          </div>
        )}
        {error && <p className="text-center text-red-500">Error loading watchlist.</p>}
        {!isLoading && !error && watchlistItems && watchlistItems.length === 0 && (
          <p className="text-center text-ios-gray">Your watchlist is empty.</p>
        )}
        {!isLoading && !error && watchlistItems && watchlistItems.length > 0 && (
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragStart={() => document.body.style.cursor = "grabbing"}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={localOrder} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {localOrder.map((symbol) => {
                  const stock = watchlistItems.find(item => item.symbol === symbol);
                  if (!stock) return null; 
                  const isPositiveChange = stock.change ? stock.change >= 0 : true;
                  
                  return (
                    <SortableWatchlistItem 
                      key={symbol} 
                      id={symbol}
                      stock={stock}
                      isPositiveChange={isPositiveChange}
                      onSelectStock={onSelectStock}
                      onRemove={handleRemove}
                      isSavingOrder={isWatchlistReordering || false}
                      isGuest={isGuest}
                      isRemoving={removeMutation.isPending}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
};

interface SortableWatchlistItemProps {
  id: string;
  stock: WatchlistItem;
  isPositiveChange: boolean;
  onSelectStock: (symbol: string) => void;
  onRemove: (symbol: string) => void;
  isSavingOrder: boolean;
  isGuest?: boolean;
  isRemoving?: boolean;
}

function SortableWatchlistItem({
  id,
  stock,
  isPositiveChange,
  onSelectStock,
  onRemove,
  isSavingOrder,
  isGuest,
  isRemoving
}: SortableWatchlistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const itemStyle = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
    position: 'relative' as const,
    background: isDragging ? 'rgba(63, 63, 70, 0.5)' : undefined,
  };

  const showPreMarket = stock.marketState === 'PRE' && stock.preMarketPrice !== undefined;
  const showPostMarket = stock.marketState === 'POST' && stock.postMarketPrice !== undefined;
  
  const displayPrice = showPreMarket ? stock.preMarketPrice : 
                       showPostMarket ? stock.postMarketPrice : 
                       stock.price;

  return (
    <div
      ref={setNodeRef}
      style={itemStyle}
      className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50 group"
    >
      {/* Drag handle */}
      <div 
        {...attributes} 
        {...listeners}
        className="mr-2 text-ios-gray hover:text-white cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
          }
        }}
      >
        <GripVertical size={16} />
      </div>
      
      {/* Content */}
      <div onClick={() => onSelectStock(stock.symbol)} className="flex-grow cursor-pointer">
        <p className="font-medium">{stock.symbol}</p>
        {stock.name && <p className="text-xs text-ios-gray min-w-[140px]">{stock.name}</p>}
      </div>
      
      {/* Price and change */}
      <div className="grid grid-cols-1 min-w-[100px]" onClick={() => onSelectStock(stock.symbol)}>
        {displayPrice !== undefined && displayPrice !== null ? (
          <>
            <div className="font-medium truncate flex items-center justify-end">
              <span>${displayPrice.toFixed(2)}</span>
              {showPreMarket && (
                <span className="ml-1 text-xs text-amber-400">pre</span>
              )}
              {showPostMarket && (
                <span className="ml-1 text-xs text-purple-400">post</span>
              )}
            </div>
            <div className={`text-xs flex items-center justify-end ${isPositiveChange ? 'text-ios-green' : 'text-ios-red'}`}>
              {isPositiveChange ? 
                <TrendingUp className="h-3 w-3 mr-1" /> : 
                <TrendingDown className="h-3 w-3 mr-1" />
              }
              <span className="truncate">{stock.changePercent !== undefined ? stock.changePercent.toFixed(2) : '0.00'}%</span>
            </div>
          </>
        ) : (
          <p className="font-medium text-ios-gray">...</p>
        )}
      </div>
      
      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(stock.symbol)}
        disabled={isSavingOrder || (isGuest ? false : isRemoving)}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="h-4 w-4 text-ios-gray hover:text-ios-red" />
      </Button>
    </div>
  );
}

export default WatchlistCard;
