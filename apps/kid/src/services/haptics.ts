/**
 * src/services/haptics.ts — the haptic cue registry (doc 61 §10 / doc 66 M13).
 *
 * Haptics are a first-class feedback channel (doc 61 §3) but FULLY toggleable —
 * many neurodivergent kids dislike them (doc 61 §6). This module is the single
 * imperative seam every caller fires through, so the cue vocabulary + the
 * "never scold a child" rule live in one place.
 *
 * HARD ANTI-SHAME RULE (doc 61 §10.2 / doc 66 §5): there is NO Warning/Error
 * haptic toward a child — a child is never vibrated at as a reprimand. This
 * module therefore exposes ONLY positive/neutral cues (Light/Medium/Heavy
 * impacts + the Success notification). Parent-facing form-validation haptics
 * (the only place `Warning` is acceptable) deliberately do NOT live here.
 *
 * `fireHaptic` is synchronous + swallow-errors so a missing motor (web / no
 * vibrator) or a disabled toggle can never break the celebration timing.
 */
import * as Haptics from "expo-haptics";

/** The named haptic cues (doc 61 §10.1). All positive/neutral — never a scold. */
export type HapticCue =
  | "tap" // UI tap / selection — Light
  | "select" // picker / toggle — Light
  | "done" // step complete — Success
  | "token" // a token lands — Medium
  | "routineComplete" // routine / milestone — Success then a Medium accent
  | "levelUp"; // companion level-up — Heavy then two Light sparkles

/**
 * Master enable, set from the active child's `hapticsEnabled` at boot/settings
 * change (see app/_layout.tsx). A per-call `enabled` override still wins so the
 * celebration hook can honor a per-moment toggle without touching this flag.
 */
let masterEnabled = true;

/** Set the master haptics enable (mirrors the child's `hapticsEnabled` setting). */
export function setHapticsEnabled(enabled: boolean): void {
  masterEnabled = enabled;
}

/** Current master haptics state (debug / tests). */
export function isHapticsEnabled(): boolean {
  return masterEnabled;
}

// expo-haptics resolves these lazily; capture once for terseness.
const Impact = Haptics.ImpactFeedbackStyle;
const Notify = Haptics.NotificationFeedbackType;

function impact(style: Haptics.ImpactFeedbackStyle): void {
  void Haptics.impactAsync(style).catch(() => {});
}

/**
 * Fire a named haptic cue. No-op when disabled (master OR the per-call override).
 * Never throws; never fires a Warning/Error toward a child (none are defined).
 */
export function fireHaptic(cue: HapticCue, opts?: { enabled?: boolean }): void {
  const on = opts?.enabled ?? masterEnabled;
  if (!on) return;
  try {
    switch (cue) {
      case "tap":
      case "select":
        impact(Impact.Light);
        break;
      case "done":
        void Haptics.notificationAsync(Notify.Success).catch(() => {});
        break;
      case "token":
        impact(Impact.Medium);
        break;
      case "routineComplete":
        // Success now, a soft Medium accent ~120ms later (doc 61 §10.1).
        void Haptics.notificationAsync(Notify.Success).catch(() => {});
        setTimeout(() => impact(Impact.Medium), 120);
        break;
      case "levelUp":
        // Heavy thump then two Light "sparkles" (doc 61 §10.1).
        impact(Impact.Heavy);
        setTimeout(() => impact(Impact.Light), 90);
        setTimeout(() => impact(Impact.Light), 170);
        break;
    }
  } catch {
    // haptics may be unavailable (web / no motor) — never break the loop
  }
}
