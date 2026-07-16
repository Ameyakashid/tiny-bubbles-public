import { describe, it, expect } from "@jest/globals";

// M0 smoke test — proves the jest-expo harness runs and `npm test` is green.
// Real domain tests (gamification, streaks, reinforcement, companionMood,
// bonus-determinism) land in M4.
describe("smoke", () => {
  it("runs the jest-expo test harness", () => {
    expect(1 + 1).toBe(2);
  });
});
