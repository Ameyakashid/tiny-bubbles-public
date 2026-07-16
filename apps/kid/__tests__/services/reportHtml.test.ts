/**
 * __tests__/services/reportHtml.test.ts — renderReportHtml (clinician-reporting
 * §3.3, M-D1). Guards the anti-shame + offline invariants on the RENDERED output:
 * no banned words, the non-diagnostic disclaimer present, no external URL, no
 * `<script>`, no AI/network. Pure string generator → no native mocks needed.
 */
import { describe, expect, it } from "@jest/globals";

import type { ReportModel } from "../../src/domain/report";
import { renderReportHtml } from "../../src/services/reportHtml";

const BASE: ReportModel = {
  childDisplayName: "Robin",
  ageModeLabel: "Older",
  calmPath: false,
  range: {
    key: "7d",
    startTs: 0,
    endTs: 7 * 24 * 3600 * 1000,
    startDay: "2026-06-08",
    endDay: "2026-06-15",
  },
  stepsCompleted: 12,
  routinesFinished: 4,
  tokensEarnedInPeriod: 18,
  lifetimeEarned: 240,
  daysActive: 5,
  daysInRange: 7,
  daypartBreakdown: [
    { daypart: "morning", stepsDone: 6 },
    { daypart: "afternoon", stepsDone: 3 },
    { daypart: "evening", stepsDone: 3 },
  ],
  streak: { mode: "active", days: 4, best: 9 },
  cumulativeBubbles: 240,
  rewardsEnjoyed: 2,
  mood: {
    counts: { rough: 0, okay: 1, good: 3, great: 2 },
    energyAvg: 3.4,
    energyScaleMax: 5,
    samples: 6,
  },
  historyTruncated: false,
  generatedAt: Date.UTC(2026, 5, 15, 12, 0, 0),
};

const BANNED = ["missed", "failed", "broken", "streak lost", "0-day", "0 days"];

describe("renderReportHtml", () => {
  it("never emits an anti-shame banned word", () => {
    const html = renderReportHtml(BASE).toLowerCase();
    for (const w of BANNED) expect(html).not.toContain(w);
  });

  it("never emits a banned word for a RESTING streak either", () => {
    const html = renderReportHtml({
      ...BASE,
      streak: { mode: "resting", best: 9, cumulative: 88 },
    }).toLowerCase();
    for (const w of BANNED) expect(html).not.toContain(w);
    expect(html).toContain("resting");
  });

  it("emits no banned word for the 30d / 90d ranges (no incidental '0 days')", () => {
    for (const key of ["30d", "90d"] as const) {
      const html = renderReportHtml({
        ...BASE,
        range: { ...BASE.range, key },
        daysInRange: key === "30d" ? 30 : 90,
      }).toLowerCase();
      for (const w of BANNED) expect(html).not.toContain(w);
    }
  });

  it("includes the fixed non-diagnostic disclaimer", () => {
    const html = renderReportHtml(BASE);
    expect(html).toContain("not a medical assessment or a diagnosis");
    expect(html).toContain("Nothing is uploaded");
  });

  it("has no external URL, no <script>, and no network/AI reference", () => {
    const html = renderReportHtml(BASE);
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toContain("<script");
    expect(html).not.toMatch(/openai|anthropic|langchain|fetch\(|axios/i);
  });

  it("escapes a child name so it cannot break the markup", () => {
    const html = renderReportHtml({ ...BASE, childDisplayName: "<b>Alex</b> & Co" });
    expect(html).not.toContain("<b>Alex</b>");
    expect(html).toContain("&lt;b&gt;Alex&lt;/b&gt; &amp; Co");
  });

  it("frames a zero-completion child forwardly (not a scolding empty state)", () => {
    const html = renderReportHtml({
      ...BASE,
      stepsCompleted: 0,
      routinesFinished: 0,
      daysActive: 0,
      streak: { mode: "resting", best: 0, cumulative: 0 },
      mood: null,
    }).toLowerCase();
    for (const w of BANNED) expect(html).not.toContain(w);
    expect(html).toContain("no steps yet");
  });

  it("footnotes recent-activity when the history is truncated", () => {
    const html = renderReportHtml({ ...BASE, historyTruncated: true });
    expect(html).toContain("most recent activity on this device");
  });
});
