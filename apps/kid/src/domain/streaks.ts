/**
 * src/domain/streaks.ts — re-export seam (M1.1b extraction, §2B discipline).
 * The canonical forgiving, timezone-aware streak math (anti-shame invariants
 * intact: never zeroed, never "broken", resting not lost) lives in
 * `@tiny-bubbles/shared/domain/streaks` (02-architecture §2.1 barrel
 * ownership); this thin re-export keeps every existing kid import unchanged.
 */
export * from "@tiny-bubbles/shared/domain/streaks";
