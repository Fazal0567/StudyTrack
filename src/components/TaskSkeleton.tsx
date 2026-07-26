import React from 'react';

export const TaskSkeletonCard: React.FC = () => {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-4 transition-all">
      <div className="flex items-start gap-3.5">
        <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2.5 min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded-md" />
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-md" />
          </div>
          <div className="h-5 w-2/3 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="flex items-center gap-4 pt-1">
            <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
        <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
      </div>
    </div>
  );
};

export const TaskListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <TaskSkeletonCard key={i} />
      ))}
    </div>
  );
};

export const StatsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col justify-center space-y-2"
        >
          <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-7 w-12 bg-slate-200 dark:bg-slate-700 rounded-md" />
        </div>
      ))}
    </div>
  );
};
