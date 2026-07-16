/**
 * src/i18n/en.ts — re-export seam (M1.1b extraction, §2B discipline).
 * THE English source catalog now lives in `@tiny-bubbles/shared/i18n/en`
 * (02-architecture §2.1 barrel ownership — the shared `resolveContent` reads
 * it; the parent app renders the same kid-safe copy in previews). Copy stays
 * scanned by the anti-shame / no-mood-interpretation grep gates. This thin
 * re-export keeps every existing kid import working unchanged.
 */
export * from "@tiny-bubbles/shared/i18n/en";
