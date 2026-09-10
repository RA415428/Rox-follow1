// Browser System & Push Notification Helper

export const LAST_ADMIN_NOTIFICATION_KEY = 'roxyefollow_last_admin_notification';

export interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  bannerUrl?: string;
}

/**
 * Check if the browser supports standard Web Notifications
 */
export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Get current browser notification permission
 */
export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

/**
 * Register background Service Worker for Push Notifications
 */
export const registerServiceWorker = async () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully for push notifications:', reg.scope);
      return reg;
    } catch (err) {
      console.warn('Service Worker registration failed:', err);
    }
  }
  return null;
};

/**
 * Request notification permission from the user and register Service Worker
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerServiceWorker();
    }
    return permission;
  } catch (err) {
    console.warn('Notification permission error:', err);
    return Notification.permission;
  }
};

/**
 * Send a device system notification if permission is granted
 */
export const sendDeviceNotification = async (title: string, options?: { body?: string; icon?: string; tag?: string }) => {
  if (!isNotificationSupported()) return;

  if (Notification.permission === 'granted') {
    try {
      let swReg: ServiceWorkerRegistration | undefined;
      if ('serviceWorker' in navigator) {
        swReg = await navigator.serviceWorker.getRegistration();
      }

      const notifOptions = {
        body: options?.body || 'New update from Roxyefollow',
        icon: options?.icon || '/icon.png',
        tag: options?.tag || 'roxyefollow-notice-' + Date.now(),
        badge: '/icon.png',
      };

      if (swReg && 'showNotification' in swReg) {
        await swReg.showNotification(title, notifOptions);
      } else {
        const notification = new Notification(title, notifOptions);
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
    } catch (err) {
      console.warn('Failed to dispatch device notification:', err);
    }
  }
};

/**
 * Broadcast an admin notification across all active tabs and trigger system notification
 */
export const broadcastAdminNotification = (title: string, message: string, bannerUrl?: string) => {
  const payload: NotificationPayload = {
    id: 'notif_' + Date.now(),
    title,
    message,
    timestamp: Date.now(),
    bannerUrl
  };

  try {
    localStorage.setItem(LAST_ADMIN_NOTIFICATION_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Failed to save last admin notification:', err);
  }

  // Trigger system notification locally if granted
  sendDeviceNotification(title, { body: message });

  // Broadcast to other tabs
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('roxyefollow_push_notification', { detail: payload }));
  }
};
