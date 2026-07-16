/**
 * bloopBrain.ts — Bloop's deterministic behavior brain. HAND-CRAFTED (Fable), M5.1.
 *
 * This is the character's *personality as code*: a pure, RN-free state machine
 * that turns (events, clock, neuroProfile, mood) into a BehaviorFrame the body
 * (BloopCharacter.tsx) choreographs. Integration target:
 *   packages/shared/src/bloop/bloopBrain.ts   (+ unit tests, RN-free)
 *
 * DESIGN LAWS (non-negotiable, from w7 + anti-shame invariants):
 *  1. NEVER negative. No withering, sulking, guilt, disappointment, sickness.
 *     The lowest-energy Bloop ever gets is "resting" — and resting is cozy, not sad.
 *  2. DETERMINISTIC. Same inputs → same behavior, always. No Math.random anywhere.
 *     "Variety" comes from deterministic rotation (counters, day-of-year, minute-of-day).
 *     An autistic kid must be able to PREDICT their friend. Predictable ≠ boring:
 *     rich reactivity to *the child's own actions* is where aliveness lives.
 *  3. THE CHILD IS THE CAUSE. Bloop reacts to what the kid does (touch, task-done,
 *     approach, idle-return), not to random timers. Agency → parasocial warmth.
 *  4. RESPECT THE PROFILE. neuroProfile 'autism' → gentler amplitudes, longer
 *     anticipation, fewer surprise micro-behaviors, identical daily patterns.
 *     'adhd' → snappier timing, bigger celebration ceilings, more idle play.
 *     Both resolved HERE (the body never branches on profile).
 *  5. TASK-DONE-AND-OFF. Bloop's job is to make finishing feel great and then
 *     settle — never to farm attention. After celebration he gets sleepy-content,
 *     not "play with me more".
 */

import type { CompanionMood } from "../domain/types"; // positive-only union (v1)

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export type NeuroProfile = "autism" | "adhd" | "balanced";

/** Events the kid app feeds the brain. All child-caused or clock-caused. */
export type BloopEvent =
  | { kind: "appOpen"; msSinceLastSeen: number }
  | { kind: "stepDone"; stepsDoneToday: number }
  | { kind: "routineComplete"; daypart: "morning" | "afternoon" | "evening" | "night" }
  | { kind: "tokenEarned"; newBalance: number }
  | { kind: "poke"; region: BloopRegion }        // single tap on a body region
  | { kind: "tickle"; pokesInWindow: number }     // >=3 pokes within ~2.5s
  | { kind: "pet"; strokeMs: number }             // slow drag across the body
  | { kind: "dragStart" } | { kind: "dragEnd"; flungVelocity: number }
  | { kind: "kidSpoke" }                          // chat layer visible activity
  | { kind: "calmEntered" } | { kind: "calmExited" }
  | { kind: "idleTick"; idleMs: number }          // fired by the body every ~4s idle
  | { kind: "quietHours" };

export type BloopRegion = "body" | "cheekL" | "cheekR" | "crown" | "eyes";

export interface BrainInputs {
  nowMs: number;                 // wall clock (passed in — testable, deterministic)
  minuteOfDay: number;           // 0..1439 local
  dayOfYear: number;             // 1..366 — the deterministic "variety" seed
  neuroProfile: NeuroProfile;
  lowStim: boolean;              // sensory clamp — wins over everything
  reducedMotion: boolean;
  mood: CompanionMood;           // from v1 companionMood.ts (positive-only)
  bondLevel: number;             // 0..N monotonic (never decreases)
}

// ---------------------------------------------------------------------------
// Output — one BehaviorFrame the body choreographs
// ---------------------------------------------------------------------------

/** Named performances the body knows how to play. Each maps to a reanimated
 *  choreography; every one resolves back to `idle`. NONE are negative. */
export type Performance =
  | "idle"            // breathe + blink + occasional gaze wander
  | "greetSmall"      // seen you <4h ago: perk up, tiny bounce, soft blink
  | "greetBig"        // been a while: double-bounce + sparkle + happy squint
  | "cheer"           // step done: quick hop, cheeks up
  | "danceRoutine"    // routine complete: the big dance (bounce x3 + spin-wiggle)
  | "tokenCatch"      // token earned: looks up, "catches" it, satisfied wiggle
  | "squishPop"       // poked: squash toward the poke point, springy pop back
  | "giggleWobble"    // tickled: rapid tiny wobbles + closed-eye grin
  | "purrLean"        // petted: slow lean into the stroke, eyes soften
  | "dangleFloat"     // dragged: relaxed jelly dangle; flung → gentle drift back
  | "listenTilt"      // kid speaking/typing: head tilt toward, attentive blink
  | "breatheGuide"    // calm corner: inflate/deflate paced with the session
  | "stretchYawn"     // idle micro-behavior (rotation slot A)
  | "lookAround"      // idle micro-behavior (slot B)
  | "chaseBubble"     // idle micro-behavior (slot C — eyes track a drifting bubble)
  | "snooze"          // quiet hours / long idle: settles, slow breath, zzz bubbles
  | "restProud";      // post-celebration settle: content, slightly puffed chest

