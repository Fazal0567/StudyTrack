import React, { useState, useEffect } from 'react';
import { StudyTask, TaskPriority } from '../types';
import { X, AlertCircle } from 'lucide-react';
import { getTodayDateString } from '../services/taskService';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<StudyTask, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  initialTask?: StudyTask | null;
  initialDate?: string;
}

const COMMON_SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Computer Science',
  'English & Literature',
  'Biology',
  'History & Civics',
  'General Revision',
];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTask,
  initialDate,
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Mathematics');
  const [customSubject, setCustomSubject] = useState('');
  const [estimatedTime, setEstimatedTime] = useState<number | string>(30);
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [date, setDate] = useState(initialDate || getTodayDateString());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || '');
      if (COMMON_SUBJECTS.includes(initialTask.subject)) {
        setSubject(initialTask.subject);
        setCustomSubject('');
      } else {
        setSubject('Custom');
        setCustomSubject(initialTask.subject || '');
      }
      setEstimatedTime(initialTask.estimatedTime ?? 30);
      setDueTime(initialTask.dueTime || '');
      setPriority(initialTask.priority || 'Medium');
      setDate(initialTask.date || initialDate || getTodayDateString());
    } else {
      setTitle('');
      setSubject('Mathematics');
      setCustomSubject('');
      setEstimatedTime(30);
      setDueTime('');
      setPriority('Medium');
      setDate(initialDate || getTodayDateString());
    }
    setError('');
    setSaving(false);
  }, [initialTask, initialDate, isOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a target title');
      return;
    }

    const finalSubject = subject === 'Custom' ? customSubject.trim() || 'General' : subject;
    const parsedEstTime = Number(estimatedTime);

    if (isNaN(parsedEstTime) || parsedEstTime < 1) {
      setError('Please enter a valid estimated study time (at least 1 minute)');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await onSave({
        title: title.trim(),
        subject: finalSubject,
        estimatedTime: parsedEstTime,
        dueTime: dueTime || '',
        priority: priority || 'Medium',
        status: initialTask ? initialTask.status : 'Pending',
        date: date || getTodayDateString(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save study target');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle =
    'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium transition-colors shadow-xs caret-blue-600 dark:caret-blue-400';

  const selectStyle =
    'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium transition-colors shadow-xs caret-blue-600 dark:caret-blue-400';

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {initialTask ? 'Edit Study Target' : 'New Study Target'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
            title="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          {error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl flex items-center gap-2 border border-rose-200 dark:border-rose-800">
              <AlertCircle size={15} className="shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
              Target Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Complete Calculus Problem Set 3"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={inputStyle}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Subject
              </label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className={selectStyle}
              >
                {COMMON_SUBJECTS.map(subj => (
                  <option key={subj} value={subj} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {subj}
                  </option>
                ))}
                <option value="Custom" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  + Other Custom Subject
                </option>
              </select>

              {subject === 'Custom' && (
                <input
                  type="text"
                  placeholder="Enter custom subject name"
                  value={customSubject}
                  onChange={e => setCustomSubject(e.target.value)}
                  className={`${inputStyle} mt-2 text-xs py-2`}
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Target Date
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className={inputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-1">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  Est. Time (mins) *
                </label>
                {Number(estimatedTime) > 0 && (
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                    {Number(estimatedTime) >= 60
                      ? `${Math.floor(Number(estimatedTime) / 60)}h ${Number(estimatedTime) % 60 ? `${Number(estimatedTime) % 60}m` : ''}`
                      : `${Number(estimatedTime)}m`}
                  </span>
                )}
              </div>
              <input
                type="number"
                min="1"
                max="1440"
                step="1"
                required
                placeholder="30"
                value={estimatedTime}
                onChange={e => setEstimatedTime(e.target.value)}
                className={inputStyle}
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {[15, 30, 45, 60, 90, 120].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setEstimatedTime(mins)}
                    className={`px-1.5 py-0.5 text-[10px] font-medium rounded-md border transition-colors ${
                      Number(estimatedTime) === mins
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Due Time (Optional)
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
                className={inputStyle}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as TaskPriority)}
                className={selectStyle}
              >
                <option value="Low" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Low</option>
                <option value="Medium" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Medium</option>
                <option value="High" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">High</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {saving ? 'Saving...' : initialTask ? 'Update Target' : 'Add Target'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
