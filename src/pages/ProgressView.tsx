import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProgressBar } from '../components/ProgressBar';
import { StatsSkeleton } from '../components/TaskSkeleton';
import { BarChart3, CheckCircle2, Clock, Calendar, Award, Flame, ChevronRight, TrendingUp } from 'lucide-react';
import { format, subDays, parseISO, isSameDay } from 'date-fns';
import { getTodayDateString } from '../services/taskService';

export const ProgressView: React.FC = () => {
  const { userProfile, tasks, tasksLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'daily' | 'all-time'>('daily');

  const todayStr = getTodayDateString();
  const todayDate = new Date();

  // Filter tasks for today
  const todayTasks = tasks.filter(t => t.date === todayStr);
  const todayCompleted = todayTasks.filter(t => t.status === 'Completed').length;
  const todayPending = todayTasks.filter(t => t.status === 'Pending').length;
  const todayMissed = todayTasks.filter(t => t.status === 'Missed').length;
  const todayRate = todayTasks.length > 0 ? Math.round((todayCompleted / todayTasks.length) * 100) : 0;
  const todayMins = todayTasks
    .filter(t => t.status === 'Completed')
    .reduce((sum, t) => sum + (t.estimatedTime || 0), 0);

  // Recent 7 Days Breakdown
  const recent7Days = Array.from({ length: 7 }).map((_, i) => {
    const dayObj = subDays(todayDate, i);
    const dateStr = format(dayObj, 'yyyy-MM-dd');
    const dayTasks = tasks.filter(t => t.date === dateStr);
    const completed = dayTasks.filter(t => t.status === 'Completed').length;
    const pending = dayTasks.filter(t => t.status === 'Pending').length;
    const missed = dayTasks.filter(t => t.status === 'Missed').length;
    const rate = dayTasks.length > 0 ? Math.round((completed / dayTasks.length) * 100) : 0;
    const studyMins = dayTasks
      .filter(t => t.status === 'Completed')
      .reduce((sum, t) => sum + (t.estimatedTime || 0), 0);

    return {
      dateObj: dayObj,
      dateStr,
      formattedDate: format(dayObj, i === 0 ? "'Today,' MMM d" : i === 1 ? "'Yesterday,' MMM d" : 'EEEE, MMM d'),
      isToday: i === 0,
      tasks: dayTasks,
      total: dayTasks.length,
      completed,
      pending,
      missed,
      rate,
      studyMins,
    };
  });

  // Calculate 7-day average completion rate for active days
  const activeDays = recent7Days.filter(d => d.total > 0);
  const avgDailyRate =
    activeDays.length > 0
      ? Math.round(activeDays.reduce((acc, d) => acc + d.rate, 0) / activeDays.length)
      : 0;

  // All-time metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
  const missedTasks = tasks.filter(t => t.status === 'Missed').length;
  const completionPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
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
      {/* Header with Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="text-blue-600 dark:text-blue-400" size={26} />
            Study Progress & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track daily study target completion rates, daily consistency trends, and subject performance.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl flex items-center self-start md:self-auto shadow-inner">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'daily'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Daily Basis Progress
          </button>
          <button
            onClick={() => setActiveTab('all-time')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'all-time'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            All-Time Summary
          </button>
        </div>
      </div>

      {tasksLoading ? (
        <div className="space-y-6">
          <StatsSkeleton />
          <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />
        </div>
      ) : activeTab === 'daily' ? (
        <>
          {/* Today's Daily Progress Hero Card */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg shadow-blue-200 dark:shadow-none">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-extrabold tracking-wider uppercase backdrop-blur-xs mb-2">
                  Today's Daily Progress ({format(todayDate, 'MMM d, yyyy')})
                </span>
                <h2 className="text-3xl font-black mt-1">
                  {todayRate}% Completed Today
                </h2>
                <p className="text-xs text-blue-100 font-medium mt-1">
                  {todayCompleted} of {todayTasks.length} study targets completed today ({todayMins} mins studied)
                </p>
              </div>

              {/* Progress Circle Gauge */}
              <div className="flex items-center gap-4 bg-white/10 dark:bg-slate-900/30 p-4 rounded-2xl backdrop-blur-xs">
                <div className="text-right">
                  <div className="text-sm font-bold text-blue-100">Daily Targets</div>
                  <div className="text-xs text-blue-200">
                    <span className="font-extrabold text-white">{todayCompleted}</span> Done •{' '}
                    <span className="font-extrabold text-amber-200">{todayPending}</span> Pending
                  </div>
                </div>
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center font-black text-lg border-2 border-white/40">
                  {todayRate}%
                </div>
              </div>
            </div>
          </div>

          {/* Daily Basis Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <TrendingUp size={24} />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {avgDailyRate}%
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  7-Day Avg Completion Rate
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Clock size={24} />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {todayMins} mins
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Today's Focused Study Time
                </div>
              </div>
            </div>
          </div>

          {/* Day-by-Day Daily Progress Breakdown (Past 7 Days) */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar size={18} className="text-blue-600" />
                  Day-by-Day Target Progress (Past 7 Days)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Inspect your daily performance, completion rates, and study duration for each date.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {recent7Days.map(day => (
                <div
                  key={day.dateStr}
                  className={`p-4 rounded-2xl border transition-all ${
                    day.isToday
                      ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/80'
                      : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {day.formattedDate}
                      </span>
                      {day.isToday && (
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-blue-600 text-white">
                          Today
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs font-bold">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {day.completed} Done
                      </span>
                      <span className="text-amber-600 dark:text-amber-400">
                        {day.pending} Pending
                      </span>
                      {day.missed > 0 && (
                        <span className="text-rose-600 dark:text-rose-400">
                          {day.missed} Missed
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        {day.rate}% Rate
                      </span>
                    </div>
                  </div>

                  {/* Daily Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${day.rate}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                      <span>{day.total > 0 ? `${day.completed} of ${day.total} targets met` : 'No targets set for this day'}</span>
                      <span>{day.studyMins > 0 ? `${day.studyMins} mins study time` : '0 mins'}</span>
                    </div>
                  </div>

                  {/* Task Chips for Day */}
                  {day.tasks.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap gap-2">
                      {day.tasks.map(t => (
                        <div
                          key={t.id}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium border flex items-center gap-1.5 ${
                            t.status === 'Completed'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                              : t.status === 'Missed'
                              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <CheckCircle2
                            size={12}
                            className={t.status === 'Completed' ? 'text-emerald-600' : 'text-slate-400'}
                          />
                          <span>{t.title}</span>
                          <span className="text-[10px] opacity-75 font-semibold">({t.subject})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* All-time Summary View */
        <div className="space-y-6">
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
                  All-Time Completion Rate
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
                  Total Completed Targets
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
                  Total Study Hours
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              All-Time Study Target Ratio
            </h2>
            <ProgressBar
              completed={completedTasks}
              total={totalTasks}
              label="Overall All-Time Target Completion"
            />
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
                No subject data available yet.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

