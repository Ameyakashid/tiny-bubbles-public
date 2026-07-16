/**
 * src/state/gameplay.ts — cross-store orchestration for the core loop.
 *
 * The stores each own one slice; the player-facing ACTIONS that touch several
 * slices live here so the wiring is in one place and the stores stay focused:
 *   - `createChildWithSeed` — create a child + apply the starter seed packs.
 *   - `completeStep`        — the core loop: record tokens/progress/reinforcement
 *                             (childStore), mark the task done (taskStore),
 *                             advance the persisted run (runProgressStore), and
 *                             drive the companion mood + monotonic nurture
 *                             (buddyStore). Base token ALWAYS paid; celebration
 *                             SIZE is decided by resolveCelebration in the UI
 *                             (M7), never reduced by reinforcement phase here.
 *   - redemption flow       — escrow request/approve/decline coordinating the
 *                             pure tokens.ts math with childStore's ledger.
 */
import { getCosmetic } from "../data/buddyCosmetics";
import { getQuestPool } from "../data/questPool";
import { freshSeedState, seedChild, taskFromTemplate } from "../data/seed";
import { getTaskTemplate } from "../data/taskTemplates";
import {
  choreTaskFor,
  currentHolderId,
  isChoreActive,
  isChoreScheduledToday,
} from "../domain/chores";
import { isoDay, isoWeekKey } from "../domain/dates";
import { FEATURED_DAYPART_BONUS, isFeaturedDaypart } from "../domain/novelty";
import {
  activeQuestsFor,
  QUEST_BOARD_SIZE,
  type QuestClaim,
  type QuestSignal,
} from "../domain/quests";
import {
  availableBalance,
  latestEarnFor,
  spend,
  undoEarn,
} from "../domain/gamification";
import { reconcileStreakRest } from "../domain/streaks";
import { routineDaypartOf } from "../domain/tasks";
import {
  approveRedemption,
  cancelRedemption,
  declineRedemption,
  requestRedemption,
  reverseRedemption as reverseRedemptionTx,
  type DecisionResult,
  type RequestRedemptionResult,
} from "../domain/tokens";
import type { CompanionEvent } from "../domain/companionMood";
import type {
  Daypart,
  RotationCadence,
  SharedChore,
  Task,
  TaskSchedule,
  VerificationMode,
  VisualLabel,
} from "../domain/types";
import { deletePhoto } from "../services/photoVerify";
import { isFeatureUnlocked } from "../services/entitlements";
import { emitActivity } from "../sync/cloudSync";

import { useBuddyStore } from "./buddyStore";
import { type CreateChildInput, useChildStore } from "./childStore";
import { useChoreStore } from "./choreStore";
import { newId, now } from "./ids";
import { usePlanStore } from "./planStore";
import { useQuestStore } from "./questStore";
import { useRewardStore } from "./rewardStore";
import { useRunProgressStore } from "./runProgressStore";
import { useSessionStore } from "./sessionStore";
import { useSettingsStore } from "./settingsStore";
import { useSyncStore } from "./syncStore";
import { useTaskStore } from "./taskStore";

/** Create a child and apply the starter seed (routines, rewards, companion). */
export function createChildWithSeed(input: CreateChildInput): string {
  const child = useChildStore.getState();
  const cid = child.createChild(input);
  const profile = useChildStore.getState().profiles[cid];
  if (!profile) return cid;

  const seeded = seedChild({
    childId: cid,
    ageMode: profile.ageMode,
    companionStyle: profile.settings.companionStyle,
    now: now(),
    newId,
  });

  useTaskStore.getState().setChildContent(cid, seeded.routines, seeded.tasks);
  useRewardStore.getState().setRewards(cid, seeded.rewards);
  useBuddyStore.getState().setCompanion(cid, seeded.companion);

  const c = useChildStore.getState();
  c.applyBasePacks();
  c.markChildSeeded(cid);

  const settings = useSettingsStore.getState();
  settings.setActiveChild(cid);
  settings.markFirstChildCreated();

  return cid;
}

// ---------------------------------------------------------------------------
// Novelty-refresh: rotating quests + deterministic spotlight magnitude (M-C4).
// Pure-math rotation (src/domain/quests + novelty) is wired to the persisted
// questStore here; the store returns QuestClaim[] and gameplay GRANTS them
// (tokens + owned-forever cosmetic) so the store stays single-purpose. ZERO RNG:
// the active set is a deterministic ISO-week hash window; the spotlight is a pure
// day-of-year function. calmMode / questsEnabled:false suppress the WHOLE layer.
// ---------------------------------------------------------------------------

/** Whether the novelty layer is suppressed for a child (calm path / quests off). */
function questsSuppressed(cid: string): boolean {
  const settings = useChildStore.getState().profiles[cid]?.settings;
  if (!settings) return true;
  if (settings.calmMode) return true;
  // Absent ⇒ default to `!calmMode` (novelty §3.3); here calmMode is already false.
  return settings.questsEnabled === false;
}

