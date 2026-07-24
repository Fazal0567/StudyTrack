import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ProgressBar } from '../components/ProgressBar';
import { StreakBadge } from '../components/StreakBadge';
import { BarChart3, CheckCircle2, Clock, AlertCircle, Target, Award, Flame } from 'lucide-react';

export const ProgressView: React.FC = () => {
  const { userProfile, tasks } = useAuth();

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
  const missedTasks = tasks.filter(t => t.status === 'Missed').length;

  const completionPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate total minutes estimated vs completed
  const totalEstimatedMins = tasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0);
  const completedMins = tasks
    .filter(t => t.status === 'Completed')
    .reduce((sum, t) => sum + (t.estimatedTime || 0), 0);

  // Group by Subject
  const subjectMap: Record<string, { total: number; completed: number; mins: number }> = {};

  tasks.forEach(task => {
    const subj = task.subject || 'General';
    if (!subjectMap[subj]) {
      subjectMap[subj] = { total: 0, completed: 0, mins: 0 };
    }
    subjectMap[subj].total += 1;
    if (task.status === 'Completed') {
      subjectMap[subj].completed += 1;
      subjectMap[subj].mins += task.estimatedTime || 0;
    }
  });

  const subjectList = Object.keys(subjectMap).map(subj => ({
    subject: subj,
    ...subjectMap[subj],
    rate: subjectMap[subj].total > 0 ? Math.round((subjectMap[subj].completed / subjectMap[subj].total) * 100) : 0,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="text-blue-600 dark:text-blue-400" size={26} />
          Study Progress & Analytics
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Track your overall target completion rates, study streak history, and subject breakdown.
        </p>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Flame size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {userProfile?.currentStreak || 0} Days
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Current Study Streak
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Award size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {completionPercentage}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Target Completion Rate
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {completedTasks} / {totalTasks}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Completed Targets
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Clock size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {Math.round(completedMins / 60)} hrs
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Focused Study Completed
            </div>
          </div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          All-Time Study Target Completion
        </h2>
        <ProgressBar
          completed={completedTasks}
          total={totalTasks}
          label="Overall All-Time Target Ratio"
        />

        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-center text-xs">
          <div>
            <span className="block text-slate-400 font-medium">Pending Tasks</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">{pendingTasks}</span>
          </div>
          <div>
            <span className="block text-slate-400 font-medium">Missed Tasks</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">{missedTasks}</span>
          </div>
          <div>
            <span className="block text-slate-400 font-medium">Completed Tasks</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{completedTasks}</span>
          </div>
        </div>
      </div>

      {/* Subject Breakdown */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Subject Completion Breakdown
        </h2>

        {subjectList.length > 0 ? (
          <div className="space-y-4">
            {subjectList.map(item => (
              <div key={item.subject} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-800 dark:text-slate-200">{item.subject}</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {item.completed}/{item.total} Done ({item.rate}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${item.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic">
            No subject data available yet. Create study targets to view subject statistics.
          </p>
        )}
      </div>
    </div>
  );
};
