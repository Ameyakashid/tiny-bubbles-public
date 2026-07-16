/**
 * src/a11y/announce.ts — the screen-reader ANNOUNCEMENT channel (§2.1).
 *
 * Distinct from `expo-speech` TTS (which proactively reads a label aloud for a
 * looking non-reader). This is the OS narrator channel: `announce(msg)` speaks an
 * event that has no focus target (a token flying to a counter) via
 * `AccessibilityInfo.announceForAccessibility`, so a VoiceOver/TalkBack user hears
 * "Nice — that's done. You earned a bubble." It is FIRE-AND-FORGET: it must never
 * block or delay the sub-300ms visual/haptic/token path (§2.1), and it no-ops
 * safely on web / where the native module is unavailable.
 */
import { AccessibilityInfo, Platform } from "react-native";
import { useEffect, useState } from "react";

/**
 * Announce `msg` to the active screen reader (no-op on web / when empty / when the
 * native call throws). Never awaits; never throws into the caller.
 */
export function announce(msg: string): void {
  if (!msg) return;
  if (Platform.OS === "web") return; // AccessibilityInfo.announce is native-only
  try {
    AccessibilityInfo.announceForAccessibility(msg);
  } catch {
    // some runtimes (restricted Expo Go / older web shims) — never fatal
  }
}

/**
 * Live "is a screen reader running?" — lets a screen decide to announce (or skip
 * a decorative flourish). Subscribes to change events; defaults false. Web-safe.
 */
export function useScreenReader(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((v) => {
        if (mounted) setEnabled(v);
      })
      .catch(() => {
        // unavailable (web) — leave false
      });
    const sub = AccessibilityInfo.addEventListener("screenReaderChanged", (v) => {
      setEnabled(v);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return enabled;
}
