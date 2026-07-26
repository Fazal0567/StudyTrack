import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { subDays, format } from 'date-fns';
import {
  requestBrowserNotificationPermission,
  getNotificationPermissionStatus,
  triggerReminder,
} from '../services/notificationService';
import { sendEmailReminder, sendTestEmail, getEmailStatus } from '../services/emailService';
import {
  Settings,
  Moon,
  Sun,
  Bell,
  Mail,
  Lock,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Send,
  Sparkles,
  ExternalLink,
  Info,
  Calendar,
  Filter,
  BarChart3,
  FileText,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { userProfile, tasks, updateUserProfile, changePassword, logout } = useAuth();
  const { theme, toggleTheme, setTheme } = useTheme();

  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(getNotificationPermissionStatus());

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [emailStatusMsg, setEmailStatusMsg] = useState('');
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailServerInfo, setEmailServerInfo] = useState<{ configured: boolean; mode: string }>({
    configured: false,
    mode: 'simulation',
  });

  // Custom Email Report Builder State
  const [selectedReportType, setSelectedReportType] = useState<'morning' | 'evening' | 'night' | 'progress_report'>('progress_report');
  const [selectedTaskFilter, setSelectedTaskFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<'today' | 'yesterday' | 'specific' | 'all'>('today');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState<boolean>(
    userProfile?.emailNotifications ?? true
  );

  const getFilteredTaskData = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    let tasksForDate = tasks;
    let dateLabel = 'Today';

    if (selectedDateRange === 'today') {
      tasksForDate = tasks.filter(t => t.date === todayStr);
      dateLabel = `Today (${todayStr})`;
    } else if (selectedDateRange === 'yesterday') {
      tasksForDate = tasks.filter(t => t.date === yesterdayStr);
      dateLabel = `Yesterday (${yesterdayStr})`;
    } else if (selectedDateRange === 'specific') {
      tasksForDate = tasks.filter(t => t.date === customDate);
      dateLabel = customDate || todayStr;
    } else if (selectedDateRange === 'all') {
      tasksForDate = tasks;
      dateLabel = 'All Dates';
    }

    let finalTasks = tasksForDate;
    if (selectedTaskFilter === 'completed') {
      finalTasks = tasksForDate.filter(t => t.status === 'Completed');
    } else if (selectedTaskFilter === 'pending') {
      finalTasks = tasksForDate.filter(t => t.status === 'Pending');
    }

    const completedCount = tasksForDate.filter(t => t.status === 'Completed').length;
    const totalCount = tasksForDate.length;
    const pendingCount = tasksForDate.filter(t => t.status === 'Pending').length;
    const totalStudyMinutes = tasksForDate
      .filter(t => t.status === 'Completed')
      .reduce((acc, t) => acc + (t.estimatedTime || 0), 0);
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return {
      filteredTasks: finalTasks,
      dateLabel,
      totalCount,
      completedCount,
      pendingCount,
      totalStudyMinutes,
      completionRate,
    };
  };

  const handleSendCustomEmailReport = async () => {
    if (!userProfile?.email) return;

    try {
      setTestingEmail(true);
      setEmailStatusMsg('');
      setEmailPreviewUrl(null);

      const {
        filteredTasks,
        dateLabel,
        totalCount,
        completedCount,
        pendingCount,
        totalStudyMinutes,
        completionRate,
      } = getFilteredTaskData();

      const res = await sendEmailReminder({
        toEmail: userProfile.email,
        userName: userProfile.name,
        reminderType: selectedReportType,
        taskFilter: selectedTaskFilter,
        targetDate: selectedDateRange === 'specific' ? customDate : selectedDateRange,
        targetDateLabel: dateLabel,
        tasks: filteredTasks,
        stats: {
          totalTasks: totalCount,
          completedCount,
          pendingCount,
          totalStudyMinutes,
          currentStreak: userProfile.currentStreak || 0,
          completionRate,
        },
        emailNotificationsEnabled,
      });

      setEmailStatusMsg(res.message);
      if (res.previewUrl) {
        setEmailPreviewUrl(res.previewUrl);
      }
    } catch (err: any) {
      setEmailStatusMsg(err.message || 'Failed to dispatch email report');
    } finally {
      setTestingEmail(false);
    }
  };

  useEffect(() => {
    if (userProfile?.emailNotifications !== undefined) {
      setEmailNotificationsEnabled(userProfile.emailNotifications);
    }
  }, [userProfile?.emailNotifications]);

  const handleToggleEmailNotifications = async () => {
    const nextVal = !emailNotificationsEnabled;
    setEmailNotificationsEnabled(nextVal);
    if (userProfile) {
      try {
        await updateUserProfile({ emailNotifications: nextVal });
      } catch (err) {
        console.error('Failed to update email notifications preference:', err);
        setEmailNotificationsEnabled(!nextVal);
      }
    }
  };

  useEffect(() => {
    getEmailStatus().then(info => {
      setEmailServerInfo({ configured: info.configured, mode: info.mode });
    });
  }, []);

  const handleEnableBrowserNotifications = async () => {
    const granted = await requestBrowserNotificationPermission();
    setNotificationPermission(getNotificationPermissionStatus());
    if (userProfile) {
      await updateUserProfile({ browserNotifications: granted });
    }
  };

  const handleTestBrowserReminder = (type: 'morning' | 'evening' | 'night') => {
    const pendingCount = tasks.filter(t => t.status === 'Pending').length;
    triggerReminder(type, pendingCount);
  };



  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setPasswordErr('Please enter a new password');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErr('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordErr('Password must be at least 6 characters long');
      return;
    }

    try {
      setChangingPassword(true);
      setPasswordErr('');
      setPasswordMsg('');
      await changePassword(newPassword);
      setPasswordMsg('Password changed successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordErr(err.message || 'Failed to change password. You may need to sign in again.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="text-blue-600 dark:text-blue-400" size={26} />
          Settings & Preferences
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Customize your theme, notification schedules, email reminders, and security preferences.
        </p>
      </div>

      {/* Theme Preference */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Appearance Mode
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose between Light and Dark interface modes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setTheme('light')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                theme === 'light'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sun size={14} />
              Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                theme === 'dark'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Moon size={14} />
              Dark
            </button>
          </div>
        </div>
      </div>

      {/* Browser Notifications */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Browser Notifications
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Receive browser alert popups for morning planning, evening check-ins, and night summaries.
              </p>
            </div>
          </div>

          <button
            onClick={handleEnableBrowserNotifications}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              notificationPermission === 'granted'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {notificationPermission === 'granted' ? 'Permission Granted ✓' : 'Enable Notifications'}
          </button>
        </div>

        {notificationPermission === 'granted' && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Test Reminder Notifications
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleTestBrowserReminder('morning')}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg flex items-center gap-1"
              >
                🌅 Morning Reminder
              </button>
              <button
                onClick={() => handleTestBrowserReminder('evening')}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg flex items-center gap-1"
              >
                ... Evening Reminder
              </button>
              <button
                onClick={() => handleTestBrowserReminder('night')}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg flex items-center gap-1"
              >
                🌙 Night Reminder
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Email Reminders */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Mail size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Email Reminders
                </h3>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    !emailNotificationsEnabled
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : emailServerInfo.configured
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {!emailNotificationsEnabled
                    ? '🔴 SMTP Stopped (OFF)'
                    : emailServerInfo.configured
                    ? '🟢 SMTP Live & Active'
                    : '🟡 Test Sandbox Active'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Target digests sent to: <span className="font-semibold text-slate-700 dark:text-slate-300">{userProfile?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span
              className={`text-xs font-bold transition-colors ${
                emailNotificationsEnabled
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {emailNotificationsEnabled ? 'ON' : 'OFF'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={emailNotificationsEnabled}
              onClick={handleToggleEmailNotifications}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                emailNotificationsEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
              title={
                emailNotificationsEnabled
                  ? 'Disable Email Reminders'
                  : 'Enable Email Reminders'
              }
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  emailNotificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Informational Guidance Box */}
        {!emailServerInfo.configured && (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <Info size={15} className="text-blue-500" />
              <span>Why are real emails not arriving in my personal inbox?</span>
            </div>
            <p className="leading-relaxed">
              By default, StudyTrack runs in a safe sandbox mode using Ethereal email testing. When you test reminders below, emails are generated and available via a instant preview link!
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              To deliver emails to real external inboxes (e.g. Gmail, Outlook), set <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200 font-mono">SMTP_HOST</code>, <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200 font-mono">SMTP_USER</code>, and <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200 font-mono">SMTP_PASS</code> in environment variables.
            </p>
          </div>
        )}

        {emailStatusMsg && (
          <div className="p-3 bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 text-xs rounded-xl border border-blue-200 dark:border-blue-800 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{emailStatusMsg}</span>
            </div>
            {emailPreviewUrl && (
              <a
                href={emailPreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition-colors shadow-xs"
              >
                <ExternalLink size={13} />
                <span>Open Generated Email Preview</span>
              </a>
            )}
          </div>
        )}



        {/* Custom Email Report Configurator */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Filter size={15} className="text-blue-600 dark:text-blue-400" />
              Custom Email Report Builder
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Select date, task status, & report style
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Report Type Selection */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Report Format
              </label>
              <select
                value={selectedReportType}
                onChange={e => setSelectedReportType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="progress_report">📊 Full Progress Report</option>
                <option value="morning">🌅 Morning Target Plan</option>
                <option value="evening">🌇 Evening Check-in</option>
                <option value="night">🌙 Night Summary</option>
              </select>
            </div>

            {/* 2. Task Status Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Filter Task Status
              </label>
              <select
                value={selectedTaskFilter}
                onChange={e => setSelectedTaskFilter(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">📌 All Targets</option>
                <option value="completed">✅ Completed Targets Only</option>
                <option value="pending">⏳ Non-Completed (Pending) Only</option>
              </select>
            </div>

            {/* 3. Target Date Selection */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                Date Range
              </label>
              <select
                value={selectedDateRange}
                onChange={e => setSelectedDateRange(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="specific">Specific Date...</option>
                <option value="all">All Dates (All-Time)</option>
              </select>
            </div>
          </div>

          {/* Specific Date Picker (when 'specific' selected) */}
          {selectedDateRange === 'specific' && (
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200">
                <Calendar size={15} />
                <span>Choose Specific Date:</span>
              </div>
              <input
                type="date"
                value={customDate}
                onChange={e => setCustomDate(e.target.value)}
                className="px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none"
              />
            </div>
          )}

          {/* Live Filter Summary Badge & Action Button */}
          {(() => {
            const data = getFilteredTaskData();
            return (
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-extrabold text-slate-900 dark:text-white">Selected Digest Summary: </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {data.filteredTasks.length} target(s)
                  </span>{' '}
                  found for <span className="font-bold">{data.dateLabel}</span> (
                  {selectedTaskFilter === 'completed'
                    ? 'Completed Only'
                    : selectedTaskFilter === 'pending'
                    ? 'Pending Only'
                    : 'All Statuses'}
                  )
                </div>

                <button
                  type="button"
                  onClick={handleSendCustomEmailReport}
                  disabled={testingEmail}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
                >
                  <Send size={14} />
                  <span>{testingEmail ? 'Dispatching Email...' : 'Send Selected Email Report'}</span>
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <Lock size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Change Password
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Update your account security password
            </p>
          </div>
        </div>

        {passwordMsg && (
          <div className="p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-xs rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{passwordMsg}</span>
          </div>
        )}

        {passwordErr && (
          <div className="p-3 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 text-xs rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{passwordErr}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={changingPassword}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors disabled:opacity-50"
          >
            {changingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Logout button card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Sign Out</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Log out from your current session on this browser
          </p>
        </div>

        <button
          onClick={logout}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 transition-colors flex items-center gap-1.5"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

