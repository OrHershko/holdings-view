
import React, { useState } from 'react';
import Header from '@/components/Header';
import PortfolioSummary from '@/components/PortfolioSummary';
import StockChart from '@/components/StockChart';
import StockCard from '@/components/StockCard';
import WatchlistCard from '@/components/WatchlistCard';
import { usePortfolio, useStock } from '@/hooks/useStockData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, Search, BarChart, User } from 'lucide-react';

const Index = () => {
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const { data: portfolioData } = usePortfolio();
  const { data: stockData } = useStock(selectedStock || '');
  
  const handleSelectStock = (symbol: string) => {
    setSelectedStock(symbol);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <div className="min-h-screen bg-[#121212]">
      <Header onSelectStock={handleSelectStock} />
      
      <main className="container max-w-md mx-auto px-4 py-4 pb-20">
        {/* Portfolio Summary */}
        <PortfolioSummary />
        
        {/* Selected Stock Chart */}
        {selectedStock && stockData && (
          <StockChart 
            symbol={stockData.symbol}
            stockName={stockData.name}
            currentPrice={stockData.price}
            change={stockData.change}
            changePercent={stockData.changePercent}
          />
        )}
        
        {/* Tabs for Portfolio/Watchlist */}
        <Tabs defaultValue="portfolio" className="mt-4">
          <TabsList className="grid grid-cols-2 mb-4 bg-[#1E1E1E]">
            <TabsTrigger value="portfolio" className="data-[state=active]:bg-ios-blue data-[state=active]:text-white text-gray-300">
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="watchlist" className="data-[state=active]:bg-ios-blue data-[state=active]:text-white text-gray-300">
              Watchlist
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="portfolio" className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-medium ml-1 text-white">Your Holdings</h2>
            
            {portfolioData?.holdings.map((holding) => (
              <StockCard
                key={holding.symbol}
                {...holding}
                onClick={() => handleSelectStock(holding.symbol)}
              />
            ))}
          </TabsContent>
          
          <TabsContent value="watchlist" className="animate-fade-in">
            <WatchlistCard onSelectStock={handleSelectStock} />
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#1E1E1E] border-t border-gray-800 p-3 flex justify-around items-center">
        <button className="flex flex-col items-center text-ios-blue">
          <Home className="h-6 w-6 mb-1" />
          <span className="text-xs">Home</span>
        </button>
        <button className="flex flex-col items-center text-gray-400">
          <Search className="h-6 w-6 mb-1" />
          <span className="text-xs">Search</span>
        </button>
        <button className="flex flex-col items-center text-gray-400">
          <BarChart className="h-6 w-6 mb-1" />
          <span className="text-xs">Markets</span>
        </button>
        <button className="flex flex-col items-center text-gray-400">
          <User className="h-6 w-6 mb-1" />
          <span className="text-xs">Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default Index;
