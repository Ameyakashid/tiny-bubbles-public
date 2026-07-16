/**
 * theme/resolveStatusPresentation.ts — [extracted v1 → @tiny-bubbles/shared, M1.1b] triple-coding resolver (§2.4).
 *
 * Guarantees every status carries THREE redundant channels — an `icon`, a
 * non-color `shape`, and a resolvable `labelKey` — plus a `colorKey`, so a
 * component renders icon + shape + label and NEVER color alone (`61` §12.4,
 * colorblind-safe). The palette pairing is blue↔gold, never red↔green: a "done"
 * step is check-bubble + success + "Done"; "to do" is an outline ring + neutral +
 * "To do"; "skipped" is a soft dash + textDim + "Later". Pure + unit-testable;
 * `labelKey` resolves through `resolveContent`/`getMessage` (age variants apply).
 */
import type { Daypart } from "../domain/types";
import type { CopyKey } from "./resolveContent";
import type { ThemeColors } from "./tokens";

/** The non-color redundant channel — a distinct SHAPE per status/daypart. */
export type StatusShape = "check" | "ring" | "dash" | "dot";
export type DaypartShape = "sun" | "cloud" | "moon" | "stars";

/** A step/status the runner + progress surfaces present. */
export type StatusKey = "done" | "todo" | "skipped" | "active" | "upcoming";

export interface StatusPresentation {
  /** glyph/emoji channel (visible + decorative-hidden where the label carries it) */
  icon: string;
  /** the non-color redundant channel (drives an outline vs filled vs dashed shape) */
  shape: StatusShape;
  /** a key of `ThemeColors` — the color channel (never the ONLY signal) */
  colorKey: keyof ThemeColors;
  /** a `resolveContent` copy key → the text channel (icon + shape + LABEL) */
  labelKey: CopyKey;
}

export interface DaypartPresentation {
  icon: string;
  shape: DaypartShape;
  colorKey: keyof ThemeColors;
  labelKey: CopyKey;
}

// Blue↔gold, never red↔green: `done` uses `success` but is ALSO a filled check
// shape + "Done" label, so color is never load-bearing (colorblind-safe).
const STATUS: Record<StatusKey, StatusPresentation> = {
  done: { icon: "✓", shape: "check", colorKey: "success", labelKey: "status.done" },
  todo: { icon: "○", shape: "ring", colorKey: "textDim", labelKey: "status.todo" },
  upcoming: { icon: "○", shape: "ring", colorKey: "textDim", labelKey: "status.todo" },
  skipped: { icon: "–", shape: "dash", colorKey: "textDim", labelKey: "status.skipped" },
  active: { icon: "▸", shape: "dot", colorKey: "primary", labelKey: "status.active" },
};

const DAYPART: Record<Daypart, DaypartPresentation> = {
  morning: { icon: "🌤", shape: "cloud", colorKey: "token", labelKey: "daypart.title.morning" },
  afternoon: { icon: "☀️", shape: "sun", colorKey: "accent", labelKey: "daypart.title.afternoon" },
  evening: { icon: "🌙", shape: "moon", colorKey: "secondary", labelKey: "daypart.title.evening" },
  night: { icon: "✨", shape: "stars", colorKey: "info", labelKey: "daypart.title.night" },
};

/** Triple-coded presentation for a step status (icon + shape + label + color). */
export function resolveStatusPresentation(status: StatusKey): StatusPresentation {
  return STATUS[status];
}

/** Triple-coded presentation for a daypart. */
export function resolveDaypartPresentation(daypart: Daypart): DaypartPresentation {
  return DAYPART[daypart];
}
