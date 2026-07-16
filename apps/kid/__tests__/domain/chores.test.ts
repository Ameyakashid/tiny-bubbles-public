/**
 * __tests__/domain/chores.test.ts — pure rotation math for shared/rotating chores
 * (multi-child §3.5 / §7 acceptance #4). Deterministic + offline: every `now`/`tz`
 * is passed in, so there is no device clock and no randomness (ZERO AI on this path).
 */
import { describe, expect, it } from "@jest/globals";

import {
  choreTaskFor,
  currentHolderId,
  currentHolderIndex,
  daysSinceAnchor,
  isChoreActive,
  isChoreScheduledToday,
  rotationPreview,
  weeksSinceAnchor,
} from "../../src/domain/chores";
import { isoDay } from "../../src/domain/dates";
import type { RotationCadence, SharedChore } from "../../src/domain/types";

const TZ = "UTC";
const DAY = 24 * 60 * 60 * 1000;
// A fixed, DST-agnostic instant (UTC) — 2026-06-15T09:00Z (a Monday).
const NOW = Date.UTC(2026, 5, 15, 9, 0, 0);

function makeChore(over: Partial<SharedChore> = {}): SharedChore {
  return {
    id: "chore1",
    label: { spokenLabel: "Take out the trash", emoji: "🗑️", color: "#7BD389" },
    childIds: ["A", "B"],
    cadence: "daily",
    rotationAnchorDay: isoDay(NOW, TZ),
    manualHolderIndex: 0,
    completionAdvanceCount: 0,
    daypart: "evening",
    tokenValue: 2,
    templateId: null,
    schedule: { daysOfWeek: [] },
    active: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  };
}

describe("anchor arithmetic (DST-safe calendar days)", () => {
  it("daysSinceAnchor / weeksSinceAnchor floor at 0 and never go negative", () => {
    const chore = makeChore();
    expect(daysSinceAnchor(chore.rotationAnchorDay, NOW, TZ)).toBe(0);
    expect(daysSinceAnchor(chore.rotationAnchorDay, NOW + 3 * DAY, TZ)).toBe(3);
    expect(weeksSinceAnchor(chore.rotationAnchorDay, NOW + 9 * DAY, TZ)).toBe(1);
    // a "now" BEFORE the anchor never rewinds the rotation
    expect(daysSinceAnchor(chore.rotationAnchorDay, NOW - 5 * DAY, TZ)).toBe(0);
  });
});

describe("currentHolderId — cadence correctness (acceptance #4)", () => {
  it("daily rotates A → B → A each day", () => {
    const chore = makeChore({ cadence: "daily" });
    expect(currentHolderId(chore, NOW, TZ)).toBe("A");
    expect(currentHolderId(chore, NOW + DAY, TZ)).toBe("B");
    expect(currentHolderId(chore, NOW + 2 * DAY, TZ)).toBe("A");
  });

  it("weekly flips every 7 days", () => {
    const chore = makeChore({ cadence: "weekly" });
    expect(currentHolderId(chore, NOW, TZ)).toBe("A");
    expect(currentHolderId(chore, NOW + 6 * DAY, TZ)).toBe("A"); // still week 0
    expect(currentHolderId(chore, NOW + 7 * DAY, TZ)).toBe("B");
    expect(currentHolderId(chore, NOW + 14 * DAY, TZ)).toBe("A");
  });

  it("perCompletion advances only on the completion counter (never the clock)", () => {
    const base = makeChore({ cadence: "perCompletion", completionAdvanceCount: 0 });
    expect(currentHolderId(base, NOW, TZ)).toBe("A");
    // a full week passing does NOT advance a perCompletion chore
    expect(currentHolderId(base, NOW + 30 * DAY, TZ)).toBe("A");
    expect(currentHolderId({ ...base, completionAdvanceCount: 1 }, NOW, TZ)).toBe("B");
    expect(currentHolderId({ ...base, completionAdvanceCount: 2 }, NOW, TZ)).toBe("A");
  });

  it("manual follows manualHolderIndex only", () => {
    const base = makeChore({ cadence: "manual" });
    expect(currentHolderId({ ...base, manualHolderIndex: 0 }, NOW + 5 * DAY, TZ)).toBe("A");
    expect(currentHolderId({ ...base, manualHolderIndex: 1 }, NOW, TZ)).toBe("B");
    expect(currentHolderId({ ...base, manualHolderIndex: 2 }, NOW, TZ)).toBe("A"); // mod 2
  });

  it("manualHolderIndex composes as a 'pass to next' offset on every cadence", () => {
    // daily holder today = A; a manual pass (+1) hands it to B for the same day.
    const chore = makeChore({ cadence: "daily", manualHolderIndex: 1 });
    expect(currentHolderId(chore, NOW, TZ)).toBe("B");
  });

  it("is modulo-safe for any roster length (3-way wraparound)", () => {
    const chore = makeChore({ cadence: "daily", childIds: ["A", "B", "C"] });
    expect(currentHolderId(chore, NOW, TZ)).toBe("A");
    expect(currentHolderId(chore, NOW + DAY, TZ)).toBe("B");
    expect(currentHolderId(chore, NOW + 2 * DAY, TZ)).toBe("C");
    expect(currentHolderId(chore, NOW + 3 * DAY, TZ)).toBe("A");
  });
});

