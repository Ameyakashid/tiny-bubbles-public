/**
 * src/services/sound.ts — the imperative audio cue REGISTRY (doc 61 §9 / doc 66
 * §1b.1 / M13).
 *
 * Design contract (the sub-300ms multisensory window, doc 61 §8):
 *   - At boot (one effect in app/_layout.tsx) `initSoundRegistry()` pre-instantiates
 *     ONE `expo-audio` AudioPlayer per named cue and registers an imperative
 *     player into the `playCue` facade. `useAudioPlayer` (the hook) is NEVER used
 *     here — players are created with `createAudioPlayer` so `playCue` stays a
 *     plain synchronous call from `useCelebration`.
 *   - `playCue(id)` = `seekTo(0)` + `play()` on the pre-created player — no async
 *     load on the hot path.
 *
 * Audio session — MIX, NEVER HIJACK (doc 61 §9.1, the Brili complaint): we set
 * `interruptionMode:'duckOthers'` so a cue briefly DUCKS (lowers) a child's
 * music / podcast / a parent's audio and lets it keep playing — it never seizes
 * or stops it. (`'mixWithOthers'` per doc 66 §1b.1 would not duck at all; the
 * M13 acceptance asks for "ducks, not stops", so we use the ducking mode, which
 * is a strict superset of "don't hijack". Real-device ducking is a device-verify
 * item — see RUN.md.) `playsInSilentMode:false` respects the hardware silent
 * switch; nothing plays in the background.
 *
 * Per-category toggles (doc 61 §9.3): every cue belongs to a category
 * (ui / celebration / voice / ambient); a category (or the master) can be muted
 * app-wide. The master mirrors the active child's `soundEnabled` setting.
 *
 * Resilient by construction: every native call is guarded so a soundless device,
 * the web export, or a failed asset can never throw into the loop.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

import { registerCuePlayer, type CueId } from "./playCue";

/** Mixer categories — each independently mutable (doc 61 §9.3). */
export type SoundCategory = "ui" | "celebration" | "voice" | "ambient";

/** The bundled asset module for each cue (all ORIGINAL / CC0, see §6 notices). */
const CUE_ASSET: Record<CueId, number> = {
  "tap.soft": require("../../assets/sounds/tap-soft.wav"),
  "step.done": require("../../assets/sounds/step-done.wav"),
  "token.payout": require("../../assets/sounds/token-payout.wav"),
  "routine.complete": require("../../assets/sounds/routine-complete.wav"),
  levelup: require("../../assets/sounds/levelup.wav"),
  "reward.redeem": require("../../assets/sounds/reward-redeem.wav"),
  "buddy.greet": require("../../assets/sounds/buddy-greet.wav"),
  "transition.swoosh": require("../../assets/sounds/transition-swoosh.wav"),
  "timer.done": require("../../assets/sounds/timer-done.wav"),
  "calm.ambient": require("../../assets/sounds/calm-ambient.wav"),
};

/** Which mixer category each cue belongs to (drives the per-category toggle). */
const CUE_CATEGORY: Record<CueId, SoundCategory> = {
  "tap.soft": "ui",
  "transition.swoosh": "ui",
  "step.done": "celebration",
  "token.payout": "celebration",
  "routine.complete": "celebration",
  levelup: "celebration",
  "reward.redeem": "celebration",
  // The optional timer chime rides the `celebration` mixer category (avoids a
  // mixer-category change); it ships MUTED-by-default at the feature level via the
  // Settings "Timer sound" toggle, not by a mixer default (visual-timers §4 #12).
  "timer.done": "celebration",
  "buddy.greet": "voice",
  "calm.ambient": "ambient",
};

/** Per-cue playback volume (0..1) — UI ticks softer, ambient sits low/under. */
const CUE_VOLUME: Record<CueId, number> = {
  "tap.soft": 0.5,
  "transition.swoosh": 0.6,
  "step.done": 0.9,
  "token.payout": 0.8,
  "routine.complete": 0.9,
  levelup: 0.85,
  "reward.redeem": 0.85,
  "timer.done": 0.5, // soft, low — a quiet "that's the time," never a sting
  "buddy.greet": 0.8,
  "calm.ambient": 0.55,
};

