/**
 * @tiny-bubbles/shared — the cross-app barrel.
 *
 * One home per symbol (02-architecture §2.1 barrel ownership): modules are
 * extracted here incrementally — M1.1 lands the domain types + the
 * neuroProfile axis + the w8 compliance modules; M1.1b lands the RN-free v1
 * resolvers + report/moodInsight modules (+ their pure supports: i18n catalog,
 * dates/streaks/shared-constants, tokens/contrast/breakpoints); Firestore doc
 * types land in M1.2, the bloop port in M2.0. Do not park ad-hoc helpers here.
 *
 * Every symbol below has exactly ONE home (no duplicate `export *` members):
 * `ModeKeyed`/`COPY` live in `i18n/{types,en}` (NOT re-exported by
 * `theme/resolveContent`), `ScreenSize` lives in `theme/breakpoints`.
 *
 * NOT exported by design: `compliance/symbolLicenseNode` (Node-only fs gate
 * wrapper — must never enter a client bundle).
 */
export * from "./domain/types";
export * from "./domain/constants";
export * from "./domain/dates";
export * from "./domain/streaks";
export * from "./domain/moodInsight";
export * from "./domain/report";
export * from "./i18n/types";
export * from "./i18n/en";
export * from "./i18n/catalog";
export * from "./i18n/messages";
export * from "./theme/resolveNeuroPreset";
export * from "./theme/breakpoints";
export * from "./theme/tokens";
export * from "./theme/contrast";
export * from "./theme/resolveCapabilities";
export * from "./theme/resolveTokens";
export * from "./theme/resolveContent";
export * from "./theme/resolveCelebration";
export * from "./theme/resolveStatusPresentation";
export * from "./services/reportHtml";
export * from "./compliance";
export * from "./bloop";
export * from "./firestore";
export * from "./sync/types";
