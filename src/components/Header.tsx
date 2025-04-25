import React from 'react';
import { Bell, Menu, LogOut } from 'lucide-react';
import ActionButton from '@/components/ActionButton';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  toggleMobileSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleMobileSidebar }) => {
  const { currentUser, logout } = useAuth();
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };
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
          <h1 className="text-xl font-bold text-white">Hi {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'there'}, 👋</h1>
          <p className="text-sm text-gray-400">Welcome back, here's what's happening today</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="text-gray-400 hover:text-white transition-colors">
          <Bell size={20} />
        </button>
        <button 
          onClick={handleLogout}
          className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          title="Log out"
        >
          <LogOut size={20} />
        </button>
        <div className="hidden md:block">
          <ActionButton onClick={() => console.log('Take action clicked')} />
        </div>
      </div>
    </header>
  );
};

export default Header;