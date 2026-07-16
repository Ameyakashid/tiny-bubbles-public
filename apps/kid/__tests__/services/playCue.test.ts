import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { playCue, registerCuePlayer, type CueId } from "../../src/services/playCue";

/**
 * The audio cue facade (doc 66 §1b.1 / M7). M7 ships it as a deliberate NO-OP —
 * no licensed audio asset exists yet and the donor's pop mp3 must NEVER be lifted
 * (doc 66 §1b.9). M13 registers the real imperative player via `registerCuePlayer`.
 * These tests pin that contract so the loop's timing/payout can never be broken by
 * a missing or throwing cue.
 */
describe("playCue facade", () => {
  afterEach(() => registerCuePlayer(null));

  it("is a safe no-op before any player is registered (M7 default)", () => {
    expect(() => playCue("step.done")).not.toThrow();
  });

  it("routes to the registered player (M13 registry seam)", () => {
    const heard: CueId[] = [];
    registerCuePlayer((cue) => heard.push(cue));
    playCue("step.done");
    playCue("routine.complete");
    const expected: CueId[] = ["step.done", "routine.complete"];
    expect(heard).toEqual(expected);
  });

  it("swallows a throwing player so a cue can never break the loop", () => {
    registerCuePlayer(() => {
      throw new Error("audio device unavailable");
    });
    expect(() => playCue("token.payout")).not.toThrow();
  });

  it("can be unregistered back to the no-op", () => {
    const fn = jest.fn();
    registerCuePlayer(fn);
    playCue("tap.soft");
    registerCuePlayer(null);
    playCue("tap.soft");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
