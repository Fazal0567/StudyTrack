import React from 'react';
import { useAuth } from '../context/AuthContext';
import { TaskCard } from '../components/TaskCard';
import { StudyTask } from '../types';
import {
  toggleTaskCompletion,
  deleteStudyTask,
  carryForwardTask,
  getTodayDateString,
} from '../services/taskService';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Calendar as CalendarIcon,
  Sparkles,
  ArrowRight,
  Flame,
  Target,
} from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { Link } from 'react-router-dom';

interface DashboardProps {
  onOpenAddModal: () => void;
  onEditTask: (task: StudyTask) => void;
  onStartStudy?: (task: StudyTask) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenAddModal, onEditTask, onStartStudy }) => {
  const { userProfile, tasks } = useAuth();

  const todayStr = getTodayDateString();
  const todayDate = new Date();
  const formattedTodayDate = format(todayDate, 'EEEE, MMM d');

  // Filter tasks for Today
  const todayTasks = tasks.filter(t => t.date === todayStr);

  const completedToday = todayTasks.filter(t => t.status === 'Completed');
  const pendingToday = todayTasks.filter(t => t.status === 'Pending');
  const missedTasksAll = tasks.filter(t => t.status === 'Missed');

  // Reorder today's tasks: pending first, completed last
  const sortedTodayTasks = [...todayTasks].sort((a, b) => {
    if (a.status === 'Completed' && b.status !== 'Completed') return 1;
    if (a.status !== 'Completed' && b.status === 'Completed') return -1;
    return a.title.localeCompare(b.title);
  });

  const completionPercentage =
    todayTasks.length > 0 ? Math.round((completedToday.length / todayTasks.length) * 100) : 0;

  // SVG Circular progress gauge calculations
  const circumference = 2 * Math.PI * 70; // r=70 -> ~439.8
  const strokeDashoffset = circumference - (circumference * completionPercentage) / 100;

  // Calendar week days
  const weekStart = startOfWeek(todayDate, { weekStartsOn: 0 }); // Sunday
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const handleToggleComplete = async (task: StudyTask) => {
    try {
      await toggleTaskCompletion(task, userProfile);
    } catch (err) {
      console.error('Failed to toggle completion:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteStudyTask(taskId);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleCarryForward = async (taskId: string) => {
    try {
      await carryForwardTask(taskId, todayStr);
    } catch (err) {
      console.error('Failed to carry forward task:', err);
    }
  };

  const userInitials = userProfile?.name
    ? userProfile.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'ST';

  return (
    <div className="space-y-6">
      {/* Bento Header Section */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            StudyTrack
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
            Welcome back, <span className="text-slate-800 dark:text-slate-200 font-bold">{userProfile?.name || 'Student'}</span>. Today is {formattedTodayDate}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAddModal}
            className="flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all gap-1.5"
          >
            <Plus size={18} />
            <span>Add Target</span>
          </button>
          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full border-2 border-white dark:border-slate-800 shadow-xs flex items-center justify-center font-extrabold text-xs text-slate-700 dark:text-slate-200">
            {userInitials}
          </div>
        </div>
      </header>

      {/* Top Bento Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xs border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Tasks
          </span>
          <span className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">
            {todayTasks.length.toString().padStart(2, '0')}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xs border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
          <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">
            Completed
          </span>
          <span className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">
            {completedToday.length.toString().padStart(2, '0')}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xs border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
          <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
            Pending
          </span>
          <span className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">
            {pendingToday.length.toString().padStart(2, '0')}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xs border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
          <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">
            Missed
          </span>
          <span className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">
            {missedTasksAll.length.toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Main Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left Column: Today's Targets Bento Container */}
        <div className="col-span-12 lg:col-span-8 bg-white dark:bg-slate-800 rounded-3xl shadow-xs border border-slate-100 dark:border-slate-700 p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                Today's Study Targets
              </h2>
              <span className="text-xs text-slate-400 font-semibold px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-full">
                {format(todayDate, 'MMM d, yyyy')}
              </span>
            </div>

            {sortedTodayTasks.length > 0 ? (
              <div className="space-y-3">
                {sortedTodayTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    onEdit={onEditTask}
                    onDelete={handleDeleteTask}
                    onCarryForward={handleCarryForward}
                    onStartStudy={onStartStudy}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/80 p-8 text-center space-y-3 my-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                  <Sparkles size={22} />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                  No targets scheduled for today
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Create structured study targets to maintain your streak and maximize productivity.
                </p>
                <button
                  onClick={onOpenAddModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
                >
                  <Plus size={16} />
                  <span>Add First Target</span>
                </button>
              </div>
            )}
          </div>

          {/* Footer banner for Missed targets */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center text-rose-500 text-xs sm:text-sm font-bold gap-2">
              <AlertCircle size={16} />
              <span>
                {missedTasksAll.length > 0
                  ? `Missed targets: ${missedTasksAll.length} items need review`
                  : 'All catch-up targets clear!'}
              </span>
            </div>
            <Link
              to="/missed-tasks"
              className="text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-bold hover:underline flex items-center gap-1"
            >
              <span>View All Missed Tasks</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Right Column: Widgets */}
        <div className="col-span-12 lg:col-span-4 space-y-5 flex flex-col">
          {/* Streak Bento Card */}
          <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-lg shadow-blue-200 dark:shadow-none">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-extrabold text-blue-100 uppercase tracking-widest">
                  Current Streak
                </span>
                <div className="text-4xl font-black mt-1 flex items-baseline gap-1.5">
                  <span>{userProfile?.currentStreak || 0}</span>
                  <span className="text-lg font-medium opacity-80">Days</span>
                </div>
              </div>
              <div className="p-3 bg-blue-500/80 rounded-2xl text-amber-300 backdrop-blur-xs">
                <Flame size={24} />
              </div>
            </div>
            <div className="text-xs text-blue-100 leading-relaxed font-medium">
              You're building consistent daily study momentum! Keep setting targets to grow your streak.
            </div>
          </div>

          {/* Progress Gauge Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xs border border-slate-100 dark:border-slate-700 flex-1 flex flex-col items-center justify-center min-h-[240px]">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-4">
              Overall Progress
            </h3>
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="58"
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="transparent"
                  className="text-slate-100 dark:text-slate-700"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="58"
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 58}
                  strokeDashoffset={
                    2 * Math.PI * 58 - (2 * Math.PI * 58 * completionPercentage) / 100
                  }
                  strokeLinecap="round"
                  className="text-blue-600 dark:text-blue-500 transition-all duration-500"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-slate-800 dark:text-white">
                  {completionPercentage}%
                </span>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                  COMPLETED
                </span>
              </div>
            </div>
            <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400 text-center px-2">
              {completedToday.length} of {todayTasks.length} targets met. {pendingToday.length} left today!
            </p>
          </div>

          {/* Calendar Snippet Widget */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xs border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <CalendarIcon size={16} className="text-blue-600" />
                <span>Calendar</span>
              </h3>
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                <div className="w-1.5 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full" />
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayName, idx) => (
                <div
                  key={idx}
                  className="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                >
                  {dayName}
                </div>
              ))}

              {weekDays.map((d, i) => {
                const isToday = isSameDay(d, todayDate);
                return (
                  <div
                    key={i}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      isToday
                        ? 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    {format(d, 'd')}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

