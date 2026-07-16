/**
 * src/theme/contrast.ts — re-export seam (M1.1b extraction, §2B discipline).
 * The canonical WCAG contrast math lives in `@tiny-bubbles/shared/theme/
 * contrast` (02-architecture §2.1 barrel ownership); this thin re-export keeps
 * `contrast.test.ts` + every kid import working unchanged.
 */
export * from "@tiny-bubbles/shared/theme/contrast";
