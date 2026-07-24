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
import { Plus, Filter, CheckSquare, Sparkles } from 'lucide-react';

interface TodaysTasksProps {
  onOpenAddModal: () => void;
  onEditTask: (task: StudyTask) => void;
  onStartStudy?: (task: StudyTask) => void;
}

export const TodaysTasks: React.FC<TodaysTasksProps> = ({
  onOpenAddModal,
  onEditTask,
  onStartStudy,
}) => {
  const { tasks } = useAuth();
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Completed'>('All');

  const todayStr = getTodayDateString();

  // Filter tasks for today
  const todayTasks = tasks.filter(t => t.date === todayStr);

  // Apply status filter
  const filteredTasks = todayTasks.filter(task => {
    if (filter === 'Pending') return task.status === 'Pending';
    if (filter === 'Completed') return task.status === 'Completed';
    return true;
  });

  // Reorder automatically: Pending first, Completed last
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.status === 'Completed' && b.status !== 'Completed') return 1;
    if (a.status !== 'Completed' && b.status === 'Completed') return -1;
    return a.title.localeCompare(b.title);
  });

  const handleToggleComplete = async (task: StudyTask) => {
    try {
      await toggleTaskCompletion(task);
    } catch (err) {
      console.error('Error toggling task completion:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
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
      console.error('Error carrying forward task:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckSquare className="text-blue-600 dark:text-blue-400" size={26} />
            Today's Study Targets
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Focus on completing your daily goals. Completed targets automatically sort to the bottom.
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>Add New Target</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {(['All', 'Pending', 'Completed'] as const).map(tab => {
            const count =
              tab === 'All'
                ? todayTasks.length
                : todayTasks.filter(t => t.status === tab).length;

            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === tab
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-400 hidden sm:block">
          Date: {todayStr}
        </div>
      </div>

      {/* Task List */}
      {sortedTasks.length > 0 ? (
        <div className="space-y-3">
          {sortedTasks.map(task => (
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
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <Sparkles size={24} />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
            No {filter !== 'All' ? filter.toLowerCase() : ''} study targets found for today
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Add your subjects and study targets for today to start tracking progress.
          </p>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            <span>Add Study Target</span>
          </button>
        </div>
      )}
    </div>
  );
};
