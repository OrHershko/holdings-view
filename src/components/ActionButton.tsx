import React from 'react';
import { Plus, UserPlus } from 'lucide-react';
import { cn } from "@/lib/utils";

interface ActionButtonProps {
  onClick: () => void;
  text?: string;
  className?: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, text, className }) => {
  const isSignUp = text === "Sign Up";
  const defaultClasses = "fixed bottom-8 right-8 md:static flex items-center gap-2 text-white rounded-full px-4 py-2 transition-colors shadow-lg";
  const themeClasses = isSignUp 
    ? "bg-blue-500 hover:bg-blue-600"
    : "bg-purple-600 hover:bg-purple-700";

  return (
    <button 
      onClick={onClick}
      className={cn(defaultClasses, themeClasses, className)}
    >
      {isSignUp ? <UserPlus size={20} /> : <Plus size={20} />}
      <span className="hidden md:inline">{text || 'Take Action'}</span>
    </button>
  );
};

export default ActionButton;