describe("empty / single-member rosters are inactive", () => {
  it("an empty roster yields index -1 / holder null and is not active", () => {
    const chore = makeChore({ childIds: [] });
    expect(currentHolderIndex(chore, NOW, TZ)).toBe(-1);
    expect(currentHolderId(chore, NOW, TZ)).toBeNull();
    expect(isChoreActive(chore)).toBe(false);
  });

  it("a one-member roster is not a rotation (isChoreActive false)", () => {
    expect(isChoreActive(makeChore({ childIds: ["A"] }))).toBe(false);
    // active flag off also deactivates a full roster
    expect(isChoreActive(makeChore({ active: false }))).toBe(false);
    expect(isChoreActive(makeChore())).toBe(true);
  });
});

describe("isChoreScheduledToday — weekday semantics", () => {
  it("empty daysOfWeek means every day", () => {
    expect(isChoreScheduledToday(makeChore({ schedule: { daysOfWeek: [] } }), NOW, TZ)).toBe(true);
  });

  it("honors a weekday restriction (NOW is a Monday = 1)", () => {
    // Monday-only chore → scheduled today, not on Tuesday.
    const mon = makeChore({ schedule: { daysOfWeek: [1] } });
    expect(isChoreScheduledToday(mon, NOW, TZ)).toBe(true);
    expect(isChoreScheduledToday(mon, NOW + DAY, TZ)).toBe(false);
  });

  it("honors a oneOff date", () => {
    const oneOff = makeChore({ schedule: { daysOfWeek: [], oneOff: isoDay(NOW, TZ) } });
    expect(isChoreScheduledToday(oneOff, NOW, TZ)).toBe(true);
    expect(isChoreScheduledToday(oneOff, NOW + DAY, TZ)).toBe(false);
  });
});

describe("choreTaskFor — materialised Task shape", () => {
  it("builds a normal per-child Task carrying chore provenance", () => {
    const chore = makeChore({ tokenValue: 3 });
    const task = choreTaskFor(chore, "A", "task-1", NOW, TZ);
    expect(task.id).toBe("task-1");
    expect(task.childId).toBe("A");
    expect(task.choreId).toBe("chore1");
    expect(task.choreHolderDay).toBe(isoDay(NOW, TZ));
    expect(task.routineId).toBeNull();
    expect(task.status).toBe("todo");
    expect(task.deadline).toBe("today");
    expect(task.tokenValue).toBe(3);
    expect(task.verification.mode).toBe("none");
    expect(task.archived).toBe(false);
    // no shame-bearing field is introduced (it is an ordinary Task).
    expect(["todo", "done", "skipped"]).toContain(task.status);
  });

  it("floors the payout at 1 (never a zero-token chore)", () => {
    const task = choreTaskFor(makeChore({ tokenValue: 0 }), "A", "t", NOW, TZ);
    expect(task.tokenValue).toBe(1);
  });
});

describe("rotationPreview — next-N holder preview", () => {
  it("returns the next N days with the resolved holder (every-day daily)", () => {
    const chore = makeChore({ cadence: "daily" });
    const preview = rotationPreview(chore, NOW, TZ, 4);
    expect(preview).toHaveLength(4);
    expect(preview.map((p) => p.holderId)).toEqual(["A", "B", "A", "B"]);
    expect(preview[0].day).toBe(isoDay(NOW, TZ));
    expect(preview[1].day).toBe(isoDay(NOW + DAY, TZ));
  });

  it("skips unscheduled weekdays so the preview only shows active days", () => {
    // Monday-only → all preview days fall on a Monday (weekday 1).
    const chore = makeChore({ cadence: "weekly", schedule: { daysOfWeek: [1] } });
    const preview = rotationPreview(chore, NOW, TZ, 3);
    expect(preview).toHaveLength(3);
    for (const entry of preview) {
      const [y, m, d] = entry.day.split("-").map((n) => parseInt(n, 10));
      expect(new Date(Date.UTC(y, m - 1, d)).getUTCDay()).toBe(1);
    }
  });
});

// A tiny exhaustiveness nudge so a future cadence member is caught by the compiler
// when it lands (kept RN-free / pure).
describe("cadence union coverage", () => {
  it("every cadence resolves a holder without throwing", () => {
    const cadences: RotationCadence[] = ["daily", "weekly", "perCompletion", "manual"];
    for (const cadence of cadences) {
      expect(() => currentHolderId(makeChore({ cadence }), NOW, TZ)).not.toThrow();
    }
  });
});
