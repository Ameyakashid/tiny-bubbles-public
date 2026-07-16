/**
 * __tests__/state/focusSession.test.ts — the in-memory focus-session store
 * transitions (focus-intervals §4 CREATE #9).
 *
 * Proves: start → focus; focus → break (blocksCompleted++, movement prompt rotates
 * DETERMINISTICALLY); break → focus; pause freezes the remaining and resume
 * re-anchors so NO time is lost; finish → done keeps the neutral count; stop clears.
 * The store is deterministic (callers pass `now`; no `Date.now()`, no `Math.random`).
 */
import { beforeEach, describe, expect, it } from "@jest/globals";

import { MOVEMENT_PROMPTS } from "../../src/data/focusBreaks";
import { focusRemainingMs, nextMovementPrompt } from "../../src/domain/focus";
import { useFocusSessionStore } from "../../src/state/focusSessionStore";

const T0 = 1_700_000_000_000;
const CID = "c1";

const s = () => useFocusSessionStore.getState();

beforeEach(() => {
  useFocusSessionStore.setState({ session: null });
});

describe("start", () => {
  it("begins a fresh session at the first focus block (neutral counters)", () => {
    s().start({ childId: CID, focusMinutes: 10, breakMinutes: 3, movementBreaks: true }, T0);
    const sess = s().session!;
    expect(sess.phase).toBe("focus");
    expect(sess.childId).toBe(CID);
    expect(sess.phaseStartedAt).toBe(T0);
    expect(sess.focusMinutes).toBe(10);
    expect(sess.breakMinutes).toBe(3);
    expect(sess.movementBreaks).toBe(true);
    expect(sess.blocksCompleted).toBe(0);
    expect(sess.promptIndex).toBe(0);
    expect(sess.paused).toBe(false);
  });
});

describe("focus → break → focus (deterministic prompt rotation)", () => {
  it("increments blocksCompleted and rotates the movement prompt across breaks", () => {
    s().start({ childId: CID, focusMinutes: 10, breakMinutes: 3, movementBreaks: true }, T0);

    // first break: prompt index 0
    s().toBreak(T0 + 10 * 60_000);
    expect(s().session!.phase).toBe("break");
    expect(s().session!.blocksCompleted).toBe(1);
    expect(s().session!.promptIndex).toBe(0);

    // back to focus, then a second break: prompt index rotates to 1
    s().toFocus(T0 + 13 * 60_000);
    expect(s().session!.phase).toBe("focus");
    s().toBreak(T0 + 23 * 60_000);
    expect(s().session!.blocksCompleted).toBe(2);
    expect(s().session!.promptIndex).toBe(1);

    // a third break rotates to 2 (deterministic, no RNG)
    s().toFocus(T0 + 26 * 60_000);
    s().toBreak(T0 + 36 * 60_000);
    expect(s().session!.blocksCompleted).toBe(3);
    expect(s().session!.promptIndex).toBe(2);
  });

  it("the rotated promptIndex maps to distinct curated prompts (matches nextMovementPrompt)", () => {
    s().start({ childId: CID, focusMinutes: 10, breakMinutes: 3, movementBreaks: true }, T0);
    const seen: string[] = [];
    let now = T0;
    for (let n = 0; n < 3; n++) {
      now += 10 * 60_000;
      s().toBreak(now);
      const { prompt } = nextMovementPrompt(s().session!.promptIndex, MOVEMENT_PROMPTS);
      seen.push(prompt!.id);
      now += 3 * 60_000;
      s().toFocus(now);
    }
    // three consecutive breaks show three DIFFERENT prompts (rotation, not repeat)
    expect(new Set(seen).size).toBe(3);
    expect(seen).toEqual([
      MOVEMENT_PROMPTS[0].id,
      MOVEMENT_PROMPTS[1].id,
      MOVEMENT_PROMPTS[2].id,
    ]);
  });
});

describe("pause / resume (no time lost)", () => {
  it("freezes the remaining and re-anchors so remaining is unchanged after resume", () => {
    s().start({ childId: CID, focusMinutes: 10, breakMinutes: 3, movementBreaks: true }, T0);

    // pause 3 minutes in → 7 minutes frozen
    s().pause(T0 + 3 * 60_000);
    expect(s().session!.paused).toBe(true);
    expect(s().session!.pausedRemainingMs).toBe(7 * 60_000);

    // resume much later (as if the app was backgrounded/idle a long while)
    const resumeAt = T0 + 100 * 60_000;
    s().resume(resumeAt);
    const sess = s().session!;
    expect(sess.paused).toBe(false);
    expect(sess.pausedRemainingMs).toBeUndefined();
    // the wall-clock remaining at the resume instant is STILL 7 minutes — no loss.
    expect(focusRemainingMs(sess.phaseStartedAt, sess.focusMinutes, resumeAt)).toBe(7 * 60_000);
  });

  it("pause is a no-op when there is no session or already paused", () => {
    s().pause(T0); // no session
    expect(s().session).toBeNull();
    s().start({ childId: CID, focusMinutes: 10, breakMinutes: 3, movementBreaks: true }, T0);
    s().pause(T0 + 60_000);
    const frozen = s().session!.pausedRemainingMs;
    s().pause(T0 + 120_000); // already paused → unchanged
    expect(s().session!.pausedRemainingMs).toBe(frozen);
  });
});

describe("finish / stop", () => {
  it("finish moves to done and keeps the neutral block count", () => {
    s().start({ childId: CID, focusMinutes: 10, breakMinutes: 3, movementBreaks: true }, T0);
    s().toBreak(T0 + 10 * 60_000); // blocksCompleted → 1
    s().finish();
    expect(s().session!.phase).toBe("done");
    expect(s().session!.blocksCompleted).toBe(1);
  });

  it("a first-block stop reaches done with blocksCompleted 0 (no shaming zero)", () => {
    s().start({ childId: CID, focusMinutes: 10, breakMinutes: 3, movementBreaks: true }, T0);
    s().finish(); // stopped during the first block
    expect(s().session!.phase).toBe("done");
    expect(s().session!.blocksCompleted).toBe(0);
  });

  it("stop clears the in-memory session entirely", () => {
    s().start({ childId: CID, focusMinutes: 10, breakMinutes: 3, movementBreaks: true }, T0);
    s().stop();
    expect(s().session).toBeNull();
  });
});
