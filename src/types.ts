export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'Pending' | 'Completed' | 'Missed';

export interface StudyTask {
  id: string;
  userId: string;
  userEmail?: string;
  title: string;
  subject: string;
  estimatedTime: number; // in minutes
  dueTime?: string; // e.g. "14:30" or ""
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string; // ISO string
  date: string; // "YYYY-MM-DD"
  completedAt?: string; // ISO string
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  createdAt: string;
  currentStreak: number;
  lastActiveDate?: string; // "YYYY-MM-DD"
  emailNotifications: boolean;
  browserNotifications: boolean;
  notificationTimeMorning?: string;
  notificationTimeEvening?: string;
  notificationTimeNight?: string;
}

export interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  missed: number;
  completionRate: number; // percentage 0-100
  totalEstimatedMinutes: number;
  completedMinutes: number;
}

export interface CalendarDaySummary {
  date: string;
  tasks: StudyTask[];
  completedCount: number;
  missedCount: number;
  pendingCount: number;
}