export interface BehaviorFrame {
  performance: Performance;
  /** 0..1 master intensity — profile/sensory-resolved. Body multiplies all
   *  amplitudes/duration-scales by this. lowStim clamps ≤ 0.35. */
  intensity: number;
  /** ms the performance should run before auto-resolving to idle. */
  holdMs: number;
  /** Where the eyes look: null = wander per idle rules; 'touch' = at the last
   *  touch point; 'up' = token arc; 'kid' = straight out at the child. */
  gaze: "wander" | "touch" | "up" | "kid" | null;
  /** Mouth curve target -1..1 (we only use 0..1 — law #1). */
  mouth: number;
  /** Cheek blush 0..1 (tickle/pet warmth). */
  blush: number;
  /** Ambient bubbles/min around Bloop (0 in lowStim/reducedMotion). */
  ambientBubbles: number;
  /** Optional short TTS-able quip key (resolved via i18n catalog; the body
   *  speaks it only if spokenLabels are on). Deterministic rotation. */
  quipKey: string | null;
}

// ---------------------------------------------------------------------------
// Deterministic "variety": rotate through options by stable counters — never RNG.
// ---------------------------------------------------------------------------

const IDLE_ROTATION: Performance[] = ["stretchYawn", "lookAround", "chaseBubble"];

/** Deterministic pick: same (seed, len) → same index. FNV-ish fold, no RNG. */
export function rotIndex(seed: number, len: number): number {
  let h = (seed ^ 2166136261) >>> 0;
  h = Math.imul(h, 16777619) >>> 0;
  return h % len;
}

/** Quip pools are keys into the i18n catalog (copy runs the evidence-honesty
 *  gate). Rotation by stepsDoneToday/dayOfYear keeps it fresh but replayable. */
const QUIP_POOLS = {
  cheer: ["bloop.cheer.1", "bloop.cheer.2", "bloop.cheer.3", "bloop.cheer.4"],
  dance: ["bloop.dance.1", "bloop.dance.2", "bloop.dance.3"],
  greet: ["bloop.greet.1", "bloop.greet.2", "bloop.greet.3"],
  tickle: ["bloop.tickle.1", "bloop.tickle.2"],
} as const;

// ---------------------------------------------------------------------------
// Profile resolution — the ONLY place neuroProfile shapes behavior.
// ---------------------------------------------------------------------------

interface ProfileTuning {
  intensityCeil: number;   // max intensity ever
  snap: number;            // timing multiplier (<1 = snappier)
  idleEveryMs: number;     // how often idle micro-behaviors may fire
  idleRepertoire: number;  // how many idle slots are in rotation
  anticipationMs: number;  // pre-performance wind-up (autism: longer = readable)
}

function tuning(p: NeuroProfile): ProfileTuning {
  switch (p) {
    case "autism":
      // Calm, readable, consistent: fewer surprises, longer wind-ups, and the
      // SAME two idle behaviors in the same order every day.
      return { intensityCeil: 0.65, snap: 1.25, idleEveryMs: 45000, idleRepertoire: 2, anticipationMs: 450 };
    case "adhd":
      // Lively and quick — but still deterministic and never louder than 'full'.
      return { intensityCeil: 1.0, snap: 0.85, idleEveryMs: 20000, idleRepertoire: 3, anticipationMs: 200 };
    default:
      return { intensityCeil: 0.85, snap: 1.0, idleEveryMs: 30000, idleRepertoire: 3, anticipationMs: 300 };
  }
}

// ---------------------------------------------------------------------------
// The brain
// ---------------------------------------------------------------------------

const IDLE_FRAME = (i: BrainInputs, t: ProfileTuning): BehaviorFrame => ({
  performance: "idle",
  intensity: clamp(0.5, i, t),
  holdMs: 0,
  gaze: "wander",
  mouth: i.mood === "content" ? 0.25 : 0.45,
  blush: 0,
  ambientBubbles: i.lowStim || i.reducedMotion ? 0 : i.neuroProfile === "adhd" ? 4 : 2,
  quipKey: null,
});

function clamp(base: number, i: BrainInputs, t: ProfileTuning): number {
  let v = Math.min(base, t.intensityCeil);
  if (i.lowStim) v = Math.min(v, 0.35);
  if (i.reducedMotion) v = Math.min(v, 0.3);
  return v;
}

