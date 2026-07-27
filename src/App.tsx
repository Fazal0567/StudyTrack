import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useOutletContext } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { TaskModal } from './components/TaskModal';
import { StudyTimerModal } from './components/StudyTimerModal';
import { StudyTask } from './types';
import { createStudyTask, updateStudyTask, getTodayDateString } from './services/taskService';
import { sendEmailReminder } from './services/emailService';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { TodaysTasks } from './pages/TodaysTasks';
import { MissedTasks } from './pages/MissedTasks';
import { CalendarView } from './pages/CalendarView';
import { ProgressView } from './pages/ProgressView';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';

interface OutletContextType {
  handleOpenAddModal: (dateStr?: string) => void;
  handleOpenEditModal: (task: StudyTask) => void;
  handleStartStudy: (task: StudyTask) => void;
}

const useOutletContextTyped = () => useOutletContext<OutletContextType>();

const AppLayout: React.FC = () => {
  const { currentUser, userProfile, tasks, addTaskToState, updateTaskInState, updateUserProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [preselectedDate, setPreselectedDate] = useState<string | undefined>(undefined);

  // Timer modal state
  const [focusTask, setFocusTask] = useState<StudyTask | null>(null);
  const [timerModalOpen, setTimerModalOpen] = useState(false);
  const sendingReportForDateRef = useRef<string | null>(null);

  const todayStr = getTodayDateString();
  const pendingCount = tasks.filter(t => t.date === todayStr && t.status === 'Pending').length;
  const missedCount = tasks.filter(t => t.status === 'Missed').length;

  // Background timer for user-scheduled custom email report
  useEffect(() => {
    if (
      !userProfile?.email ||
      userProfile?.emailNotifications === false ||
      userProfile?.emailReportEnabled === false
    ) {
      return;
    }

    const checkAndSendScheduledEmail = async () => {
      const currentDayStr = getTodayDateString();
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const scheduledTime = userProfile.emailReportTime || '09:00';

      const timeSlotKey = `${currentDayStr}_${currentTimeStr}`;

      if (currentTimeStr === scheduledTime) {
        if (sendingReportForDateRef.current === timeSlotKey) {
          return;
        }
        sendingReportForDateRef.current = timeSlotKey;
        await updateUserProfile({ lastEmailReportSentDate: currentDayStr });

        try {
          const reportType = userProfile.emailReportType || 'progress_report';
          const reportFilter = userProfile.emailReportFilter || 'all';
          const dateRange = userProfile.emailReportDateRange || 'today';

          let targetDateStr = currentDayStr;
          let targetDateLabel = `Today (${currentDayStr})`;

          if (dateRange === 'yesterday') {
            const y = new Date();
            y.setDate(y.getDate() - 1);
            targetDateStr = y.toISOString().split('T')[0];
            targetDateLabel = `Yesterday (${targetDateStr})`;
          } else if (dateRange === 'specific') {
            targetDateStr = userProfile.emailReportCustomDate || currentDayStr;
            targetDateLabel = `Specific Date (${targetDateStr})`;
          } else if (dateRange === 'all') {
            targetDateStr = 'all';
            targetDateLabel = 'All Dates (All-Time)';
          }

          let filteredTasks = dateRange === 'all' ? [...tasks] : tasks.filter(t => t.date === targetDateStr);
          if (reportFilter === 'completed') {
            filteredTasks = filteredTasks.filter(t => t.status === 'Completed');
          } else if (reportFilter === 'pending') {
            filteredTasks = filteredTasks.filter(t => t.status === 'Pending');
          }

          const baseTargetTasks = dateRange === 'all' ? tasks : tasks.filter(t => t.date === targetDateStr);
          const completedCount = baseTargetTasks.filter(t => t.status === 'Completed').length;
          const totalCount = baseTargetTasks.length;
          const pendingCount = baseTargetTasks.filter(t => t.status === 'Pending').length;
          const totalStudyMinutes = baseTargetTasks
            .filter(t => t.status === 'Completed')
            .reduce((acc, t) => acc + (t.estimatedTime || 0), 0);
          const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

          await sendEmailReminder({
            toEmail: userProfile.email,
            userName: userProfile.name,
            reminderType: reportType,
            taskFilter: reportFilter,
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
            emailNotificationsEnabled: true,
          });
        } catch (err) {
          console.error('Automated email report dispatch error:', err);
        }
      }
    };

    // Run check immediately on mount/profile change
    checkAndSendScheduledEmail();

    const interval = setInterval(checkAndSendScheduledEmail, 20000);
    return () => clearInterval(interval);
  }, [userProfile, tasks, updateUserProfile]);

  const handleOpenAddModal = (dateStr?: string) => {
    const validDateStr = typeof dateStr === 'string' ? dateStr : undefined;
    setSidebarOpen(false);
    setEditingTask(null);
    setPreselectedDate(validDateStr);
    setTaskModalOpen(true);
  };

  const handleOpenEditModal = (task: StudyTask) => {
    setSidebarOpen(false);
    setEditingTask(task);
    setPreselectedDate(undefined);
    setTaskModalOpen(true);
  };

  const handleStartStudy = (task: StudyTask) => {
    setFocusTask(task);
    setTimerModalOpen(true);
  };

  const handleSaveTask = async (
    taskData: Omit<StudyTask, 'id' | 'userId' | 'createdAt'>
  ) => {
    const userId = currentUser?.uid || 'guest_user';
    const userEmail = currentUser?.email || userProfile?.email || undefined;

    if (editingTask) {
      const updates = {
        ...taskData,
        userId: editingTask.userId || userId,
        userEmail: editingTask.userEmail || (userEmail ? userEmail.toLowerCase().trim() : undefined),
      };
      await updateStudyTask(editingTask.id, updates);
      updateTaskInState(editingTask.id, updates);
    } else {
      const created = await createStudyTask(userId, taskData, userEmail);
      addTaskToState(created);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col transition-colors max-w-full overflow-x-hidden">
      <Navbar
        onOpenAddModal={() => handleOpenAddModal()}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto flex max-w-full overflow-x-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          pendingCount={pendingCount}
          missedCount={missedCount}
        />

        <main className="flex-1 p-3 sm:p-6 lg:p-8 min-w-0 max-w-full overflow-x-hidden">
          <Outlet context={{ handleOpenAddModal, handleOpenEditModal, handleStartStudy }} />
        </main>
      </div>

      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTask}
        initialTask={editingTask}
        initialDate={preselectedDate}
      />

      <StudyTimerModal
        task={focusTask}
        isOpen={timerModalOpen}
        onClose={() => setTimerModalOpen(false)}
      />
    </div>
  );
};

// Route wrapper components to pass context props clean & typed
const DashboardWrapper: React.FC = () => {
  const { handleOpenAddModal, handleOpenEditModal, handleStartStudy } = useOutletContextTyped();
  return (
    <Dashboard
      onOpenAddModal={() => handleOpenAddModal()}
      onEditTask={handleOpenEditModal}
      onStartStudy={handleStartStudy}
    />
  );
};

const TodaysTasksWrapper: React.FC = () => {
  const { handleOpenAddModal, handleOpenEditModal, handleStartStudy } = useOutletContextTyped();
  return (
    <TodaysTasks
      onOpenAddModal={() => handleOpenAddModal()}
      onEditTask={handleOpenEditModal}
      onStartStudy={handleStartStudy}
    />
  );
};

const MissedTasksWrapper: React.FC = () => {
  const { handleOpenEditModal, handleStartStudy } = useOutletContextTyped();
  return (
    <MissedTasks
      onEditTask={handleOpenEditModal}
      onStartStudy={handleStartStudy}
    />
  );
};

const CalendarWrapper: React.FC = () => {
  const { handleOpenAddModal, handleOpenEditModal, handleStartStudy } = useOutletContextTyped();
  return (
    <CalendarView
      onOpenAddModal={handleOpenAddModal}
      onEditTask={handleOpenEditModal}
      onStartStudy={handleStartStudy}
    />
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected Application Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardWrapper />} />
              <Route path="/todays-tasks" element={<TodaysTasksWrapper />} />
              <Route path="/missed-tasks" element={<MissedTasksWrapper />} />
              <Route path="/calendar" element={<CalendarWrapper />} />
              <Route path="/progress" element={<ProgressView />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
