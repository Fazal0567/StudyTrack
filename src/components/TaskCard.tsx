import React, { useState } from 'react';
import { StudyTask } from '../types';
import {
  CheckCircle2,
  Circle,
  Clock,
  Tag,
  ArrowRightCircle,
  Edit2,
  Trash2,
  MoreVertical,
  AlertCircle,
  Play,
} from 'lucide-react';

interface TaskCardProps {
  task: StudyTask;
  onToggleComplete: (task: StudyTask) => void;
  onEdit: (task: StudyTask) => void;
  onDelete: (taskId: string) => void;
  onCarryForward?: (taskId: string) => void;
  onStartStudy?: (task: StudyTask) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  onCarryForward,
  onStartStudy,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const priorityStyles = {
    Low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    Medium: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/50',
    High: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/50 dark:border-rose-800/50',
  };

  const isCompleted = task.status === 'Completed';
  const isMissed = task.status === 'Missed';

  const handleCardClick = () => {
    if (onStartStudy) {
      onStartStudy(task);
    }
  };

  return (
    <div
      className={`relative group rounded-2xl border p-4 transition-all duration-200 shadow-xs ${
        isCompleted
          ? 'border-blue-100 dark:border-slate-800 opacity-75 bg-blue-50/40 dark:bg-slate-800/40'
          : isMissed
          ? 'border-rose-200/80 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20'
          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-700/60 hover:border-blue-200 dark:hover:border-blue-700'
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Checkbox button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(task);
          }}
          className="mt-0.5 text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 transition-colors focus:outline-none shrink-0"
          title={isCompleted ? 'Mark as Pending' : 'Mark as Completed'}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-emerald-100 dark:fill-emerald-950/50" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>

        {/* Task Details */}
        <div
          onClick={handleCardClick}
          className="flex-1 min-w-0 cursor-pointer"
          title="Click to view & start timer"
        >
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              <Tag size={12} />
              {task.subject}
            </span>

            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-md border ${
                priorityStyles[task.priority]
              }`}
            >
              {task.priority} Priority
            </span>

            {isMissed && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
                <AlertCircle size={12} />
                Missed
              </span>
            )}
          </div>

          <h3
            className={`font-semibold text-slate-900 dark:text-slate-100 text-base leading-tight mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${
              isCompleted ? 'line-through text-slate-500 dark:text-slate-400' : ''
            }`}
          >
            {task.title}
          </h3>

          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <div className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
              <Clock size={13} className="text-blue-500" />
              <span>Time: {task.estimatedTime} mins</span>
            </div>

            {task.dueTime && (
              <div className="flex items-center gap-1">
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  Due: {task.dueTime}
                </span>
              </div>
            )}

            <div className="text-slate-400">Date: {task.date}</div>
          </div>
        </div>

        {/* Start Button & Action Menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onStartStudy && !isCompleted && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartStudy(task);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-lg shadow-xs transition-all active:scale-95"
              title={`Start Timer (${task.estimatedTime} mins)`}
            >
              <Play size={13} className="fill-current shrink-0" />
              <span className="hidden sm:inline">Start ({task.estimatedTime}m)</span>
              <span className="sm:hidden">{task.estimatedTime}m</span>
            </button>
          )}

          {isMissed && onCarryForward && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCarryForward(task.id);
              }}
              className="inline-flex items-center gap-1 text-xs font-medium bg-slate-800 text-white dark:bg-slate-700 hover:bg-slate-900 px-2.5 py-1.5 rounded-lg shadow-xs transition-all"
              title="Move this missed target to Today"
            >
              <ArrowRightCircle size={14} />
              <span className="hidden sm:inline">Carry Forward</span>
            </button>
          )}

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <MoreVertical size={18} />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-20 text-xs">
                  {onStartStudy && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onStartStudy(task);
                      }}
                      className="w-full text-left px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center gap-2 font-semibold"
                    >
                      <Play size={14} className="fill-current" />
                      Start Timer
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onEdit(task);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Edit2 size={14} />
                    Edit Target
                  </button>
                  {isMissed && onCarryForward && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onCarryForward(task.id);
                      }}
                      className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <ArrowRightCircle size={14} />
                      Carry Forward
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete(task.id);
                    }}
                    className="w-full text-left px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
