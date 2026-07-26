import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { StudyTask, UserProfile } from '../types';
import { format, subDays, isBefore, parseISO, startOfDay } from 'date-fns';

const TASKS_COLLECTION = 'tasks';
const USERS_COLLECTION = 'users';

export const getTodayDateString = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

export const seedInitialTasksIfEmpty = async (_userId: string): Promise<void> => {
  // Dummy data seeding removed
  return;
};

const DUMMY_TITLES = new Set([
  'Advanced Calculus Integration',
  'Organic Chemistry - Alkyl Halides',
  'Literature Review - The Great Gatsby',
]);

export const cleanupDummyTasks = async (tasks: StudyTask[]): Promise<void> => {
  const dummyTasks = tasks.filter(t => DUMMY_TITLES.has(t.title));
  for (const t of dummyTasks) {
    try {
      await deleteStudyTask(t.id);
    } catch (err) {
      console.error('Failed to cleanup dummy task', t.id, err);
    }
  }
};

export const subscribeToUserTasks = (
  userId: string,
  callback: (tasks: StudyTask[]) => void
) => {
  const q = query(
    collection(db, TASKS_COLLECTION),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    snapshot => {
      const tasks: StudyTask[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          title: data.title,
          subject: data.subject || 'General',
          estimatedTime: data.estimatedTime || 30,
          dueTime: data.dueTime || '',
          priority: data.priority || 'Medium',
          status: data.status || 'Pending',
          createdAt: data.createdAt || new Date().toISOString(),
          date: data.date || getTodayDateString(),
          completedAt: data.completedAt,
        } as StudyTask;
      });

      // Sort in memory by date desc, then status (Pending first, Completed last)
      tasks.sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        if (a.status === 'Completed' && b.status !== 'Completed') return 1;
        if (a.status !== 'Completed' && b.status === 'Completed') return -1;
        return a.title.localeCompare(b.title);
      });

      // Merge with offline tasks stored in localStorage for this specific userId
      let offlineTasks: StudyTask[] = [];
      try {
        const userSpecificKey = `offline_tasks_${userId}`;
        const raw = localStorage.getItem(userSpecificKey) || localStorage.getItem('offline_tasks');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            offlineTasks = parsed.filter(t => t && (t.userId === userId || !t.userId));
          }
        }
      } catch (e) {
        offlineTasks = [];
      }

      const allTasksMap = new Map<string, StudyTask>();
      // Put offline tasks for this user first
      offlineTasks.forEach(t => {
        if (t && t.id) {
          allTasksMap.set(t.id, { ...t, userId });
        }
      });
      // Overwrite/merge with Firestore snapshot tasks (strictly for this userId)
      tasks.forEach(t => {
        if (t && t.id) {
          allTasksMap.set(t.id, t);
        }
      });

      const allTasks = Array.from(allTasksMap.values());

      // Sort in memory by date desc, then status (Pending first, Completed last)
      allTasks.sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        if (a.status === 'Completed' && b.status !== 'Completed') return 1;
        if (a.status !== 'Completed' && b.status === 'Completed') return -1;
        return a.title.localeCompare(b.title);
      });

      callback(allTasks);
    },
    error => {
      console.warn('Realtime task listener notice:', error.message);
      let offlineTasks: StudyTask[] = [];
      try {
        const userSpecificKey = `offline_tasks_${userId}`;
        const raw = localStorage.getItem(userSpecificKey) || localStorage.getItem('offline_tasks');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            offlineTasks = parsed.filter(t => t && (t.userId === userId || !t.userId)).map(t => ({ ...t, userId }));
          }
        }
      } catch (e) {
        offlineTasks = [];
      }
      callback(offlineTasks);
    }
  );
};

export const createStudyTask = async (
  userId: string,
  taskData: Omit<StudyTask, 'id' | 'userId' | 'createdAt'>
): Promise<StudyTask> => {
  const taskId = doc(collection(db, TASKS_COLLECTION)).id;
  const newTask: StudyTask = {
    id: taskId,
    userId,
    title: taskData.title,
    subject: taskData.subject || 'General',
    estimatedTime: Number(taskData.estimatedTime) || 30,
    dueTime: taskData.dueTime || '',
    priority: taskData.priority || 'Medium',
    status: taskData.status || 'Pending',
    date: taskData.date || getTodayDateString(),
    createdAt: new Date().toISOString(),
  };

  // Always save to localStorage backup
  try {
    const offline: StudyTask[] = JSON.parse(localStorage.getItem('offline_tasks') || '[]');
    const existingIndex = offline.findIndex(t => t.id === taskId);
    if (existingIndex !== -1) {
      offline[existingIndex] = newTask;
    } else {
      offline.unshift(newTask);
    }
    localStorage.setItem('offline_tasks', JSON.stringify(offline));
  } catch (e) {
    console.warn('Failed to cache task locally:', e);
  }

  // Persist to Firestore asynchronously without blocking local user feedback
  const docRef = doc(db, TASKS_COLLECTION, taskId);
  setDoc(docRef, newTask).catch(err => {
    console.warn('Firestore setDoc background save notice:', err);
  });

  return newTask;
};

