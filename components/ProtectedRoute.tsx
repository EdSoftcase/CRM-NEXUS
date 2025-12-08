
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// NOTE: In the SPA version (without router), redirection is handled by App.tsx.
// This component now serves mainly as a loading state handler or extra security layer if used.
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { loading, currentUser } = useAuth();

  if (loading) {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors">
            <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mb-4" />
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium animate-pulse">Verificando acesso...</p>
        </div>
    );
  }

  // If not loading and no user, parent (App.tsx) handles showing Login component.
  // If user exists, we render children.
  return <>{children}</>;
};
