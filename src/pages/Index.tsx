import React, { useState } from 'react';
import {
  Home,
  Cash,
  PieChart as Budgets,
  TrendingUp as Invest,
  BarChart as Market,
  HelpCircle as Help,
  Settings as Theme,
  CircleUser,
  Plus
} from 'lucide-react';
import { usePortfolio, useStock } from '@/hooks/useStockData';
import { SidebarProvider, Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import PortfolioSummary from '@/components/PortfolioSummary';
import StockChart from '@/components/StockChart';
import { cn } from '@/lib/utils';

const Index = () => {
  const [selectedStock, setSelectedStock] = useState<string | null>("AAPL");
  const { data: portfolioData } = usePortfolio();
  const { data: stockData } = useStock(selectedStock || '');

  return (
    <div className="flex min-h-screen bg-[#121212]">
      {/* Left Sidebar */}
      <div className="w-[250px] fierce-sidebar flex flex-col justify-between py-4">
        <div>
          {/* Logo */}
          <div className="px-6 mb-8 flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-purple-600 flex items-center justify-center">
              <span className="text-white font-bold">F</span>
            </div>
            <span className="text-white font-medium">Fierce</span>
          </div>

          {/* Navigation */}
          <nav className="space-y-1 px-3">
            <NavItem icon={<Home />} label="Home" active />
            <NavItem icon={<Cash />} label="Cash" />
            <NavItem icon={<Budgets />} label="Budgets" />
            <NavItem icon={<Invest />} label="Invest" />
            <NavItem icon={<Market />} label="Market" />
            <NavItem icon={<Help />} label="Help" />
            <NavItem icon={<Theme />} label="Theme" />
          </nav>
        </div>

        {/* User Profile */}
        <div className="px-3">
          <button className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg">
            <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
              <CircleUser className="h-6 w-6 text-gray-400" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-white">Your Name</div>
              <div className="text-xs text-gray-400">Personal account</div>
            </div>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {/* Welcome Section */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-medium text-white">Hi User, 👋</h1>
            <p className="text-gray-400 mt-1">Welcome back, here's what's happening today</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg text-white">
            <Plus className="h-4 w-4" />
            <span>Take Action</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-6">
            <PortfolioSummary />
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

          {/* Right Column */}
          <div className="lg:col-span-4 space-y-6">
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
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active = false }) => (
  <button
    className={cn(
      "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-400 hover:bg-white/5 transition-colors",
      active && "bg-white/5 text-white"
    )}
  >
    {icon}
    <span className="text-sm">{label}</span>
  </button>
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
