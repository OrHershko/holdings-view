import React from 'react';
import { Bell, ExternalLink, Menu } from 'lucide-react';
import { mockUser } from '@/data/mockData';
import ActionButton from '@/components/ActionButton';

interface HeaderProps {
  toggleMobileSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleMobileSidebar }) => {
  return (
    <header className="flex justify-between items-center p-4 md:p-5 mb-2">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleMobileSidebar}
          className="md:hidden text-white hover:text-gray-300 transition-colors"
        >
          <Menu size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Hi {mockUser.name}, 👋</h1>
          <p className="text-sm text-gray-400">Welcome back, here's what's happening today</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="text-gray-400 hover:text-white transition-colors">
          <Bell size={20} />
        </button>
        <div className="hidden md:block">
          <ActionButton onClick={() => console.log('Take action clicked')} />
        </div>
      </div>
    </header>
  );
};

export default Header;