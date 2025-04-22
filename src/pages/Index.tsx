import React, { useState, useCallback } from 'react';
import Header from '@/components/Header';
import PortfolioSummary from '@/components/PortfolioSummary';
import StockChart from '@/components/StockChart';
import StockCard from '@/components/StockCard';
import WatchlistCard from '@/components/WatchlistCard';
import { usePortfolio, useStock } from '@/hooks/useStockData';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import Sidebar from '@/components/Sidebar';
import MarketOverview from '@/components/MarketOverview';
import AddStockDialog from '@/components/AddStockDialog';
import EditHoldingDialog from '@/components/EditHoldingDialog';
import { Button } from '@/components/ui/button';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
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
  const { data: portfolioData } = usePortfolio();
  const { data: stockData } = useStock(selectedStock || '');
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
  
  const handleSelectStock = (symbol: string) => {
    setSelectedStock(symbol);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://holdings-view.vercel.app/api';
        const response = await fetch(`${API_BASE_URL}/portfolio/reorder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fromId: active.id,
            toId: over.id,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to reorder holdings');
        }

        // Invalidate and refetch portfolio data
        await queryClient.invalidateQueries({ queryKey: ['portfolio'] });
        await queryClient.refetchQueries({ queryKey: ['portfolio'], type: 'active' }); // Force refetch after drag
      } catch (error) {
        console.error('Error reordering holdings:', error);
      }
    }
  };

  const handleAddStockClose = useCallback(async () => {
    setIsAddStockDialogOpen(false);
    await queryClient.refetchQueries({ queryKey: ['portfolio'], type: 'active' });
  }, [queryClient]);

  const handleEditHoldingClose = useCallback(async () => {
    setEditingHolding(null);
    await queryClient.refetchQueries({ queryKey: ['portfolio'], type: 'active' });
  }, [queryClient]);

  const handleUploadCsvClose = useCallback(async () => {
    setIsUploadCsvDialogOpen(false);
    await queryClient.refetchQueries({ queryKey: ['portfolio'], type: 'active' });
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

                  {/* Selected Stock Chart */}
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
                      items={portfolioData?.holdings.slice().sort((a, b) => a.position - b.position).map(h => h.symbol) || []}
                      strategy={verticalListSortingStrategy}
                    >
                      {portfolioData?.holdings.slice().sort((a, b) => a.position - b.position).map((holding) => (
                        <StockCard
                          key={holding.symbol}
                          id={holding.symbol}
                          {...holding}
                          onClick={() => handleSelectStock(holding.symbol)}
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
                  <WatchlistCard onSelectStock={handleSelectStock} />
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
