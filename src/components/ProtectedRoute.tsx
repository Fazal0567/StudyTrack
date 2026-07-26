import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors">
        {/* Navbar Skeleton */}
        <div className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-5 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>
        </div>

        <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 md:p-6 gap-6">
          {/* Sidebar Skeleton */}
          <div className="hidden lg:block w-64 space-y-3">
            <div className="h-12 rounded-2xl bg-slate-200/80 dark:bg-slate-800/60 animate-pulse" />
            <div className="h-12 rounded-2xl bg-slate-200/80 dark:bg-slate-800/60 animate-pulse" />
            <div className="h-12 rounded-2xl bg-slate-200/80 dark:bg-slate-800/60 animate-pulse" />
          </div>

          {/* Main Content Skeleton */}
          <div className="flex-1 space-y-6">
            <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="h-24 rounded-2xl bg-slate-200/80 dark:bg-slate-800/60 animate-pulse" />
              <div className="h-24 rounded-2xl bg-slate-200/80 dark:bg-slate-800/60 animate-pulse" />
              <div className="h-24 rounded-2xl bg-slate-200/80 dark:bg-slate-800/60 animate-pulse" />
              <div className="h-24 rounded-2xl bg-slate-200/80 dark:bg-slate-800/60 animate-pulse" />
            </div>
            <div className="space-y-3 pt-2">
              <div className="h-20 rounded-2xl bg-slate-200/80 dark:bg-slate-800/60 animate-pulse" />
              <div className="h-20 rounded-2xl bg-slate-200/80 dark:bg-slate-800/60 animate-pulse" />
              <div className="h-20 rounded-2xl bg-slate-200/80 dark:bg-slate-800/60 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
