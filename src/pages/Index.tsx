import React, { useState, useRef, useCallback } from 'react';
import Header from '@/components/Header';
import PortfolioSummary from '@/components/PortfolioSummary';
import StockChart from '@/components/StockChart';
import StockCard from '@/components/StockCard';
import WatchlistCard from '@/components/WatchlistCard';
import { useStock, useMultipleStockInfo } from '@/hooks/useStockData';
import { useFirebasePortfolio } from '@/hooks/useFirebasePortfolio';

import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import Sidebar from '@/components/Sidebar';
import MarketOverview from '@/components/MarketOverview';
import AddStockDialog from '@/components/AddStockDialog';
import EditHoldingDialog from '@/components/EditHoldingDialog';
import { Button } from '@/components/ui/button';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import UploadCsvDialog from '@/components/UploadCsvDialog';


// Create a client
const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      staleTime: 0,
      gcTime: 0,
    },
  },
});

const Index = () => {
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const { data: portfolioData, reorderPortfolio } = useFirebasePortfolio();
  const { data: stockData } = useStock(selectedStock || '');
  // Batch fetch live data for portfolio holdings
  const symbols = portfolioData?.holdings.map(h => h.symbol) || [];
  const { data: liveStockData = [] } = useMultipleStockInfo(symbols);
  const mergedHoldings = portfolioData?.holdings.map(h => {
    const live = liveStockData.find(s => s.symbol === h.symbol) || {} as any;
    const price = live.price ?? h.currentPrice;
    const change = live.change ?? h.change;
    const changePercent = live.changePercent ?? h.changePercent;
    const marketCap = live.marketCap ?? h.marketCap;
    const volume = live.volume ?? h.volume;
    const preMarketPrice = live.preMarketPrice ?? h.preMarketPrice;
    const postMarketPrice = live.postMarketPrice ?? h.postMarketPrice;
    const marketState = live.marketState ?? h.marketState;
    const shares = h.shares;
    const averageCost = h.averageCost;
    const value = price * shares;
    const gain = (price - averageCost) * shares;
    const gainPercent = averageCost ? (gain / (averageCost * shares)) * 100 : 0;
    return {
      ...h,
      currentPrice: price,
      change,
      changePercent,
      marketCap,
      volume,
      preMarketPrice,
      postMarketPrice,
      marketState,
      value,
      gain,
      gainPercent,
    };
  }) || [];
  // Reference to the chart section for scrolling
  const chartRef = useRef<HTMLDivElement>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeItem, setActiveItem] = useState('home');
  const [isAddStockDialogOpen, setIsAddStockDialogOpen] = useState(false);
  const [isUploadCsvDialogOpen, setIsUploadCsvDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<{
    symbol: string;
    name: string;
    shares: number;
    averageCost: number;
  } | null>(null);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleMobileSidebar = () => setMobileSidebarOpen(!mobileSidebarOpen);
  
  const handleStockClick = (symbol: string) => {
    setSelectedStock(symbol);
    
    setTimeout(() => {
      if (chartRef.current) {
        chartRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center' 
        });
    
        window.scrollBy({
          top: 100, 
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  
const handleDragEnd = async (event: any) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  const oldIndex = portfolioData?.holdings.findIndex(h => h.symbol === active.id);
  const newIndex = portfolioData?.holdings.findIndex(h => h.symbol === over.id);
  if (oldIndex === -1 || newIndex === -1) return;

  const sortedHoldings = [...portfolioData.holdings].sort((a, b) => a.position - b.position);
  const newOrder = arrayMove(sortedHoldings, oldIndex, newIndex);
  const orderedSymbols = newOrder.map(h => h.symbol);
  
  // Use the Firebase-specific reorder function
  reorderPortfolio(orderedSymbols);
};


  const handleAddStockClose = useCallback(async () => {
    setIsAddStockDialogOpen(false);
    await queryClient.refetchQueries({ queryKey: ['firebase-portfolio'], type: 'active' });
  }, [queryClient]);

  const handleEditHoldingClose = useCallback(async () => {
    setEditingHolding(null);
    await queryClient.refetchQueries({ queryKey: ['firebase-portfolio'], type: 'active' });
  }, [queryClient]);

  const handleUploadCsvClose = useCallback(async () => {
    setIsUploadCsvDialogOpen(false);
    await queryClient.refetchQueries({ queryKey: ['firebase-portfolio'], type: 'active' });
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClientInstance}>
      <div className="min-h-screen bg-[#121212]">
        <div className="min-h-screen bg-gray-900 text-white overflow-hidden relative flex">
          {/* Background gradient effects */}
          <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          
          {/* Mobile sidebar backdrop */}
          {mobileSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-30 md:hidden"
              onClick={toggleMobileSidebar}
            />
          )}
          
          {/* Sidebar */}
          <div 
            className={`fixed inset-y-0 left-0 w-64 z-40 md:relative md:h-screen md:block transition-transform transform ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
          >
            <Sidebar activeItem={activeItem} setActiveItem={setActiveItem} />
          </div>
          
          {/* Main content */}
          <div className="flex-1 flex flex-col h-screen overflow-y-auto">
            <Header toggleMobileSidebar={toggleMobileSidebar} />
            
            <main className="flex-1 px-4 md:px-8 pb-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column - Portfolio overview */}
                <div className="lg:col-span-2">
                  <PortfolioSummary />

                  {/* Selected Stock Chart - with ref for scrolling */}
                  <div ref={chartRef}>
                  {selectedStock && stockData && (
                    <StockChart 
                      symbol={stockData.symbol}
                      stockName={stockData.name}
                      currentPrice={stockData.price}
                      change={stockData.change}
                      changePercent={stockData.changePercent}
                      marketCap={stockData.marketCap}
                      volume={stockData.volume}
                    />
                  )}
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium ml-1 text-white">Your Holdings</h2>
                    <div className="flex space-x-2">
                      <Button 
                        onClick={() => setIsUploadCsvDialogOpen(true)}
                        variant="outline"
                        className="text-white border-blue-600 hover:bg-blue-600/20"
                      >
                        Upload CSV
                      </Button>
                      <Button 
                        onClick={() => setIsAddStockDialogOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Add Stock
                      </Button>
                    </div>
                  </div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={mergedHoldings.slice().sort((a, b) => a.position - b.position).map(h => h.symbol) || []}
                      strategy={verticalListSortingStrategy}
                    >
                      {mergedHoldings.slice().sort((a, b) => a.position - b.position).map((holding) => (
                        <StockCard
                          key={holding.symbol}
                          id={holding.symbol}
                          {...holding}
                          onClick={() => handleStockClick(holding.symbol)}
                          onEdit={() => setEditingHolding({
                            symbol: holding.symbol,
                            name: holding.name,
                            shares: holding.shares,
                            averageCost: holding.averageCost,
                          })}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>                  
                {/* Right column - Auxiliary data */}
                <div className="lg:col-span-1">
                  <MarketOverview portfolio={portfolioData?.holdings.map((holding) => holding.symbol) || []} />
                  <WatchlistCard onSelectStock={handleStockClick} />
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Add Stock Dialog */}
      <AddStockDialog 
        isOpen={isAddStockDialogOpen}
        onClose={handleAddStockClose}
      />

      {/* Edit Holding Dialog */}
      {editingHolding && (
        <EditHoldingDialog
          isOpen={!!editingHolding}
          onClose={handleEditHoldingClose}
          holding={editingHolding}
        />
      )}

      {/* Upload CSV Dialog */}
      <UploadCsvDialog
        isOpen={isUploadCsvDialogOpen}
        onClose={handleUploadCsvClose}
      />
    </QueryClientProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClientInstance}>
    <Index />
  </QueryClientProvider>
);

export default App;
