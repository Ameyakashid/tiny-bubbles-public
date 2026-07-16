/**
 * src/services/soundscape.ts — the scene-switchable, volume-controllable LOOPING
 * BED player (feature `soundscapes`, M-C1). This milestone OWNS this shared
 * audio-bed layer; later milestones (breathing M-C2) reuse it.
 *
 * Deliberately SEPARATE from the sub-300ms one-shot cue registry (src/services/
 * sound.ts): a scene load/swap must never touch the celebration hot path. A single
 * looping `expo-audio` player at a time; scene swap tears down + recreates.
 *
 * MIX, NEVER HIJACK — and NO BACKGROUND: this service does NOT configure the audio
 * session itself. It relies on the mix-not-hijack session already configured ONCE
 * by `initSoundRegistry` at boot (`interruptionMode:'duckOthers'`,
 * `playsInSilentMode:false`, `shouldPlayInBackground:false`) — so the bed DUCKS
 * (lowers) other media and NEVER seizes/stops a child's or parent's own audio, the
 * hardware silent switch is respected, and nothing plays backgrounded. Keeping the
 * session solely in `sound.ts` is grep-gated (soundscapes §7).
 *
 * FULL volume control: a real settable bed volume (0..1), not a fixed constant.
 *
 * CC0 / project-authored assets only. Resilient by construction: every native call
 * is guarded so a soundless device / the web export / a failed asset can never
 * throw into a screen. On web `createAudioPlayer` may be unavailable — the guarded
 * calls no-op.
 */
import { createAudioPlayer, type AudioPlayer } from "expo-audio";

import { SOUNDSCAPES, SOUNDSCAPE_ASSET_KEYS } from "../data/soundscapes";
import type { SoundscapeId } from "../domain/types";

import { isCategoryEnabled, isSoundEnabled } from "./sound";

/**
 * The bundled asset module for each scene `assetKey`. The FREE `waves` scene
 * reuses the already-bundled calm bed. INCLUDE a premium key's `require()` ONLY
 * when its `.wav` exists on disk (BUILD DEFAULT, soundscapes §4) — a `require()`
 * of a missing file breaks `expo export`. Keep the key set in sync with
 * `SOUNDSCAPE_ASSET_KEYS` in src/data/soundscapes.ts (a test binds the two).
 */
const SOUNDSCAPE_ASSET: Record<string, number> = {
  waves: require("../../assets/sounds/calm-ambient.wav"),
};

export { SOUNDSCAPE_ASSET, SOUNDSCAPE_ASSET_KEYS };

// --- module state (in-memory only; mirrored from the active child's prefs) ----
let player: AudioPlayer | null = null;
let activeSceneId: SoundscapeId | null = null;
let volume = 0.55;
let playing = false;

/** The bed may sound only when master sound + the `ambient` mixer category are on. */
function canPlay(): boolean {
  return isSoundEnabled() && isCategoryEnabled("ambient");
}

/** Resolve a scene id → its bundled asset module (undefined if unknown/unbundled). */
function assetForScene(sceneId: SoundscapeId): number | undefined {
  const scene = SOUNDSCAPES.find((s) => s.id === sceneId);
  if (!scene) return undefined;
  return SOUNDSCAPE_ASSET[scene.assetKey];
}

/** Remove the active player (used on scene switch + teardown). Guarded. */
function removePlayer(): void {
  const p = player;
  player = null;
  activeSceneId = null;
  playing = false;
  if (!p) return;
  try {
    p.remove();
  } catch {
    // already released — ignore
  }
}

/**
 * Play the bed for `sceneId` (looping). If a DIFFERENT scene is active, tear the
 * old player down and create a fresh looping player. Applies the current volume,
 * seeks to 0, and plays. NO-OP when master sound / the `ambient` category is off,
 * or when the scene has no bundled asset. Never throws.
 */
export function playSoundscape(sceneId: SoundscapeId): void {
  if (!canPlay()) return;
  const asset = assetForScene(sceneId);
  if (asset === undefined) return; // unknown / not-yet-bundled scene → silent no-op
  try {
    if (activeSceneId !== sceneId || !player) {
      removePlayer();
      const p = createAudioPlayer(asset);
      p.loop = true;
      try {
        p.volume = volume;
      } catch {
        // volume set may not be supported pre-load on some platforms — ignore
      }
      player = p;
      activeSceneId = sceneId;
    }
    const p = player;
    if (!p) return;
    try {
      p.volume = volume;
    } catch {
      // ignore
    }
    void p.seekTo(0);
    p.play();
    playing = true;
  } catch {
    // the bed is best-effort; it must never throw into a screen
  }
}

/** Pause the active bed (safe to call any time; keeps the player for a resume). */
export function stopSoundscape(): void {
  playing = false;
  const p = player;
  if (!p) return;
  try {
    p.pause();
  } catch {
    // ignore
  }
}

/** Set the persisted-mirrored bed volume (clamped `[0,1]`); apply to the live bed. */
export function setSoundscapeVolume(v: number): void {
  volume = Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0.55));
  const p = player;
  if (!p) return;
  try {
    p.volume = volume;
  } catch {
    // ignore
  }
}

/** Fully release the bed + reset state (teardown / tests). */
export function teardownSoundscape(): void {
  removePlayer();
}

/** Debug / tests: the current bed state. */
export function getSoundscapeState(): {
  activeSceneId: SoundscapeId | null;
  volume: number;
  playing: boolean;
} {
  return { activeSceneId, volume, playing };
}
