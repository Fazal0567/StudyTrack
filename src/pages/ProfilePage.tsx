import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StreakBadge } from '../components/StreakBadge';
import { User, Mail, Camera, Save, CheckCircle2, AlertCircle, Award } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { userProfile, tasks, updateUserProfile } = useAuth();

  const [name, setName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setPhotoURL(userProfile.photoURL || '');
    }
  }, [userProfile]);

  const totalCompleted = tasks.filter(t => t.status === 'Completed').length;
  const totalMissed = tasks.filter(t => t.status === 'Missed').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Name cannot be empty');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg('');
      setSuccessMsg('');
      await updateUserProfile({
        name: name.trim(),
        photoURL: photoURL.trim(),
      });
      setSuccessMsg('Profile updated successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <User className="text-blue-600 dark:text-blue-400" size={26} />
          Student Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal information, profile picture, and view your account statistics.
        </p>
      </div>

      {/* Account Highlights Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-3xl overflow-hidden border-2 border-blue-500 shadow-md">
            {photoURL ? (
              <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              name.charAt(0) || 'S'
            )}
          </div>
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {userProfile?.name || 'Student'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center sm:justify-start gap-1">
            <Mail size={14} />
            <span>{userProfile?.email}</span>
          </p>

          <div className="pt-2 flex items-center justify-center sm:justify-start gap-2">
            <StreakBadge streak={userProfile?.currentStreak || 0} size="sm" />
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs text-center space-y-1">
          <CheckCircle2 className="mx-auto text-emerald-500" size={24} />
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {totalCompleted}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Total Targets Completed
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs text-center space-y-1">
          <AlertCircle className="mx-auto text-rose-500" size={24} />
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {totalMissed}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Total Missed Targets
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Edit Profile Information
        </h3>

        {successMsg && (
          <div className="p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-xs rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 text-xs rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Profile Picture Image URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://example.com/photo.jpg"
              value={photoURL}
              onChange={e => setPhotoURL(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={16} />
              <span>{saving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
