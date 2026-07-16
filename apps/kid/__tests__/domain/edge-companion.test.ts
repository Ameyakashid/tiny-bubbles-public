/**
 * M4 ADVERSARIAL EDGE TESTS — companionMood decay timing + rapid sequences.
 *
 * The mood is a short-lived expression of the LAST positive interaction and must
 * (doc 66 §5.1): always be a positive member, settle to `content` at exactly its
 * decay window, doze to the restful `sleepy` only from `content`, measure decay
 * from the LATEST event (rapid re-triggers reset the clock), and be stable under
 * repeated decay calls. These probe the exact >= boundaries and event races.
 */
import { describe, expect, it } from "@jest/globals";

import {
  IDLE_SLEEPY_MS,
  POSITIVE_MOODS,
  applyCompanionEvent,
  type CompanionEvent,
  decayMood,
} from "../../src/domain/companionMood";
import { freshCompanion } from "../../src/domain/constants";
import type { CompanionState } from "../../src/domain/types";

function buddy(over: Partial<CompanionState> = {}): CompanionState {
  return { ...freshCompanion("c1", { speciesId: "bloop", name: "Bloop", now: 0 }), ...over };
}

// The transient moods and their decay windows (mirrors the module's DECAY_MS).
const TRANSIENT: { event: CompanionEvent; mood: string; window: number }[] = [
  { event: "stepDone", mood: "celebrating", window: 8_000 },
  { event: "collectible", mood: "excited", window: 30_000 },
  { event: "routineComplete", mood: "proud", window: 30_000 },
  { event: "tokenEarned", mood: "happy", window: 20_000 },
  { event: "tap", mood: "curious", window: 15_000 },
];

describe("decay window is inclusive at the boundary (>= settles to content)", () => {
  for (const { event, mood, window } of TRANSIENT) {
    it(`${mood}: stays one ms before the window, settles to content AT the window`, () => {
      const c = applyCompanionEvent(buddy(), event, 0);
      expect(c.mood).toBe(mood);
      expect(decayMood(c, window - 1).mood).toBe(mood); // still expressing
      expect(decayMood(c, window).mood).toBe("content"); // exactly elapsed -> settled
    });
  }
});

describe("decay measures from the LATEST event (rapid re-trigger resets the clock)", () => {
  it("a fresh event mid-decay extends expression by its full window", () => {
    let c = applyCompanionEvent(buddy(), "stepDone", 0); // celebrating, window 8s
    // Re-trigger at t=5000 with a different event -> happy (window 20s) from 5000.
    c = applyCompanionEvent(c, "tokenEarned", 5_000);
    expect(c.mood).toBe("happy");
    expect(c.moodSince).toBe(5_000);
    // 19,999ms after the LATEST event -> still happy (clock did not run from t=0)
    expect(decayMood(c, 5_000 + 19_999).mood).toBe("happy");
    expect(decayMood(c, 5_000 + 20_000).mood).toBe("content");
  });

  it("a rapid burst of events keeps the mood positive and advances moodSince each time", () => {
    let c = buddy();
    const seq: CompanionEvent[] = ["tap", "stepDone", "tokenEarned", "routineComplete", "collectible", "greet"];
    let t = 0;
    let prevSince = -1;
    for (const e of seq) {
      t += 1; // events arriving 1ms apart
      c = applyCompanionEvent(c, e, t);
      expect(POSITIVE_MOODS).toContain(c.mood);
      expect(c.moodSince).toBeGreaterThan(prevSince);
      prevSince = c.moodSince;
    }
  });
});

describe("idle -> sleepy only from content, at the exact boundary", () => {
  it("a content buddy dozes at EXACTLY IDLE_SLEEPY_MS, not one ms before", () => {
    const c = buddy({ mood: "content", moodSince: 0, lastInteractionAt: 0 });
    expect(decayMood(c, IDLE_SLEEPY_MS - 1).mood).toBe("content");
    expect(decayMood(c, IDLE_SLEEPY_MS).mood).toBe("sleepy");
  });

  it("a transient mood that is ALSO long-idle settles all the way to sleepy", () => {
    // happy expressed at 0; by IDLE_SLEEPY_MS the 20s window is long gone -> content -> sleepy.
    const c = applyCompanionEvent(buddy(), "tokenEarned", 0);
    const out = decayMood(c, IDLE_SLEEPY_MS + 1);
    expect(out.mood).toBe("sleepy");
    expect(POSITIVE_MOODS).toContain(out.mood);
  });

  it("a JUST-expressed mood is NOT dozed off even if the last *interaction* stamp is old", () => {
    // Defensive crafted state: recent mood, stale interaction. The sleepy rule only
    // applies to `content`, so an actively-expressed happy must survive.
    const c = buddy({ mood: "happy", moodSince: 1_000_000, lastInteractionAt: 0 });
    const out = decayMood(c, 1_000_000 + 1_000); // within the 20s happy window
    expect(out.mood).toBe("happy");
  });
});

describe("decay is idempotent / stable (no flip-flop)", () => {
  it("settling twice at the same instant yields the same mood", () => {
    const c = applyCompanionEvent(buddy(), "stepDone", 0);
    const once = decayMood(c, 9_000); // -> content
    const twice = decayMood(once, 9_000);
    expect(once.mood).toBe("content");
    expect(twice.mood).toBe("content");
  });

  it("a settled sleepy buddy stays sleepy under repeated decay", () => {
    const c = buddy({ mood: "content", moodSince: 0, lastInteractionAt: 0 });
    const dozed = decayMood(c, IDLE_SLEEPY_MS + 5);
    expect(dozed.mood).toBe("sleepy");
    expect(decayMood(dozed, IDLE_SLEEPY_MS + 10).mood).toBe("sleepy");
  });

  it("can NEVER reach a negative mood across a long random event+decay storm", () => {
    let c = buddy();
    const events: CompanionEvent[] = ["stepDone", "tap", "rest", "greet", "tokenEarned", "levelUp", "returnAfterAbsence", "collectible", "routineComplete"];
    let t = 0;
    for (let i = 0; i < 200; i++) {
      t += (i % 7) * 1_000; // irregular spacing
      c = i % 2 === 0 ? applyCompanionEvent(c, events[i % events.length], t) : decayMood(c, t);
      expect(POSITIVE_MOODS).toContain(c.mood);
    }
  });
});