/** Grant each auto-claimed quest's deterministic reward (bubbles + optional cosmetic). */
function grantQuestClaims(cid: string, claims: QuestClaim[]): void {
  if (claims.length === 0) return;
  const buddy = useBuddyStore.getState();
  for (const claim of claims) {
    if (claim.rewardTokens > 0) {
      // Deterministic quest bubbles — reason "quest_reward" (novelty §3.1/§4.2).
      useChildStore.getState().giftTokens(cid, claim.rewardTokens, "Quest reward", "quest_reward");
    }
    if (claim.rewardCosmeticId) {
      const companion = buddy.companions[cid];
      if (companion && !companion.unlockedItems.includes(claim.rewardCosmeticId)) {
        buddy.unlockCosmetic(cid, claim.rewardCosmeticId);
        buddy.applyEvent(cid, "collectible"); // positive "new treasure!" mood
      }
    }
  }
}

/**
 * Deterministically rotate this child's weekly quest board (idempotent within the
 * ISO week). Builds the age/premium-appropriate active set via `activeQuestsFor`
 * and hands it to `questStore.ensureRotation`. No-op when the novelty layer is
 * suppressed. Called on `reconcileChild` (app-open / switch) and when the board mounts.
 */
export function rotateQuests(cid: string): void {
  if (questsSuppressed(cid)) return;
  const child = useChildStore.getState();
  const profile = child.profiles[cid];
  if (!profile) return;
  const ts = now();
  const weekKey = isoWeekKey(ts, profile.timeZone);
  const premium = isFeatureUnlocked("noveltyPipeline", useSettingsStore.getState().entitlement, ts);
  // young single-card mode draws from the simplest goal kinds (novelty §2.1).
  const simpleOnly = profile.ageMode === "young";
  const pool = getQuestPool({ premium, simpleOnly });
  const defs = activeQuestsFor(weekKey, pool, QUEST_BOARD_SIZE);
  useQuestStore.getState().ensureRotation(cid, weekKey, defs);
}

/**
 * Feed a durable signal to the child's quest board, granting any auto-claimed
 * rewards. Suppressed on the calm path. Ensures rotation first so the current
 * week's board exists (idempotent). Exported so non-loop surfaces (buddy restyle,
 * calm visit) can advance their matching quests.
 */
export function emitQuestSignal(cid: string, signal: QuestSignal): QuestClaim[] {
  if (questsSuppressed(cid)) return [];
  rotateQuests(cid); // idempotent within the week
  const claims = useQuestStore.getState().onSignal(cid, signal);
  grantQuestClaims(cid, claims);
  return claims;
}

export interface CompleteStepResult {
  tokensAwarded: number;
  bonus: boolean;
  bonusTokens: number;
  lifetimeEarned: number;
  leveledUp: boolean;
  /**
   * True when the just-completed routine was today's DETERMINISTIC "spotlight"
   * daypart (novelty §2.2). The runner steps the routine-complete celebration UP
   * one level for a spotlight completion (magnitude variety, never a chance drop).
   */
  spotlight: boolean;
}

/**
 * The core loop step (doc 66 M7 brain). Records the completion across stores.
 * Returns the token/level deltas the UI uses to drive the celebration; returns
 * null if the child/task data is missing.
 */
