import React from 'react';
import * as LucideIcons from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/assets/Logo.png';
import { useNavigate } from 'react-router-dom';
import { NavItem } from '@/types';

interface SidebarProps {
  activeItem: string;
  setActiveItem: (id: string) => void;
}

const navItems: NavItem[] = [
  { id: 'home', name: 'Home', icon: 'home', path: '/' },
];

const Sidebar: React.FC<SidebarProps> = ({ activeItem, setActiveItem }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleNavigate = (id: string, path: string) => {
    setActiveItem(id);
    navigate(path);
  };

  return (
    <div className="flex flex-col h-full bg-gray-800/60 backdrop-blur-md border-r border-gray-700/40 text-white">
      <div className="p-4 border-b border-gray-700/40">
  <img 
    src={Logo} 
    alt="HoldingsView Logo" 
    className="w-full h-auto object-contain" 
  />
</div>
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = LucideIcons[item.icon as keyof typeof LucideIcons] as React.ElementType;
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleNavigate(item.id, item.path)}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${
                    activeItem === item.id
                      ? 'bg-purple-600/20 text-purple-400'
                      : 'hover:bg-gray-700/50 text-gray-300'
                  }`}
                >
                  {Icon && <Icon size={20} />}
                  <span>{item.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-700/40 flex items-center gap-3">
        <img
          src="https://img.freepik.com/free-psd/contact-icon-illustration-isolated_23-2151903337.jpg?t=st=1745326411~exp=1745330011~hmac=d71d7c11541d20acd7b0cb435800c8fd97b0dd47aa07bee47ff06269bd8f475a?auto=compress&cs=tinysrgb&w=100"
          alt={currentUser?.displayName || currentUser?.email?.split('@')[0]}
          className="h-10 w-10 rounded-full object-cover"
        />
        <div>
          <p className="ios-regular text-sm">{currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Guest'}</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;