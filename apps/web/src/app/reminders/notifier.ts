import { Injectable } from '@angular/core';

export type NotifyPermission = NotificationPermission | 'unsupported';

/**
 * A thin wrapper over the browser's Notification API, so the rest of the app
 * (and its tests) never touch browser globals directly.
 */
@Injectable({ providedIn: 'root' })
export class Notifier {
  permission(): NotifyPermission {
    return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
  }

  async requestPermission(): Promise<NotifyPermission> {
    if (typeof Notification === 'undefined') return 'unsupported';
    try {
      return await Notification.requestPermission();
    } catch {
      return Notification.permission;
    }
  }

  /**
   * Shows a notification through the service worker when there is one (required on
   * Android, and lets a tap open the app), else directly from the page.
   */
  async show(title: string, body: string, tag: string): Promise<boolean> {
    if (this.permission() !== 'granted') return false;
    const options: NotificationOptions & { data?: unknown } = {
      body,
      tag,
      icon: 'icons/icon.svg',
      // Angular's service worker reads this to focus or open the app when tapped.
      data: { onActionClick: { default: { operation: 'focusLastFocusedOrOpen', url: '/today' } } },
    };
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) {
        await reg.showNotification(title, options);
        return true;
      }
    } catch {
      // Fall through to a page notification.
    }
    try {
      const n = new Notification(title, options);
      n.onclick = () => {
        window.focus();
        n.close();
      };
      return true;
    } catch {
      return false;
    }
  }
}
