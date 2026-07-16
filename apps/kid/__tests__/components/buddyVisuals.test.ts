import { describe, expect, it } from "@jest/globals";

import {
  buddyPose,
  growthVisual,
  isBuddyFinish,
  VARIANT_PRESETS,
  type BuddyFinish,
} from "../../components/buddy/buddyVisuals";
import { POSITIVE_MOODS, MAX_GROWTH_STAGE } from "../../src/domain/companionMood";
import type { CompanionMood } from "../../src/domain/types";

const ALL_MOODS = POSITIVE_MOODS as readonly CompanionMood[];

describe("buddyPose — anti-shame invariants (doc 66 §5.1)", () => {
  it("every canonical mood maps to an UPWARD mouth (smile is never < 0 — no frown)", () => {
    for (const mood of ALL_MOODS) {
      const pose = buddyPose(mood);
      expect(pose.smile).toBeGreaterThanOrEqual(0);
      expect(pose.smile).toBeLessThanOrEqual(1);
    }
  });

  it("eyes are only (nearly) shut in the restful sleepy state, never elsewhere", () => {
    for (const mood of ALL_MOODS) {
      const pose = buddyPose(mood);
      expect(pose.eyeOpen).toBeGreaterThanOrEqual(0);
      expect(pose.eyeOpen).toBeLessThanOrEqual(1);
      if (mood !== "sleepy") expect(pose.eyeOpen).toBeGreaterThan(0.5);
    }
    expect(buddyPose("sleepy").drowsy).toBe(true);
    expect(buddyPose("content").drowsy).toBe(false);
  });

  it("uses the documented expressive transitions", () => {
    expect(buddyPose("celebrating").jump).toBe(true);
    expect(buddyPose("excited").jump).toBe(true);
    expect(buddyPose("proud").puff).toBeGreaterThan(1);
    expect(buddyPose("curious").tilt).toBeGreaterThan(0);
    // celebrating is the biggest beam
    expect(buddyPose("celebrating").smile).toBeGreaterThanOrEqual(buddyPose("content").smile);
  });

  it("never produces a NaN/negative bob or breathe", () => {
    for (const mood of ALL_MOODS) {
      const pose = buddyPose(mood);
      expect(Number.isFinite(pose.bob)).toBe(true);
      expect(pose.bob).toBeGreaterThanOrEqual(0);
      expect(pose.breathe).toBeGreaterThan(0);
    }
  });
});

describe("growthVisual — monotonic, rendered growth (doc 66 M6)", () => {
  it("body scale strictly increases with growth stage and clamps at MAX", () => {
    let prev = 0;
    for (let stage = 0; stage <= MAX_GROWTH_STAGE; stage += 1) {
      const v = growthVisual(stage);
      expect(v.bodyScale).toBeGreaterThan(prev);
      prev = v.bodyScale;
    }
    // beyond MAX it does not keep growing
    expect(growthVisual(MAX_GROWTH_STAGE + 5).bodyScale).toBe(
      growthVisual(MAX_GROWTH_STAGE).bodyScale,
    );
  });

  it("satellites count tracks the (clamped) stage and a halo appears later", () => {
    expect(growthVisual(0).satellites).toBe(0);
    expect(growthVisual(0).halo).toBe(false);
    expect(growthVisual(3).halo).toBe(true);
    expect(growthVisual(MAX_GROWTH_STAGE).satellites).toBe(MAX_GROWTH_STAGE);
    // garbage / negative input is floored, never throws
    expect(growthVisual(-3).satellites).toBe(0);
    expect(growthVisual(Number.NaN).bodyScale).toBe(growthVisual(0).bodyScale);
  });
});

describe("variant presets — cuddly Bloop vs cool Orbit (driven by companionStyle)", () => {
  it("Bloop is rounder with bigger eyes and cheeks; Orbit is sleeker without", () => {
    expect(VARIANT_PRESETS.bloop.cheeks).toBe(true);
    expect(VARIANT_PRESETS.orbit.cheeks).toBe(false);
    expect(VARIANT_PRESETS.bloop.eyeScale).toBeGreaterThan(VARIANT_PRESETS.orbit.eyeScale);
    expect(VARIANT_PRESETS.orbit.bodyStretch).toBeGreaterThan(VARIANT_PRESETS.bloop.bodyStretch);
    expect(VARIANT_PRESETS.bloop.expressiveness).toBeGreaterThan(
      VARIANT_PRESETS.orbit.expressiveness,
    );
  });
});

describe("isBuddyFinish — guards persisted customization.finish", () => {
  it("accepts the known finishes and rejects anything else", () => {
    const ok: BuddyFinish[] = ["plain", "sparkle", "glass", "galaxy"];
    for (const f of ok) expect(isBuddyFinish(f)).toBe(true);
    expect(isBuddyFinish("angry")).toBe(false);
    expect(isBuddyFinish(undefined)).toBe(false);
    expect(isBuddyFinish(42)).toBe(false);
  });
});
