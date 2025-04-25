import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ProtectedRoute: React.FC = () => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    // You can render a loading spinner or component here
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // If not authenticated, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Render the protected content
  return <Outlet />;
};

export default ProtectedRoute;