export function completeStep(
  cid: string,
  task: Task,
  opts?: { isRoutineComplete?: boolean },
): CompleteStepResult | null {
  const result = useChildStore.getState().recordCompletion(cid, task);
  if (!result) return null;

  useTaskStore.getState().setTaskStatus(cid, task.id, "done");
  useRunProgressStore.getState().markStepResolved(cid, task.id);

  const event: CompanionEvent = opts?.isRoutineComplete ? "routineComplete" : "stepDone";
  const buddy = useBuddyStore.getState();
  buddy.applyEvent(cid, event);
  const leveledUp = buddy.nurture(cid, result.lifetimeEarned);

  // Rotating-chore provenance (multi-child §3.5/§6): a `perCompletion` chore advances
  // its holder pointer when THIS holder finishes it — so the next materialisation
  // hands it to the next sibling. Time-based cadences (daily/weekly) advance on the
  // clock instead, so a child never gets "stuck" holding one as a penalty. Purely a
  // pointer bump — it NEVER alters this child's tokens/streak/companion (anti-shame).
  if (task.choreId) {
    const chore = useChoreStore.getState().chores.find((ch) => ch.id === task.choreId);
    if (chore && chore.cadence === "perCompletion") {
      useChoreStore.getState().advanceChore(chore.id);
    }
  }

  // Novelty-refresh (M-C4): advance the rotating quest board + apply the
  // deterministic daypart "spotlight" magnitude. Suppressed on the calm path.
  let spotlight = false;
  if (!questsSuppressed(cid)) {
    // Every completed step is a "popped bubble" (delta 1).
    emitQuestSignal(cid, { kind: "popBubbles", delta: 1 });

    if (opts?.isRoutineComplete && task.routineId) {
      const profile = useChildStore.getState().profiles[cid];
      const routine = (useTaskStore.getState().routines[cid] ?? []).find(
        (r) => r.id === task.routineId,
      );
      if (profile && routine) {
        const dp = routineDaypartOf(routine);
        // Quest: a completed daypart routine (with its daypart for filtered quests).
        emitQuestSignal(cid, { kind: "completeDaypart", delta: 1, daypart: dp });
        // Spotlight: today's featured daypart pays a fixed extra bonus + steps the
        // celebration up (a pure day-of-year function — never Math.random).
        if (isFeaturedDaypart(dp, now(), profile.timeZone)) {
          useChildStore
            .getState()
            .giftTokens(cid, FEATURED_DAYPART_BONUS, "Spotlight bonus", "quest_reward");
          spotlight = true;
        }
      }
    }
  }

  // One-way-up activity mirror (w1 M1.2 §2.4): route through the SHARED
  // emitActivity seam — a fail-closed NO-OP unless cloudSyncEnabled + paired
  // (default off). Counts only; never free text. w5's completeScheduleStep
  // (M4.2) emits `schedule_step_done` and w4's first-then flow (M4.1) emits
  // `firstthen_done` through this same seam.
  emitActivity("step_done", { tokens: result.entry.delta }, { cid });
  if (opts?.isRoutineComplete) emitActivity("routine_complete", { spotlight }, { cid });
  if (result.entry.delta > 0) {
    emitActivity("token_earned", { amount: result.entry.delta, bonus: result.bonus }, { cid });
  }

  return {
    tokensAwarded: result.entry.delta,
    bonus: result.bonus,
    bonusTokens: result.bonusTokens,
    lifetimeEarned: result.lifetimeEarned,
    leveledUp,
    spotlight,
  };
}

/** Skip a step — free, never penalized (doc 62 §5). Advances the run. */
export function skipStep(cid: string, taskId: string): void {
  useTaskStore.getState().setTaskStatus(cid, taskId, "skipped");
  useRunProgressStore.getState().markStepResolved(cid, taskId);
}

// ---------------------------------------------------------------------------
// Quick undo + light verify (verify-undo, feature #17). Undo is a CALM, no-blame
// correction — it reverses the spendable balance + task status + run pointer, but
// NEVER `lifetimeEarned` / `cumulativeCount` / streak / buddy growth (all
// monotonic/celebratory — anti-shame §2.5). Verify is always token-neutral and is
// NEVER a gate (completion already paid on Done).
// ---------------------------------------------------------------------------

/**
 * Undo an accidental Done on a completed step (verify-undo §2.2/§2.5). Reverses
 * ONLY what should be reversible:
 *   - spendable `balance` ← lowered by the step's granted delta (floored ≥ 0);
 *   - `Task.status` ← back to `todo`;
 *   - the active run pointer ← the step re-armed (re-created if it auto-cleared on
 *     the last step);
 *   - the daypart-complete marker ← cleared (so the calm done panel yields back).
 * LEAVES `lifetimeEarned`/`lifetimeSpent`/`cumulativeCount`/streak/buddy growth
 * UNTOUCHED — a mis-tap never claws back felt progress or frowns the buddy.
 * Returns true when a step was undone.
 */
export function undoStep(cid: string, taskId: string): boolean {
  const taskStore = useTaskStore.getState();
  const task = (taskStore.tasks[cid] ?? []).find((tk) => tk.id === taskId);
  if (!task) return false;

  const child = useChildStore.getState();
  const ledger = child.ledgers[cid];
  if (!ledger) return false;

  // 1) Reverse the mis-earned CURRENCY only (anti-gaming). lifetime totals + buddy
  //    growth stay put by construction (undoEarn touches neither lifetime field).
  const grant = latestEarnFor(ledger, taskId);
  if (grant) {
    const { ledger: next } = undoEarn(ledger, {
      id: newId(),
      ts: now(),
      amount: grant.delta,
      refId: taskId,
      note: task.label.spokenLabel,
    });
    child.setLedger(cid, next);
  }

  // 2) The step becomes "to do" again.
  taskStore.setTaskStatus(cid, taskId, "todo");

  // 3) Re-arm the run pointer + un-mark the daypart (handles the last-step case).
  if (task.routineId) {
    const routine = (taskStore.routines[cid] ?? []).find((r) => r.id === task.routineId);
    const stepIds = routine?.stepIds ?? [];
    // resolvedTaskIds AFTER the status flip above (this task is now `todo`).
    const resolvedTaskIds = (useTaskStore.getState().tasks[cid] ?? [])
      .filter(
        (tk) =>
          tk.routineId === task.routineId && (tk.status === "done" || tk.status === "skipped"),
      )
      .map((tk) => tk.id);
    useRunProgressStore
      .getState()
      .unmarkStepResolved(cid, taskId, { stepIds, routineId: task.routineId, resolvedTaskIds });

    const profile = child.profiles[cid];
    if (routine && profile) {
      const dp = routineDaypartOf(routine);
      const today = isoDay(now(), profile.timeZone);
      // No-op if the daypart wasn't marked done — safe for a mid-run undo too.
      useRunProgressStore.getState().clearDaypartComplete(cid, today, dp);
    }
  }
  return true;
}

