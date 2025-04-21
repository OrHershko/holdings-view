import React, { useState } from 'react';
import Header from '@/components/Header';
import PortfolioSummary from '@/components/PortfolioSummary';
import StockChart from '@/components/StockChart';
import StockCard from '@/components/StockCard';
import WatchlistCard from '@/components/WatchlistCard';
import { usePortfolio, useStock } from '@/hooks/useStockData';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Sidebar from '@/components/Sidebar';
import { mockAccountBalances, mockBills, mockMarketAssets, mockPortfolioSummary, mockRewards, mockTotalRewards } from '@/data/mockData';
import ActionButton from '@/components/ActionButton';
import MarketOverview from '@/components/MarketOverview';

// Create a client
const queryClient = new QueryClient();

const Index = () => {
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const { data: portfolioData } = usePortfolio();
  const { data: stockData } = useStock(selectedStock || '');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeItem, setActiveItem] = useState('home');

  const toggleMobileSidebar = () => setMobileSidebarOpen(!mobileSidebarOpen);

  
  const handleSelectStock = (symbol: string) => {
    setSelectedStock(symbol);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <QueryClientProvider client={queryClient}>
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
              className={`fixed inset-y-0 left-0 w-64 z-40 md:relative md:h-screen md:block transition-transform transform ${
                mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
              }`}
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
                    <h2 className="text-lg font-medium ml-1 text-white">Your Holdings</h2>
                    <br />
                  {portfolioData?.holdings.map((holding) => (
                    <StockCard
                      key={holding.symbol}
                      {...holding}
                      onClick={() => handleSelectStock(holding.symbol)}
                    />
                  ))}
                  </div>                  
                  {/* Right column - Auxiliary data */}
                  <div className="lg:col-span-1">
                  <MarketOverview portfolio={portfolioData?.holdings.map((holding) => holding.symbol) || []} />
                  <WatchlistCard onSelectStock={handleSelectStock} />
                  </div>
                </div>
              </main>
              
              {/* Mobile Action Button */}
              <div className="md:hidden">
                <ActionButton onClick={() => console.log('Action clicked')} />
              </div>
            </div>
          </div>
        </div>
    </QueryClientProvider>);
}

export default Index;
