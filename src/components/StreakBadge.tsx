import React from 'react';
import { Flame } from 'lucide-react';

interface StreakBadgeProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ streak, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22,
  };

  return (
    <div
      className={`inline-flex items-center font-bold rounded-full transition-all duration-200 ${
        streak > 0
          ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/30'
          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
      } ${sizeClasses[size]}`}
      title={`${streak} day daily study streak!`}
    >
      <Flame
        size={iconSizes[size]}
        className={streak > 0 ? 'fill-amber-500 text-amber-500 animate-pulse' : 'text-slate-400'}
      />
      <span>{streak} {streak === 1 ? 'Day' : 'Days'} Streak</span>
    </div>
  );
};
