/**
 * src/services/reportHtml.ts — re-export seam (M1.1b extraction, §2B
 * discipline). The canonical PURE `renderReportHtml` (self-contained HTML, no
 * script/network, anti-shame + non-diagnostic copy baked in) lives in
 * `@tiny-bubbles/shared/services/reportHtml` (02-architecture §2.1 barrel
 * ownership — the parent Report reuse in M3.1 renders the same HTML); this
 * thin re-export keeps `src/services/report.ts` + tests working unchanged.
 */
export * from "@tiny-bubbles/shared/services/reportHtml";
