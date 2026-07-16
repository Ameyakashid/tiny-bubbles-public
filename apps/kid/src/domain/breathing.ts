/**
 * src/domain/breathing.ts — the calm breathing / regulation mini-game domain
 * (feature `breathing-regulation`, M-C2). Pure, RN-free, unit-testable.
 *
 * A CURATED table of kid-framed breathing patterns (never free-form — curated
 * autonomy) + DETERMINISTIC phase math. `breathPhaseAt` powers BOTH the animated
 * bubble scale AND the Reduce-Motion stepped label, so the two can never drift
 * apart; `growStage` drives the "stay-calm-to-grow" garden purely from elapsed
 * time on the activity (completed cycles) — NEVER from any reading of the child's
 * body or state. There is NO hardware, NO body signal, NO efficacy/health claim.
 *
 * Zero AI: the pattern is chosen by the parent / older child from this fixed,
 * hand-authored list; the app never proposes or picks one for the child. No RNG.
 */
import type { AgeMode, VisualLabel } from "./types";

/** One kid-framed breathing pattern (curated; NOT free-form — curated autonomy). */
export interface BreathPattern {
  /** stable id: 'bubble' | 'box' | 'calm46' */
  id: string;
  /** spokenLabel REQUIRED (non-reader support) + emoji */
  label: VisualLabel;
  /** > 0 */
  inhaleMs: number;
  /** >= 0 (young default uses 0 — holds are hard for little kids) */
  holdMs: number;
  /** > 0 */
  exhaleMs: number;
  /** >= 0 */
  holdOutMs: number;
  /** grow stages / "N breaths" for one full set (e.g. 4–6) */
  cyclesTarget: number;
  /** which age bands this pattern is offered to */
  suggestedAgeModes: AgeMode[];
}

export type BreathPhase = "inhale" | "hold" | "exhale" | "holdOut";

/** The resolved phase state at a given elapsed time. */
export interface BreathPhaseState {
  phase: BreathPhase;
  /** 0..1 within the current phase */
  phaseProgress: number;
  /** how many FULL cycles have completed */
  cycleIndex: number;
  /** 0..1 bubble size (inhale 0->1, hold 1, exhale 1->0, holdOut 0) */
  scale: number;
}

// ---------------------------------------------------------------------------
// The curated set (3). Young default = 'bubble'; older/preteen pick among all.
// Contents per breathing-regulation §4 CREATE #1.
// ---------------------------------------------------------------------------
export const BREATH_PATTERNS: BreathPattern[] = [
  {
    id: "bubble",
    label: { spokenLabel: "Bubble breath", text: "Bubble breath", emoji: "🫧", color: "#5BC8F5" },
    inhaleMs: 4000,
    holdMs: 0,
    exhaleMs: 4000,
    holdOutMs: 0,
    cyclesTarget: 5,
    suggestedAgeModes: ["young", "older"],
  },
  {
    id: "box",
    label: { spokenLabel: "Box breath", text: "Box breath", emoji: "⬜", color: "#7BD389" },
    inhaleMs: 4000,
    holdMs: 4000,
    exhaleMs: 4000,
    holdOutMs: 4000,
    cyclesTarget: 4,
    suggestedAgeModes: ["older"],
  },
  {
    id: "calm46",
    label: { spokenLabel: "Calm four-six", text: "Calm 4-6", emoji: "🌙", color: "#9D8DF1" },
    inhaleMs: 4000,
    holdMs: 0,
    exhaleMs: 6000,
    holdOutMs: 0,
    cyclesTarget: 5,
    suggestedAgeModes: ["older"],
  },
];

export const BREATH_PATTERNS_BY_ID: Record<string, BreathPattern> = Object.fromEntries(
  BREATH_PATTERNS.map((p) => [p.id, p]),
);

/** Look up a curated pattern by id (undefined for an unknown/removed id). */
export function getBreathPattern(id: string | undefined): BreathPattern | undefined {
  if (id == null) return undefined;
  return BREATH_PATTERNS_BY_ID[id];
}

/**
 * Age-resolved DEFAULT pattern id (young -> 'bubble', older/preteen -> 'calm46').
 * Overridable via `ChildSettings.breathingPatternId`.
 */
export function defaultBreathPatternId(ageMode: AgeMode): string {
  return ageMode === "young" ? "bubble" : "calm46";
}

