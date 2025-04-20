
import React, { useState } from 'react';
import Header from '@/components/Header';
import PortfolioSummary from '@/components/PortfolioSummary';
import StockChart from '@/components/StockChart';
import StockCard from '@/components/StockCard';
import WatchlistCard from '@/components/WatchlistCard';
import { usePortfolio, useStock } from '@/hooks/useStockData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Home, 
  Search, 
  BarChart, 
  User, 
  MessageSquare, 
  CreditCard, 
  Calendar, 
  Settings, 
  HelpCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Index = () => {
  const [selectedStock, setSelectedStock] = useState<string | null>("AAPL"); // Default to Apple
  const { data: portfolioData } = usePortfolio();
  const { data: stockData } = useStock(selectedStock || '');
  
  const handleSelectStock = (symbol: string) => {
    setSelectedStock(symbol);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <div className="flex min-h-screen bg-[#121212]">
      {/* Sidebar */}
      <div className="w-[70px] bg-[#1A1A1A] border-r border-gray-800 fixed left-0 top-0 bottom-0 z-10">
        <div className="flex flex-col items-center py-4">
          <div className="h-10 w-10 rounded-full bg-purple-700 flex items-center justify-center mb-6">
            <span className="text-white font-bold">F</span>
          </div>
          
          <NavItem icon={<Home className="h-5 w-5" />} active />
          <NavItem icon={<CreditCard className="h-5 w-5" />} />
          <NavItem icon={<BarChart className="h-5 w-5" />} />
          <NavItem icon={<Calendar className="h-5 w-5" />} />
          <NavItem icon={<MessageSquare className="h-5 w-5" />} />
          <NavItem icon={<Settings className="h-5 w-5" />} />
          <NavItem icon={<HelpCircle className="h-5 w-5" />} />
        </div>
        
        <div className="absolute bottom-5 left-0 right-0 flex justify-center">
          <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
            <User className="h-4 w-4 text-gray-300" />
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 ml-[70px]">
        <Header onSelectStock={handleSelectStock} />
        
        <main className="container mx-auto p-5">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* Left Column - Portfolio & Chart */}
            <div className="xl:col-span-2 space-y-5">
              <PortfolioSummary />
              
              {/* Stock Chart */}
              {selectedStock && stockData && (
                <StockChart 
                  symbol={stockData.symbol}
                  stockName={stockData.name}
                  currentPrice={stockData.price}
                  change={stockData.change}
                  changePercent={stockData.changePercent}
                />
              )}
              
              {/* Market Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <MarketCard 
                  title="Today's Market" 
                  value="$322,485.32" 
                  change="+$4,582.32"
                />
                <MarketCard 
                  title="Custodian Account" 
                  value="$122,485.32"
                  change="+$1,512.32"
                />
              </div>
            </div>
            
            {/* Right Column - Watchlist */}
            <div className="space-y-5">
              <PortfolioCircle value={78} />
              
              {/* Tabs */}
              <Tabs defaultValue="watchlist" className="w-full">
                <TabsList className="grid grid-cols-2 mb-4 bg-[#1E1E1E]">
                  <TabsTrigger value="watchlist" className="text-sm">
                    Watchlist
                  </TabsTrigger>
                  <TabsTrigger value="holdings" className="text-sm">
                    Holdings
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="watchlist">
                  <WatchlistCard onSelectStock={handleSelectStock} />
                </TabsContent>
                
                <TabsContent value="holdings">
                  <div className="space-y-4">
                    {portfolioData?.holdings.map((holding) => (
                      <StockCard
                        key={holding.symbol}
                        {...holding}
                        onClick={() => handleSelectStock(holding.symbol)}
                      />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
              
              {/* Activity Section */}
              <div className="bg-[#1A1A1A] rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white font-medium">Upcoming Bills</h3>
                  <span className="text-xs text-gray-400">View All</span>
                </div>
                
                <div className="space-y-3">
                  <BillItem title="Netflix" amount="$12.99" date="May 15" />
                  <BillItem title="Spotify" amount="$9.99" date="May 18" />
                  <BillItem title="iCloud" amount="$2.99" date="May 20" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// Helper Components
const NavItem = ({ icon, active = false }) => (
  <div className={cn(
    "h-10 w-10 rounded-lg flex items-center justify-center my-1 cursor-pointer",
    active ? "bg-purple-700 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
  )}>
    {icon}
  </div>
);

const MarketCard = ({ title, value, change }) => (
  <div className="bg-[#1A1A1A] rounded-xl p-4">
    <h3 className="text-gray-400 text-sm">{title}</h3>
    <div className="mt-1">
      <p className="text-white text-lg font-medium">{value}</p>
      <p className="text-green-400 text-xs">{change}</p>
    </div>
  </div>
);

const PortfolioCircle = ({ value }) => (
  <div className="bg-[#1A1A1A] rounded-xl p-4 flex flex-col items-center">
    <h3 className="text-white font-medium mb-2">Portfolio Progress</h3>
    <div className="relative h-32 w-32">
      <svg className="h-full w-full" viewBox="0 0 100 100">
        <circle 
          cx="50" 
          cy="50" 
          r="40" 
          fill="none" 
          stroke="#333" 
          strokeWidth="10" 
        />
        <circle 
          cx="50" 
          cy="50" 
          r="40" 
          fill="none" 
          stroke="#6366F1" 
          strokeWidth="10" 
          strokeDasharray="251.2" 
          strokeDashoffset={251.2 - (251.2 * value / 100)} 
          transform="rotate(-90 50 50)" 
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white text-2xl font-bold">${value},523</span>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2 w-full mt-4">
      <StatItem label="Stocks" value="$45.2k" />
      <StatItem label="Crypto" value="$15.3k" />
      <StatItem label="Bonds" value="$5.2k" />
    </div>
  </div>
);

const StatItem = ({ label, value }) => (
  <div className="text-center">
    <p className="text-gray-400 text-xs">{label}</p>
    <p className="text-white text-sm font-medium">{value}</p>
  </div>
);

const BillItem = ({ title, amount, date }) => (
  <div className="flex justify-between items-center py-2">
    <div className="flex items-center">
      <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center mr-3">
        <span className="text-xs text-white">{title[0]}</span>
      </div>
      <div>
        <p className="text-white text-sm">{title}</p>
        <p className="text-gray-400 text-xs">{date}</p>
      </div>
    </div>
    <p className="text-white">{amount}</p>
  </div>
);

export default Index;
