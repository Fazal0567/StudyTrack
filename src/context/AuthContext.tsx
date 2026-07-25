import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword as firebaseUpdatePassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/config';
import { UserProfile, StudyTask } from '../types';
import {
  subscribeToUserTasks,
  checkAndSyncMissedTasksAndStreak,
  getTodayDateString,
  cleanupDummyTasks,
} from '../services/taskService';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  tasks: StudyTask[];
  loading: boolean;
  signup: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshTasks: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync or create user document in Firestore
  const ensureUserProfile = async (user: User, nameOverride?: string): Promise<UserProfile> => {
    const userRef = doc(db, 'users', user.uid);
    try {
      const docSnap = await getDoc(userRef);

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
        };
        setUserProfile(profile);
        return profile;
      } else {
        const newProfile: UserProfile = {
          uid: user.uid,
          name: nameOverride || user.displayName || 'Student',
          email: user.email || '',
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
        try {
          await setDoc(userRef, newProfile);
        } catch (setErr) {
          console.warn('Failed to save user profile to Firestore (offline mode):', setErr);
        }
        setUserProfile(newProfile);
        return newProfile;
      }
    } catch (err) {
      console.warn('Could not fetch user profile from Firestore (offline or connection issue), using local fallback profile:', err);
      const fallbackProfile: UserProfile = {
        uid: user.uid,
        name: nameOverride || user.displayName || (user.email ? user.email.split('@')[0] : 'Student'),
        email: user.email || '',
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
    let unsubscribeTasks: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async user => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await ensureUserProfile(user);

          // Subscribe to user tasks
          unsubscribeTasks = subscribeToUserTasks(user.uid, async userTasks => {
            // Clean up any remaining initial dummy sample tasks
            await cleanupDummyTasks(userTasks);
            const realTasks = userTasks.filter(
              t =>
                ![
                  'Advanced Calculus Integration',
                  'Organic Chemistry - Alkyl Halides',
                  'Literature Review - The Great Gatsby',
                ].includes(t.title)
            );
            setTasks(realTasks);
            // Auto check missed tasks & update streak
            const updatedStreak = await checkAndSyncMissedTasksAndStreak(user.uid, realTasks);
            setUserProfile(prev => (prev ? { ...prev, currentStreak: updatedStreak } : prev));
          });
        } catch (err) {
          console.error('Error initializing user profile:', err);
        }
      } else {
        setUserProfile(null);
        setTasks([]);
        if (unsubscribeTasks) unsubscribeTasks();
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeTasks) unsubscribeTasks();
    };
  }, []);

  const signup = async (email: string, password: string, name: string) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    if (res.user) {
      await updateProfile(res.user, { displayName: name });
      await ensureUserProfile(res.user, name);
    }
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    const res = await signInWithPopup(auth, googleProvider);
    if (res.user) {
      await ensureUserProfile(res.user);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const changePassword = async (newPassword: string) => {
    if (!currentUser) throw new Error('No active user logged in');
    await firebaseUpdatePassword(currentUser, newPassword);
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    setUserProfile(prev => (prev ? { ...prev, ...updates } : null));

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, updates);
    } catch (err) {
      console.warn('Failed to update user profile in Firestore (offline mode):', err);
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, updates, { merge: true });
      } catch (mergeErr) {
        console.warn('Fallback setDoc also failed (offline mode):', mergeErr);
      }
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
        signup,
        login,
        loginWithGoogle,
        logout,
        resetPassword,
        changePassword,
        updateUserProfile,
        refreshTasks,
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
