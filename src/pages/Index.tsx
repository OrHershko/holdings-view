import React, { useState, useRef, useCallback, useEffect } from "react";
import Header from "@/components/Header";
import PortfolioSummary from "@/components/PortfolioSummary";
import StockChart from "@/components/StockChart";
import StockCard from "@/components/StockCard";
import WatchlistCard from "@/components/WatchlistCard";
import { useStock, useMultipleStockInfo } from "@/hooks/useStockData";
import { useApiPortfolio } from "@/hooks/useApiPortfolio";

import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import MarketOverview from "@/components/MarketOverview";
import AddStockDialog from "@/components/AddStockDialog";
import EditHoldingDialog from "@/components/EditHoldingDialog";
import UploadCsvDialog from "@/components/UploadCsvDialog";
import { Button } from "@/components/ui/button";

// dnd‑kit
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

const PortfolioPage = () => {
  const queryClient = useQueryClient();

  /* ────────────────   DATA  ──────────────── */
  const { data: portfolioData, reorderPortfolio, isReordering } = useApiPortfolio();
  const symbols = portfolioData?.holdings.map((h) => h.symbol) || [];
  const { data: liveStockData = [] } = useMultipleStockInfo(symbols);

  // merge live + cached
  const mergedHoldings = (portfolioData?.holdings || []).map((h) => {
    const live = liveStockData.find((s) => s.symbol === h.symbol) || ({} as any);
    const price = live.price ?? h.currentPrice;
    const change = live.change ?? h.change;
    const changePercent = live.changePercent ?? h.changePercent;
    const value = price * h.shares;
    const gain = (price - h.averageCost) * h.shares;
    const gainPercent = h.averageCost ? (gain / (h.averageCost * h.shares)) * 100 : 0;
    return { ...h, currentPrice: price, change, changePercent, value, gain, gainPercent };
  });

  /* ────────────────   LOCAL ORDER STATE  ──────────────── */
  // We keep local order for super‑smooth drag‑and‑drop. It is initialised from the DB once.
  const [localOrder, setLocalOrder] = useState<string[]>([]);

  useEffect(() => {
    if (portfolioData) {
      const ordered = [...portfolioData.holdings]
        .sort((a, b) => a.position - b.position)
        .map((h) => h.symbol);
      setLocalOrder(ordered);
    }
  }, [portfolioData]);

  /* ────────────────   DND‑KIT SENSORS  ──────────────── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /* ────────────────   DRAG END HANDLER  ──────────────── */
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    document.body.style.cursor = "default";
    if (!over || active.id === over.id) return;

    const oldIndex = localOrder.indexOf(String(active.id));
    const newIndex = localOrder.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    // optimistic UI update
    const newOrder = arrayMove(localOrder, oldIndex, newIndex);
    setLocalOrder(newOrder);

    try {
      // Call the reorderPortfolio mutation (removed unnecessary await)
      reorderPortfolio(newOrder); // persist to the database
      // No need to invalidate cache - handled by the optimistic update in the mutation
    } catch (err) {
      console.error("reorder failed, rolling back", err);
      setLocalOrder(localOrder); // rollback on error
    }
  };

  /* ────────────────   UI STATE  ──────────────── */
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const { data: stockData } = useStock(selectedStock || "");
  const chartRef = useRef<HTMLDivElement>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeItem, setActiveItem] = useState("home");
  const [isAddStockDialogOpen, setIsAddStockDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<{
    symbol: string;
    name: string;
    shares: number;
    averageCost: number;
  } | null>(null);

  const toggleMobileSidebar = () => setMobileSidebarOpen(!mobileSidebarOpen);

  const handleStockClick = (symbol: string) => {
    setSelectedStock(symbol);
    setTimeout(() => chartRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  };

  const refetchPortfolio = useCallback(() =>
    queryClient.refetchQueries({ queryKey: ["firebase-portfolio"], type: "active" }), [queryClient]);

  const afterDialogClose = async (setter: React.Dispatch<React.SetStateAction<any>>) => {
    setter(false);
    await refetchPortfolio();
  };

  /* ────────────────   RENDER  ──────────────── */
  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden relative flex">
      {/* Gradient backgrounds */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      {/* Sidebar + backdrop */}
      {mobileSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={toggleMobileSidebar} />}
      <aside className={`fixed inset-y-0 left-0 w-64 z-40 md:relative md:h-screen md:block transition-transform transform ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}> <Sidebar activeItem={activeItem} setActiveItem={setActiveItem} /> </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        <Header toggleMobileSidebar={toggleMobileSidebar} />
        <main className="flex-1 px-4 md:px-8 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Holdings & chart */}
            <section className="lg:col-span-2 space-y-6">
              <PortfolioSummary />
              <div ref={chartRef}>{selectedStock && stockData && 
              (<StockChart 
                symbol={stockData.symbol}
                stockName={stockData.name}         
                currentPrice={stockData.price}     
                change={stockData.change}
                changePercent={stockData.changePercent}
                marketCap={stockData.marketCap}
                volume={stockData.volume}
              />)}</div>

              {/* Holdings list */}
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium ml-1">Your Holdings</h2>
                <div className="flex space-x-2">
                  <Button onClick={() => setIsAddStockDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">Add Stock</Button>
                </div>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={() => document.body.style.cursor = "grabbing"} onDragEnd={handleDragEnd}>
                <SortableContext items={localOrder} strategy={verticalListSortingStrategy}>
                  {localOrder.map((symbol) => {
                    // Find the holding by symbol, with null check
                    const holding = mergedHoldings.find((h) => h.symbol === symbol);
                    if (!holding) return null; // Skip if not found
                    return (
                      <StockCard
                        key={symbol}
                        id={symbol}
                        {...holding}
                        onClick={() => handleStockClick(symbol)}
                        onEdit={() => setEditingHolding({ symbol, name: holding.name, shares: holding.shares, averageCost: holding.averageCost })}
                        isSavingOrder={isReordering}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>
            </section>

            {/* Market overview + watchlist */}
            <aside className="lg:col-span-1 space-y-6">
              <MarketOverview portfolio={symbols} />
              <WatchlistCard onSelectStock={handleStockClick} />
            </aside>
          </div>
        </main>
      </div>

      {/* Dialogs */}
      <AddStockDialog isOpen={isAddStockDialogOpen} onClose={() => afterDialogClose(setIsAddStockDialogOpen)} />
      {editingHolding && <EditHoldingDialog isOpen={!!editingHolding} onClose={() => afterDialogClose(() => setEditingHolding(null))} holding={editingHolding} />}
    </div>
  );
};

export default PortfolioPage;

