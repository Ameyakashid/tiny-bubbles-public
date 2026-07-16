/**
 * src/services/report.ts — the ONLY module that imports expo-print / expo-sharing
 * (clinician-reporting §4 / §5, M-D1). Turns a pure `ReportModel` into a shareable
 * / printable PDF entirely ON-DEVICE (no network, no AI).
 *
 * All native access is LAZY (an indirect `require` inside the functions) and
 * wrapped in try/catch, so:
 *   - the web build never imports a native module at module scope (it degrades to
 *     the browser print dialog — §6.4), and
 *   - jest can `jest.mock("expo-print")` / `jest.mock("expo-sharing")` and these
 *     lazy requires resolve to the mocks.
 *
 * OFFLINE: `printToFileAsync` renders the HTML to a PDF locally; the file only
 * ever goes where the PARENT explicitly sends it via the OS share sheet. Nothing
 * auto-uploads.
 */
import type { ReportModel } from "../domain/report";

import { renderReportHtml } from "./reportHtml";

type PrintModule = typeof import("expo-print");
type SharingModule = typeof import("expo-sharing");

/** Indirect require so neither web bundling nor TS statically pulls the native
 *  module at module scope; jest.mock still intercepts by module path. */
function lazyRequire<T>(name: string): T {
  const req =
    typeof require === "function" ? (require as (n: string) => unknown) : undefined;
  if (!req) throw new Error(`[report] no require available to load ${name}`);
  return req(name) as T;
}

export type ShareReportResult =
  | { ok: true; mode: "shared" | "printed" }
  | { ok: false; reason: "unavailable" | "error" };

/**
 * Open the native/browser print dialog for the report. On web this is the browser
 * print dialog; on device it is the OS print sheet. No-throw.
 */
export async function printReport(model: ReportModel): Promise<ShareReportResult> {
  try {
    const Print = lazyRequire<PrintModule>("expo-print");
    await Print.printAsync({ html: renderReportHtml(model) });
    return { ok: true, mode: "printed" };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/**
 * Render the report to a PDF file on-device and hand it to the OS share sheet.
 * Degrades gracefully: if sharing is unavailable (some web/desktop) it falls back
 * to the print dialog with the same content; if PDF generation itself is
 * unavailable (web) it also falls back to the print dialog. No-throw, no network.
 */
export async function shareReportPdf(model: ReportModel): Promise<ShareReportResult> {
  const html = renderReportHtml(model);
  let uri: string;
  try {
    const Print = lazyRequire<PrintModule>("expo-print");
    const file = await Print.printToFileAsync({ html });
    uri = file.uri;
  } catch {
    // PDF generation unavailable (e.g. web) → degrade to the print dialog.
    return printReport(model);
  }

  try {
    const Sharing = lazyRequire<SharingModule>("expo-sharing");
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Progress report",
        UTI: "com.adobe.pdf",
      });
      return { ok: true, mode: "shared" };
    }
  } catch {
    // fall through to the print dialog below
  }
  // Sharing not available → offer the same PDF through the print dialog.
  return printReport(model);
}
