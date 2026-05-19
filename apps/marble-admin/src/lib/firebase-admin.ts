/**
 * Firebase Admin SDK init for the marble-admin app.
 *
 * Used exclusively for sending push notifications to native FCM (Android)
 * and APNs (iOS) tokens that the mobile client registered with the server.
 * The mobile side stores the native device push token from
 * Notifications.getDevicePushTokenAsync(); this module sends to those
 * tokens directly via the FCM HTTP v1 API.
 *
 * Why not Expo's Push API:
 *   - Expo proxies through their own servers (exp.host) → extra latency,
 *     opaque failures, and we've seen pushes silently drop when the app
 *     is in the killed state on Android.
 *   - Firebase Admin SDK talks straight to FCM/APNs → reliable kill-state
 *     delivery, real per-token failure reasons, and consistent with the
 *     argufight + basktball server-side push paths.
 *
 * Credentials: reads FIREBASE_SERVICE_ACCOUNT_JSON env var (same JSON
 * already used for GA4 in lib/kpis/fetch). Falls back to null if not
 * configured — callers must handle that gracefully so local dev without
 * a service account doesn't crash.
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

let cachedApp: App | null = null;
let cachedMessaging: Messaging | null = null;

function parseServiceAccount(): Record<string, unknown> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err: any) {
    console.error('[firebase-admin] FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON:', err?.message);
    return null;
  }
}

/**
 * Lazy init. Returns null when no service account is configured so the
 * push routes can return a clear 503 instead of crashing.
 */
export function getFirebaseMessaging(): Messaging | null {
  if (cachedMessaging) return cachedMessaging;

  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[firebase-admin] FIREBASE_SERVICE_ACCOUNT_JSON not set — push disabled');
    }
    return null;
  }

  if (!cachedApp) {
    /* getApps() across the process is shared across all Firebase consumers
     * in this Node runtime — only initialize if no other module has done it. */
    const existing = getApps();
    if (existing.length > 0) {
      cachedApp = existing[0];
    } else {
      cachedApp = initializeApp({
        credential: cert(serviceAccount as any),
      });
    }
  }

  cachedMessaging = getMessaging(cachedApp);
  return cachedMessaging;
}
