/**
 * src/theme/tokens.ts — re-export seam (M1.1b extraction, §2B discipline).
 * The canonical design-system token contract + the three palettes live in
 * `@tiny-bubbles/shared/theme/tokens` (02-architecture §2.1 barrel ownership);
 * this thin re-export keeps every existing kid import working unchanged.
 *
 * NativeWind note (doc 60 §7.4) still applies: the shared palette hexes are
 * mirrored as CSS variables in this app's `global.css` — keep them in sync.
 */
export * from "@tiny-bubbles/shared/theme/tokens";
