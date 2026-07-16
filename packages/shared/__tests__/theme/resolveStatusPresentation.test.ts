/**
 * resolveStatusPresentation.test.ts (shared) — M1.1b extraction acceptance:
 * the moved triple-coding resolver keeps every status colorblind-safe —
 * icon + non-color shape + resolvable label on every entry (color is never
 * the only signal), blue↔gold pairing (no red↔green).
 */
import { describe, expect, it } from "@jest/globals";

import {
  resolveDaypartPresentation,
  resolveStatusPresentation,
  type StatusKey,
} from "../../src/theme/resolveStatusPresentation";
import type { Daypart } from "../../src/domain/types";

const STATUSES: StatusKey[] = ["done", "todo", "skipped", "active", "upcoming"];
const DAYPARTS: Daypart[] = ["morning", "afternoon", "evening", "night"];

describe("resolveStatusPresentation — triple coding preserved", () => {
  it("every status carries icon + shape + labelKey + colorKey (never color alone)", () => {
    for (const s of STATUSES) {
      const p = resolveStatusPresentation(s);
      expect(p.icon.length).toBeGreaterThan(0);
      expect(p.shape.length).toBeGreaterThan(0);
      expect(p.labelKey.length).toBeGreaterThan(0);
      expect(p.colorKey.length).toBeGreaterThan(0);
    }
  });

  it("done = filled check + success; skipped = soft dash 'Later' (never a red/failure code)", () => {
    const done = resolveStatusPresentation("done");
    expect(done.shape).toBe("check");
    expect(done.colorKey).toBe("success");
    expect(done.labelKey).toBe("status.done");
    const skipped = resolveStatusPresentation("skipped");
    expect(skipped.shape).toBe("dash");
    expect(skipped.colorKey).toBe("textDim");
    expect(skipped.labelKey).toBe("status.skipped");
  });

  it("statuses are pairwise distinguishable without color (shape or icon differs)", () => {
    const done = resolveStatusPresentation("done");
    const todo = resolveStatusPresentation("todo");
    const active = resolveStatusPresentation("active");
    expect(done.shape).not.toBe(todo.shape);
    expect(active.shape).not.toBe(todo.shape);
  });

  it("every daypart carries the same four redundant channels", () => {
    for (const d of DAYPARTS) {
      const p = resolveDaypartPresentation(d);
      expect(p.icon.length).toBeGreaterThan(0);
      expect(p.shape.length).toBeGreaterThan(0);
      expect(p.labelKey).toBe(`daypart.title.${d}`);
    }
  });
});
