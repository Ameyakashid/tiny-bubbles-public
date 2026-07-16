/**
 * src/data/soundscapes.ts — the curated soundscape CATALOG (feature `soundscapes`,
 * M-C1). A fixed, hand-authored list — a curated catalog only, never ranked or
 * personalised, never generated. Every scene carries a REQUIRED `spokenLabel`
 * (non-reader support) + emoji + color.
 *
 * BUILD DEFAULT (green with zero new assets — soundscapes.md §4): a catalog entry
 * must NEVER reference an `assetKey` that has no bundled `.wav` in the sound
 * service's `SOUNDSCAPE_ASSET` require() map — a `require()` of a missing file
 * fails `npx expo export`. So we ship ONLY the free `waves` scene, which reuses the
 * already-bundled `assets/sounds/calm-ambient.wav`. The ~6 premium CC0 loops
 * (`rain` / `brown_noise` / `forest` / `soft_piano` / `cafe` / `night`) are an
 * out-of-band orchestrator prerequisite (a code-agent cannot author audio); add
 * each premium entry below ONLY once its file lands AND a `require()` is added to
 * `SOUNDSCAPE_ASSET` in `src/services/soundscape.ts`. Keep `SOUNDSCAPE_ASSET_KEYS`
 * (below) in sync with that require() map — a test binds the two.
 *
 * Every bundled loop is project-authored / CC0 and listed in THIRD_PARTY_NOTICES.md.
 */
import type { Soundscape, SoundscapeId } from "../domain/types";

/**
 * The curated catalog. `waves` (free, calm) is ALWAYS present. Premium scenes are
 * appended here ONLY when their asset file + `require()` exist (BUILD DEFAULT).
 */
export const SOUNDSCAPES: Soundscape[] = [
  {
    id: "waves",
    label: { spokenLabel: "Gentle Waves", emoji: "🌊", color: "#5BC8F5" },
    kind: "calm",
    premium: false,
    assetKey: "waves",
  },
];

/**
 * The set of `assetKey`s that have a bundled `.wav` in the sound service's
 * require() map. The catalog is canonical for scene metadata; the service is
 * canonical for the literal `require()`. `soundscape.test.ts` asserts this list
 * exactly matches `Object.keys(SOUNDSCAPE_ASSET)`, and `soundscapes.test.ts`
 * asserts every scene's `assetKey` is in here — so a scene can never point at an
 * un-bundled asset (the invariant that keeps `expo export` green).
 */
export const SOUNDSCAPE_ASSET_KEYS = ["waves"] as const;

/** All valid scene ids (used by validateAndRepair to detect a stale/removed id). */
export const SOUNDSCAPE_IDS: readonly SoundscapeId[] = SOUNDSCAPES.map((s) => s.id);

/** Is `id` a real catalog scene id? (A premium-locked scene is still valid.) */
export function isSoundscapeId(id: unknown): id is SoundscapeId {
  return typeof id === "string" && SOUNDSCAPE_IDS.includes(id);
}
