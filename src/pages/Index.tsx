
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
  HelpCircle,
  PlusCircle,
  TrendingUp 
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
      <div className="w-[70px] bg-[#1A1A1A]/80 backdrop-blur-md border-r border-gray-800 fixed left-0 top-0 bottom-0 z-10">
        <div className="flex flex-col items-center py-4">
          <div className="h-10 w-10 rounded-lg bg-purple-700 flex items-center justify-center mb-6 text-white font-bold">
            F
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column - Portfolio */}
            <div className="lg:col-span-8 space-y-5">
              {/* Portfolio & Chart Area */}
              <div className="space-y-5">
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
              </div>
              
              {/* Market Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-[#1A1A1A]/80 backdrop-blur-md border border-gray-800 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-gray-400 text-sm">Checking</h3>
                      <p className="text-white text-2xl font-bold mt-1">$322,498.32</p>
                      <p className="text-green-400 text-xs">+$1,512.32 today</p>
                    </div>
                    <button className="bg-white/10 hover:bg-white/20 text-white text-sm py-1 px-4 rounded-full">
                      Deposit
                    </button>
                  </div>
                  <div className="h-10 w-full mt-2 relative">
                    <svg className="w-full h-full" viewBox="0 0 200 40">
                      <path 
                        d="M0,20 L10,15 L20,25 L30,20 L40,30 L50,25 L60,15 L70,20 L80,10 L90,15 L100,5 L110,15 L120,10 L130,20 L140,15 L150,25 L160,20 L170,10 L180,15 L190,5 L200,10" 
                        fill="none" 
                        stroke="#10B981" 
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                </div>
                <div className="bg-[#1A1A1A]/80 backdrop-blur-md border border-gray-800 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-gray-400 text-sm">Custodian Account</h3>
                      <p className="text-white text-2xl font-bold mt-1">$322,498.32</p>
                      <p className="text-green-400 text-xs">+$1,512.32 today</p>
                    </div>
                    <button className="bg-white/10 hover:bg-white/20 text-white text-sm py-1 px-4 rounded-full">
                      Deposit
                    </button>
                  </div>
                  <div className="h-10 w-full mt-2 relative">
                    <svg className="w-full h-full" viewBox="0 0 200 40">
                      <path 
                        d="M0,20 L10,15 L20,25 L30,20 L40,30 L50,25 L60,15 L70,20 L80,10 L90,15 L100,5 L110,15 L120,10 L130,20 L140,15 L150,25 L160,20 L170,10 L180,15 L190,5 L200,10" 
                        fill="none" 
                        stroke="#10B981" 
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Today's Market */}
              <div className="bg-[#1A1A1A]/80 backdrop-blur-md border border-gray-800 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white font-medium">Today's Market</h3>
                  <button className="text-xs text-purple-400">View All</button>
                </div>
                <p className="text-gray-400 text-xs mb-4">The largest movers by percent in the markets</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <MarketItem symbol="AAPL" change={-0.67} price={179.66} />
                  <MarketItem symbol="MSFT" change={1.25} price={415.33} />
                  <MarketItem symbol="TSLA" change={2.51} price={218.12} />
                </div>
              </div>
            </div>
            
            {/* Right Column */}
            <div className="lg:col-span-4 space-y-5">
              {/* Get Started Card */}
              <div className="bg-[#1A1A1A]/80 backdrop-blur-md border border-gray-800 rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-white font-medium">Auto-invest & Get $500</h3>
                    <p className="text-gray-400 text-xs mt-1">Set up automatic investments and get a bonus.</p>
                  </div>
                  <button className="bg-purple-700 text-white text-xs py-1 px-3 rounded-md">Setup</button>
                </div>
                <div className="mt-3 text-center">
                  <button className="text-purple-400 text-xs">+ See Other Offers</button>
                </div>
              </div>
              
              {/* Rewards Card */}
              <div className="bg-[#1A1A1A]/80 backdrop-blur-md border border-gray-800 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <span className="text-white font-medium">Fierce Rewards</span>
                    <span className="ml-2 text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">New</span>
                  </div>
                  <button className="text-xs text-purple-400">Switch</button>
                </div>
                
                {/* Donut Chart */}
                <div className="flex justify-center my-6">
                  <div className="relative">
                    <svg height="150" width="150" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="transparent" stroke="#333" strokeWidth="12" />
                      <circle cx="60" cy="60" r="50" fill="transparent" stroke="#6366F1" strokeWidth="12" strokeDasharray="314" strokeDashoffset="78" />
                      <circle cx="60" cy="60" r="50" fill="transparent" stroke="#EC4899" strokeWidth="12" strokeDasharray="314" strokeDashoffset="188" transform="rotate(236 60 60)" />
                      <circle cx="60" cy="60" r="50" fill="transparent" stroke="#10B981" strokeWidth="12" strokeDasharray="314" strokeDashoffset="245" transform="rotate(146 60 60)" />
                      <circle cx="60" cy="60" r="50" fill="transparent" stroke="#F59E0B" strokeWidth="12" strokeDasharray="314" strokeDashoffset="283" transform="rotate(97 60 60)" />
                      <text x="60" y="55" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">$6,472.71</text>
                      <text x="60" y="75" textAnchor="middle" fill="#9CA3AF" fontSize="12">Total Rewards</text>
                    </svg>
                  </div>
                </div>
                
                {/* Rewards List */}
                <div className="space-y-2">
                  <RewardItem label="Cash Rewards" amount="$4,250.24" color="#10B981" />
                  <RewardItem label="Stock Rewards" amount="$871.95" color="#6366F1" />
                  <RewardItem label="Crypto Rewards" amount="$712.62" color="#EC4899" />
                  <RewardItem label="Lending Rewards" amount="$637.91" color="#F59E0B" />
                </div>
                
                {/* Transfer Button */}
                <button className="w-full mt-4 bg-black/30 hover:bg-black/50 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center">
                  <span>Transfer to Cash</span>
                  <span className="ml-2">→</span>
                </button>
              </div>
              
              {/* Upcoming Bills */}
              <div className="bg-[#1A1A1A]/80 backdrop-blur-md border border-gray-800 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white font-medium">Upcoming Bills</h3>
                  <button className="text-xs text-purple-400">Coming soon</button>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="bg-black/30 rounded-xl p-3 flex items-center justify-center">
                    <div className="text-center">
                      <div className="h-10 w-10 rounded-full bg-yellow-500 mx-auto mb-2 flex items-center justify-center">
                        <span className="text-white">N</span>
                      </div>
                      <p className="text-white text-xs">Netflix</p>
                      <p className="text-gray-500 text-xs mt-1">May 27</p>
                    </div>
                  </div>
                  <div className="bg-black/30 rounded-xl p-3 flex items-center justify-center">
                    <div className="text-center">
                      <div className="h-10 w-10 rounded-full bg-green-500 mx-auto mb-2 flex items-center justify-center">
                        <span className="text-white">S</span>
                      </div>
                      <p className="text-white text-xs">Spotify</p>
                      <p className="text-gray-500 text-xs mt-1">May 29</p>
                    </div>
                  </div>
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

