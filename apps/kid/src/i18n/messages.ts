/**
 * src/i18n/messages.ts — re-export seam (M1.1b extraction, §2B discipline).
 * The canonical pure message accessor (`getMessage` + interpolation + the
 * literal-language neuro branch) lives in `@tiny-bubbles/shared/i18n/messages`
 * (02-architecture §2.1 barrel ownership); this thin re-export keeps every
 * existing kid import working unchanged.
 */
export * from "@tiny-bubbles/shared/i18n/messages";
