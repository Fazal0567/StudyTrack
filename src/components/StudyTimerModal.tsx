import React, { useState, useEffect, useRef } from 'react';
import { StudyTask } from '../types';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  Tag,
  Flame,
  Volume2,
  VolumeX,
  Plus,
  Minus,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { toggleTaskCompletion } from '../services/taskService';

interface StudyTimerModalProps {
  task: StudyTask | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: () => void;
}

export const StudyTimerModal: React.FC<StudyTimerModalProps> = ({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
}) => {
  if (!isOpen || !task) return null;

  // Time specified in minutes (default to task.estimatedTime)
  const [specifiedMinutes, setSpecifiedMinutes] = useState<number>(task.estimatedTime || 25);
  const [secondsRemaining, setSecondsRemaining] = useState<number>((task.estimatedTime || 25) * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isCompleted, setIsCompleted] = useState<boolean>(task.status === 'Completed');
  const [completing, setCompleting] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync initial task state when modal opens or task changes
  useEffect(() => {
    const mins = task.estimatedTime && task.estimatedTime > 0 ? task.estimatedTime : 25;
    setSpecifiedMinutes(mins);
    setSecondsRemaining(mins * 60);
    setIsRunning(false);
    setIsCompleted(task.status === 'Completed');
  }, [task]);

  // Web Audio sound generator for completion/chime
  const playChimeSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.3); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.6); // G5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (e) {
      console.warn('Audio context play error:', e);
    }
  };

  // Countdown effect
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout);
            setIsRunning(false);
            playChimeSound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, soundEnabled]);

  const totalSeconds = specifiedMinutes * 60;
  const progressPercent =
    totalSeconds > 0 ? Math.min(100, Math.max(0, ((totalSeconds - secondsRemaining) / totalSeconds) * 100)) : 0;

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remainderSecs = secs % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${remainderSecs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${remainderSecs.toString().padStart(2, '0')}`;
  };

  const handleStartPause = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsRemaining(specifiedMinutes * 60);
  };

  const handleAdjustTime = (deltaMinutes: number) => {
    const newMins = Math.max(1, specifiedMinutes + deltaMinutes);
    setSpecifiedMinutes(newMins);
    if (!isRunning) {
      setSecondsRemaining(newMins * 60);
    } else {
      setSecondsRemaining(prev => Math.max(0, prev + deltaMinutes * 60));
    }
  };

  const handleSetPresetTime = (mins: number) => {
    setSpecifiedMinutes(mins);
    setIsRunning(false);
    setSecondsRemaining(mins * 60);
  };

  const handleMarkCompleted = async () => {
    if (!task) return;
    setCompleting(true);
    try {
      playChimeSound();
      await toggleTaskCompletion(task);
      setIsCompleted(true);
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      console.error('Failed to mark task completed:', err);
    } finally {
      setCompleting(false);
    }
  };

  const priorityBadgeStyle = {
    Low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    Medium: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/50',
    High: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/50 dark:border-rose-800/50',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700/80 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
              <Clock size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Focus Study Session
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Specified Target Time: {specifiedMinutes} mins
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title={soundEnabled ? 'Disable Chime Sound' : 'Enable Chime Sound'}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 min-h-0">
          {/* Task Info Card */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/80">
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                <Tag size={12} />
                {task.subject}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${priorityBadgeStyle[task.priority]}`}>
                {task.priority} Priority
              </span>
            </div>

            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
              {task.title}
            </h3>

            {task.dueTime && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Scheduled Due Time: {task.dueTime}
              </p>
            )}
          </div>

          {/* Radial / Countdown Timer Section */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative w-52 h-52 flex items-center justify-center">
              {/* Outer SVG Gauge */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="104"
                  cy="104"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  className="text-slate-100 dark:text-slate-700/60"
                />
                <circle
                  cx="104"
                  cy="104"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 88}
                  strokeDashoffset={2 * Math.PI * 88 - (2 * Math.PI * 88 * progressPercent) / 100}
                  strokeLinecap="round"
                  className={`transition-all duration-300 ${
                    isRunning
                      ? 'text-blue-600 dark:text-blue-500'
                      : secondsRemaining === 0
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
              </svg>

              {/* Center Countdown Display */}
              <div className="absolute flex flex-col items-center text-center">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                  {formatTime(secondsRemaining)}
                </span>
                <span className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase mt-1">
                  {secondsRemaining === 0
                    ? 'TIME EXPIRED'
                    : isRunning
                    ? 'STUDY SESSION ACTIVE'
                    : 'PAUSED'}
                </span>
              </div>
            </div>

            {/* Time Adjuster presets */}
            <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
              <button
                onClick={() => handleAdjustTime(-5)}
                disabled={isRunning && secondsRemaining <= 300}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                title="Subtract 5 minutes"
              >
                <Minus size={14} />
                <span>5m</span>
              </button>

              {[15, 25, 45, 60].map(mins => (
                <button
                  key={mins}
                  onClick={() => handleSetPresetTime(mins)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    specifiedMinutes === mins
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {mins}m
                </button>
              ))}

              <button
                onClick={() => handleAdjustTime(5)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-xs font-bold flex items-center gap-1"
                title="Add 5 minutes"
              >
                <Plus size={14} />
                <span>5m</span>
              </button>
            </div>
          </div>

          {/* Primary Controls */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <button
                onClick={handleStartPause}
                className={`flex-1 py-3.5 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 text-white shadow-md transition-all ${
                  isRunning
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200 dark:shadow-none'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause size={18} />
                    <span>Pause Session</span>
                  </>
                ) : (
                  <>
                    <Play size={18} className="fill-current" />
                    <span>{secondsRemaining < totalSeconds ? 'Resume Session' : 'Start Study Timer'}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleReset}
                className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-bold text-sm"
                title="Reset Timer"
              >
                <RotateCcw size={18} />
              </button>
            </div>

            {/* Complete Task Button */}
            <button
              onClick={handleMarkCompleted}
              disabled={completing}
              className={`w-full py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border transition-all ${
                isCompleted
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent hover:opacity-90 shadow-sm'
              }`}
            >
              <CheckCircle2 size={18} className={isCompleted ? 'text-emerald-600 dark:text-emerald-400' : ''} />
              <span>
                {completing
                  ? 'Saving...'
                  : isCompleted
                  ? 'Target Completed! 🎉'
                  : 'Mark Target as Completed'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
