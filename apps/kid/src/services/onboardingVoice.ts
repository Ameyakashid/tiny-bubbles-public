/**
 * src/services/onboardingVoice.ts — the offline-TTS fallback SEAM for onboarding
 * (doc 66 §M11, risk register "Offline TTS absent on some Android devices").
 *
 * "Everything spoken aloud" must survive a device with NO usable system voice.
 * The flow is: probe `Speech.getAvailableVoicesAsync()` ONCE; if a voice exists
 * the screens speak via `tts.speak()`; if none, they fall back to a bundled,
 * pre-recorded CC0 clip per onboarding slot AND surface a one-time "install a
 * voice" prompt (the non-reader path never depends solely on runtime TTS).
 *
 * NO CC0 recording is bundled yet, so every slot below maps to `null` (a
 * documented asset slot — see THIRD_PARTY_NOTICES.md §6 + RUN.md). The clip
 * player is a registrable seam (mirrors `playCue`): when a licensed clip lands,
 * set the slot to `require('../../assets/audio/onboarding/<slot>.m4a')` and
 * register a real player at boot. We WIRE the path here; we never fabricate a
 * binary. This module imports no native audio so it stays Expo-Go/test-friendly.
 */
import { getAvailableVoices } from "./tts";

/** One audio slot per onboarding screen (the spoken script for that step). */
export type OnboardingVoiceSlot =
  | "welcome"
  | "privacy"
  | "gate"
  | "child"
  | "buddy"
  | "task"
  | "calm"
  | "done";

/**
 * Bundled-clip registry for the offline fallback. `null` = NO licensed asset
 * bundled yet (documented slot). Replace a slot with a `require(...)` module id
 * once a CC0/royalty-free recording ships; the registered player consumes it.
 */
export const ONBOARDING_VOICE_SLOTS: Record<OnboardingVoiceSlot, number | null> = {
  welcome: null,
  privacy: null,
  gate: null,
  child: null,
  buddy: null,
  task: null,
  calm: null,
  done: null,
};

type ClipPlayer = (slot: OnboardingVoiceSlot, assetModule: number) => boolean;

/** The registered fallback player (set at boot when an audio layer exists). */
let clipImpl: ClipPlayer | null = null;

/** Register (or clear) the bundled-clip player. Mirrors `playCue`'s seam. */
export function registerOnboardingClipPlayer(fn: ClipPlayer | null): void {
  clipImpl = fn;
}

/**
 * Play the bundled fallback clip for a slot. Returns whether it actually played.
 * Today this is always `false` — no asset is bundled and no player is registered
 * — so callers fall through to the "install a voice" prompt. Never throws.
 */
export function playOnboardingClip(slot: OnboardingVoiceSlot): boolean {
  const asset = ONBOARDING_VOICE_SLOTS[slot];
  if (asset == null || !clipImpl) return false;
  try {
    return clipImpl(slot, asset);
  } catch {
    return false;
  }
}

// Single cached probe: voice availability does not change within a session and
// the call is mildly expensive, so we memoize the promise.
let probe: Promise<boolean> | null = null;

/** Probe (once per session) whether a usable system voice exists. */
export function probeVoiceAvailable(): Promise<boolean> {
  if (!probe) {
    probe = getAvailableVoices()
      .then((voices) => voices.length > 0)
      .catch(() => false);
  }
  return probe;
}

/** Test seam: forget the cached probe so a test can re-stub voice availability. */
export function __resetVoiceProbe(): void {
  probe = null;
}
