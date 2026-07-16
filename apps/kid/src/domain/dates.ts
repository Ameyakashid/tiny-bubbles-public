/**
 * src/domain/dates.ts — re-export seam (M1.1b extraction, §2B discipline).
 * The canonical timezone-aware calendar-day + daypart helpers live in
 * `@tiny-bubbles/shared/domain/dates` (02-architecture §2.1 barrel ownership;
 * the shared report/moodInsight/streaks modules build on them); this thin
 * re-export keeps every existing kid import working unchanged.
 */
export * from "@tiny-bubbles/shared/domain/dates";
