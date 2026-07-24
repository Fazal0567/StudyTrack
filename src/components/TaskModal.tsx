import React, { useState, useEffect } from 'react';
import { StudyTask, TaskPriority } from '../types';
import { X, Plus, Clock, Tag, Calendar, AlertCircle } from 'lucide-react';
import { getTodayDateString } from '../services/taskService';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<StudyTask, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  initialTask?: StudyTask | null;
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
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Mathematics');
  const [customSubject, setCustomSubject] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(30);
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [date, setDate] = useState(getTodayDateString());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      if (COMMON_SUBJECTS.includes(initialTask.subject)) {
        setSubject(initialTask.subject);
        setCustomSubject('');
      } else {
        setSubject('Custom');
        setCustomSubject(initialTask.subject);
      }
      setEstimatedTime(initialTask.estimatedTime || 30);
      setDueTime(initialTask.dueTime || '');
      setPriority(initialTask.priority || 'Medium');
      setDate(initialTask.date || getTodayDateString());
    } else {
      setTitle('');
      setSubject('Mathematics');
      setCustomSubject('');
      setEstimatedTime(30);
      setDueTime('');
      setPriority('Medium');
      setDate(getTodayDateString());
    }
    setError('');
  }, [initialTask, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a target title');
      return;
    }

    const finalSubject = subject === 'Custom' ? customSubject.trim() || 'General' : subject;

    try {
      setSaving(true);
      setError('');
      await onSave({
        title: title.trim(),
        subject: finalSubject,
        estimatedTime: Number(estimatedTime) || 30,
        dueTime,
        priority,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            {initialTask ? 'Edit Study Target' : 'New Study Target'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          {error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg flex items-center gap-2 border border-rose-200 dark:border-rose-800">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Complete Calculus Problem Set 3"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subject
              </label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              >
                {COMMON_SUBJECTS.map(subj => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
                <option value="Custom">+ Other Custom Subject</option>
              </select>

              {subject === 'Custom' && (
                <input
                  type="text"
                  placeholder="Enter custom subject"
                  value={customSubject}
                  onChange={e => setCustomSubject(e.target.value)}
                  className="mt-2 w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Date
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Estimated Time (mins)
              </label>
              <input
                type="number"
                min="5"
                max="600"
                step="5"
                value={estimatedTime}
                onChange={e => setEstimatedTime(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Due Time (Optional)
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700 mt-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {saving ? 'Saving...' : initialTask ? 'Update Target' : 'Add Target'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
