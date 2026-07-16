/**
 * src/i18n/types.ts — re-export seam (M1.1b extraction, §2B discipline).
 * The canonical i18n type surface (incl. THE single `ModeKeyed<T>` home) lives
 * in `@tiny-bubbles/shared/i18n/types` (02-architecture §2.1 barrel ownership
 * — the shared `resolveContent`/`getMessage` build on it); this thin re-export
 * keeps every existing kid import working unchanged.
 */
export * from "@tiny-bubbles/shared/i18n/types";
