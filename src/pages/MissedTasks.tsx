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
import { AlertCircle, ArrowRightCircle, CheckCircle } from 'lucide-react';

interface MissedTasksProps {
  onEditTask: (task: StudyTask) => void;
  onStartStudy?: (task: StudyTask) => void;
}

export const MissedTasks: React.FC<MissedTasksProps> = ({ onEditTask, onStartStudy }) => {
  const { tasks } = useAuth();
  const todayStr = getTodayDateString();

  // Filter all missed tasks
  const missedTasks = tasks.filter(t => t.status === 'Missed');

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

  const handleCarryAllForward = async () => {
    for (const task of missedTasks) {
      try {
        await carryForwardTask(task.id, todayStr);
      } catch (err) {
        console.error('Failed to carry forward task:', task.id, err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="text-rose-600 dark:text-rose-400" size={26} />
            Missed Study Targets
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Unfinished targets from previous days. Carry them forward to today to keep your progress moving.
          </p>
        </div>

        {missedTasks.length > 0 && (
          <button
            onClick={handleCarryAllForward}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all self-start sm:self-auto"
          >
            <ArrowRightCircle size={18} />
            <span>Carry All Forward to Today</span>
          </button>
        )}
      </div>

      {/* List */}
      {missedTasks.length > 0 ? (
        <div className="space-y-3">
          {missedTasks.map(task => (
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
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle size={26} />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
            No missed study targets! 🎉
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Great job! You have no pending missed tasks from past days.
          </p>
        </div>
      )}
    </div>
  );
};
