/**
 * src/sync/fcmToken.ts — per-platform push-token capture (w1 M1.2 — §8 #26).
 *
 * The crisis-delivery CLIENT half. `firebase/messaging` (JS SDK) is web-only
 * on RN, so per §8 #26:
 *   - **Android**: `expo-notifications` `getDevicePushTokenAsync()` yields a
 *     REAL FCM registration token → `admin.messaging().send()` works
 *     (type `"fcm"`).
 *   - **iOS**: a JS-SDK + expo-notifications app yields an **APNs** token,
 *     which `admin.messaging().send()` REJECTS. Preferred path =
 *     `@react-native-firebase/messaging` (real FCM token, native prod build
 *     only); when that module is absent (Expo Go / this repo today) the APNs
 *     token is captured with type `"apns"` so `sendParentAlert` routes it via
 *     Expo Push / APNs instead of FCM. The token TYPE is always recorded.
 *
 * This is a SEAM: nothing calls it on the kid critical path (crisis pushes
 * target the PARENT device — `users/{parentUid}.fcmTokens[]`; the parent app
 * reuses this module at M3.x). All native access is lazy + try/catch so the
 * web build and jest never touch a native module at module scope (the shipped
 * `services/report.ts` discipline).
 */
import { Platform } from "react-native";

import type { EpochMs, FcmTokenRecord } from "@tiny-bubbles/shared";

/** Indirect require — keeps native modules out of module scope (web/jest safe). */
function lazyRequire<T>(name: string): T {
  const req = typeof require === "function" ? (require as (n: string) => unknown) : undefined;
  if (!req) throw new Error(`[fcmToken] no require available to load ${name}`);
  return req(name) as T;
}

type NotificationsModule = {
  getDevicePushTokenAsync(): Promise<{ type: string; data: unknown }>;
};

type RnfbMessagingModule = {
  default: () => { getToken(): Promise<string> };
};

/**
 * Capture this device's push token + TYPE (§8 #26). Returns null when no
 * push transport is available (web, simulator, permissions off) — callers
 * treat null as "no reachable channel", never an error.
 */
export async function capturePushToken(
  nowMs: EpochMs = Date.now(),
): Promise<FcmTokenRecord | null> {
  if (Platform.OS === "web") return null;

  if (Platform.OS === "android") {
    try {
      const notifications = lazyRequire<NotificationsModule>("expo-notifications");
      const token = await notifications.getDevicePushTokenAsync();
      const data = typeof token.data === "string" ? token.data : JSON.stringify(token.data);
      // Android device push token IS the FCM registration token (§8 #26).
      return { token: data, type: "fcm", platform: "android", updatedAtMs: nowMs };
    } catch {
      return null;
    }
  }

  // iOS — prefer the real FCM registration token via RNFB messaging (native
  // prod build); fall back to the APNs token with its TYPE recorded honestly.
  try {
    const messaging = lazyRequire<RnfbMessagingModule>("@react-native-firebase/messaging");
    const token = await messaging.default().getToken();
    if (token) return { token, type: "fcm", platform: "ios", updatedAtMs: nowMs };
  } catch {
    // RNFB not installed (Expo Go / mock build) — fall through to APNs.
  }
  try {
    const notifications = lazyRequire<NotificationsModule>("expo-notifications");
    const token = await notifications.getDevicePushTokenAsync();
    const data = typeof token.data === "string" ? token.data : JSON.stringify(token.data);
    return { token: data, type: "apns", platform: "ios", updatedAtMs: nowMs };
  } catch {
    return null;
  }
}