export function nextBehavior(ev: BloopEvent, i: BrainInputs): BehaviorFrame {
  const t = tuning(i.neuroProfile);
  const idle = IDLE_FRAME(i, t);
  const hold = (ms: number) => Math.round(ms * t.snap);

  switch (ev.kind) {
    case "appOpen": {
      const big = ev.msSinceLastSeen > 4 * 3600_000;
      return {
        ...idle,
        performance: big ? "greetBig" : "greetSmall",
        intensity: clamp(big ? 0.9 : 0.6, i, t),
        holdMs: hold(big ? 1800 : 900),
        gaze: "kid",
        mouth: 0.85,
        quipKey: QUIP_POOLS.greet[rotIndex(i.dayOfYear, QUIP_POOLS.greet.length)],
      };
    }
    case "stepDone":
      return {
        ...idle,
        performance: "cheer",
        intensity: clamp(0.8, i, t),
        holdMs: hold(1100),
        gaze: "kid",
        mouth: 1,
        quipKey: QUIP_POOLS.cheer[rotIndex(ev.stepsDoneToday, QUIP_POOLS.cheer.length)],
      };
    case "routineComplete":
      return {
        ...idle,
        performance: "danceRoutine",
        intensity: clamp(1, i, t),
        holdMs: hold(2600),
        gaze: "kid",
        mouth: 1,
        blush: 0.5,
        quipKey: QUIP_POOLS.dance[rotIndex(i.dayOfYear + ev.daypart.length, QUIP_POOLS.dance.length)],
      };
    case "tokenEarned":
      return { ...idle, performance: "tokenCatch", intensity: clamp(0.7, i, t), holdMs: hold(900), gaze: "up", mouth: 0.9, quipKey: null };
    case "poke":
      return { ...idle, performance: "squishPop", intensity: clamp(0.75, i, t), holdMs: hold(500), gaze: "touch", mouth: 0.7, quipKey: null };
    case "tickle":
      return {
        ...idle,
        performance: "giggleWobble",
        intensity: clamp(0.9, i, t),
        holdMs: hold(Math.min(1600, 600 + ev.pokesInWindow * 180)),
        gaze: "touch",
        mouth: 1,
        blush: 0.8,
        quipKey: QUIP_POOLS.tickle[rotIndex(ev.pokesInWindow, QUIP_POOLS.tickle.length)],
      };
    case "pet":
      return { ...idle, performance: "purrLean", intensity: clamp(0.5, i, t), holdMs: hold(Math.min(2400, ev.strokeMs + 700)), gaze: "kid", mouth: 0.8, blush: 0.6, quipKey: null };
    case "dragStart":
      return { ...idle, performance: "dangleFloat", intensity: clamp(0.6, i, t), holdMs: 0 /* until dragEnd */, gaze: "kid", mouth: 0.6, quipKey: null };
    case "dragEnd":
      return { ...idle, performance: "idle", holdMs: hold(400 + Math.min(600, Math.abs(ev.flungVelocity) / 8)), gaze: "wander", mouth: 0.5, intensity: clamp(0.5, i, t), quipKey: null };
    case "kidSpoke":
      return { ...idle, performance: "listenTilt", intensity: clamp(0.45, i, t), holdMs: hold(1200), gaze: "kid", mouth: 0.4, quipKey: null };
    case "calmEntered":
      return { ...idle, performance: "breatheGuide", intensity: clamp(0.4, i, t), holdMs: 0 /* until calmExited */, gaze: "kid", mouth: 0.3, ambientBubbles: 0, quipKey: null };
    case "calmExited":
      return idle;
    case "quietHours":
      return { ...idle, performance: "snooze", intensity: clamp(0.3, i, t), holdMs: 0, gaze: null, mouth: 0.2, ambientBubbles: 0, quipKey: null };
    case "idleTick": {
      if (ev.idleMs < t.idleEveryMs) return idle;
      // Deterministic idle micro-behavior: rotate by (minuteOfDay / cadence).
      const slot = rotIndex(i.dayOfYear + Math.floor(i.minuteOfDay / Math.max(1, t.idleEveryMs / 60000)), t.idleRepertoire);
      const perf = IDLE_ROTATION[slot % IDLE_ROTATION.length];
      // Very long idle (>6 min) → cozy snooze rather than attention-seeking.
      if (ev.idleMs > 360_000) return { ...idle, performance: "snooze", intensity: clamp(0.3, i, t), gaze: null, mouth: 0.2, ambientBubbles: 0 };
      return { ...idle, performance: perf, intensity: clamp(0.55, i, t), holdMs: hold(1400), gaze: perf === "chaseBubble" ? "up" : "wander" };
    }
  }
}

/** Post-celebration settle: called by the body when danceRoutine finishes.
 *  Law #5 — proud rest, never "more!". */
export function settleAfterCelebration(i: BrainInputs): BehaviorFrame {
  const t = tuning(i.neuroProfile);
  return { ...IDLE_FRAME(i, t), performance: "restProud", intensity: clamp(0.4, i, t), holdMs: 2200, gaze: "kid", mouth: 0.7 };
}