export interface VerifyStepInput {
  by: "child" | "parent";
  /** on-device local photo URI (mode:'photo'); omit for self/parent confirmation */
  photoUri?: string;
}

/**
 * Stamp an OPTIONAL verification on a completed step (verify-undo §2.1/§2.4).
 * TOKEN-NEUTRAL — records `verifiedBy`/`verifiedAt` (+ `photoUri`) and changes NO
 * ledger value (avoids re-gaming). On re-verify with a NEW photo, the prior photo
 * file is deleted first so nothing orphans (§9.3). Never a gate.
 */
export async function verifyStep(
  cid: string,
  taskId: string,
  input: VerifyStepInput,
): Promise<void> {
  const taskStore = useTaskStore.getState();
  const task = (taskStore.tasks[cid] ?? []).find((tk) => tk.id === taskId);
  if (!task) return;

  const prev = task.verification.photoUri;
  if (input.photoUri && prev && prev !== input.photoUri) {
    await deletePhoto(prev);
  }

  taskStore.updateTask(cid, taskId, {
    verification: {
      ...task.verification,
      verifiedBy: input.by,
      verifiedAt: now(),
      ...(input.photoUri ? { photoUri: input.photoUri } : {}),
    },
  });
}

/**
 * Undo a recently-approved / auto-approved / fulfilled redemption (verify-undo
 * §2.3/§2.5). Refunds the cost + flips status to `reversed` (guardrail availability
 * then recovers); a stale reverse on a non-grant request is a no-op. Returns null
 * when the child/request is missing.
 */
export function reverseRedemption(cid: string, requestId: string): DecisionResult | null {
  const child = useChildStore.getState();
  const request = useRewardStore.getState().redemptions[cid]?.find((r) => r.id === requestId);
  const ledger = child.ledgers[cid];
  if (!request || !ledger) return null;

  const result = reverseRedemptionTx(ledger, request, { id: newId(), now: now() });
  child.setLedger(cid, result.ledger);
  useRewardStore.getState().updateRedemption(cid, result.request);
  return result;
}

// ---------------------------------------------------------------------------
// Redemption escrow (coordinates tokens.ts with childStore's ledger).
// ---------------------------------------------------------------------------

export function requestReward(cid: string, rewardId: string): RequestRedemptionResult {
  const child = useChildStore.getState();
  const reward = useRewardStore.getState().rewards[cid]?.find((r) => r.id === rewardId);
  const ledger = child.ledgers[cid];
  const profile = child.profiles[cid];
  if (!reward || !ledger || !profile) return { ok: false, reason: "reward_unavailable" };

  const existing = useRewardStore.getState().redemptions[cid] ?? [];
  const result = requestRedemption(ledger, reward, profile.settings, existing, {
    id: newId(),
    now: now(),
  });
  if (!result.ok) return result;

  child.setLedger(cid, result.ledger);
  useRewardStore.getState().addRedemption(cid, result.request);
  return result;
}

export function approveReward(cid: string, requestId: string): DecisionResult | null {
  const child = useChildStore.getState();
  const request = useRewardStore.getState().redemptions[cid]?.find((r) => r.id === requestId);
  const ledger = child.ledgers[cid];
  if (!request || !ledger) return null;

  const result = approveRedemption(ledger, request, { now: now(), id: newId() });
  child.setLedger(cid, result.ledger);
  useRewardStore.getState().updateRedemption(cid, result.request);
  return result;
}

export function declineReward(
  cid: string,
  requestId: string,
  reasonKidSafe?: string,
): DecisionResult | null {
  const child = useChildStore.getState();
  const request = useRewardStore.getState().redemptions[cid]?.find((r) => r.id === requestId);
  const ledger = child.ledgers[cid];
  if (!request || !ledger) return null;

  const result = declineRedemption(ledger, request, now(), reasonKidSafe);
  child.setLedger(cid, result.ledger);
  useRewardStore.getState().updateRedemption(cid, result.request);
  return result;
}

/**
 * The child taps "never mind" on their own pending request (doc 62 §7 step 4).
 * Releases the escrow hold with ZERO net spend — forgiving, never a penalty.
 */
export function cancelReward(cid: string, requestId: string): DecisionResult | null {
  const child = useChildStore.getState();
  const request = useRewardStore.getState().redemptions[cid]?.find((r) => r.id === requestId);
  const ledger = child.ledgers[cid];
  if (!request || !ledger) return null;

  const result = cancelRedemption(ledger, request, now());
  child.setLedger(cid, result.ledger);
  useRewardStore.getState().updateRedemption(cid, result.request);
  return result;
}

