import React from 'react';
import { Bell, Menu, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  toggleMobileSidebar: () => void;
  isGuest?: boolean;
}

const Header: React.FC<HeaderProps> = ({ toggleMobileSidebar, isGuest }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
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
          {isGuest ? (
            <h1 className="text-xl font-bold text-white flex items-center mb-2">
              <UserCircle size={28} className="mr-2 opacity-80" /> Guest User
              <Badge variant="secondary" className="ml-3 text-xs py-0.5 px-1.5 bg-gray-700 text-gray-300 border-gray-600">Guest Mode</Badge>
            </h1>
          ) : (
            <h1 className="text-xl font-bold text-white flex items-center mb-2">
              <UserCircle size={28} className="mr-2 opacity-80" /> {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Guest'}
              </h1>
          )}
          <p className="text-sm text-gray-400 pr-4">
            {isGuest ? 'Explore the platform. Your data is local to this browser.' : "Welcome back, here's what's happening today"}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {!isGuest && (
          <>
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
          </>
        )}
        {isGuest && (
          <div className="flex items-center gap-2">
             <Button variant="outline" size="sm" onClick={() => navigate('/login')} className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">
               Login
             </Button>
             <Button size="sm" onClick={() => navigate('/register')} className="bg-blue-600 hover:bg-blue-700 text-white">
               Sign Up
             </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;