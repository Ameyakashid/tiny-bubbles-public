/**
 * src/domain/moodInsight.ts — re-export seam (M1.1b extraction, §2B
 * discipline). The canonical no-interpretation mood selectors live in
 * `@tiny-bubbles/shared/domain/moodInsight` (02-architecture §2.1 barrel
 * ownership — the parent dashboard reuses the same math in M3.x); this thin
 * re-export keeps every existing kid import working unchanged.
 */
export * from "@tiny-bubbles/shared/domain/moodInsight";