/** Set (or clear) the older "save toward this reward" goal (doc 66 §M8). */
export function setSavingToward(cid: string, rewardId: string | null): void {
  const child = useChildStore.getState();
  const progress = child.progress[cid];
  if (!progress) return;
  if (progress.savingTowardRewardId === rewardId) return;
  child.setProgress(cid, { ...progress, savingTowardRewardId: rewardId });
}

// ---------------------------------------------------------------------------
// Cosmetics — a refundless, owned-forever token unlock (tether spend/affordability
// PATTERN, re-authored). Distinct from the caregiver-reward escrow: a digital
// collectible the child OWNS forever once unlocked, so there is nothing to refund
// and no parent gate. Children never see a paywall, so premium items are blocked
// here (acquired via the M12 premium flow) — doc 66 §1b.11/§5.
// ---------------------------------------------------------------------------

export type UnlockCosmeticResult =
  | { ok: true; alreadyOwned: boolean; spent: number }
  | { ok: false; reason: "unknown" | "premium" | "insufficient_balance" | "no_child" };

export function unlockCosmeticWithTokens(cid: string, cosmeticId: string): UnlockCosmeticResult {
  const cosmetic = getCosmetic(cosmeticId);
  if (!cosmetic) return { ok: false, reason: "unknown" };

  const buddy = useBuddyStore.getState();
  const companion = buddy.companions[cid];
  if (!companion) return { ok: false, reason: "no_child" };

  // already owned (or a free base item) — idempotent, no spend.
  if (companion.unlockedItems.includes(cosmeticId)) {
    return { ok: true, alreadyOwned: true, spent: 0 };
  }
  // premium acquisition is NEVER a child-facing token purchase (no paywall).
  if (cosmetic.premium) return { ok: false, reason: "premium" };

  const child = useChildStore.getState();
  const ledger = child.ledgers[cid];
  if (!ledger) return { ok: false, reason: "no_child" };

  const cost = Math.max(0, cosmetic.unlockCost);
  if (cost > 0) {
    if (availableBalance(ledger) < cost) return { ok: false, reason: "insufficient_balance" };
    const { ledger: next } = spend(ledger, {
      id: newId(),
      ts: now(),
      amount: cost,
      reason: "redeem",
      refId: cosmeticId,
      note: cosmetic.label.spokenLabel,
    });
    child.setLedger(cid, next);
  }

  buddy.unlockCosmetic(cid, cosmeticId);
  buddy.applyEvent(cid, "collectible"); // a positive "new treasure!" mood
  // Novelty-refresh (M-C4): a fresh unlock advances any `unlockCosmetic` quest.
  emitQuestSignal(cid, { kind: "unlockCosmetic", delta: 1 });
  return { ok: true, alreadyOwned: false, spent: cost };
}

// ---------------------------------------------------------------------------
// Forgiving rollover reconciler (doc 62 §5/§10, doc 66 §M8) — run on app-open and
// at local midnight. Idempotent + gated by the child timezone day, so re-running
// is safe. It NEVER zeroes a streak or fails a task: an incomplete `today` task
// rolls to `someday`, `tomorrow` -> `today`, and a multi-day gap is surfaced as a
// RESTING streak (paused), never "broken".
// ---------------------------------------------------------------------------

export function reconcileChild(cid: string): void {
  const child = useChildStore.getState();
  const profile = child.profiles[cid];
  if (!profile) return;
  const tz = profile.timeZone;

  // 1) forgiving task rollover (today -> someday, tomorrow -> today), once/day.
  useTaskStore.getState().rolloverChild(cid, tz);

  // 2) surface a multi-day gap as a resting (never broken) streak.
  const progress = useChildStore.getState().progress[cid];
  if (progress) {
    const rested = reconcileStreakRest(progress, { tz, now: now() });
    if (rested !== progress) child.setProgress(cid, rested);
  }

  // 3) materialise the current holder's rotating-chore tasks for today + archive
  //    stale ones (multi-child §3.5). Runs every reconcile (NOT day-gated) so a
  //    fast child switch or a just-authored chore shows up immediately.
  materialiseChores(cid);

  // 4) rotate the weekly novelty quest board (novelty §4.2, M-C4). Idempotent
  //    within the ISO week; suppressed on the calm path. Runs every reconcile so a
  //    new week's board is ready on app-open / switch.
  rotateQuests(cid);
}

// ---------------------------------------------------------------------------
// Rotating shared chores (multi-child §3.3/§3.5). Deterministic, offline, ZERO AI:
// the current holder is pure date math (src/domain/chores.ts); each holder-day
// assignment materialises as an ORDINARY per-child Task carrying `choreId`, dropped
// into the holder's active daypart routine (or standalone if none) so it flows
// through the shipped core loop untouched. Idempotent: exactly one task per
// (choreId, holder-day); re-running never duplicates.
// ---------------------------------------------------------------------------

