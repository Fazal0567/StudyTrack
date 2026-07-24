export const requestBrowserNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const getNotificationPermissionStatus = (): NotificationPermission | 'unsupported' => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};

export const sendBrowserNotification = (
  title: string,
  body: string,
  icon: string = '/icon.png'
) => {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon,
        badge: icon,
        silent: false,
      });
    } catch (err) {
      console.error('Error displaying notification:', err);
    }
  }
};

export const triggerReminder = (type: 'morning' | 'evening' | 'night', pendingCount: number = 0) => {
  switch (type) {
    case 'morning':
      sendBrowserNotification(
        '🌅 StudyTrack Morning Reminder',
        'Good morning! Plan your study targets for a productive day ahead.'
      );
      break;
    case 'evening':
      sendBrowserNotification(
        '🌇 StudyTrack Evening Check-in',
        pendingCount > 0
          ? `You still have ${pendingCount} pending study target${pendingCount > 1 ? 's' : ''}. Keep going!`
          : 'Great job! All your study targets for today are completed.'
      );
      break;
    case 'night':
      sendBrowserNotification(
        '🌙 StudyTrack Night Wrap-up',
        pendingCount > 0
          ? `You have ${pendingCount} uncompleted study target${pendingCount > 1 ? 's' : ''}. Carry them forward tomorrow!`
          : 'Excellent work today! Rest well and prepare for tomorrow.'
      );
      break;
  }
};
