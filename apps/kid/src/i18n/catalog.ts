/**
 * src/i18n/catalog.ts — re-export seam (M1.1b extraction, §2B discipline).
 * The canonical locale registry + fallback source lives in
 * `@tiny-bubbles/shared/i18n/catalog` (02-architecture §2.1 barrel ownership);
 * this thin re-export keeps every existing kid import working unchanged.
 * Future locales are still a pure data drop — author them in the shared
 * package and register there.
 */
export * from "@tiny-bubbles/shared/i18n/catalog";