/** Archive a stale chore Task + detach it from its routine so the runner never shows it. */
function detachChoreTask(cid: string, task: Task): void {
  const taskStore = useTaskStore.getState();
  taskStore.archiveTask(cid, task.id);
  if (task.routineId) {
    const routine = (useTaskStore.getState().routines[cid] ?? []).find(
      (r) => r.id === task.routineId,
    );
    if (routine) {
      taskStore.reorderRoutineSteps(
        cid,
        task.routineId,
        routine.stepIds.filter((id) => id !== task.id),
      );
    }
  }
}

/**
 * Ensure the current holder's chore tasks exist for today (and stale ones are gone)
 * for child `cid`. Pure-math holder resolution; only the placement writes to stores.
 */
function materialiseChores(cid: string): void {
  const child = useChildStore.getState();
  const profile = child.profiles[cid];
  if (!profile || profile.archived) return;
  const tz = profile.timeZone;
  const ts = now();
  const today = isoDay(ts, tz);
  const chores = useChoreStore.getState().chores;

  // 1) Archive stale chore tasks (still `todo`, materialised for a PRIOR day). A
  //    done/skipped chore task is history — left untouched (anti-shame; no clawback).
  for (const task of useTaskStore.getState().tasks[cid] ?? []) {
    if (
      task.choreId &&
      task.choreHolderDay &&
      task.choreHolderDay !== today &&
      task.status === "todo" &&
      !task.archived
    ) {
      detachChoreTask(cid, task);
    }
  }

  // 2) Materialise exactly one task per active, scheduled chore this child holds today.
  for (const chore of chores) {
    if (!isChoreActive(chore)) continue;
    if (!isChoreScheduledToday(chore, ts, tz)) continue;
    if (currentHolderId(chore, ts, tz) !== cid) continue;
    const existing = (useTaskStore.getState().tasks[cid] ?? []).find(
      (tk) => tk.choreId === chore.id && tk.choreHolderDay === today && !tk.archived,
    );
    if (existing) continue; // idempotent — never duplicate a holder-day instance
    const task = choreTaskFor(chore, cid, newId(), ts, tz);
    const routine = (useTaskStore.getState().routines[cid] ?? []).find(
      (r) => r.active && routineDaypartOf(r) === chore.daypart,
    );
    if (routine) {
      // append as an ordinary routine step (keeps stepIds in sync)
      useTaskStore.getState().addRoutineStep(cid, routine.id, task);
    } else {
      // no active routine for that daypart → a standalone `today` task (§3 assumption 3)
      useTaskStore.getState().addTask(cid, task);
    }
  }
}

// ---------------------------------------------------------------------------
// Fast child switcher + roster hygiene (multi-child §2.1/§3.4). Switching only
// changes `activeChildId` + reconciles — it NEVER zeroes/hides/alters the previous
// child's tokens/streak/companion/history (all per-`cid`, untouched).
// ---------------------------------------------------------------------------

/**
 * Hand the device to child `cid`: set the active child, clear the in-memory live-run
 * handle (the new child starts fresh — the previous child's persisted run pointer is
 * untouched), and reconcile (forgiving rollover + chore materialisation).
 */
export function switchActiveChild(cid: string): void {
  useSettingsStore.getState().setActiveChild(cid);
  useSessionStore.getState().setActiveRun(null);
  reconcileChild(cid);
}

/**
 * Remove (archive — never hard-delete) a child, prune them from every shared-chore
 * roster (deactivating any left with < 2 members), delete their on-device verify
 * photos, and reassign `activeChildId` to the next non-archived child (or null).
 * Acquisition-only gating means an existing child is never removed BY the gate — this
 * is an explicit parent action.
 */
export function removeChild(cid: string): void {
  // Delete this child's on-device verify photos first (they live OUTSIDE the tb/
  // keyspace; archiving the child would otherwise orphan them — verify-undo §9.3).
  for (const task of useTaskStore.getState().tasks[cid] ?? []) {
    const uri = task.verification?.photoUri;
    if (uri) void deletePhoto(uri);
  }

  useChildStore.getState().archiveChild(cid);
  useChoreStore.getState().pruneChild(cid);
  // Drop the removed child's rotating-quest state (novelty §3.2 clearChild).
  useQuestStore.getState().clearChild(cid);
  // Drop the removed child's if-then plans (if-then-plans §3.3 per-child delete).
  usePlanStore.getState().clearChild(cid);

  const settings = useSettingsStore.getState();
  if (settings.meta.activeChildId === cid) {
    const next = useChildStore.getState().index.find((e) => !e.archived && e.id !== cid);
    settings.setActiveChild(next ? next.id : null);
    useSessionStore.getState().setActiveRun(null);
  }
}

// ---------------------------------------------------------------------------
// Shared-chore CRUD orchestrators (multi-child §3.3). Thin glue over choreStore +
// an immediate materialise for the current holder so a just-authored chore appears
// in that child's loop without waiting for the next app-open (§3 assumption 8).
// ---------------------------------------------------------------------------