/**
 * The curated list of patterns offered to a given age band. Young gets the single
 * default (no chooser); older/preteen get the full curated set. A preteen inherits
 * the `older`-suggested patterns (no separate preteen list — same voice).
 */
export function breathPatternsFor(ageMode: AgeMode): BreathPattern[] {
  if (ageMode === "young") {
    return BREATH_PATTERNS.filter((p) => p.suggestedAgeModes.includes("young"));
  }
  // older + preteen: every pattern suggested for `older` (or explicitly for the band)
  return BREATH_PATTERNS.filter(
    (p) => p.suggestedAgeModes.includes("older") || p.suggestedAgeModes.includes(ageMode),
  );
}

// ---------------------------------------------------------------------------
// Deterministic phase math. Guards: non-finite/negative durations coerce to a
// safe floor; inhale/exhale are always positive; holds clamp to >= 0.
// ---------------------------------------------------------------------------

/** Minimum inhale/exhale duration so a pattern always has a positive cycle. */
const MIN_ACTIVE_MS = 1;

function safeActive(ms: number): number {
  return Number.isFinite(ms) && ms > 0 ? ms : MIN_ACTIVE_MS;
}
function safeHold(ms: number): number {
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
}

/** The four coerced, safe phase durations for a pattern. */
function phaseDurations(p: BreathPattern): {
  inhale: number;
  hold: number;
  exhale: number;
  holdOut: number;
} {
  return {
    inhale: safeActive(p.inhaleMs),
    hold: safeHold(p.holdMs),
    exhale: safeActive(p.exhaleMs),
    holdOut: safeHold(p.holdOutMs),
  };
}

/** Total ms for one cycle of a pattern (always > 0). */
export function cycleMs(p: BreathPattern): number {
  const d = phaseDurations(p);
  return d.inhale + d.hold + d.exhale + d.holdOut;
}

/** Fraction within a phase; a zero-length phase reports progress 0 (never NaN). */
function frac(elapsedInPhase: number, phaseMs: number): number {
  if (phaseMs <= 0) return 0;
  const f = elapsedInPhase / phaseMs;
  return f < 0 ? 0 : f > 1 ? 1 : f;
}

/**
 * DETERMINISTIC phase state at a given elapsed time (ms since the set started).
 * Pure — powers BOTH the animation and the Reduce-Motion stepped label, so they
 * can never drift. A negative/NaN elapsed is treated as 0.
 */
export function breathPhaseAt(p: BreathPattern, elapsedMs: number): BreathPhaseState {
  const d = phaseDurations(p);
  const cycle = d.inhale + d.hold + d.exhale + d.holdOut;
  const elapsed = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0;

  const cycleIndex = Math.floor(elapsed / cycle);
  const within = elapsed - cycleIndex * cycle;

  // inhale [0, inhale)
  if (within < d.inhale) {
    const phaseProgress = frac(within, d.inhale);
    return { phase: "inhale", phaseProgress, cycleIndex, scale: phaseProgress };
  }
  // hold [inhale, inhale+hold)
  if (within < d.inhale + d.hold) {
    const phaseProgress = frac(within - d.inhale, d.hold);
    return { phase: "hold", phaseProgress, cycleIndex, scale: 1 };
  }
  // exhale [inhale+hold, inhale+hold+exhale)
  if (within < d.inhale + d.hold + d.exhale) {
    const phaseProgress = frac(within - d.inhale - d.hold, d.exhale);
    return { phase: "exhale", phaseProgress, cycleIndex, scale: 1 - phaseProgress };
  }
  // holdOut [inhale+hold+exhale, cycle)
  const phaseProgress = frac(within - d.inhale - d.hold - d.exhale, d.holdOut);
  return { phase: "holdOut", phaseProgress, cycleIndex, scale: 0 };
}

/**
 * Completed cycles clamped to `cyclesTarget` (drives the grow stage 0..target).
 * The garden grows purely on elapsed time on the activity — never on any reading
 * of the child's calm — and rests "full for now" at the target.
 */
export function growStage(p: BreathPattern, elapsedMs: number): number {
  const target = Number.isFinite(p.cyclesTarget) && p.cyclesTarget > 0 ? Math.floor(p.cyclesTarget) : 1;
  const completed = breathPhaseAt(p, elapsedMs).cycleIndex;
  return Math.min(target, Math.max(0, completed));
}