const AMBIENT_CUE: CueId = "calm.ambient";

// --- module state -------------------------------------------------------------
const players: Partial<Record<CueId, AudioPlayer>> = {};
let initialized = false;
let masterEnabled = true;
const categoryEnabled: Record<SoundCategory, boolean> = {
  ui: true,
  celebration: true,
  voice: true,
  ambient: true,
};

function audible(cue: CueId): boolean {
  return masterEnabled && categoryEnabled[CUE_CATEGORY[cue]];
}

/**
 * The imperative one-shot player registered into the `playCue` facade. Fires the
 * pre-created player for a cue (seek-to-0 + play). The looping ambient bed is
 * managed separately via `startAmbient`/`stopAmbient`, so a one-shot `playCue`
 * for it routes there (and can be stopped) instead of leaking an endless loop.
 */
function playCueImpl(cue: CueId): void {
  if (cue === AMBIENT_CUE) {
    startAmbient();
    return;
  }
  if (!audible(cue)) return;
  const p = players[cue];
  if (!p) return;
  try {
    void p.seekTo(0);
    p.play();
  } catch {
    // a cue must never throw into the celebration/loop timing
  }
}

/**
 * Pre-instantiate one AudioPlayer per cue + configure the mix-not-hijack session,
 * then register the imperative player. Idempotent. Returns a teardown fn.
 */
export function initSoundRegistry(): () => void {
  if (initialized) return teardownSoundRegistry;
  initialized = true;

  // MIX, never hijack: duck other audio, respect silent switch, no background.
  void setAudioModeAsync({
    interruptionMode: "duckOthers",
    playsInSilentMode: false,
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
  }).catch(() => {});

  (Object.keys(CUE_ASSET) as CueId[]).forEach((cue) => {
    try {
      const player = createAudioPlayer(CUE_ASSET[cue]);
      try {
        player.volume = CUE_VOLUME[cue];
      } catch {
        // volume set may not be supported pre-load on some platforms — ignore
      }
      if (cue === AMBIENT_CUE) player.loop = true;
      players[cue] = player;
    } catch {
      // a single failed asset must not abort the whole registry
    }
  });

  registerCuePlayer(playCueImpl);
  return teardownSoundRegistry;
}

/** Release every player + unregister the facade (idempotent; for teardown/tests). */
export function teardownSoundRegistry(): void {
  registerCuePlayer(null);
  stopAmbient();
  (Object.keys(players) as CueId[]).forEach((cue) => {
    try {
      players[cue]?.remove();
    } catch {
      // already released — ignore
    }
    delete players[cue];
  });
  initialized = false;
}

// --- the looping calm soundscape (doc 61 §9.2 calm.ambient) -------------------

/** Start the loopable calm bed (no-op if muted or not initialized). */
export function startAmbient(): void {
  if (!audible(AMBIENT_CUE)) return;
  const p = players[AMBIENT_CUE];
  if (!p) return;
  try {
    p.loop = true;
    void p.seekTo(0);
    p.play();
  } catch {
    // ambient is best-effort; never throw
  }
}

/** Stop the calm bed (safe to call any time). */
export function stopAmbient(): void {
  const p = players[AMBIENT_CUE];
  if (!p) return;
  try {
    p.pause();
  } catch {
    // ignore
  }
}

// --- per-category + master toggles (doc 61 §9.3) ------------------------------

/** Master sound enable — mirrors the active child's `soundEnabled` setting. */
export function setSoundEnabled(enabled: boolean): void {
  masterEnabled = enabled;
  if (!enabled) stopAmbient();
}

/** Toggle one mixer category app-wide (UI / celebration / companion voice / ambient). */
export function setSoundCategoryEnabled(category: SoundCategory, enabled: boolean): void {
  categoryEnabled[category] = enabled;
  if (category === "ambient" && !enabled) stopAmbient();
}

/** Read the current master state (debug / tests). */
export function isSoundEnabled(): boolean {
  return masterEnabled;
}

/** Read a category's current state (debug / tests). */
export function isCategoryEnabled(category: SoundCategory): boolean {
  return categoryEnabled[category];
}