/** Device-local calendar day for the rotation anchor (assumption 4: stored in device tz). */
function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export interface CreateSharedChoreInput {
  label: VisualLabel;
  /** ordered roster (rotation order); length >= 2 to be an active rotation */
  childIds: string[];
  cadence: RotationCadence;
  daypart: Exclude<Daypart, "night">;
  tokenValue: number;
  templateId?: string | null;
  /** days-of-week the chore is active (empty => every day) */
  schedule?: Partial<TaskSchedule>;
}

/** Create a shared chore + immediately materialise it for its current holder. Returns the id. */
export function createSharedChore(input: CreateSharedChoreInput): string {
  const ts = now();
  const chore: SharedChore = {
    id: newId(),
    label: { ...input.label },
    childIds: [...input.childIds],
    cadence: input.cadence,
    rotationAnchorDay: isoDay(ts, deviceTimeZone()),
    manualHolderIndex: 0,
    completionAdvanceCount: 0,
    daypart: input.daypart,
    tokenValue: Math.max(1, input.tokenValue),
    templateId: input.templateId ?? null,
    schedule: { daysOfWeek: [], ...input.schedule },
    active: input.childIds.length >= 2,
    createdAt: ts,
    updatedAt: ts,
  };
  useChoreStore.getState().addChore(chore);
  const holder = currentHolderId(chore, ts, deviceTimeZone());
  if (holder) reconcileChild(holder);
  return chore.id;
}

/** Patch a shared chore, then re-materialise the (possibly changed) current holder. */
export function updateSharedChore(choreId: string, patch: Partial<SharedChore>): void {
  useChoreStore.getState().updateChore(choreId, patch);
  const chore = useChoreStore.getState().chores.find((ch) => ch.id === choreId);
  if (chore) {
    const holder = currentHolderId(chore, now(), deviceTimeZone());
    if (holder) reconcileChild(holder);
  }
}

/** Hard-delete a shared chore's parent-owned metadata (already-earned tokens untouched). */
export function deleteSharedChore(choreId: string): void {
  useChoreStore.getState().removeChore(choreId);
}

/**
 * Manual "pass to next now" (multi-child §2.2): hand the chore to the next child in
 * the roster + re-materialise so the new holder's task appears (and the old holder's
 * now-stale one is archived on their next reconcile). Anti-shame framing lives in the
 * copy ("hand off / pass to next"), never "take away."
 */
export function passSharedChoreToNext(choreId: string): void {
  useChoreStore.getState().passChoreToNext(choreId);
  const chore = useChoreStore.getState().chores.find((ch) => ch.id === choreId);
  if (chore) {
    const holder = currentHolderId(chore, now(), deviceTimeZone());
    if (holder) reconcileChild(holder);
  }
}

/** Reconcile the currently-active child on app-open (doc 66 §M8). */
export function reconcileActiveChild(): void {
  const cid = useSettingsStore.getState().meta.activeChildId;
  if (cid) reconcileChild(cid);
}

// ---------------------------------------------------------------------------
// Parent task assignment (doc 63 Feature 5, doc 66 §M9). A parent picks a
// templated task and assigns it in 2-3 taps; light customization (emoji/color/
// schedule/value) rides on the template defaults. Assignment either APPENDS a
// step to an existing routine (instantly runnable in the kid loop) or creates a
// standalone task. NEW glue over the existing seed/taskTemplate data + stores.
// ---------------------------------------------------------------------------

export interface AssignTaskInput {
  templateId: string;
  /** emoji / color / text / spokenLabel overrides on top of the template label */
  label?: Partial<VisualLabel>;
  /** daysOfWeek / timeOfDay overrides */
  schedule?: Partial<TaskSchedule>;
  /** base immediate payout (defaults to the template's suggested value) */
  tokenValue?: number;
  /**
   * Optional visual-transition-timer budget in seconds (visual-timers §3.4). A
   * positive value shows a depleting bar/wedge on the active step in the kid loop;
   * `undefined`/`0` => no timer. Defaults to the template's own `timerSeconds`.
   */
  timerSeconds?: number;
  /**
   * Optional light-verification style (verify-undo §2.4). `none` (default) keeps
   * verify off; `self`/`photo`/`parent` attach a BONUS confirmation — NEVER a gate
   * (completion + payout stay immediate). Sets `verification.mode`; `required`
   * stays false and is never surfaced. Defaults to the template's own mode.
   */
  verificationMode?: VerificationMode;
  /** append to this routine; omit/null => a standalone task */
  routineId?: string | null;
}

