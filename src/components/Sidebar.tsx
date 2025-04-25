import React from 'react';
import { mockNavItems } from '../data/mockData';
import * as LucideIcons from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { mockUser } from '../data/mockData';

interface SidebarProps {
  activeItem: string;
  setActiveItem: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem, setActiveItem }) => {
  const { currentUser } = useAuth();

  return (
    <div className="flex flex-col h-full bg-gray-800/60 backdrop-blur-md border-r border-gray-700/40 text-white">
      <div className="p-4 flex items-center gap-2 border-b border-gray-700/40">
        <div className="h-10 w-10 bg-purple-600 rounded-lg flex items-center justify-center">
          <LucideIcons.LayoutGrid className="h-6 w-6 text-white" />
        </div>
        <span className="text-xl font-bold">Holdings View</span>
      </div>
      
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {mockNavItems.map((item) => {
            const Icon = LucideIcons[item.icon as keyof typeof LucideIcons] as React.ElementType;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveItem(item.id)}
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
          src={mockUser.avatarUrl}
          alt={mockUser.name}
          className="h-10 w-10 rounded-full object-cover"
        />
        <div>
          <p className="font-medium text-sm">{currentUser?.displayName || currentUser?.email?.split('@')[0]}</p>
          <p className="text-xs text-gray-400">{mockUser.accountType}</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;