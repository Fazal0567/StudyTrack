import React from 'react';
import { AlertCircle, ExternalLink, UserCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface AuthErrorAlertProps {
  error: string;
}

export const AuthErrorAlert: React.FC<AuthErrorAlertProps> = ({ error }) => {
  const { loginAsGuest } = useAuth();
  const navigate = useNavigate();

  if (!error) return null;

  const isOperationNotAllowed =
    error.includes('auth/operation-not-allowed') || error.includes('disabled in your Firebase project');
  const isUnauthorizedDomain =
    error.includes('auth/unauthorized-domain') || error.includes('Authorized domains');
  const isGoogle403 = error.includes('403') || error.includes('access_denied');

  const handleInstantGuest = async () => {
    try {
      await loginAsGuest();
      navigate('/dashboard');
    } catch (e) {
      console.error('Guest sign in error:', e);
    }
  };

  if (isOperationNotAllowed) {
    return (
      <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-2xl text-amber-900 dark:text-amber-200 text-xs leading-relaxed space-y-3 shadow-sm">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-amber-950 dark:text-amber-100">
              Firebase Sign-In Provider Disabled
            </h4>
            <p>
              Email/Password or Google authentication is currently turned off in your Firebase project settings.
            </p>
          </div>
        </div>

        <div className="bg-amber-100/70 dark:bg-amber-900/40 p-3 rounded-xl space-y-1.5 font-medium text-amber-900 dark:text-amber-200">
          <p className="font-bold">How to fix in Firebase Console:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open <span className="font-semibold underline">Firebase Console &gt; Authentication</span></li>
            <li>Click on the <span className="font-semibold">Sign-in method</span> tab</li>
            <li>Click <span className="font-semibold">Email/Password</span> and <span className="font-semibold">Google</span> and select <span className="font-semibold">Enable</span></li>
          </ol>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <a
            href="https://console.firebase.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
          >
            <span>Open Firebase Console</span>
            <ExternalLink size={13} />
          </a>

          <button
            type="button"
            onClick={handleInstantGuest}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
          >
            <UserCheck size={14} />
            <span>⚡ Instant Guest Access (Skip Setup)</span>
          </button>
        </div>
      </div>
    );
  }

  if (isUnauthorizedDomain) {
    return (
      <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-2xl text-amber-900 dark:text-amber-200 text-xs leading-relaxed space-y-3 shadow-sm">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-amber-950 dark:text-amber-100">
              Unauthorized Firebase Domain
            </h4>
            <p>{error}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <a
            href="https://console.firebase.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
          >
            <span>Firebase Settings</span>
            <ExternalLink size={13} />
          </a>

          <button
            type="button"
            onClick={handleInstantGuest}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
          >
            <UserCheck size={14} />
            <span>⚡ Instant Guest Access</span>
          </button>
        </div>
      </div>
    );
  }

  if (isGoogle403) {
    return (
      <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700/60 rounded-2xl text-rose-900 dark:text-rose-200 text-xs leading-relaxed space-y-3 shadow-sm">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-rose-950 dark:text-rose-100">
              Google OAuth Access Blocked (Error 403)
            </h4>
            <p>{error}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleInstantGuest}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
          >
            <UserCheck size={14} />
            <span>⚡ Continue with Guest Account</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 p-3 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 text-xs rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-2">
      <AlertCircle size={16} className="shrink-0" />
      <span>{error}</span>
    </div>
  );
};
