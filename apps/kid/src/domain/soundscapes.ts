/**
 * src/domain/soundscapes.ts — pure resolver + lookups for the soundscape feature
 * (M-C1). RN-free + unit-testable; no audio, no store writes — the UI + the
 * validateAndRepair layer share these so the "which scene is available" rule lives
 * in exactly one place.
 *
 * Anti-shame + acquisition-only (soundscapes §2.6 / §6): `isSceneAvailable`
 * HONOURS the currently-selected id — a premium scene a child already picked stays
 * available forever, even after a trial ends. Only NEWLY choosing a not-yet-unlocked
 * premium scene is gated.
 */
import { DEFAULT_SOUNDSCAPE_SETTINGS } from "./constants";
import type {
  Entitlement,
  Soundscape,
  SoundscapeId,
  SoundscapeKind,
  SoundscapeSettings,
} from "./types";
import { SOUNDSCAPES } from "../data/soundscapes";
import { isPremium } from "../state/settingsStore";

/** Clamp any value to a valid bed volume `[0,1]` (NaN/garbage → the default 0.55). */
export function clampVolume(v: unknown): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : DEFAULT_SOUNDSCAPE_SETTINGS.volume;
  return Math.min(1, Math.max(0, n));
}

/** Look up a catalog scene by id (a premium-locked scene is still found). */
export function findSoundscape(id: SoundscapeId | null | undefined): Soundscape | undefined {
  if (id == null) return undefined;
  return SOUNDSCAPES.find((s) => s.id === id);
}

/**
 * Resolve a (possibly-absent / partial / corrupt) persisted blob into a TOTAL
 * `SoundscapeSettings`: spread over the defaults, clamp the volume, and coerce a
 * stale scene id (one that no longer exists in the catalog) back to a safe value.
 * A premium-LOCKED scene is NOT coerced here — ownership is a separate check.
 */
export function resolveSoundscapeSettings(
  s?: Partial<SoundscapeSettings> | null,
): SoundscapeSettings {
  const merged = { ...DEFAULT_SOUNDSCAPE_SETTINGS, ...(s ?? {}) };
  return {
    volume: clampVolume(merged.volume),
    calmSceneId: findSoundscape(merged.calmSceneId)
      ? merged.calmSceneId
      : DEFAULT_SOUNDSCAPE_SETTINGS.calmSceneId,
    focusSceneId:
      merged.focusSceneId != null && findSoundscape(merged.focusSceneId)
        ? merged.focusSceneId
        : null,
    focusDuringTasks: Boolean(merged.focusDuringTasks),
  };
}

/**
 * Is `scene` selectable at the current entitlement? Free scenes always are;
 * premium scenes are available to premium/trial children OR when the scene is the
 * one already selected (ownership-honoured, acquisition-only — never strips an
 * owned/equipped scene after a downgrade).
 */
export function isSceneAvailable(
  scene: Soundscape,
  entitlement: Entitlement,
  selectedId?: SoundscapeId | null,
): boolean {
  if (!scene.premium) return true;
  if (isPremium(entitlement)) return true;
  return selectedId != null && scene.id === selectedId;
}

/**
 * The curated, sliced scene list for a picker in `kind` context: the free scene(s)
 * of any kind + the scenes suggested for this kind + the currently-selected scene
 * (so a chosen focus scene still shows in the calm picker, §2.2). Ordered
 * selected-first, then free, then premium-preview; capped at `maxChoices`
 * (curated autonomy — never an open catalog). Any scene is selectable in either
 * context; premium ones render as preview tiles the UI routes to the paywall.
 */
export function pickableScenes(
  kind: SoundscapeKind,
  maxChoices: number,
  _entitlement: Entitlement,
  selectedId?: SoundscapeId | null,
): Soundscape[] {
  const relevant = SOUNDSCAPES.filter(
    (s) => s.kind === kind || !s.premium || s.id === selectedId,
  );
  const rank = (s: Soundscape): number => {
    if (s.id === selectedId) return 0; // the current pick always shows first
    if (!s.premium) return 1; // free/owned next
    return 2; // premium previews last
  };
  const ordered = [...relevant].sort((a, b) => rank(a) - rank(b));
  return ordered.slice(0, Math.max(0, maxChoices));
}
