import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  requestBrowserNotificationPermission,
  getNotificationPermissionStatus,
  triggerReminder,
} from '../services/notificationService';
import { sendEmailReminder, getEmailStatus } from '../services/emailService';
import {
  Settings,
  Moon,
  Sun,
  Bell,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Send,
  Sparkles,
  ExternalLink,
  Info,
  Clock,
  Save,
  Calendar,
  Filter,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { userProfile, tasks, updateUserProfile, changePassword, logout } = useAuth();
  const { theme, toggleTheme, setTheme } = useTheme();

  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(getNotificationPermissionStatus());

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [emailStatusMsg, setEmailStatusMsg] = useState('');
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);
  const [emailServerInfo, setEmailServerInfo] = useState<{ configured: boolean; mode: string }>({
    configured: false,
    mode: 'simulation',
  });

  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState<boolean>(
    userProfile?.emailNotifications ?? true
  );

  // Custom Scheduled Email Report States
  const [emailReportEnabled, setEmailReportEnabled] = useState<boolean>(
    userProfile?.emailReportEnabled ?? true
  );
  const [emailReportTime, setEmailReportTime] = useState<string>(
    userProfile?.emailReportTime || '09:00'
  );
  const [emailReportType, setEmailReportType] = useState<'progress_report' | 'morning' | 'evening' | 'night'>(
    userProfile?.emailReportType || 'progress_report'
  );
  const [emailReportFilter, setEmailReportFilter] = useState<'all' | 'completed' | 'pending'>(
    userProfile?.emailReportFilter || 'all'
  );
  const [emailReportDateRange, setEmailReportDateRange] = useState<'today' | 'yesterday' | 'specific' | 'all'>(
    userProfile?.emailReportDateRange || 'today'
  );
  const [emailReportCustomDate, setEmailReportCustomDate] = useState<string>(
    userProfile?.emailReportCustomDate || new Date().toISOString().split('T')[0]
  );

  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [scheduleSavedMsg, setScheduleSavedMsg] = useState('');
  const [isTriggeringNow, setIsTriggeringNow] = useState(false);

  useEffect(() => {
    if (userProfile?.emailNotifications !== undefined) {
      setEmailNotificationsEnabled(userProfile.emailNotifications);
    }
    if (userProfile?.emailReportEnabled !== undefined) {
      setEmailReportEnabled(userProfile.emailReportEnabled);
    }
    if (userProfile?.emailReportTime) {
      setEmailReportTime(userProfile.emailReportTime);
    }
    if (userProfile?.emailReportType) {
      setEmailReportType(userProfile.emailReportType);
    }
    if (userProfile?.emailReportFilter) {
      setEmailReportFilter(userProfile.emailReportFilter);
    }
    if (userProfile?.emailReportDateRange) {
      setEmailReportDateRange(userProfile.emailReportDateRange);
    }
    if (userProfile?.emailReportCustomDate) {
      setEmailReportCustomDate(userProfile.emailReportCustomDate);
    }
  }, [userProfile]);

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

  const handleSaveReportSchedule = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();

    try {
      setIsSavingSchedule(true);
      setScheduleSavedMsg('');
      await updateUserProfile({
        emailReportEnabled,
        emailReportTime,
        emailReportType,
        emailReportFilter,
        emailReportDateRange,
        emailReportCustomDate,
      });
      setScheduleSavedMsg('Report delivery schedule updated and saved!');
      setTimeout(() => setScheduleSavedMsg(''), 4000);
    } catch (err: any) {
      console.error('Failed to save email report schedule:', err);
      setScheduleSavedMsg('Failed to save schedule preferences.');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleSendScheduledReportNow = async () => {
    if (!userProfile?.email) return;

    try {
      setIsTriggeringNow(true);
      setEmailStatusMsg('');
      setEmailPreviewUrl(null);

      const todayStr = new Date().toISOString().split('T')[0];
      let targetDateStr = todayStr;
      let targetDateLabel = `Today (${todayStr})`;

      if (emailReportDateRange === 'yesterday') {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        targetDateStr = y.toISOString().split('T')[0];
        targetDateLabel = `Yesterday (${targetDateStr})`;
      } else if (emailReportDateRange === 'specific') {
        targetDateStr = emailReportCustomDate || todayStr;
        targetDateLabel = `Specific Date (${targetDateStr})`;
      } else if (emailReportDateRange === 'all') {
        targetDateStr = 'all';
        targetDateLabel = 'All Dates (All-Time)';
      }

      let filteredTasks = emailReportDateRange === 'all' ? [...tasks] : tasks.filter(t => t.date === targetDateStr);
      if (emailReportFilter === 'completed') {
        filteredTasks = filteredTasks.filter(t => t.status === 'Completed');
      } else if (emailReportFilter === 'pending') {
        filteredTasks = filteredTasks.filter(t => t.status === 'Pending');
      }

      const baseTargetTasks = emailReportDateRange === 'all' ? tasks : tasks.filter(t => t.date === targetDateStr);
      const completedCount = baseTargetTasks.filter(t => t.status === 'Completed').length;
      const totalCount = baseTargetTasks.length;
      const pendingCount = baseTargetTasks.filter(t => t.status === 'Pending').length;
      const totalStudyMinutes = baseTargetTasks
        .filter(t => t.status === 'Completed')
        .reduce((acc, t) => acc + (t.estimatedTime || 0), 0);
      const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      const res = await sendEmailReminder({
        toEmail: userProfile.email,
        userName: userProfile.name,
        reminderType: emailReportType,
        taskFilter: emailReportFilter,
        targetDate: targetDateStr,
        targetDateLabel,
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
      setEmailStatusMsg(err.message || 'Failed to dispatch report email');
    } finally {
      setIsTriggeringNow(false);
    }
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
          Customize your theme, browser alerts, user-scheduled email reports, and password security.
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
                🌇 Evening Reminder
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

      {/* Email Reminders & User Scheduled Reports */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Mail size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Email Reminders & User Scheduled Reports
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

        {/* User Scheduled Custom Mail Reminder Configurator */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  User Scheduled Custom Mail Report
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Set the daily time & format for report delivery scheduled by user
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Scheduled by User
              </span>
              <input
                type="checkbox"
                checked={emailReportEnabled}
                onChange={async e => {
                  const val = e.target.checked;
                  setEmailReportEnabled(val);
                  await updateUserProfile({ emailReportEnabled: val });
                }}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
            </label>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Daily Scheduled Time */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Clock size={12} className="text-blue-600 dark:text-blue-400" />
                  Preferred Send Time
                </label>
                <input
                  type="time"
                  required
                  value={emailReportTime}
                  onChange={async e => {
                    const val = e.target.value;
                    setEmailReportTime(val);
                    await updateUserProfile({ emailReportTime: val });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* 2. Target Date Range */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Calendar size={12} className="text-blue-600 dark:text-blue-400" />
                  Target Date Section
                </label>
                <select
                  value={emailReportDateRange}
                  onChange={async e => {
                    const val = e.target.value as any;
                    setEmailReportDateRange(val);
                    await updateUserProfile({ emailReportDateRange: val });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="today">📅 Today's Targets</option>
                  <option value="yesterday">⏪ Yesterday's Targets</option>
                  <option value="specific">📆 Specific Date...</option>
                  <option value="all">🌐 All Dates (All-Time)</option>
                </select>
              </div>

              {/* 3. Report Type Selection */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                  Report Format
                </label>
                <select
                  value={emailReportType}
                  onChange={async e => {
                    const val = e.target.value as any;
                    setEmailReportType(val);
                    await updateUserProfile({ emailReportType: val });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="progress_report">📊 Full Progress Report</option>
                  <option value="morning">🌅 Morning Target Plan</option>
                  <option value="evening">🌇 Evening Check-in</option>
                  <option value="night">🌙 Night Wrap-up</option>
                </select>
              </div>

              {/* 4. Task Filter Selection */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                  Target Status Included
                </label>
                <select
                  value={emailReportFilter}
                  onChange={async e => {
                    const val = e.target.value as any;
                    setEmailReportFilter(val);
                    await updateUserProfile({ emailReportFilter: val });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">📌 All Targets</option>
                  <option value="completed">✅ Completed Targets Only</option>
                  <option value="pending">⏳ Pending / Non-Completed Only</option>
                </select>
              </div>
            </div>

            {/* Custom Specific Date Picker if selected */}
            {emailReportDateRange === 'specific' && (
              <div className="p-3 bg-blue-50/50 dark:bg-slate-800/80 rounded-xl border border-blue-200/60 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-600 dark:text-blue-400" />
                    Select Specific Date for Email Report
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    The scheduled report will specifically summarize targets from this chosen calendar date.
                  </p>
                </div>
                <input
                  type="date"
                  required
                  value={emailReportCustomDate}
                  onChange={async e => {
                    const val = e.target.value;
                    setEmailReportCustomDate(val);
                    await updateUserProfile({ emailReportCustomDate: val });
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none shrink-0"
                />
              </div>
            )}

            {/* Status & Manual Dispatch Action Bar */}
            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                  <Clock size={14} className="text-blue-600 dark:text-blue-400" />
                  <span>
                    User Schedule Status:{' '}
                    {emailReportEnabled ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Active (Enabled)</span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 font-extrabold">Disabled</span>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {emailReportEnabled ? (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      ⏰ Configured for {emailReportTime} daily ({emailReportDateRange} date range filter)
                    </span>
                  ) : (
                    <span>Enable schedule to activate report preferences</span>
                  )}
                </p>
              </div>

              {/* Button to schedule mail */}
              <button
                type="button"
                onClick={handleSendScheduledReportNow}
                disabled={isTriggeringNow || !emailNotificationsEnabled}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <Send size={14} className={isTriggeringNow ? "animate-spin" : ""} />
                <span>{isTriggeringNow ? "Scheduling..." : "Schedule Mail"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Informational Guidance Box */}
        {!emailServerInfo.configured ? (
          <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs space-y-1.5 text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-1.5 font-bold">
              <Info size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>SMTP Environment Credentials Needed for Direct Inbox Delivery</span>
            </div>
            <p className="leading-relaxed text-[11.5px]">
              The server is currently running in <strong>Test Sandbox Mode</strong> (using Ethereal preview links). To receive emails directly in your personal email address (e.g., Gmail or Outlook):
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] font-medium pl-1">
              <li>Set <code className="bg-amber-100 dark:bg-amber-900/80 px-1 py-0.5 rounded font-mono">SMTP_HOST="smtp.gmail.com"</code></li>
              <li>Set <code className="bg-amber-100 dark:bg-amber-900/80 px-1 py-0.5 rounded font-mono">SMTP_PORT="587"</code></li>
              <li>Set <code className="bg-amber-100 dark:bg-amber-900/80 px-1 py-0.5 rounded font-mono">SMTP_USER="your-email@gmail.com"</code></li>
              <li>Set <code className="bg-amber-100 dark:bg-amber-900/80 px-1 py-0.5 rounded font-mono">SMTP_PASS="16-character-app-password"</code> (From Google Account &gt; Security &gt; 2-Step Verification &gt; App passwords)</li>
            </ul>
          </div>
        ) : (
          <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs space-y-1 text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Live SMTP Server Connected</span>
            </div>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
              Emails are dispatched via live SMTP host. Scheduled reports will be sent directly to <strong>{userProfile?.email}</strong> at your specified schedule time.
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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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
