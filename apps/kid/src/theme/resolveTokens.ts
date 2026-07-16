/**
 * src/theme/resolveTokens.ts — re-export seam (M1.1b extraction, §2B
 * discipline). The canonical token resolver lives in `@tiny-bubbles/shared/
 * theme/resolveTokens` (02-architecture §2.1 barrel ownership); this thin
 * re-export keeps every existing kid import working unchanged.
 */
export * from "@tiny-bubbles/shared/theme/resolveTokens";
