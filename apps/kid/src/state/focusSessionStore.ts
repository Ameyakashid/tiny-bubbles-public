/**
 * src/state/focusSessionStore.ts — the single LIVE focus session (IN-MEMORY, NOT
 * persisted) for the adjustable focus intervals feature (#22, `focus-intervals`, M-C3).
 *
 * Created WITHOUT `persist` (like `sessionStore.ts`) — a force-quit mid-session simply
 * drops it, which is anti-shame-fine for a short, self-directed scaffold (never a
 * "loss", never a resume-guilt). No persisted slice ⇒ no migration surface.
 *
 * All time math is wall-clock anchored and delegated to the pure helpers in
 * `src/domain/focus.ts`, and the store NEVER calls `Date.now()` itself — callers pass
 * `now` in (deterministic + unit-testable, matching runProgressStore/gameplay
 * conventions). ZERO RNG: the movement-prompt index rotates deterministically via
 * `nextMovementPrompt`.
 */
import { create } from "zustand";

import { nextMovementPrompt } from "../domain/focus";
import type { EpochMs, FocusSession } from "../domain/types";
import { MOVEMENT_PROMPTS } from "../data/focusBreaks";
import { emitActivity } from "../sync/cloudSync";

export interface FocusSessionStartConfig {
  childId: string;
  focusMinutes: number;
  breakMinutes: number;
  movementBreaks: boolean;
}

export interface FocusSessionStoreState {
  /** the single live session, or null when idle (the UI treats null as `setup`). */
  session: FocusSession | null;
  /** begin a fresh session at the first `focus` block. */
  start: (cfg: FocusSessionStartConfig, now: EpochMs) => void;
  /** a focus block ended → break; blocksCompleted++, rotate the movement prompt. */
  toBreak: (now: EpochMs) => void;
  /** a break ended/skipped → the next focus block. */
  toFocus: (now: EpochMs) => void;
  /** end the session calmly → phase `done` (keeps the neutral block count for the close). */
  finish: () => void;
  /** freeze the current remaining (paused ring holds). */
  pause: (now: EpochMs) => void;
  /** re-anchor `phaseStartedAt` so the remaining continues unchanged (no time lost). */
  resume: (now: EpochMs) => void;
  /** drop the session entirely (backing out / done → Today). */
  stop: () => void;
}

/** Minutes for the phase currently running (0 for `setup`/`done`). */
function phaseMinutes(session: FocusSession): number {
  if (session.phase === "focus") return session.focusMinutes;
  if (session.phase === "break") return session.breakMinutes;
  return 0;
}

export const useFocusSessionStore = create<FocusSessionStoreState>((set, get) => ({
  session: null,

  start: (cfg, now) =>
    set({
      session: {
        childId: cfg.childId,
        phase: "focus",
        phaseStartedAt: now,
        focusMinutes: cfg.focusMinutes,
        breakMinutes: cfg.breakMinutes,
        movementBreaks: cfg.movementBreaks,
        promptIndex: 0,
        blocksCompleted: 0,
        paused: false,
        pausedRemainingMs: undefined,
      },
    }),

  toBreak: (now) => {
    const session = get().session;
    if (!session) return;
    // The first break shows prompt index 0; each subsequent break rotates
    // deterministically to the next prompt (no RNG). blocksCompleted is a neutral
    // count of finished focus blocks (never a target/streak).
    const isFirst = session.blocksCompleted === 0;
    const promptIndex = isFirst
      ? 0
      : nextMovementPrompt(session.promptIndex, MOVEMENT_PROMPTS).nextIndex;
    set({
      session: {
        ...session,
        phase: "break",
        phaseStartedAt: now,
        blocksCompleted: session.blocksCompleted + 1,
        promptIndex,
        paused: false,
        pausedRemainingMs: undefined,
      },
    });
    // One-way-up mirror via the SHARED seam (w1 M1.2 §2.4c): an
    // active-movement focus break mirrors as `movement_break`, a plain rest
    // break as `break_taken`. Counts only; fail-closed no-op unless synced.
    emitActivity(
      session.movementBreaks ? "movement_break" : "break_taken",
      { blocksCompleted: session.blocksCompleted + 1 },
      { cid: session.childId, atMs: now },
    );
  },

  toFocus: (now) => {
    const session = get().session;
    if (!session) return;
    set({
      session: {
        ...session,
        phase: "focus",
        phaseStartedAt: now,
        paused: false,
        pausedRemainingMs: undefined,
      },
    });
  },

  finish: () => {
    const session = get().session;
    if (!session) return;
    set({ session: { ...session, phase: "done", paused: false, pausedRemainingMs: undefined } });
  },

  pause: (now) => {
    const session = get().session;
    if (!session || session.paused) return;
    const remaining = Math.max(0, session.phaseStartedAt + phaseMinutes(session) * 60_000 - now);
    set({ session: { ...session, paused: true, pausedRemainingMs: remaining } });
  },

  resume: (now) => {
    const session = get().session;
    if (!session || !session.paused) return;
    const remaining = session.pausedRemainingMs ?? 0;
    // Re-anchor so `phaseStartedAt + phaseMs - now === remaining` afterwards: the
    // wall-clock recompute stays correct and no time is "lost" (anti-shame §2.2).
    const phaseStartedAt = now - (phaseMinutes(session) * 60_000 - remaining);
    set({ session: { ...session, paused: false, pausedRemainingMs: undefined, phaseStartedAt } });
  },

  stop: () => set({ session: null }),
}));
