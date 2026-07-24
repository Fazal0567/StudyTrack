export const getFriendlyAuthErrorMessage = (error: any): string => {
  const code = error?.code || '';
  const message = error?.message || '';

  if (code === 'auth/unauthorized-domain' || message.includes('unauthorized-domain')) {
    return 'Firebase Error (auth/unauthorized-domain): This domain is not authorized in your Firebase Console. To fix this, go to Firebase Console > Authentication > Settings > Authorized domains and add this domain to the allowed list.';
  }

  if (code === 'auth/operation-not-allowed' || message.includes('operation-not-allowed')) {
    return 'Firebase Error (auth/operation-not-allowed): This sign-in provider (Email/Password or Google) is currently disabled in your Firebase project. To fix this, open Firebase Console > Authentication > Sign-in method and click Enable for Email/Password and Google.';
  }

  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Invalid email or password. Please check your credentials and try again.';
  }

  if (code === 'auth/email-already-in-use') {
    return 'An account with this email address already exists. Please sign in instead.';
  }

  if (code === 'auth/popup-closed-by-user') {
    return 'Google Sign-In popup was closed before completing.';
  }

  return message || 'An unexpected authentication error occurred.';
};
