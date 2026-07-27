import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword as firebaseUpdatePassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/config';
import { UserProfile, StudyTask } from '../types';
import {
  subscribeToUserTasks,
  checkAndSyncMissedTasksAndStreak,
  calculateCurrentStreak,
  getTodayDateString,
  cleanupDummyTasks,
} from '../services/taskService';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  tasks: StudyTask[];
  loading: boolean;
  tasksLoading: boolean;
  signup: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (emailHint?: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshTasks: () => void;
  addTaskToState: (task: StudyTask) => void;
  updateTaskInState: (taskId: string, updates: Partial<StudyTask>) => void;
  deleteTaskInState: (taskId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const loadCachedTasks = (userId?: string, userEmail?: string): StudyTask[] => {
  if (!userId && !userEmail) return [];
  const cleanEmail = userEmail ? userEmail.toLowerCase().trim() : '';
  const emailKey = cleanEmail ? `offline_tasks_email_${cleanEmail.replace(/[^a-z0-9]/g, '_')}` : '';

  const taskMap = new Map<string, StudyTask>();
  const keysToRead: string[] = [];
  if (emailKey) keysToRead.push(emailKey);
  if (userId) keysToRead.push(`offline_tasks_${userId}`);

  keysToRead.forEach(key => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(t => {
            if (t && t.id) {
              const matchesUser = userId && t.userId === userId;
              const matchesEmail = cleanEmail && t.userEmail && t.userEmail.toLowerCase().trim() === cleanEmail;
              if (matchesUser || matchesEmail) {
                taskMap.set(t.id, { ...t, userId: userId || t.userId, userEmail: cleanEmail || t.userEmail });
              }
            }
          });
        }
      }
    } catch (e) {}
  });

  return Array.from(taskMap.values());
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync or create user document in Firestore
  const ensureUserProfile = async (user: User, nameOverride?: string): Promise<UserProfile> => {
    const userRef = doc(db, 'users', user.uid);
    const cleanEmail = user.email ? user.email.toLowerCase().trim() : '';

    try {
      const fetchDocPromise = getDoc(userRef);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore fetch timeout')), 2000)
      );
      const docSnap = (await Promise.race([fetchDocPromise, timeoutPromise])) as any;

      if (docSnap.exists()) {
        const data = docSnap.data();
        const profile: UserProfile = {
          uid: user.uid,
          name: data.name || nameOverride || user.displayName || 'Student',
          email: data.email || user.email || '',
          photoURL: data.photoURL || user.photoURL || '',
          createdAt: data.createdAt || new Date().toISOString(),
          currentStreak: data.currentStreak || 0,
          emailNotifications: data.emailNotifications ?? true,
          browserNotifications: data.browserNotifications ?? true,
          notificationTimeMorning: data.notificationTimeMorning || '08:00',
          notificationTimeEvening: data.notificationTimeEvening || '18:00',
          notificationTimeNight: data.notificationTimeNight || '21:00',
          emailReportEnabled: data.emailReportEnabled ?? true,
          emailReportTime: data.emailReportTime || '09:00',
          emailReportType: data.emailReportType || 'progress_report',
          emailReportFilter: data.emailReportFilter || 'all',
          emailReportDateRange: data.emailReportDateRange || 'today',
          emailReportCustomDate: data.emailReportCustomDate || getTodayDateString(),
          lastEmailReportSentDate: data.lastEmailReportSentDate || '',
        };
        setUserProfile(profile);
        return profile;
      } else {
        // If profile doesn't exist for this UID, check if another profile exists with matching email
        let existingEmailProfile: Partial<UserProfile> | null = null;
        if (cleanEmail) {
          try {
            const emailQuery = query(collection(db, 'users'), where('email', '==', cleanEmail));
            const emailSnap = await getDocs(emailQuery);
            if (!emailSnap.empty) {
              existingEmailProfile = emailSnap.docs[0].data() as UserProfile;
            }
          } catch (e) {}
        }

        const newProfile: UserProfile = {
          uid: user.uid,
          name: nameOverride || user.displayName || existingEmailProfile?.name || (cleanEmail ? cleanEmail.split('@')[0] : 'Student'),
          email: user.email || cleanEmail,
          photoURL: user.photoURL || existingEmailProfile?.photoURL || '',
          createdAt: existingEmailProfile?.createdAt || new Date().toISOString(),
          currentStreak: existingEmailProfile?.currentStreak || 0,
          lastActiveDate: existingEmailProfile?.lastActiveDate || getTodayDateString(),
          emailNotifications: existingEmailProfile?.emailNotifications ?? true,
          browserNotifications: existingEmailProfile?.browserNotifications ?? true,
          notificationTimeMorning: existingEmailProfile?.notificationTimeMorning || '08:00',
          notificationTimeEvening: existingEmailProfile?.notificationTimeEvening || '18:00',
          notificationTimeNight: existingEmailProfile?.notificationTimeNight || '21:00',
          emailReportEnabled: existingEmailProfile?.emailReportEnabled ?? true,
          emailReportTime: existingEmailProfile?.emailReportTime || '09:00',
          emailReportType: existingEmailProfile?.emailReportType || 'progress_report',
          emailReportFilter: existingEmailProfile?.emailReportFilter || 'all',
          emailReportDateRange: existingEmailProfile?.emailReportDateRange || 'today',
          emailReportCustomDate: existingEmailProfile?.emailReportCustomDate || getTodayDateString(),
          lastEmailReportSentDate: existingEmailProfile?.lastEmailReportSentDate || '',
        };
        setDoc(userRef, newProfile).catch(setErr =>
          console.warn('Failed to save user profile to Firestore (background):', setErr)
        );
        setUserProfile(newProfile);
        return newProfile;
      }
    } catch (err) {
      console.warn('Could not fetch user profile from Firestore in time, using instant fallback profile:', err);
      const fallbackProfile: UserProfile = {
        uid: user.uid,
        name: nameOverride || user.displayName || (cleanEmail ? cleanEmail.split('@')[0] : 'Student'),
        email: user.email || cleanEmail,
        photoURL: user.photoURL || '',
        createdAt: new Date().toISOString(),
        currentStreak: 0,
        lastActiveDate: getTodayDateString(),
        emailNotifications: true,
        browserNotifications: true,
        notificationTimeMorning: '08:00',
        notificationTimeEvening: '18:00',
        notificationTimeNight: '21:00',
      };
      setUserProfile(fallbackProfile);
      return fallbackProfile;
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async user => {
      if (user) {
        setCurrentUser(user);
      } else {
        // Check if there is a local guest session
        try {
          const localGuestRaw = localStorage.getItem('studytrack_local_guest');
          if (localGuestRaw) {
            const { user: localUser, profile: localProfile } = JSON.parse(localGuestRaw);
            if (localUser && localProfile) {
              setCurrentUser(localUser);
              setUserProfile(localProfile);
              setLoading(false);
              return;
            }
          }
        } catch (e) {}

        setUserProfile(null);
        setCurrentUser(null);
        setTasks([]);
        setTasksLoading(false);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Sync tasks and user profile in real-time across devices whenever currentUser changes
  useEffect(() => {
    if (!currentUser) {
      setTasks([]);
      setTasksLoading(false);
      return;
    }

    const cleanEmail = currentUser.email ? currentUser.email.toLowerCase().trim() : '';

    // Load user-specific cached tasks instantly so there's no layout jump
    const cached = loadCachedTasks(currentUser.uid, cleanEmail);
    if (cached.length > 0) {
      setTasks(cached);
      setTasksLoading(false);
    }

    // Run ensureUserProfile in background without delaying task loading
    ensureUserProfile(currentUser).catch(err => console.warn('Background ensureUserProfile:', err));

    // Realtime listener for user profile updates across sessions
    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubProfile = onSnapshot(
      userDocRef,
      docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserProfile({
            uid: currentUser.uid,
            name: data.name || currentUser.displayName || (cleanEmail ? cleanEmail.split('@')[0] : 'Student'),
            email: data.email || currentUser.email || cleanEmail,
            photoURL: data.photoURL || currentUser.photoURL || '',
            createdAt: data.createdAt || new Date().toISOString(),
            currentStreak: data.currentStreak ?? 0,
            lastActiveDate: data.lastActiveDate || getTodayDateString(),
            emailNotifications: data.emailNotifications ?? true,
            browserNotifications: data.browserNotifications ?? true,
            notificationTimeMorning: data.notificationTimeMorning || '08:00',
            notificationTimeEvening: data.notificationTimeEvening || '18:00',
            notificationTimeNight: data.notificationTimeNight || '21:00',
            emailReportEnabled: data.emailReportEnabled ?? true,
            emailReportTime: data.emailReportTime || '09:00',
            emailReportType: data.emailReportType || 'progress_report',
            emailReportFilter: data.emailReportFilter || 'all',
            emailReportDateRange: data.emailReportDateRange || 'today',
            emailReportCustomDate: data.emailReportCustomDate || getTodayDateString(),
            lastEmailReportSentDate: data.lastEmailReportSentDate || '',
          });
        }
      },
      err => {
        console.warn('Realtime profile listener notice:', err.message);
      }
    );

    // Subscribe to tasks across devices matching userId or cleanEmail
    const unsubTasks = subscribeToUserTasks(
      currentUser.uid,
      userTasks => {
        const realTasks = userTasks.filter(
          t =>
            ![
              'Advanced Calculus Integration',
              'Organic Chemistry - Alkyl Halides',
              'Literature Review - The Great Gatsby',
            ].includes(t.title)
        );
        setTasks(realTasks);
        setTasksLoading(false);
        try {
          localStorage.setItem(`offline_tasks_${currentUser.uid}`, JSON.stringify(realTasks));
          if (cleanEmail) {
            const emailKey = `offline_tasks_email_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
            localStorage.setItem(emailKey, JSON.stringify(realTasks));
          }
        } catch (e) {}
      },
      cleanEmail
    );

    return () => {
      unsubProfile();
      unsubTasks();
    };
  }, [currentUser?.uid, currentUser?.email]);

  // Recalculate streak in real-time whenever tasks state changes
  useEffect(() => {
    if (userProfile && tasks) {
      const calculatedStreak = calculateCurrentStreak(tasks);
      if (userProfile.currentStreak !== calculatedStreak) {
        setUserProfile(prev => (prev ? { ...prev, currentStreak: calculatedStreak } : prev));
        if (currentUser) {
          const userRef = doc(db, 'users', currentUser.uid);
          updateDoc(userRef, { currentStreak: calculatedStreak }).catch(() => {});
        }
      }
    }
  }, [tasks, currentUser]);

  const createLocalUserSession = (uid: string, email: string, name: string, photoURL = '') => {
    const mockUser = {
      uid,
      email,
      displayName: name,
      photoURL,
      emailVerified: true,
      isAnonymous: false,
    } as unknown as User;

    const profile: UserProfile = {
      uid,
      name: name || (email ? email.split('@')[0] : 'Student'),
      email: email || '',
      photoURL: photoURL || '',
      createdAt: new Date().toISOString(),
      currentStreak: 0,
      lastActiveDate: getTodayDateString(),
      emailNotifications: true,
      browserNotifications: true,
      notificationTimeMorning: '08:00',
      notificationTimeEvening: '18:00',
      notificationTimeNight: '21:00',
    };

    setCurrentUser(mockUser);
    setUserProfile(profile);
    const cached = loadCachedTasks(uid, email);
    setTasks(cached);
    setTasksLoading(false);
    try {
      localStorage.setItem('studytrack_local_guest', JSON.stringify({ user: mockUser, profile }));
    } catch (e) {}
    return { mockUser, profile };
  };

  const signup = async (email: string, password: string, name: string) => {
    const cleanEmail = email.toLowerCase().trim();
    try {
      localStorage.setItem(`local_pass_${cleanEmail}`, password);
    } catch (e) {}

    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      if (res.user) {
        await updateProfile(res.user, { displayName: name });
        await ensureUserProfile(res.user, name);
      }
    } catch (err: any) {
      if (
        err.code === 'auth/operation-not-allowed' ||
        err.code === 'auth/unauthorized-domain' ||
        err.code === 'auth/network-request-failed' ||
        err.message?.includes('disabled in your Firebase project') ||
        err.message?.includes('operation-not-allowed')
      ) {
        console.warn('Firebase email auth disabled, falling back to local account mode:', err);
        const uid = 'local_' + cleanEmail.replace(/[^a-z0-9]/g, '_');
        createLocalUserSession(uid, cleanEmail, name);
        return;
      }
      throw err;
    }
  };

  const login = async (email: string, password: string) => {
    const cleanEmail = email.toLowerCase().trim();

    try {
      await signInWithEmailAndPassword(auth, email, password);
      try {
        localStorage.setItem(`local_pass_${cleanEmail}`, password);
      } catch (e) {}
    } catch (err: any) {
      if (
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-email'
      ) {
        throw err;
      }

      if (
        err.code === 'auth/operation-not-allowed' ||
        err.code === 'auth/unauthorized-domain' ||
        err.code === 'auth/network-request-failed' ||
        err.message?.includes('disabled in your Firebase project') ||
        err.message?.includes('operation-not-allowed')
      ) {
        console.warn('Firebase email auth disabled, falling back to local account mode:', err);
        const savedPass = localStorage.getItem(`local_pass_${cleanEmail}`);
        if (savedPass && savedPass !== password) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        }
        if (!savedPass) {
          try {
            localStorage.setItem(`local_pass_${cleanEmail}`, password);
          } catch (e) {}
        }

        const uid = 'local_' + cleanEmail.replace(/[^a-z0-9]/g, '_');
        const defaultName = cleanEmail.split('@')[0] || 'Student';
        createLocalUserSession(uid, cleanEmail, defaultName);
        return;
      }
      throw err;
    }
  };

  const loginWithGoogle = async (emailHint?: string) => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        await ensureUserProfile(res.user);
      }
    } catch (err: any) {
      if (
        err.code === 'auth/operation-not-allowed' ||
        err.code === 'auth/unauthorized-domain' ||
        err.code === 'auth/popup-blocked' ||
        err.code === 'auth/popup-closed-by-user' ||
        err.message?.includes('disabled in your Firebase project') ||
        err.message?.includes('operation-not-allowed') ||
        err.message?.includes('403')
      ) {
        console.warn('Firebase Google auth disabled or popup blocked, falling back to Google local session:', err);
        const targetEmail = (emailHint || currentUser?.email || 'google.student@gmail.com').toLowerCase().trim();
        const uid = 'local_' + targetEmail.replace(/[^a-z0-9]/g, '_');
        const name = targetEmail.split('@')[0] || 'Student';
        createLocalUserSession(uid, targetEmail, name, 'https://lh3.googleusercontent.com/a/default-user');
        return;
      }
      throw err;
    }
  };

  const loginAsGuest = async () => {
    try {
      const res = await signInAnonymously(auth);
      if (res.user) {
        await ensureUserProfile(res.user, 'Guest Student');
      }
    } catch (err) {
      console.warn('Firebase anonymous auth disabled or failed, using instant local guest mode:', err);
      const guestUid = 'guest_' + Math.random().toString(36).substring(2, 9);
      const mockGuestUser = {
        uid: guestUid,
        email: 'guest@studytrack.local',
        displayName: 'Guest Student',
        photoURL: '',
        emailVerified: true,
        isAnonymous: true,
      } as unknown as User;

      const fallbackProfile: UserProfile = {
        uid: guestUid,
        name: 'Guest Student',
        email: 'guest@studytrack.local',
        photoURL: '',
        createdAt: new Date().toISOString(),
        currentStreak: 0,
        lastActiveDate: getTodayDateString(),
        emailNotifications: true,
        browserNotifications: true,
        notificationTimeMorning: '08:00',
        notificationTimeEvening: '18:00',
        notificationTimeNight: '21:00',
      };

      setCurrentUser(mockGuestUser);
      setUserProfile(fallbackProfile);
      const cached = loadCachedTasks(guestUid);
      setTasks(cached);
      setTasksLoading(false);
      try {
        localStorage.setItem('studytrack_local_guest', JSON.stringify({ user: mockGuestUser, profile: fallbackProfile }));
      } catch (e) {}
    }
  };

  const addTaskToState = (task: StudyTask) => {
    setTasks(prev => {
      if (prev.some(t => t.id === task.id)) return prev;
      const next = [task, ...prev];
      if (currentUser) {
        try {
          localStorage.setItem(`offline_tasks_${currentUser.uid}`, JSON.stringify(next));
          if (currentUser.email) {
            const clean = currentUser.email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
            localStorage.setItem(`offline_tasks_email_${clean}`, JSON.stringify(next));
          }
        } catch (e) {}
      }
      return next;
    });
  };

  const updateTaskInState = (taskId: string, updates: Partial<StudyTask>) => {
    setTasks(prev => {
      const next = prev.map(t => (t.id === taskId ? { ...t, ...updates } : t));
      if (currentUser) {
        try {
          localStorage.setItem(`offline_tasks_${currentUser.uid}`, JSON.stringify(next));
          if (currentUser.email) {
            const clean = currentUser.email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
            localStorage.setItem(`offline_tasks_email_${clean}`, JSON.stringify(next));
          }
        } catch (e) {}
      }
      return next;
    });
  };

  const deleteTaskInState = (taskId: string) => {
    setTasks(prev => {
      const next = prev.filter(t => t.id !== taskId);
      if (currentUser) {
        try {
          localStorage.setItem(`offline_tasks_${currentUser.uid}`, JSON.stringify(next));
          if (currentUser.email) {
            const clean = currentUser.email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
            localStorage.setItem(`offline_tasks_email_${clean}`, JSON.stringify(next));
          }
        } catch (e) {}
      }
      return next;
    });
  };

  const logout = async () => {
    try {
      localStorage.removeItem('studytrack_local_guest');
    } catch (e) {}
    setTasks([]);
    setUserProfile(null);
    setCurrentUser(null);
    await signOut(auth).catch(() => {});
  };

  const resetPassword = async (email: string) => {
    try {
      const actionCodeSettings = {
        url: typeof window !== 'undefined' ? `${window.location.origin}/login` : '',
        handleCodeInApp: false,
      };
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
    } catch (e) {
      await sendPasswordResetEmail(auth, email);
    }
  };

  const changePassword = async (newPassword: string) => {
    if (!currentUser) throw new Error('No active user logged in');

    if (auth.currentUser) {
      try {
        await firebaseUpdatePassword(auth.currentUser, newPassword);
      } catch (err: any) {
        if (err.code === 'auth/requires-recent-login') {
          throw new Error('For security reasons, please log out and log back in before updating your password.');
        }
        if (
          err.code === 'auth/operation-not-allowed' ||
          err.code === 'auth/unauthorized-domain' ||
          err.code === 'auth/network-request-failed' ||
          err.message?.includes('disabled in your Firebase project')
        ) {
          if (currentUser.email) {
            try {
              localStorage.setItem(`local_pass_${currentUser.email.toLowerCase().trim()}`, newPassword);
            } catch (e) {}
          }
          return;
        }
        throw err;
      }
    } else {
      if (currentUser.email) {
        try {
          localStorage.setItem(`local_pass_${currentUser.email.toLowerCase().trim()}`, newPassword);
        } catch (e) {}
      }
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;

    setUserProfile(prev => {
      const base: UserProfile = prev || {
        uid: currentUser.uid,
        email: currentUser.email || 'user@example.com',
        name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
        emailNotifications: true,
        browserNotifications: false,
        notificationTimeMorning: '08:00',
        notificationTimeEvening: '18:00',
        notificationTimeNight: '21:00',
        emailReportEnabled: true,
        emailReportTime: '09:00',
        emailReportType: 'progress_report',
        emailReportFilter: 'all',
        emailReportDateRange: 'today',
        emailReportCustomDate: getTodayDateString(),
        lastEmailReportSentDate: '',
      };
      const updated = { ...base, ...updates };
      try {
        if (currentUser.uid === 'guest-user') {
          localStorage.setItem('studytrack_local_guest', JSON.stringify({ user: currentUser, profile: updated }));
        } else {
          localStorage.setItem(`user_profile_${currentUser.uid}`, JSON.stringify(updated));
        }
      } catch (e) {}
      return updated;
    });

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, updates, { merge: true });
    } catch (err) {
      console.warn('Failed to update user profile in Firestore (offline mode):', err);
    }

    if (updates.name && auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, { displayName: updates.name });
      } catch (err) {
        console.warn('Failed to update Auth user profile name:', err);
      }
    }
  };

  const refreshTasks = () => {
    if (currentUser && tasks) {
      checkAndSyncMissedTasksAndStreak(currentUser.uid, tasks);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        tasks,
        loading,
        tasksLoading,
        signup,
        login,
        loginWithGoogle,
        loginAsGuest,
        logout,
        resetPassword,
        changePassword,
        updateUserProfile,
        refreshTasks,
        addTaskToState,
        updateTaskInState,
        deleteTaskInState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