/** Build a per-child Task from a template + customization (no store writes). */
function makeTaskFromTemplate(cid: string, input: AssignTaskInput): Task | null {
  const template = getTaskTemplate(input.templateId);
  if (!template) return null;
  const ts = now();
  const base = taskFromTemplate(template, {
    id: newId(),
    childId: cid,
    routineId: null,
    order: 0,
    now: ts,
  });
  const label: VisualLabel = { ...base.label, ...input.label };
  const schedule: TaskSchedule = { ...base.schedule, ...input.schedule };
  // A curated Off (0/undefined) clears any template default; a positive value sets it.
  const timerSeconds =
    input.timerSeconds !== undefined
      ? input.timerSeconds > 0
        ? input.timerSeconds
        : undefined
      : base.timerSeconds;
  // Attach the optional verify style (never a gate; `required` stays false).
  const verification =
    input.verificationMode !== undefined
      ? { ...base.verification, mode: input.verificationMode }
      : base.verification;
  return {
    ...base,
    label,
    schedule,
    tokenValue: input.tokenValue ?? base.tokenValue,
    timerSeconds,
    verification,
  };
}

/**
 * Parent assigns a templated task. Returns the new task id (or null if the
 * template id is unknown). Appending to a routine makes it immediately runnable.
 */
export function assignTaskFromTemplate(cid: string, input: AssignTaskInput): string | null {
  const task = makeTaskFromTemplate(cid, input);
  if (!task) return null;
  const taskStore = useTaskStore.getState();
  if (input.routineId) {
    taskStore.addRoutineStep(cid, input.routineId, task);
  } else {
    taskStore.addTask(cid, { ...task, routineId: null });
  }
  return task.id;
}

/** Parent adds a templated step directly to a routine (momentum add-a-step). */
export function addStepToRoutine(cid: string, routineId: string, templateId: string): string | null {
  return assignTaskFromTemplate(cid, { templateId, routineId });
}

// ---------------------------------------------------------------------------
// Child task-proposal / parent-approval queue (doc 66 §age fix #24). Surfaced
// only when `autonomy.canAddTasks`. A proposed task is held (proposed:true) and
// NEVER appears in the kid loop until a parent approves it. Dismissal archives
// it — never a punishment, never shown to the child as a rejection.
// ---------------------------------------------------------------------------

/** Child proposes a templated task into the parent approval queue. */
export function proposeTaskFromTemplate(cid: string, templateId: string): string | null {
  const task = makeTaskFromTemplate(cid, { templateId });
  if (!task) return null;
  useTaskStore.getState().addTask(cid, { ...task, routineId: null, proposed: true });
  return task.id;
}

/** Parent approves a proposed task — it becomes a normal standalone task. */
export function approveProposal(cid: string, taskId: string): void {
  useTaskStore.getState().updateTask(cid, taskId, { proposed: false });
}

/** Parent dismisses a proposed task (archived, not a punishment). */
export function dismissProposal(cid: string, taskId: string): void {
  useTaskStore.getState().archiveTask(cid, taskId);
}

// ---------------------------------------------------------------------------
// Delete-data (doc 63 Feature 10, doc 66 §M9). Clears all child-identifiable
// data (profiles, tasks, routines, runs, rewards, companion, and the opt-in
// mood/event logs). Parent settings + gate + onboarding + entitlement are kept
// so the app stays configured. Setting each persisted store clears its disk slice
// via the persist middleware. COPPA "delete my child's data".
// ---------------------------------------------------------------------------

export function wipeAllChildData(): void {
  // Delete on-device verify photos FIRST — they live OUTSIDE the tb/ AsyncStorage
  // keyspace, so the store wipe below would otherwise orphan them (verify-undo
  // §MODIFY gameplay.ts / §9.3). No-throw + fire-and-forget; a wiped child leaves
  // no orphaned photo file.
  const allTasks = useTaskStore.getState().tasks;
  for (const list of Object.values(allTasks)) {
    for (const task of list ?? []) {
      const uri = task.verification?.photoUri;
      if (uri) void deletePhoto(uri);
    }
  }

  useChildStore.setState({
    index: [],
    profiles: {},
    ledgers: {},
    progress: {},
    reinforcement: {},
    moods: {},
    events: {},
    seed: freshSeedState(),
  });
  useTaskStore.setState({ tasks: {}, routines: {}, runs: {}, lastRolloverDay: {} });
  useRewardStore.setState({ rewards: {}, redemptions: {} });
  useBuddyStore.setState({ companions: {} });
  useRunProgressStore.setState({ active: {} });
  // Parent-global rotating chores span children, so they belong to this wipe too
  // (multi-child §3.6 / roadmap invariant #8(c)). No child remains to hold them.
  useChoreStore.setState({ chores: [] });
  // Per-child rotating-quest state (novelty §4.2 / roadmap invariant #8(c)).
  useQuestStore.setState({ quests: {} });
  // Per-child if-then plans (if-then-plans §3.3 / roadmap invariant #8(c)).
  usePlanStore.setState({ plans: {} });
  // The tb/sync slice (w1 M1.2): linkage + queued outbox items are
  // child-identifiable, so the COPPA wipe clears them too. Cloud-side purge is
  // the parent's `deleteChildData` callable — this clears the DEVICE half.
  useSyncStore.getState().clearAll();
  useSettingsStore.getState().setActiveChild(null);
}
