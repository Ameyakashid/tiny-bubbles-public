/**
 * src/theme/resolveCapabilities.ts — re-export seam (M1.1b extraction, §2B
 * discipline). The canonical resolver lives in `@tiny-bubbles/shared/theme/
 * resolveCapabilities` (02-architecture §2.1 barrel ownership); this thin
 * re-export keeps every existing kid import working unchanged.
 */
export * from "@tiny-bubbles/shared/theme/resolveCapabilities";
