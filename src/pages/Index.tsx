import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import PortfolioSummary from "@/components/PortfolioSummary";
import StockChart from "@/components/StockChart";
import StockCard from "@/components/StockCard";
import WatchlistCard from "@/components/WatchlistCard";
import { useMultipleStockInfo, usePortfolio, useReorderPortfolio, useWatchlist, useReorderWatchlist } from "@/hooks/usePostgresData";
import { getAuth, User } from "firebase/auth";
import { useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/Sidebar";
import MarketOverview from "@/components/MarketOverview";
import AddStockDialog from "@/components/AddStockDialog";
import EditHoldingDialog from "@/components/EditHoldingDialog";
import { Button } from "@/components/ui/button";
import { fetchStock } from "@/services/stockService";
import { useToast } from "@/components/ui/use-toast";

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

// Import types that might be needed for local state
import type { PortfolioHolding, PortfolioSummary as PortfolioSummaryType } from "@/api/stockApi"; // Corrected path
import type { WatchlistItem } from "@/hooks/usePostgresData"; // This should now work

const PortfolioPage = () => {
  const queryClient = useQueryClient();
  const auth = getAuth();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const isGuest = !currentUser;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      // Potentially refetch data or clear guest data if user logs in/out
      if (user) {
        // Clear guest data if user logs in
        setGuestPortfolioHoldings([]);
        setGuestWatchlistItems([]);
        queryClient.invalidateQueries({ queryKey: ["portfolio", user.uid] });
        queryClient.invalidateQueries({ queryKey: ["watchlist", user.uid] });
      }
    });
    return () => unsubscribe();
  }, [auth, queryClient]);

  /* ────────────────   GUEST DATA STATE (if no user is logged in) ──────────────── */
  const [guestPortfolioHoldings, setGuestPortfolioHoldings] = useState<PortfolioHolding[]>([]);
  const [guestWatchlistItems, setGuestWatchlistItems] = useState<WatchlistItem[]>([]);
  const [isGuestReordering, setIsGuestReordering] = useState(false);
  const [isGuestWatchlistReordering, setIsGuestWatchlistReordering] = useState(false); // For watchlist reorder state

  // Load guest data from localStorage on initial mount if no user
  useEffect(() => {
    if (!auth.currentUser) { // Check initial auth state, not reactive `isGuest`
      try {
        const storedHoldings = localStorage.getItem('guestPortfolioHoldings');
        if (storedHoldings) {
          setGuestPortfolioHoldings(JSON.parse(storedHoldings));
        }
        const storedWatchlist = localStorage.getItem('guestWatchlistItems');
        if (storedWatchlist) {
          setGuestWatchlistItems(JSON.parse(storedWatchlist));
        }
      } catch (error) {
        console.error("Error loading guest data from localStorage:", error);
        // Clear potentially corrupted data
        localStorage.removeItem('guestPortfolioHoldings');
        localStorage.removeItem('guestWatchlistItems');
      }
    }
  }, [auth]); // Depend on auth instance, runs once effectively for initial load decision

  // Save guest portfolio to localStorage when it changes
  useEffect(() => {
    if (isGuest) {
      localStorage.setItem('guestPortfolioHoldings', JSON.stringify(guestPortfolioHoldings));
    }
  }, [guestPortfolioHoldings, isGuest]);

  // Save guest watchlist to localStorage when it changes
  useEffect(() => {
    if (isGuest) {
      localStorage.setItem('guestWatchlistItems', JSON.stringify(guestWatchlistItems));
    }
  }, [guestWatchlistItems, isGuest]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        // User logged in: Clear guest state and localStorage
        setGuestPortfolioHoldings([]);
        setGuestWatchlistItems([]);
        localStorage.removeItem('guestPortfolioHoldings');
        localStorage.removeItem('guestWatchlistItems');
        queryClient.invalidateQueries({ queryKey: ["portfolio", user.uid] });
        queryClient.invalidateQueries({ queryKey: ["watchlist", user.uid] });
      } else {
        // User logged out or no user initially: try to load from localStorage
        // This might be redundant if the initial load effect covers it, but safe for logout
        try {
          const storedHoldings = localStorage.getItem('guestPortfolioHoldings');
          if (storedHoldings) setGuestPortfolioHoldings(JSON.parse(storedHoldings));
          else setGuestPortfolioHoldings([]); // Ensure it's empty if nothing in LS
          const storedWatchlist = localStorage.getItem('guestWatchlistItems');
          if (storedWatchlist) setGuestWatchlistItems(JSON.parse(storedWatchlist));
          else setGuestWatchlistItems([]); // Ensure it's empty
        } catch (error) {
          console.error("Error reloading guest data from localStorage on logout:", error);
          setGuestPortfolioHoldings([]);
          setGuestWatchlistItems([]);
        }
      }
    });
    return () => unsubscribe();
  }, [auth, queryClient]);

  /* ────────────────   GUEST PORTFOLIO HANDLERS ──────────────── */
  // Type for stock data passed from AddStockDialog
  type GuestStockAddData = { symbol: string; shares: number; averageCost: number; name?: string };

  const handleGuestAddStocks = async (stocksToAdd: GuestStockAddData[]) => {
    const addedSymbols: string[] = [];
    const failedSymbols: string[] = [];

    for (const stock of stocksToAdd) {
      try {
        const stockInfo = await fetchStock(stock.symbol.toUpperCase());
        if (!stockInfo || stockInfo.price === undefined || stockInfo.price === null) {
          // Check if price is explicitly null or undefined, 0 might be a valid (though rare) price
          throw new Error(`No valid price data found for ${stock.symbol}`);
        }

        setGuestPortfolioHoldings(prevHoldings => {
          const updatedHoldings = [...prevHoldings];
          let maxPosition = updatedHoldings.reduce((max, h) => Math.max(max, h.position), -1);
          const existingHoldingIndex = updatedHoldings.findIndex(h => h.symbol.toUpperCase() === stock.symbol.toUpperCase());

          if (existingHoldingIndex !== -1) {
            updatedHoldings[existingHoldingIndex] = {
              ...updatedHoldings[existingHoldingIndex],
              shares: updatedHoldings[existingHoldingIndex].shares + stock.shares, 
              averageCost: stock.averageCost, 
              name: stockInfo.name || stock.name || updatedHoldings[existingHoldingIndex].name,
            };
          } else {
            maxPosition++;
            const newHolding: PortfolioHolding = {
              symbol: stockInfo.symbol, // Use symbol from fetched data for correct casing
              name: stockInfo.name || stock.symbol.toUpperCase(),
              shares: stock.shares,
              averageCost: stock.averageCost,
              position: maxPosition,
              currentPrice: stockInfo.price, // Use fetched price
              change: stockInfo.change || 0,
              changePercent: stockInfo.changePercent || 0,
              value: stock.shares * stockInfo.price,
              gain: (stockInfo.price - stock.averageCost) * stock.shares,
              gainPercent: stock.averageCost ? ((stockInfo.price - stock.averageCost) * stock.shares) / (stock.averageCost * stock.shares) * 100 : 0,
              type: stockInfo.type as 'stock' | 'etf' | 'crypto' | 'cash', 
              preMarketPrice: stockInfo.preMarketPrice || 0,
              postMarketPrice: stockInfo.postMarketPrice || 0,
              marketState: stockInfo.marketState || 'REGULAR',
            };
            updatedHoldings.push(newHolding);
          }
          return updatedHoldings.sort((a, b) => a.position - b.position); // Ensure order is maintained
        });
        addedSymbols.push(stock.symbol.toUpperCase());
      } catch (error) {
        console.error(`Failed to validate or add guest stock ${stock.symbol}:`, error);
        failedSymbols.push(stock.symbol.toUpperCase());
      }
    }

    if (addedSymbols.length > 0) {
      toast({
        title: "Stocks Processed (Guest)",
        description: `${addedSymbols.join(", ")} added/updated. ${failedSymbols.length > 0 ? `Failed: ${failedSymbols.join(", ")}` : ""}`,
        variant: failedSymbols.length > 0 ? "default" : "default", // "default" for success, could be different
      });
    } else if (failedSymbols.length > 0) {
      toast({
        title: "Failed to Add Stocks (Guest)",
        description: `Could not validate or add: ${failedSymbols.join(", ")}`,
        variant: "destructive",
      });
    }
  };

  const handleGuestUpdateHolding = (symbol: string, updatedData: { shares: number; averageCost: number }) => {
    setGuestPortfolioHoldings(prevHoldings =>
      prevHoldings.map(h =>
        h.symbol === symbol
          ? { ...h, ...updatedData, value: updatedData.shares * h.currentPrice, gain: (h.currentPrice - updatedData.averageCost) * updatedData.shares } // Recalculate value/gain
          : h
      )
    );
  };

  const handleGuestDeleteHolding = (symbol: string) => {
    setGuestPortfolioHoldings(prevHoldings => {
      const filteredHoldings = prevHoldings.filter(h => h.symbol !== symbol);
      // Re-assign positions
      return filteredHoldings.map((h, index) => ({ ...h, position: index }));
    });
  };

  /* ────────────────   GUEST WATCHLIST HANDLERS ──────────────── */
  const handleGuestAddToWatchlist = async (symbol: string) => {
    const upperSymbol = symbol.toUpperCase();
    try {
      const stockInfo = await fetchStock(upperSymbol);
      if (!stockInfo || stockInfo.price === undefined || stockInfo.price === null) {
        throw new Error(`No valid price data found for ${upperSymbol}`);
      }

      setGuestWatchlistItems(prevItems => {
        if (prevItems.some(item => item.symbol.toUpperCase() === upperSymbol)) {
          toast({ title: "Already in Watchlist", description: `${upperSymbol} is already in your guest watchlist.` });
          return prevItems;
        }
        const newItem: WatchlistItem = {
          symbol: stockInfo.symbol, // Use symbol from fetched data
          name: stockInfo.name || upperSymbol,
          price: stockInfo.price,
          change: stockInfo.change || 0,
          changePercent: stockInfo.changePercent || 0,
          // Add any other fields from WatchlistItem with defaults from stockInfo if available
        };
        toast({ title: "Added to Watchlist (Guest)", description: `${stockInfo.symbol} added.` });
        return [...prevItems, newItem];
      });

    } catch (error) {
      console.error(`Failed to validate or add ${upperSymbol} to guest watchlist:`, error);
      toast({
        title: "Error Adding to Watchlist (Guest)",
        description: `Could not add ${upperSymbol}. Symbol might be invalid or data unavailable.`,
        variant: "destructive",
      });
    }
  };

  const handleGuestRemoveFromWatchlist = (symbol: string) => {
    setGuestWatchlistItems(prevItems => prevItems.filter(item => item.symbol !== symbol));
  };

  const handleGuestReorderWatchlist = (orderedSymbols: string[]) => {
    setIsGuestWatchlistReordering(true);
    setGuestWatchlistItems(prevItems => {
      const newOrderedItems = orderedSymbols.map(symbol => {
        return prevItems.find(item => item.symbol === symbol)!
      });
      return newOrderedItems.filter(item => item !== undefined);
    });
    setTimeout(() => setIsGuestWatchlistReordering(false), 100); 
  };

  /* ────────────────   DATA (Hook-based for logged-in users)  ──────────────── */
  const { data: userPortfolioData } = usePortfolio({ enabled: !!currentUser });
  const { data: userWatchlistData } = useWatchlist({ enabled: !!currentUser });
  const reorderPortfolioMutation = useReorderPortfolio();
  const reorderWatchlistUserMutation = useReorderWatchlist(); // Assuming this hook exists and is imported
  
  const isUserReordering = reorderPortfolioMutation.isPending;
  const isUserWatchlistReordering = reorderWatchlistUserMutation.isPending;

  const isReordering = isGuest ? isGuestReordering : isUserReordering;
  const isWatchlistReordering = isGuest ? isGuestWatchlistReordering : isUserWatchlistReordering;

  /* ────────────────   DERIVED DATA - Step 1: Base Data ──────────────── */
  const basePortfolioHoldings = useMemo(() => {
    return isGuest ? guestPortfolioHoldings : (userPortfolioData?.holdings || []);
  }, [isGuest, guestPortfolioHoldings, userPortfolioData]);

  const baseWatchlist = useMemo(() => {
    return isGuest ? guestWatchlistItems : (userWatchlistData || []);
  }, [isGuest, guestWatchlistItems, userWatchlistData]);

  /* ────────────────   DERIVED DATA - Step 2: All Symbols ──────────────── */
  const allSymbols = useMemo(() => {
    const portfolioSymbols = basePortfolioHoldings.map((h) => h.symbol);
    const watchlistSymbols = baseWatchlist.map((item) => item.symbol);
    return [...new Set([...portfolioSymbols, ...watchlistSymbols])];
  }, [basePortfolioHoldings, baseWatchlist]);

  /* ────────────────   DERIVED DATA - Step 3: Fetch Live Data ──────────────── */
  const { data: liveStockData = [] } = useMultipleStockInfo(allSymbols);

  /* ────────────────  DERIVED DATA - Step 4: Calculate Summary ──────────────── */
  const currentPortfolioSummary = useMemo((): PortfolioSummaryType => {
    if (isGuest) {
      let totalValue = 0;
      let totalGain = 0;
      let totalCost = 0;
      let dayChange = 0;

      basePortfolioHoldings.forEach(h => { // Use basePortfolioHoldings
        const live = liveStockData.find(s => s.symbol === h.symbol);
        const price = live?.price ?? h.currentPrice; 
        const changeVal = live?.change ?? h.change; 
        const cost = h.averageCost * h.shares;
        
        totalValue += price * h.shares;
        totalGain += (price - h.averageCost) * h.shares;
        totalCost += cost;
        dayChange += changeVal * h.shares;
      });

      const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
      const dayChangePercent = 0; 

      return {
        totalValue,
        totalGain,
        totalGainPercent,
        dayChange,
        dayChangePercent,
      };
    }
    // For logged-in users, use summary from backend data
    return userPortfolioData?.summary || { 
      totalValue: 0, totalGain: 0, totalGainPercent: 0, dayChange: 0, dayChangePercent: 0 
    };
  }, [isGuest, basePortfolioHoldings, userPortfolioData, liveStockData]); // Depends on base holdings, user data, live data

  /* ────────────────  DERIVED DATA - Step 5: Merged Holdings ──────────────── */
  const mergedHoldings = useMemo(() => {
    return basePortfolioHoldings.map((h) => { // Use basePortfolioHoldings
      const live = liveStockData.find((s) => s.symbol === h.symbol) || ({} as any);
      const price = live.price ?? h.currentPrice;
      const change = live.change ?? h.change;
      const changePercent = live.changePercent ?? h.changePercent;
      const value = price * h.shares;
      const gain = (price - h.averageCost) * h.shares;
      const gainPercent = h.averageCost ? (gain / (h.averageCost * h.shares)) * 100 : 0;
      // Return merged holding, ensuring it includes all PortfolioHolding fields + calculated ones
      return { 
          ...h, // Spread base holding first
          currentPrice: price, 
          change, 
          changePercent, 
          value, 
          gain, 
          gainPercent,
          name: live.name ?? h.name // Update name from live if available
      };
    });
  }, [basePortfolioHoldings, liveStockData]);

  /* ────────────────  DERIVED DATA - Step 6: Merged Watchlist ──────────────── */
  const mergedWatchlist = useMemo(() => {
    return baseWatchlist.map(item => { // Use baseWatchlist
      const live = liveStockData.find(s => s.symbol === item.symbol);
      return {
        ...item,
        name: live?.name ?? item.name,
        price: live?.price ?? item.price, 
        change: live?.change ?? item.change, 
        changePercent: live?.changePercent ?? item.changePercent, 
      };
    });
  }, [baseWatchlist, liveStockData]);

  /* ────────────────   LOCAL ORDER STATE (uses base holdings) ──────────────── */
  const [localOrder, setLocalOrder] = useState<string[]>([]);

  useEffect(() => {
    const ordered = [...basePortfolioHoldings] // Use basePortfolioHoldings
      .sort((a, b) => a.position - b.position)
      .map((h) => h.symbol);
    setLocalOrder(ordered);
  }, [basePortfolioHoldings]); // Depend on base holdings

  /* ────────────────   DND‑KIT SENSORS  ──────────────── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /* ────────────────   DRAG END HANDLER  ──────────────── */
  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    document.body.style.cursor = "default";
    if (!over || active.id === over.id) return;

    const oldIndex = localOrder.indexOf(String(active.id));
    const newIndex = localOrder.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrderSymbols = arrayMove(localOrder, oldIndex, newIndex);
    setLocalOrder(newOrderSymbols); // Optimistic UI update for localOrder

    if (isGuest) {
      setIsGuestReordering(true);
      // Update guestPortfolioHoldings order
      const reorderedGuestHoldings = newOrderSymbols.map((symbol, index) => {
        const holding = guestPortfolioHoldings.find(h => h.symbol === symbol);
        return { ...holding!, position: index }; // Update position
      });
      setGuestPortfolioHoldings(reorderedGuestHoldings);
      setIsGuestReordering(false);
    } else {
      try {
        await reorderPortfolioMutation.mutateAsync(newOrderSymbols); // persist to the database
      } catch (err) {
        console.error("Reorder failed, rolling back UI for user:", err);
        // Rollback localOrder if server update fails for logged-in user
        // The query's onError would typically handle cache rollback
        setLocalOrder(arrayMove(newOrderSymbols, newIndex, oldIndex)); 
      }
    }
  };

  /* ────────────────   UI STATE  ──────────────── */
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const stockData = selectedStock ? liveStockData.find(s => s.symbol === selectedStock) : null;
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

  const refetchPortfolio = useCallback(async () => {
    if (isGuest) {
      // For guests, "refetching" might mean re-evaluating local data if it were more complex
      // or if we had a local persistence layer. For now, it does little.
      console.log("Guest data is local, no server refetch.");
      return;
    }
    if (currentUser?.uid) {
      await queryClient.refetchQueries({ queryKey: ["portfolio", currentUser.uid], type: "active" });
      await queryClient.refetchQueries({ queryKey: ["watchlist", currentUser.uid], type: "active" });
    }
  }, [queryClient, currentUser, isGuest]);

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
        <Header toggleMobileSidebar={toggleMobileSidebar} isGuest={isGuest} />
        <main className="flex-1 px-4 md:px-8 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Holdings & chart */}
            <section className="lg:col-span-2 space-y-6">
              <PortfolioSummary portfolioSummary={currentPortfolioSummary} holdings={mergedHoldings} />
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
              <MarketOverview portfolio={basePortfolioHoldings.map((h) => h.symbol)} />
              <WatchlistCard 
                watchlistItems={mergedWatchlist}
                onSelectStock={handleStockClick}
                isGuest={isGuest}
                onAddGuestWatchlistItem={handleGuestAddToWatchlist}
                onRemoveGuestWatchlistItem={handleGuestRemoveFromWatchlist}
                onReorderGuestWatchlist={handleGuestReorderWatchlist}
                isWatchlistReordering={isWatchlistReordering} 
              />
            </aside>
          </div>
        </main>
      </div>

      {/* Dialogs */}
      <AddStockDialog 
        isOpen={isAddStockDialogOpen} 
        onClose={() => afterDialogClose(setIsAddStockDialogOpen)}
        isGuest={isGuest}
        onAddGuestStocks={handleGuestAddStocks}
      />
      {editingHolding && <EditHoldingDialog 
        isOpen={!!editingHolding} 
        onClose={() => afterDialogClose(() => setEditingHolding(null))} 
        holding={editingHolding}
        isGuest={isGuest}
        onUpdateGuestHolding={handleGuestUpdateHolding}
        onDeleteGuestHolding={handleGuestDeleteHolding}
      />}
    </div>
  );
};

export type { PortfolioHolding, PortfolioSummaryType, WatchlistItem }; // Export if needed by child components directly through this file
export default PortfolioPage;

