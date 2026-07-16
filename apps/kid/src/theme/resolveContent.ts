/**
 * src/theme/resolveContent.ts — re-export seam (M1.1b extraction, §2B
 * discipline). The canonical copy resolver lives in `@tiny-bubbles/shared/
 * theme/resolveContent`; the bundled catalog lives in `@tiny-bubbles/shared/
 * i18n/*` (02-architecture §2.1 barrel ownership).
 *
 * `ModeKeyed` + `COPY` keep their v1 backward-compat re-exports HERE (their
 * one canonical home is the shared i18n module — the shared barrel exports
 * that home only; this kid-local seam preserves the historical
 * `import { ModeKeyed, COPY } from "../theme/resolveContent"` call sites).
 */
export * from "@tiny-bubbles/shared/theme/resolveContent";
export { COPY } from "@tiny-bubbles/shared/i18n/en";
export type { ModeKeyed } from "@tiny-bubbles/shared/i18n/types";
