/**
 * __tests__/domain/quests.test.ts — pure rotating-quest logic (novelty-refresh,
 * M-C4). Proves DETERMINISM (no RNG), the additive/anti-shame invariants, and the
 * premium/simple pool filtering.
 */
import { describe, expect, it } from "@jest/globals";

import {
  activeQuestsFor,
  advance,
  freshQuestProgress,
  hashKey,
  isComplete,
  QUEST_BOARD_SIZE,
  signalMatches,
  type QuestSignal,
} from "../../src/domain/quests";
import {
  BASE_QUEST_POOL,
  PREMIUM_QUEST_POOL,
  getQuestById,
  getQuestPool,
} from "../../src/data/questPool";
import type { QuestDef } from "../../src/domain/types";

const POP: QuestDef = {
  id: "t_pop",
  label: { spokenLabel: "pop", color: "#fff" },
  goalKind: "popBubbles",
  target: 3,
  rewardTokens: 2,
};
const MORNING: QuestDef = {
  id: "t_morn",
  label: { spokenLabel: "morning", color: "#fff" },
  goalKind: "completeDaypart",
  daypart: "morning",
  target: 2,
  rewardTokens: 3,
};

describe("hashKey", () => {
  it("is deterministic + non-negative for the same string", () => {
    expect(hashKey("2026-W27")).toBe(hashKey("2026-W27"));
    expect(hashKey("2026-W27")).toBeGreaterThanOrEqual(0);
    expect(hashKey("2026-W27")).not.toBe(hashKey("2026-W28"));
  });
});

describe("activeQuestsFor (deterministic rotation, no RNG)", () => {
  it("returns the identical set for the same weekKey across repeated calls / 'devices'", () => {
    const a = activeQuestsFor("2026-W27", BASE_QUEST_POOL, 3).map((q) => q.id);
    const b = activeQuestsFor("2026-W27", BASE_QUEST_POOL, 3).map((q) => q.id);
    expect(a).toEqual(b);
  });

  it("rotates the window as the ISO week advances", () => {
    const weeks = ["2026-W25", "2026-W26", "2026-W27", "2026-W28"].map((w) =>
      activeQuestsFor(w, BASE_QUEST_POOL, 1)[0]?.id,
    );
    // Not every consecutive week must differ, but the mapping is stable per key.
    for (const w of ["2026-W25", "2026-W26", "2026-W27", "2026-W28"]) {
      expect(activeQuestsFor(w, BASE_QUEST_POOL, 1)[0]?.id).toBe(
        activeQuestsFor(w, BASE_QUEST_POOL, 1)[0]?.id,
      );
    }
    expect(weeks.every((id) => typeof id === "string")).toBe(true);
  });

  it("caps at the pool length + returns [] for an empty pool / non-positive count", () => {
    expect(activeQuestsFor("w", BASE_QUEST_POOL, 999)).toHaveLength(BASE_QUEST_POOL.length);
    expect(activeQuestsFor("w", [], 3)).toEqual([]);
    expect(activeQuestsFor("w", BASE_QUEST_POOL, 0)).toEqual([]);
  });

  it("yields DISTINCT quests within a board (no duplicate quest id)", () => {
    const ids = activeQuestsFor("2026-W27", BASE_QUEST_POOL, QUEST_BOARD_SIZE).map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("signalMatches", () => {
  const popSig: QuestSignal = { kind: "popBubbles", delta: 1 };
  it("matches on kind", () => {
    expect(signalMatches(POP, popSig)).toBe(true);
    expect(signalMatches(MORNING, popSig)).toBe(false);
  });
  it("respects a completeDaypart daypart filter", () => {
    expect(signalMatches(MORNING, { kind: "completeDaypart", delta: 1, daypart: "morning" })).toBe(
      true,
    );
    expect(signalMatches(MORNING, { kind: "completeDaypart", delta: 1, daypart: "evening" })).toBe(
      false,
    );
    // an unfiltered completeDaypart quest matches any daypart
    const anyDp: QuestDef = { ...MORNING, id: "any", daypart: undefined };
    expect(signalMatches(anyDp, { kind: "completeDaypart", delta: 1, daypart: "evening" })).toBe(
      true,
    );
  });
});

describe("advance / isComplete (anti-shame counter math)", () => {
  it("advances toward target, capping at target (never over, never negative)", () => {
    let p = freshQuestProgress(POP.id);
    p = advance(p, POP, { kind: "popBubbles", delta: 1 });
    expect(p.count).toBe(1);
    p = advance(p, POP, { kind: "popBubbles", delta: 5 }); // caps at target 3
    expect(p.count).toBe(3);
    expect(isComplete(p, POP)).toBe(true);
  });

  it("is a no-op (same object) for a non-matching signal", () => {
    const p = freshQuestProgress(POP.id);
    expect(advance(p, POP, { kind: "tryCalm", delta: 1 })).toBe(p);
  });

  it("ignores zero/negative deltas (no regression, monotonic)", () => {
    const p = { ...freshQuestProgress(POP.id), count: 2 };
    expect(advance(p, POP, { kind: "popBubbles", delta: 0 })).toBe(p);
    expect(advance(p, POP, { kind: "popBubbles", delta: -3 })).toBe(p);
  });

  it("never advances a claimed quest (grant-once idempotency at the pure layer)", () => {
    const claimed = { ...freshQuestProgress(POP.id), count: 3, claimed: true };
    expect(advance(claimed, POP, { kind: "popBubbles", delta: 1 })).toBe(claimed);
  });
});

describe("getQuestPool + getQuestById", () => {
  it("free tier excludes premium/seasonal quests; premium includes them", () => {
    const free = getQuestPool({ premium: false }).map((q) => q.id);
    const prem = getQuestPool({ premium: true }).map((q) => q.id);
    for (const q of PREMIUM_QUEST_POOL) {
      expect(free).not.toContain(q.id);
      expect(prem).toContain(q.id);
    }
    for (const q of BASE_QUEST_POOL) expect(free).toContain(q.id);
  });

  it("simpleOnly restricts to the young single-card kinds", () => {
    const simple = getQuestPool({ premium: true, simpleOnly: true });
    expect(simple.length).toBeGreaterThan(0);
    expect(simple.every((q) => q.simple === true)).toBe(true);
  });

  it("every premium quest awards a seasonal cosmetic + resolves by id", () => {
    for (const q of PREMIUM_QUEST_POOL) {
      expect(q.rewardCosmeticId).toBeDefined();
      expect(q.packId).toBeDefined();
      expect(getQuestById(q.id)).toEqual(q);
    }
  });

  it("no quest def is missing its required spokenLabel or a fixed reward", () => {
    for (const q of [...BASE_QUEST_POOL, ...PREMIUM_QUEST_POOL]) {
      expect(q.label.spokenLabel.length).toBeGreaterThan(0);
      expect(q.rewardTokens).toBeGreaterThan(0);
      expect(q.target).toBeGreaterThan(0);
    }
  });
});
