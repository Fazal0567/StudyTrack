import React from 'react';

interface ProgressBarProps {
  completed: number;
  total: number;
  showPercentage?: boolean;
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  completed,
  total,
  showPercentage = true,
  label = 'Study Target Progress',
}) => {
  const percentage = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5 text-sm font-medium">
        <span className="text-slate-700 dark:text-slate-300">{label}</span>
        <span className="text-blue-600 dark:text-blue-400 font-semibold">
          {completed}/{total} Completed ({percentage}%)
        </span>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
        <div
          className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500 ease-out shadow-sm"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