export const updateStudyTask = async (
  taskId: string,
  updates: Partial<StudyTask>
): Promise<void> => {
  try {
    const offline: StudyTask[] = JSON.parse(localStorage.getItem('offline_tasks') || '[]');
    const index = offline.findIndex(t => t.id === taskId);
    if (index !== -1) {
      offline[index] = { ...offline[index], ...updates };
      localStorage.setItem('offline_tasks', JSON.stringify(offline));
    }
  } catch (e) {}

  const taskRef = doc(db, TASKS_COLLECTION, taskId);
  updateDoc(taskRef, updates).catch(err => {
    console.warn('Firestore updateDoc background notice:', err);
  });
};

export const deleteStudyTask = async (taskId: string): Promise<void> => {
  try {
    const offline: StudyTask[] = JSON.parse(localStorage.getItem('offline_tasks') || '[]');
    const filtered = offline.filter(t => t.id !== taskId);
    localStorage.setItem('offline_tasks', JSON.stringify(filtered));
  } catch (e) {}

  const taskRef = doc(db, TASKS_COLLECTION, taskId);
  deleteDoc(taskRef).catch(err => {
    console.warn('Firestore deleteDoc background notice:', err);
  });
};

export const toggleTaskCompletion = async (
  task: StudyTask,
  _userProfile?: UserProfile | null
): Promise<{ isCompleted: boolean }> => {
  const isNowCompleted = task.status !== 'Completed';
  const completedAtISO = isNowCompleted ? new Date().toISOString() : undefined;
  const updates: Partial<StudyTask> = {
    status: isNowCompleted ? 'Completed' : 'Pending',
    completedAt: completedAtISO,
  };
  await updateStudyTask(task.id, updates);

  return { isCompleted: isNowCompleted };
};

export const carryForwardTask = async (
  taskId: string,
  targetDate: string = getTodayDateString()
): Promise<void> => {
  const updates: Partial<StudyTask> = {
    date: targetDate,
    status: 'Pending',
  };
  await updateStudyTask(taskId, updates);
};

/**
 * Checks all tasks for a user and automatically marks past tasks as 'Missed' if still 'Pending'.
 * Also calculates current daily streak.
 */
export const checkAndSyncMissedTasksAndStreak = async (
  userId: string,
  allTasks: StudyTask[]
): Promise<number> => {
  const todayStr = getTodayDateString();
  let updatedCount = 0;

  for (const task of allTasks) {
    if (task.date < todayStr && task.status === 'Pending') {
      try {
        await updateStudyTask(task.id, { status: 'Missed' });
        updatedCount++;
      } catch (err) {
        console.error('Failed to update missed task', task.id, err);
      }
    }
  }

  // Calculate Streak
  const streak = calculateCurrentStreak(allTasks);

  // Sync profile streak in Firestore
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      currentStreak: streak,
      lastActiveDate: todayStr,
    });
  } catch (err) {
    // ignore if user doc not ready yet
  }

  return streak;
};

export const calculateCurrentStreak = (tasks: StudyTask[]): number => {
  const completedDates = new Set<string>();

  tasks.forEach(t => {
    if (t.status === 'Completed') {
      if (t.date) completedDates.add(t.date);
      if (t.completedAt) {
        try {
          const compDate = format(new Date(t.completedAt), 'yyyy-MM-dd');
          if (compDate) completedDates.add(compDate);
        } catch (e) {}
      }
    }
  });

  if (completedDates.size === 0) return 0;

  let streak = 0;
  let checkDate = new Date();
  const todayStr = getTodayDateString();

  // If completed today, count today
  if (completedDates.has(todayStr)) {
    streak++;
    checkDate = subDays(checkDate, 1);
  } else {
    // If not completed today, check if completed yesterday to maintain active streak
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    if (!completedDates.has(yesterdayStr)) {
      return 0;
    }
    checkDate = subDays(new Date(), 1);
  }

  // Continue counting backwards
  while (true) {
    const dateStr = format(checkDate, 'yyyy-MM-dd');
    if (completedDates.has(dateStr)) {
      if (dateStr !== todayStr) {
        streak++;
      }
      checkDate = subDays(checkDate, 1);
    } else {
      break;
    }
  }

  return streak;
};
