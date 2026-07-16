/**
 * src/domain/quests.ts — pure, deterministic quest logic (novelty-refresh, M-C4).
 *
 * The rotating-quest brain: a small board of optional bonus goals is selected for
 * each ISO week by INTEGER ARITHMETIC over a static pool (a stable offset derived
 * from an in-repo FNV-1a hash of the week key) — this is a deterministic rotation,
 * NOT an ML/AI recommender and NOT an RNG payout. `Math.random` is FORBIDDEN in
 * this file (grep-gated, novelty §7.3): every "which quests / how much reward"
 * decision is a pure function of the week key + explicit progress, never chance.
 *
 * Anti-shame invariants encoded here (novelty §7):
 *   - counters only ever ADVANCE toward `target`; there is no fail/negative state;
 *   - completion is auto (no missable "Claim"); an unfinished quest simply is not
 *     `isComplete` and rotates out with zero penalty (the store keeps history);
 *   - variety is MAGNITUDE + CONTENT (which quests, how big the reward), never a
 *     variable SCHEDULE — the reward is a fixed `rewardTokens`, granted once.
 *
 * Pure + RN-free + unit-testable: `now`/`weekKey` are always passed in.
 */
import type { Daypart, QuestDef, QuestGoalKind, QuestProgress } from "./types";

/**
 * How many quests the weekly board holds (novelty §2.1). The store rotates this
 * many in; the young single-card mode shows the FIRST, older shows up to all 3 —
 * a shared constant so `gameplay.rotateQuests` and the board agree on the set.
 */
export const QUEST_BOARD_SIZE = 3;

/**
 * A durable "something happened" signal the orchestrator feeds to the quest board
 * (novelty §3.2). `delta` is an INCREMENT (usually 1) — the matching kinds advance
 * their `count` by it. `daypart` refines a `completeDaypart` match.
 */
export interface QuestSignal {
  kind: QuestGoalKind;
  /** how many matching events just occurred (>=1) — advances `count` */
  delta: number;
  /** for `completeDaypart`: which daypart routine finished (matches an optional filter) */
  daypart?: Daypart;
}

/**
 * The reward description an auto-completed quest yields, for the orchestrator to
 * GRANT (tokens via the ledger + an optional owned-forever cosmetic). The store
 * emits these; the store itself never touches tokens/cosmetics (single-purpose).
 */
export interface QuestClaim {
  questId: string;
  /** DETERMINISTIC bubbles to grant (the quest's fixed `rewardTokens`) */
  rewardTokens: number;
  /** optional cosmetic id to reveal/grant (owned forever) */
  rewardCosmeticId?: string;
}

/**
 * FNV-1a 32-bit hash of a string → a stable non-negative integer. Pure integer
 * arithmetic (no RNG, no library, no model) — the deterministic rotation offset.
 */
export function hashKey(key: string): number {
  let h = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    // FNV prime multiply, kept in 32-bit unsigned range
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * The deterministic active quest set for `weekKey`: a stable window of up to
 * `count` quests rotated into `pool` by the week's hash offset. The SAME `weekKey`
 * + `pool` + `count` always yields the SAME ordered set (across calls and across
 * "devices"); a new ISO week rotates the window forward. No `Math.random`.
 */
export function activeQuestsFor(weekKey: string, pool: QuestDef[], count: number): QuestDef[] {
  if (pool.length === 0 || count <= 0) return [];
  const n = Math.min(count, pool.length);
  const start = hashKey(weekKey) % pool.length;
  const out: QuestDef[] = [];
  for (let i = 0; i < n; i++) out.push(pool[(start + i) % pool.length]);
  return out;
}

/** Whether a signal advances this quest def (kind + optional daypart filter match). */
export function signalMatches(def: QuestDef, signal: QuestSignal): boolean {
  if (def.goalKind !== signal.kind) return false;
  // A completeDaypart quest with a daypart FILTER only matches that daypart.
  if (def.goalKind === "completeDaypart" && def.daypart !== undefined) {
    return signal.daypart === def.daypart;
  }
  return true;
}

/**
 * Advance a quest's progress by a matching signal — pure counter math, capped at
 * `target` (monotonic up, never past the goal, never negative). Returns the SAME
 * object when the signal does not match or the quest is already claimed (idempotent
 * no-op), so callers can detect "no change" by identity.
 */
export function advance(progress: QuestProgress, def: QuestDef, signal: QuestSignal): QuestProgress {
  if (progress.claimed) return progress;
  if (!signalMatches(def, signal)) return progress;
  const inc = Math.max(0, Math.floor(signal.delta));
  if (inc === 0) return progress;
  const count = Math.min(def.target, progress.count + inc);
  if (count === progress.count) return progress;
  return { ...progress, count };
}

/** Whether a quest has reached its target (ready to auto-grant). */
export function isComplete(progress: QuestProgress, def: QuestDef): boolean {
  return progress.count >= def.target;
}

/** A fresh zeroed progress record for a newly-rotated quest (count starts at 0). */
export function freshQuestProgress(questId: string): QuestProgress {
  return { questId, count: 0, baseline: 0, claimed: false };
}
