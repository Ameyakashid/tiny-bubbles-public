/**
 * reportHtml.test.ts (shared) — M1.1b extraction acceptance: the moved
 * `renderReportHtml` stays a self-contained, script-free, network-free HTML
 * renderer with the anti-shame + non-diagnostic copy baked in, and it still
 * escapes interpolated child data.
 */
import { describe, expect, it } from "@jest/globals";

import { makeRange, type ReportModel } from "../../src/domain/report";
import { renderReportHtml } from "../../src/services/reportHtml";

const NOW = Date.UTC(2026, 5, 15, 12, 0, 0);

function model(over: Partial<ReportModel> = {}): ReportModel {
  return {
    childDisplayName: "Robin",
    ageModeLabel: "Older",
    calmPath: false,
    range: makeRange("7d", NOW, "UTC"),
    stepsCompleted: 12,
    routinesFinished: 3,
    tokensEarnedInPeriod: 15,
    lifetimeEarned: 120,
    daysActive: 5,
    daysInRange: 7,
    daypartBreakdown: [
      { daypart: "morning", stepsDone: 6 },
      { daypart: "afternoon", stepsDone: 4 },
      { daypart: "evening", stepsDone: 2 },
    ],
    streak: { mode: "active", days: 4, best: 9 },
    cumulativeBubbles: 42,
    rewardsEnjoyed: 2,
    mood: null,
    historyTruncated: false,
    generatedAt: NOW,
    ...over,
  };
}

// The v1 anti-shame banned-word gate, preserved for the shared home: the
// template must never emit a deficit/loss/guilt word (ANTI-SHAME hard
// constraint) nor a trademarked-framework claim (EVIDENCE-HONESTY).
const BANNED = [
  "missed",
  "failed",
  "broken",
  "streak lost",
  "0-day",
  "0 days",
  "zones of regulation",
];

describe("renderReportHtml — self-contained + anti-shame survives the move", () => {
  it("renders a full self-contained document (no script, no external URL)", () => {
    const html = renderReportHtml(model());
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Robin");
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/https?:\/\//i);
    expect(html).not.toMatch(/src=/i); // no external asset
  });

  it("bakes in the non-diagnostic disclaimer + on-device footer", () => {
    const html = renderReportHtml(model());
    expect(html).toContain("not a medical assessment");
    expect(html).toContain("Nothing is uploaded");
  });

  it("never emits a deficit/loss word — resting streak is 'resting', not lost", () => {
    const resting = renderReportHtml(
      model({ streak: { mode: "resting", best: 9, cumulative: 42 } }),
    ).toLowerCase();
    for (const w of BANNED) {
      expect(resting).not.toContain(w);
    }
    expect(resting).toContain("resting");
  });

  it("zero completions get calm forward framing, never a shortfall", () => {
    const html = renderReportHtml(
      model({ stepsCompleted: 0, routinesFinished: 0, tokensEarnedInPeriod: 0 }),
    );
    expect(html).toContain("No steps yet");
    const lower = html.toLowerCase();
    for (const w of BANNED) {
      expect(lower).not.toContain(w);
    }
  });

  it("escapes interpolated child data (no HTML injection)", () => {
    const html = renderReportHtml(model({ childDisplayName: `<img onerror="x">&Bo"b` }));
    expect(html).not.toContain(`<img onerror`);
    expect(html).toContain("&lt;img");
    expect(html).toContain("&amp;Bo&quot;b");
  });

  it("truncation footnote appears only when historyTruncated", () => {
    expect(renderReportHtml(model({ historyTruncated: true }))).toContain(
      "most recent activity on this device",
    );
    expect(renderReportHtml(model())).not.toContain("most recent activity on this device");
  });

  it("calm path reorders to quiet framing (bubbles first, no daypart bars)", () => {
    const html = renderReportHtml(model({ calmPath: true }));
    expect(html.indexOf("Bubbles")).toBeLessThan(html.indexOf("Routines &amp; steps"));
    expect(html).not.toContain("By time of day");
  });
});
