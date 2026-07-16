/**
 * components/buddy/buddyVisuals.ts — pure visual mapping for <BubbleBuddy>.
 *
 * Keeping the mood->pose, growth->visual, and art-variant presets in a PURE
 * module (no React / no react-native / no Reanimated imports) means the
 * anti-shame invariants are unit-testable: every mood yields an UPWARD mouth
 * (a smile is never < 0 — there is no frown), eyes are never fully shut except
 * in the restful `sleepy` state, and growth is MONOTONIC in the stage.
 *
 * This is the re-authored replacement for the donor sprites' per-state shape
 * tables (lockin ScannerSprite/ExecutionSprite) with EVERY shame state removed:
 * no irate eyes, no mocking phases, no tears, no insults — the union the table
 * switches over (`CompanionMood`) is positive-only by construction.
 */
import { MAX_GROWTH_STAGE } from "../../src/domain/companionMood";
import type { CompanionMood } from "../../src/domain/types";
import type { BuddyArtVariant } from "../../src/theme/resolveContent";

/** A finish (surface treatment) for the bubble body (doc 61 §6.2). */
export type BuddyFinish = "plain" | "sparkle" | "glass" | "galaxy";

export const BUDDY_FINISHES: readonly BuddyFinish[] = [
  "plain",
  "sparkle",
  "glass",
  "galaxy",
] as const;

export function isBuddyFinish(v: unknown): v is BuddyFinish {
  return typeof v === "string" && (BUDDY_FINISHES as readonly string[]).includes(v);
}

// ---------------------------------------------------------------------------
// Art-variant presets — "Bloop" (cuddly) / "Orbit" (cool) / "Nova" (avatar).
// Selected by the resolved `buddy.artVariant` key (driven by companionStyle,
// NEVER ageMode). Nova is the sleekest, least-expressive identity companion.
// ---------------------------------------------------------------------------

export interface VariantPreset {
  /** body aspect: 1 = perfectly round (Bloop); >1 = slightly taller/sleeker orb (Orbit/Nova). */
  bodyStretch: number;
  /** eye radius as a fraction of the 200x200 viewBox (Bloop = large/cuddly). */
  eyeScale: number;
  /** soft blush cheeks — young/cuddly only (doc 61 §6.4). */
  cheeks: boolean;
  /** expression exaggeration (young needs unambiguous cues; older/preteen subtler). */
  expressiveness: number;
  /**
   * NEW (aging-up §3.4): a subtle orbital "identity ring" so the avatar reads as
   * a signature, not a pet to nurture. Static flourish (renders under
   * reduced-motion too). Absent/false for the pet variants.
   */
  identityRing?: boolean;
}

export const VARIANT_PRESETS: Record<BuddyArtVariant, VariantPreset> = {
  bloop: { bodyStretch: 1.0, eyeScale: 1.0, cheeks: true, expressiveness: 1.0 },
  orbit: { bodyStretch: 1.08, eyeScale: 0.78, cheeks: false, expressiveness: 0.72 },
  nova: { bodyStretch: 1.14, eyeScale: 0.6, cheeks: false, expressiveness: 0.5, identityRing: true },
};

// ---------------------------------------------------------------------------
// Mood -> pose. Every field is positive/neutral/restful. `smile` is the single
// animatable emotion number the mouth curve reads; it is NEVER negative.
// ---------------------------------------------------------------------------

export interface BuddyPose {
  /** mouth curve: 0 = soft neutral, 1 = big beaming smile. NEVER < 0 (no frown). */
  smile: number;
  /** eyelid openness: 0 = shut (only in restful sleepy), 1 = wide. */
  eyeOpen: number;
  /** idle vertical bob amplitude (px in the 200-box). */
  bob: number;
  /** breathe scale delta (e.g. 0.04 => squash/stretch ±4%). */
  breathe: number;
  /** resting head tilt (deg) — curious/sleepy lean. */
  tilt: number;
  /** body puff scale at rest (proud puff-up). */
  puff: number;
  /** trigger an entry jump (celebrating / excited). */
  jump: boolean;
  /** drifting sleepy "z" (resting, never sick). */
  drowsy: boolean;
  /** decorative sparkles near the buddy (positive moods only). */
  sparkles: number;
  /** gaze behavior: random saccades (idle) vs a fixed soft gaze. */
  gaze: "saccade" | "up" | "down" | "rest";
}

/**
 * The mood rule table. Switches over the canonical POSITIVE `CompanionMood`
 * union, so it is exhaustive and can never name a shame state.
 */
export function buddyPose(mood: CompanionMood): BuddyPose {
  switch (mood) {
    case "content":
      return { smile: 0.45, eyeOpen: 1, bob: 6, breathe: 0.035, tilt: 0, puff: 1, jump: false, drowsy: false, sparkles: 0, gaze: "saccade" };
    case "happy":
      return { smile: 0.8, eyeOpen: 0.82, bob: 8, breathe: 0.045, tilt: 0, puff: 1.02, jump: false, drowsy: false, sparkles: 1, gaze: "saccade" };
    case "excited":
      return { smile: 0.95, eyeOpen: 1, bob: 12, breathe: 0.05, tilt: 0, puff: 1.03, jump: true, drowsy: false, sparkles: 2, gaze: "up" };
    case "celebrating":
      return { smile: 1, eyeOpen: 0.88, bob: 11, breathe: 0.05, tilt: 0, puff: 1.04, jump: true, drowsy: false, sparkles: 3, gaze: "up" };
    case "proud":
      return { smile: 0.7, eyeOpen: 0.8, bob: 6, breathe: 0.04, tilt: 0, puff: 1.08, jump: false, drowsy: false, sparkles: 1, gaze: "up" };
    case "curious":
      return { smile: 0.5, eyeOpen: 1, bob: 5, breathe: 0.035, tilt: 7, puff: 1, jump: false, drowsy: false, sparkles: 0, gaze: "down" };
    case "sleepy":
      return { smile: 0.3, eyeOpen: 0.16, bob: 3, breathe: 0.025, tilt: 4, puff: 0.99, jump: false, drowsy: true, sparkles: 0, gaze: "rest" };
  }
}

// ---------------------------------------------------------------------------
// Growth-stage visual — a RENDERED, monotonic body change driven by the
// monotonic `growthStage` (doc 66 M6: "earning visibly advances the buddy").
// ---------------------------------------------------------------------------

export interface GrowthVisual {
  /** overall body scale — strictly increases with stage (the visible growth). */
  bodyScale: number;
  /** orbiting satellite bubbles (0..MAX) — a growing flourish. */
  satellites: number;
  /** a soft growth halo appears at the later stages. */
  halo: boolean;
}

export function growthVisual(growthStage: number): GrowthVisual {
  const stage = Math.max(0, Math.min(MAX_GROWTH_STAGE, Math.floor(growthStage || 0)));
  return {
    bodyScale: 1 + stage * 0.07, // 1.00 (egg) .. 1.35 (fully grown)
    satellites: stage, // 0 .. MAX little orbiting bubbles
    halo: stage >= 3,
  };
}