const RewardItem = ({ label, amount, color }) => (
  <div className="flex justify-between items-center">
    <div className="flex items-center">
      <div className="h-3 w-3 rounded-full mr-2" style={{ backgroundColor: color }}></div>
      <span className="text-gray-400 text-sm">{label}</span>
    </div>
    <span className="text-white text-sm">{amount}</span>
  </div>
);

const MarketItem = ({ symbol, change, price }) => {
  const isPositive = change >= 0;
  
  return (
    <div className="bg-black/30 backdrop-blur-md rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center mr-2">
            <span className="text-white text-xs">{symbol[0]}</span>
          </div>
          <span className="text-white">{symbol}</span>
        </div>
        <div className={`px-2 py-0.5 rounded-full text-xs ${isPositive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
          {isPositive ? '+' : ''}{change}%
        </div>
      </div>
      <div className="h-8 w-full relative">
        <svg className="w-full h-full" viewBox="0 0 100 20">
          <path 
            d={isPositive 
              ? "M0,10 L10,8 L20,12 L30,9 L40,13 L50,10 L60,7 L70,11 L80,8 L90,5 L100,3" 
              : "M0,10 L10,12 L20,8 L30,11 L40,7 L50,10 L60,13 L70,9 L80,12 L90,15 L100,17"
            }
            fill="none" 
            stroke={isPositive ? "#10B981" : "#EF4444"} 
            strokeWidth="1.5"
          />
        </svg>
      </div>
      <p className="text-white text-right mt-1">${price}</p>
    </div>
  );
};

export default Index;
