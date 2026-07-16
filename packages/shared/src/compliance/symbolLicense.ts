/**
 * packages/shared/src/compliance/symbolLicense.ts — the CANONICAL symbol
 * license schema + the license-clean gate core (w8 M1.1; 02-architecture
 * §8 #22, ship-gate authority).
 *
 * ONE authority: `SymbolLicense` + `SymbolAssetManifestEntry` live HERE; w4's
 * `aac/types.ts` IMPORTS/extends them, never re-declares. The ONE canonical
 * manifest is `apps/kid/assets/symbols/manifest.json` (JSON; the divergent
 * `src/data/aacSymbolManifest.ts` / `assets/aac/symbols/` paths are dropped).
 *
 * LICENSE LINE (locked): ship ONLY CC0 / public-domain / CC-BY / CC-BY-SA
 * (with attribution) / MIT / Apache-2.0 / BSD / original. **ARASAAC
 * (CC-BY-NC-SA) and Sclera (CC-BY-NC) are NON-COMMERCIAL → BANNED**; any
 * `*-NC*` and GPL/AGPL art is banned. `user` / `unknown` are modeled as
 * NEVER-SHIP (personal `.obf`/custom-tile imports stay on-device only).
 *
 * This module is PURE (RN-safe — the kid app imports the schema). The
 * fs-walking wrapper that reads the real manifest + assets dir lives in
 * `symbolLicenseNode.ts` (Node-only: gates/CI/ship-gate), keeping "fs" out of
 * every client bundle.
 */

/**
 * The canonical license union (§8 #22). `user`/`unknown` exist so personal
 * imports are REPRESENTABLE — but they are never-ship (excluded from
 * `ALLOWED_SYMBOL_LICENSES`); the gate fails any manifest row carrying them.
 */
export type SymbolLicense =
  | "CC0"
  | "public-domain"
  | "CC-BY"
  | "CC-BY-SA"
  | "MIT"
  | "Apache-2.0"
  | "BSD"
  | "original"
  /** personal on-device import (custom tile / .obf) — NEVER shipped */
  | "user"
  /** provenance not established — NEVER shipped */
  | "unknown";

/** One per-file provenance row in `apps/kid/assets/symbols/manifest.json`. */
export interface SymbolAssetManifestEntry {
  /** path relative to `assets/symbols/` */
  file: string;
  /** where the asset came from (set name / author / URL) */
  source: string;
  license: SymbolLicense;
  /** required for CC-BY / CC-BY-SA */
  attribution?: string;
}

/** Licenses a SHIPPED symbol asset may carry. (`user`/`unknown` excluded.) */
export const ALLOWED_SYMBOL_LICENSES: readonly SymbolLicense[] = [
  "CC0",
  "public-domain",
  "CC-BY",
  "CC-BY-SA",
  "MIT",
  "Apache-2.0",
  "BSD",
  "original",
];

/**
 * Banned markers — matched against the row's license AND source/attribution
 * text so a mislabeled row still trips the gate: any non-commercial CC
 * variant (`-NC`), GPL/AGPL art, and the two known-NC sets by name.
 */
export const BANNED_SYMBOL_LICENSE_PATTERNS: readonly RegExp[] = [
  /-NC(-|\b)/i, // CC-BY-NC, CC-BY-NC-SA, …
  /\bNC-SA\b/i,
  /AGPL/i,
  /\bGPL\b|GPL-\d/i,
  /ARASAAC/i,
  /Sclera/i,
];

/** True iff a single manifest row is shippable. */
export function isSymbolLicenseClean(entry: SymbolAssetManifestEntry): boolean {
  if (!ALLOWED_SYMBOL_LICENSES.includes(entry.license)) return false;
  const provenanceText = `${entry.license} ${entry.source} ${entry.attribution ?? ""}`;
  if (BANNED_SYMBOL_LICENSE_PATTERNS.some((re) => re.test(provenanceText))) return false;
  // share-alike/attribution licenses must actually carry their attribution
  if ((entry.license === "CC-BY" || entry.license === "CC-BY-SA") && !entry.attribution) {
    return false;
  }
  return true;
}

export interface SymbolManifestCheck {
  clean: boolean;
  problems: string[];
}

/**
 * The PURE gate core: validates every row's license AND completeness — every
 * shipped asset file must have a clean manifest row (an orphan/renamed NC
 * asset FAILS), and every manifest row must point at a real file (no stale
 * provenance). `assetFiles` are paths relative to the assets dir, as the Node
 * wrapper collects them.
 */
export function checkSymbolManifest(
  entries: readonly SymbolAssetManifestEntry[],
  assetFiles: readonly string[],
): SymbolManifestCheck {
  const problems: string[] = [];

  for (const entry of entries) {
    if (!isSymbolLicenseClean(entry)) {
      problems.push(
        `[${entry.file}] not license-clean (license="${entry.license}", source="${entry.source}") — ` +
          `allowed: ${ALLOWED_SYMBOL_LICENSES.join("/")}; ARASAAC/Sclera/any-NC/GPL are banned; ` +
          `user/unknown never ship`,
      );
    }
  }

  // completeness: every file under assets/symbols/ has a clean row
  const rowsByFile = new Map(entries.map((e) => [e.file, e]));
  for (const file of assetFiles) {
    if (!rowsByFile.has(file)) {
      problems.push(`[${file}] shipped asset has NO manifest row (orphan — completeness, §8 #22)`);
    }
  }
  // …and no stale row points at a missing file
  const fileSet = new Set(assetFiles);
  for (const entry of entries) {
    if (!fileSet.has(entry.file)) {
      problems.push(`[${entry.file}] manifest row has no matching asset file (stale row)`);
    }
  }

  return { clean: problems.length === 0, problems };
}

/**
 * Assert form of the pure core — throws listing every problem. The Node
 * wrapper (`symbolLicenseNode.ts` `assertSymbolManifestCleanAtPath`) feeds it
 * the real manifest + walked assets dir; tests feed it fixtures.
 */
export function assertSymbolManifestClean(
  entries: readonly SymbolAssetManifestEntry[],
  assetFiles: readonly string[],
): void {
  const result = checkSymbolManifest(entries, assetFiles);
  if (!result.clean) {
    throw new Error(
      `Symbol-license gate: ${result.problems.length} problem(s) (§8 #22):\n` +
        result.problems.join("\n"),
    );
  }
}
