export const getFriendlyAuthErrorMessage = (error: any): string => {
  const code = error?.code || '';
  const message = error?.message || '';

  if (message.includes('access_denied') || message.includes('403') || message.includes('verification process') || code === 'auth/access-denied') {
    return 'Google Sign-In Access Blocked (Error 403: access_denied): The app has not completed the Google verification process. To fix this: 1) Open Google Cloud Console > OAuth consent screen. 2) Add your email address under "Test users", or set Publishing status to "In Production".';
  }

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

  if (code === 'auth/popup-blocked') {
    return 'Google Sign-In popup was blocked by your browser. Please allow popups for this site and try again.';
  }

  return message || 'An unexpected authentication error occurred.';
};
