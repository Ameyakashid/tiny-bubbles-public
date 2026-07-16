import { describe, expect, it } from "@jest/globals";

import type { Daypart } from "../../src/domain/types";
import { COPY } from "../../src/i18n/en";
import {
  resolveDaypartPresentation,
  resolveStatusPresentation,
  type StatusKey,
} from "../../src/theme/resolveStatusPresentation";

/**
 * accessibility-i18n §CREATE 18 / §8.7 — triple-coding: every status/daypart
 * yields icon + shape + label (never color-only), the pairing is colorblind-safe
 * (blue↔gold, never red↔green), and every `labelKey` exists in the catalog.
 */
const STATUSES: StatusKey[] = ["done", "todo", "skipped", "active", "upcoming"];
const DAYPARTS: Daypart[] = ["morning", "afternoon", "evening", "night"];

describe("resolveStatusPresentation", () => {
  it("gives icon + shape + label + color for every status (never color-only)", () => {
    for (const status of STATUSES) {
      const p = resolveStatusPresentation(status);
      expect(p.icon.length).toBeGreaterThan(0);
      expect(p.shape.length).toBeGreaterThan(0);
      expect(p.colorKey.length).toBeGreaterThan(0);
      // the label channel resolves to real catalog copy (both age variants)
      expect(p.labelKey in COPY).toBe(true);
    }
  });

  it("distinguishes done / todo / skipped by shape AND label, not color alone", () => {
    const done = resolveStatusPresentation("done");
    const todo = resolveStatusPresentation("todo");
    const skipped = resolveStatusPresentation("skipped");
    // distinct shapes (the non-color redundant channel)
    expect(new Set([done.shape, todo.shape, skipped.shape]).size).toBe(3);
    // distinct labels
    expect(new Set([done.labelKey, todo.labelKey, skipped.labelKey]).size).toBe(3);
  });

  it("never uses a red/danger color key (blue↔gold, anti-shame palette)", () => {
    const banned = ["gentleAlert", "secondary"]; // no red/danger token exists; guard intent
    for (const status of STATUSES) {
      expect(banned).not.toContain(resolveStatusPresentation(status).colorKey);
    }
  });

  it("upcoming presents the same as todo (a not-yet step is never 'failed')", () => {
    expect(resolveStatusPresentation("upcoming").labelKey).toBe(
      resolveStatusPresentation("todo").labelKey,
    );
  });
});

describe("resolveDaypartPresentation", () => {
  it("gives icon + shape + label for every daypart with distinct shapes", () => {
    const shapes = new Set<string>();
    for (const daypart of DAYPARTS) {
      const p = resolveDaypartPresentation(daypart);
      expect(p.icon.length).toBeGreaterThan(0);
      expect(p.labelKey in COPY).toBe(true);
      shapes.add(p.shape);
    }
    expect(shapes.size).toBe(DAYPARTS.length);
  });
});
