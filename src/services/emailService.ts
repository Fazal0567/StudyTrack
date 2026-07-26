import { StudyTask } from '../types';

export interface EmailReminderPayload {
  toEmail: string;
  userName: string;
  reminderType: 'morning' | 'evening' | 'night' | 'progress_report';
  taskFilter?: 'all' | 'completed' | 'pending';
  targetDate?: string;
  targetDateLabel?: string;
  tasks: StudyTask[];
  stats?: {
    totalTasks: number;
    completedCount: number;
    pendingCount: number;
    totalStudyMinutes: number;
    currentStreak: number;
    completionRate: number;
  };
  emailNotificationsEnabled?: boolean;
}

export interface EmailResult {
  success: boolean;
  message: string;
  previewUrl?: string | null;
  smtpConfigured?: boolean;
  mode?: 'smtp' | 'ethereal' | 'simulation' | 'stopped';
}

export const getEmailStatus = async (): Promise<{ configured: boolean; host?: string; mode: string }> => {
  try {
    const res = await fetch('/api/email-status');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch email status', err);
  }
  return { configured: false, mode: 'simulation' };
};

export const sendEmailReminder = async (payload: EmailReminderPayload): Promise<EmailResult> => {
  if (payload.emailNotificationsEnabled === false) {
    return {
      success: false,
      message: 'Email reminders are currently toggled OFF. Switch toggle to ON to activate live SMTP delivery.',
      smtpConfigured: false,
      mode: 'stopped',
    };
  }

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  try {
    const response = await fetch('/api/send-email-reminder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...payload, appUrl }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to send email reminder');
    }

    return {
      success: data.success,
      message: data.message || 'Email reminder processed successfully!',
      previewUrl: data.previewUrl,
      smtpConfigured: data.smtpConfigured,
      mode: data.mode,
    };
  } catch (error: any) {
    console.error('Email service error:', error);
    return { success: false, message: error.message || 'Failed to connect to email server' };
  }
};

export const sendTestEmail = async (
  email: string,
  userName: string,
  emailNotificationsEnabled: boolean = true
): Promise<EmailResult> => {
  if (emailNotificationsEnabled === false) {
    return {
      success: false,
      message: 'Email reminders are currently toggled OFF. Switch toggle to ON to activate live SMTP delivery.',
      smtpConfigured: false,
      mode: 'stopped',
    };
  }

  try {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const response = await fetch('/api/send-test-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, userName, emailNotificationsEnabled, appUrl }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to send test email');
    }

    return {
      success: data.success,
      message: data.message || 'Test email dispatched successfully!',
      previewUrl: data.previewUrl,
      smtpConfigured: data.smtpConfigured,
      mode: data.mode,
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to send test email' };
  }
};

