import React from 'react';
import { Plus } from 'lucide-react';

interface ActionButtonProps {
  onClick: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick }) => {
  return (
    <button 
      onClick={onClick}
      className="fixed bottom-8 right-8 md:static flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full px-4 py-2 transition-colors shadow-lg"
    >
      <Plus size={20} />
      <span className="hidden md:inline">Take Action</span>
    </button>
  );
};

export default ActionButton;