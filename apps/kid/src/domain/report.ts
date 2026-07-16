/**
 * src/domain/report.ts — re-export seam (M1.1b extraction, §2B discipline).
 * The canonical PURE report model (`buildReport`/`ReportModel`/`makeRange`)
 * lives in `@tiny-bubbles/shared/domain/report` (02-architecture §2.1 barrel
 * ownership — the parent app's Report reuse in M3.1 imports the same module);
 * this thin re-export keeps every existing kid import working unchanged.
 */
export * from "@tiny-bubbles/shared/domain/report";
