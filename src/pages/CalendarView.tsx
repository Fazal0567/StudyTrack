import React, { useState } from 'react';
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
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Plus,
} from 'lucide-react';

interface CalendarViewProps {
  onOpenAddModal?: (dateStr?: string) => void;
  onEditTask: (task: StudyTask) => void;
  onStartStudy?: (task: StudyTask) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onOpenAddModal,
  onEditTask,
  onStartStudy,
}) => {
  const { tasks, userProfile, updateTaskInState, deleteTaskInState } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const todayStr = getTodayDateString();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedDateTasks = tasks.filter(t => t.date === selectedDateStr);

  const completedCount = selectedDateTasks.filter(t => t.status === 'Completed').length;
  const pendingCount = selectedDateTasks.filter(t => t.status === 'Pending').length;
  const missedCount = selectedDateTasks.filter(t => t.status === 'Missed').length;

  const handleToggleComplete = async (task: StudyTask) => {
    const isNowCompleted = task.status !== 'Completed';
    updateTaskInState(task.id, {
      status: isNowCompleted ? 'Completed' : 'Pending',
      completedAt: isNowCompleted ? new Date().toISOString() : undefined,
    });
    try {
      await toggleTaskCompletion(task, userProfile);
    } catch (err) {
      console.error('Error toggling complete:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    deleteTaskInState(taskId);
    try {
      await deleteStudyTask(taskId);
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleCarryForward = async (taskId: string) => {
    try {
      await carryForwardTask(taskId, todayStr);
    } catch (err) {
      console.error('Error carrying forward:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="text-blue-600 dark:text-blue-400" size={26} />
            Study Targets Calendar
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review your daily study targets across the month or pick any date to add new targets.
          </p>
        </div>
        {onOpenAddModal && (
          <button
            onClick={() => onOpenAddModal(selectedDateStr)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>Add Target for {format(selectedDate, 'MMM d')}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Calendar Grid */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-sm">
          {/* Controls */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => {
                  setCurrentMonth(new Date());
                  setSelectedDate(new Date());
                }}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 mb-2">
            <div><span className="sm:hidden">S</span><span className="hidden sm:inline">Sun</span></div>
            <div><span className="sm:hidden">M</span><span className="hidden sm:inline">Mon</span></div>
            <div><span className="sm:hidden">T</span><span className="hidden sm:inline">Tue</span></div>
            <div><span className="sm:hidden">W</span><span className="hidden sm:inline">Wed</span></div>
            <div><span className="sm:hidden">T</span><span className="hidden sm:inline">Thu</span></div>
            <div><span className="sm:hidden">F</span><span className="hidden sm:inline">Fri</span></div>
            <div><span className="sm:hidden">S</span><span className="hidden sm:inline">Sat</span></div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const dayTasks = tasks.filter(t => t.date === dayStr);
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDay = isSameDay(day, new Date());
              const isCurrentMonthDay = isSameMonth(day, monthStart);

              const dayCompleted = dayTasks.filter(t => t.status === 'Completed').length;
              const dayMissed = dayTasks.filter(t => t.status === 'Missed').length;
              const dayPending = dayTasks.filter(t => t.status === 'Pending').length;

              return (
                <button
                  key={dayStr}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[48px] sm:min-h-[60px] p-1 sm:p-1.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    !isCurrentMonthDay
                      ? 'opacity-40 border-transparent bg-slate-50/50 dark:bg-slate-900/30'
                      : isSelected
                      ? 'border-blue-600 dark:border-blue-400 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                      : isTodayDay
                      ? 'border-amber-400 dark:border-amber-500/80 bg-amber-50/30 dark:bg-amber-950/20'
                      : 'border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span
                    className={`text-[10px] sm:text-xs font-bold inline-block px-1 sm:px-1.5 py-0.5 rounded-md ${
                      isTodayDay
                        ? 'bg-amber-500 text-white'
                        : isSelected
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>

                  {dayTasks.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap text-[10px] font-bold">
                      {dayCompleted > 0 && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title={`${dayCompleted} Completed`} />
                      )}
                      {dayPending > 0 && (
                        <span className="w-2 h-2 rounded-full bg-blue-500" title={`${dayPending} Pending`} />
                      )}
                      {dayMissed > 0 && (
                        <span className="w-2 h-2 rounded-full bg-rose-500" title={`${dayMissed} Missed`} />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Task Inspector */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {format(selectedDate, 'EEEE, MMM d, yyyy')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedDateTasks.length} target{selectedDateTasks.length === 1 ? '' : 's'} scheduled
                </p>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  {completedCount} Done
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  {pendingCount} Pending
                </span>
                <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  {missedCount} Missed
                </span>
              </div>
            </div>

            {selectedDateTasks.length > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-end mb-2">
                  {onOpenAddModal && (
                    <button
                      onClick={() => onOpenAddModal(selectedDateStr)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                    >
                      <Plus size={14} />
                      <span>Add Target for this Day</span>
                    </button>
                  )}
                </div>
                {selectedDateTasks.map(task => (
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
              <div className="py-8 text-center space-y-3">
                <Sparkles className="mx-auto text-slate-300 dark:text-slate-600" size={28} />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No study targets recorded for {format(selectedDate, 'MMM d, yyyy')}.
                </p>
                {onOpenAddModal && (
                  <button
                    onClick={() => onOpenAddModal(selectedDateStr)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
                  >
                    <Plus size={16} />
                    <span>Add Target for {format(selectedDate, 'MMM d')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
