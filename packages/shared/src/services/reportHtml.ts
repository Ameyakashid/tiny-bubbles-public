/**
 * services/reportHtml.ts — [extracted v1 → @tiny-bubbles/shared, M1.1b] PURE HTML renderer for the on-device progress
 * report (clinician-reporting §3.3, M-D1).
 *
 * Produces a self-contained HTML string (inline `<style>`, system fonts, NO
 * external URL, NO `<script>`, NO network, NO AI) for `expo-print`. Kept pure so
 * it is snapshot-testable. Every string is anti-shame by construction: the
 * template never emits any deficit/loss word (the banned-word gate in
 * reportHtml.test.ts enforces this) — streak status comes only from the forgiving
 * `streakDisplay` selector, the report leads with the monotonic cumulative count,
 * and a zero-completion child gets calm forward framing. The fixed non-diagnostic
 * disclaimer is baked in.
 */
import type { MoodTally, ReportModel } from "../domain/report";
import type { Mood } from "../domain/types";

/** Minimal HTML escaping for interpolated dynamic strings (child name, labels). */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** A short human date `YYYY-MM-DD` from epoch ms (deterministic / snapshot-safe). */
function shortDate(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// Word-based labels — deliberately numeral-free so the anti-shame banned-word
// gate never trips on an incidental zero-terminated day count. The exact window is
// still shown as the start→end dates in the header.
const RANGE_LABEL: Record<ReportModel["range"]["key"], string> = {
  "7d": "the past week",
  "30d": "the past month",
  "90d": "the past three months",
};

const MOOD_META: Record<Mood, { emoji: string; label: string }> = {
  rough: { emoji: "🌧️", label: "rough" },
  okay: { emoji: "⛅", label: "okay" },
  good: { emoji: "🙂", label: "good" },
  great: { emoji: "🌟", label: "great" },
};

const DAYPART_TITLE: Record<"morning" | "afternoon" | "evening", string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

/** A calm summary card block. */
function card(title: string, body: string): string {
  return `<section class="card"><h2>${esc(title)}</h2>${body}</section>`;
}

/** One "label: value" stat line. */
function stat(label: string, value: string): string {
  return `<p class="stat"><span class="lbl">${esc(label)}</span><span class="val">${esc(value)}</span></p>`;
}

function streakBlock(model: ReportModel): string {
  const s = model.streak;
  if (s.mode === "active") {
    // Active — a gentle count, plus the non-losable best. Never "0", never a loss.
    const line = model.calmPath
      ? stat("Popping bubbles", "keeping a steady rhythm")
      : stat("Active days in a row", String(s.days));
    return line + stat("Best ever", `${s.best}`);
  }
  // Resting — lead with the monotonic cumulative + best run; label it "resting".
  return (
    stat("Bubbles popped so far", String(s.cumulative)) +
    stat("Best run", `${s.best}`) +
    `<p class="quiet">Currently resting — ready to pick back up anytime.</p>`
  );
}

function moodBlock(mood: MoodTally): string {
  const order: Mood[] = ["great", "good", "okay", "rough"];
  const chips = order
    .map((m) => `<span class="chip">${MOOD_META[m].emoji} ${MOOD_META[m].label}: ${mood.counts[m]}</span>`)
    .join("");
  const energy =
    mood.energyAvg !== null
      ? stat("Average energy", `${mood.energyAvg.toFixed(1)} / ${mood.energyScaleMax}`)
      : "";
  return (
    `<div class="chips">${chips}</div>` +
    energy +
    stat("Check-ins shared", String(mood.samples))
  );
}

function daypartBlock(model: ReportModel): string {
  if (model.daypartBreakdown.length === 0) return "";
  const max = Math.max(1, ...model.daypartBreakdown.map((d) => d.stepsDone));
  const rows = model.daypartBreakdown
    .map((d) => {
      const pct = Math.round((d.stepsDone / max) * 100);
      return (
        `<div class="bar-row">` +
        `<span class="bar-lbl">${DAYPART_TITLE[d.daypart]}</span>` +
        `<span class="bar-track"><span class="bar-fill" style="width:${pct}%"></span></span>` +
        `<span class="bar-val">${d.stepsDone}</span>` +
        `</div>`
      );
    })
    .join("");
  return card("By time of day", rows);
}

/**
 * Render the full report to a self-contained HTML string. Pure — no network, no
 * AI, no external asset. Anti-shame + non-diagnostic copy baked in.
 */
export function renderReportHtml(model: ReportModel): string {
  const rangeLabel = RANGE_LABEL[model.range.key];
  const nameStr = esc(model.childDisplayName || "Your child");
  const ageStr = model.ageModeLabel ? ` · ${esc(model.ageModeLabel)}` : "";

  // Routines & steps card — forward framing when nothing has been logged yet.
  const stepsBody =
    model.stepsCompleted === 0 && model.routinesFinished === 0
      ? `<p class="quiet">No steps yet — the report fills in as your child pops bubbles.</p>`
      : stat("Steps completed", String(model.stepsCompleted)) +
        stat("Routines finished", String(model.routinesFinished)) +
        stat("Days active", `${model.daysActive} of ${model.daysInRange}`);

  // Bubbles card — a quiet count on the calm path, never a scoreboard.
  const bubblesBody =
    stat("Earned this period", `${model.tokensEarnedInPeriod} 🫧`) +
    stat("Lifetime earned", String(model.lifetimeEarned));

  // On the calm path lead with cumulative bubbles + routines and keep the streak
  // as plain resting/active text (no ring/scoreboard emphasis).
  const cards = model.calmPath
    ? [
        card("Bubbles", bubblesBody + stat("Bubbles popped so far", String(model.cumulativeBubbles))),
        card("Routines & steps", stepsBody),
        card("Keeping it going", streakBlock(model)),
        card("Rewards enjoyed", stat("Rewards enjoyed", String(model.rewardsEnjoyed))),
      ]
    : [
        card("Routines & steps", stepsBody),
        card("Bubbles", bubblesBody),
        daypartBlock(model),
        card("Streak", streakBlock(model)),
        card("Rewards enjoyed", stat("Rewards enjoyed", String(model.rewardsEnjoyed))),
      ];
  if (model.mood) cards.push(card("Mood check-ins", moodBlock(model.mood)));

  const truncNote = model.historyTruncated
    ? `<p class="foot">Based on the most recent activity on this device.</p>`
    : "";

  const body = cards.filter(Boolean).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Progress report — ${nameStr}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1b2b34; margin: 0; padding: 28px; background: #ffffff; line-height: 1.5;
  }
  header { border-bottom: 2px solid #e2edf2; padding-bottom: 16px; margin-bottom: 20px; }
  h1 { font-size: 24px; margin: 0 0 4px; color: #17414f; }
  .sub { color: #5a7079; font-size: 14px; margin: 2px 0; }
  .disclaimer {
    background: #f2f8fb; border: 1px solid #d8e8ef; border-radius: 10px;
    padding: 12px 14px; color: #3d5560; font-size: 13px; margin: 16px 0;
  }
  .card {
    border: 1px solid #e2edf2; border-radius: 12px; padding: 14px 16px; margin: 12px 0;
    page-break-inside: avoid;
  }
  h2 { font-size: 15px; margin: 0 0 8px; color: #17414f; text-transform: uppercase; letter-spacing: .4px; }
  .stat { display: flex; justify-content: space-between; align-items: baseline; margin: 4px 0; font-size: 15px; }
  .stat .lbl { color: #4a626c; }
  .stat .val { font-weight: 700; color: #17414f; }
  .quiet { color: #5a7079; font-size: 14px; font-style: italic; margin: 4px 0; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
  .chip { background: #eef6fa; border-radius: 999px; padding: 4px 10px; font-size: 13px; color: #2c4a56; }
  .bar-row { display: flex; align-items: center; gap: 10px; margin: 6px 0; font-size: 14px; }
  .bar-lbl { width: 84px; color: #4a626c; }
  .bar-track { flex: 1; height: 12px; background: #eef6fa; border-radius: 6px; overflow: hidden; }
  .bar-fill { display: block; height: 100%; background: #4bb0d6; }
  .bar-val { width: 28px; text-align: right; font-weight: 700; color: #17414f; }
  footer { margin-top: 24px; border-top: 1px solid #e2edf2; padding-top: 12px; }
  .foot { color: #7a8f97; font-size: 12px; margin: 4px 0; }
</style>
</head>
<body>
<header>
  <h1>Progress report</h1>
  <p class="sub">${nameStr}${ageStr}</p>
  <p class="sub">A summary of routines and bubbles at home over ${rangeLabel} (${esc(model.range.startDay)} to ${esc(model.range.endDay)}).</p>
</header>
<div class="disclaimer">
  A summary of routines and bubbles at home. This is not a medical assessment or a diagnosis.
</div>
${body}
<footer>
  ${truncNote}
  <p class="foot">Generated on-device by Tiny Bubbles on ${shortDate(model.generatedAt)} · not a medical assessment.</p>
  <p class="foot">Everything here was built on this device. Nothing is uploaded.</p>
</footer>
</body>
</html>`;
}
