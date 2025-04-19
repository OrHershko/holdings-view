import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useStockSearch } from '@/hooks/useStockData';

interface HeaderProps {
  onSelectStock: (symbol: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onSelectStock }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { data: searchResults, isLoading } = useStockSearch(searchQuery);

  return (
    <header className="sticky top-0 z-10 bg-blue-950/95 backdrop-blur-sm px-4 py-3 border-b border-blue-800/70">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-white">FinVest</h1>
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-blue-300 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search stocks..."
              className="pl-8 pr-4 py-2 w-full rounded-full bg-blue-900/80 border-0 text-white placeholder-blue-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            />
          </div>

          {isSearchFocused && searchQuery.length > 1 && (
            <div className="absolute top-full right-0 mt-1 w-64 bg-blue-900 rounded-lg shadow-lg overflow-hidden border border-blue-700/80">
              {isLoading ? (
                <div className="px-4 py-3 text-sm text-blue-300">Loading...</div>
              ) : searchResults && searchResults.length > 0 ? (
                <ul>
                  {searchResults.map((stock) => (
                    <li
                      key={stock.symbol}
                      className="px-4 py-3 hover:bg-blue-800/70 cursor-pointer border-b border-blue-700/50 last:border-0"
                      onClick={() => {
                        onSelectStock(stock.symbol);
                        setSearchQuery('');
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-white">{stock.symbol}</div>
                          <div className="text-xs text-blue-300">{stock.name}</div>
                        </div>
                        <div className={stock.change >= 0 ? 'stock-up' : 'stock-down'}>
                          ${stock.price.toFixed(2)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-3 text-sm text-blue-300">No results found</div>
              )}
            </div>
          )}
        </div>
      </div>
      <nav className="flex overflow-x-auto hide-scrollbar space-x-4 pb-1">
        <button className="text-blue-300 font-medium whitespace-nowrap">Portfolio</button>
        <button className="text-blue-400/70 hover:text-blue-300 font-medium whitespace-nowrap">Watchlist</button>
        <button className="text-blue-400/70 hover:text-blue-300 font-medium whitespace-nowrap">News</button>
        <button className="text-blue-400/70 hover:text-blue-300 font-medium whitespace-nowrap">Settings</button>
      </nav>
    </header>
  );
};

export default Header;
