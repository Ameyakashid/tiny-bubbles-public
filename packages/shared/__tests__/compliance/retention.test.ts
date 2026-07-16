/**
 * retention.test.ts — computeTtlAt correct; default 30; typed 30|90; clamp
 * (M1.1 acceptance; §8 #10b).
 */
import { describe, expect, it } from "@jest/globals";

import {
  coerceRetentionDays,
  computeTtlAt,
  RETENTION_POLICY,
  retentionMs,
} from "../../src/compliance/retention";

const DAY = 86_400_000;

describe("RETENTION_POLICY — the canonical values (§8 #10b)", () => {
  it("default 30 (COPPA-min), allowed [30, 90], max 90", () => {
    expect(RETENTION_POLICY.defaultDays).toBe(30);
    expect(RETENTION_POLICY.allowedDays).toEqual([30, 90]);
    expect(RETENTION_POLICY.maxDays).toBe(90);
  });
});

describe("computeTtlAt — createdAt + days · 86_400_000", () => {
  it("default window is 30 days", () => {
    expect(computeTtlAt(1_700_000_000_000)).toBe(1_700_000_000_000 + 30 * DAY);
  });

  it("explicit 30 / 90 windows compute exactly", () => {
    expect(computeTtlAt(0, 30)).toBe(30 * DAY);
    expect(computeTtlAt(0, 90)).toBe(90 * DAY);
    expect(retentionMs(30)).toBe(30 * DAY);
    expect(retentionMs(90)).toBe(90 * DAY);
  });

  it("clamps to the typed 30|90 set — never a longer window than chosen", () => {
    expect(coerceRetentionDays(undefined)).toBe(30);
    expect(coerceRetentionDays(Number.NaN)).toBe(30);
    expect(coerceRetentionDays(-5)).toBe(30);
    expect(coerceRetentionDays(0)).toBe(30);
    expect(coerceRetentionDays(45)).toBe(30); // in-between never rounds UP
    expect(coerceRetentionDays(90)).toBe(90);
    expect(coerceRetentionDays(365)).toBe(90); // never beyond max
    expect(computeTtlAt(0, 365)).toBe(90 * DAY);
    expect(computeTtlAt(0, 1)).toBe(30 * DAY);
  });
});
