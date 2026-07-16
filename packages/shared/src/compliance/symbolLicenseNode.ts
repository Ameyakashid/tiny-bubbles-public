/**
 * packages/shared/src/compliance/symbolLicenseNode.ts — the Node-only symbol
 * manifest gate wrapper (w8 M1.1; §8 #22).
 *
 * Reads the ONE canonical manifest (`apps/kid/assets/symbols/manifest.json`)
 * + walks the assets dir, then delegates to the PURE core in
 * `symbolLicense.ts`. Kept OUT of the barrel and out of every client bundle
 * (it imports "fs"/"path"); consumers are the `symbol-license` gate test,
 * `scripts/ship-gate.sh`, and w4's authoring tooling.
 *
 * VACUOUS-PASS RULE (w8 §9 #7): until w4 lands art, neither the manifest nor
 * the assets dir exists — the gate passes vacuously and tightens the moment
 * either appears (a dir with files but no manifest FAILS completeness).
 */
import * as fs from "node:fs";
import * as path from "node:path";

import {
  assertSymbolManifestClean,
  type SymbolAssetManifestEntry,
} from "./symbolLicense";

/** Recursively collect files under `dir`, relative to it (POSIX separators). */
function walkFiles(dir: string, base: string = dir): string[] {
  const out: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      out.push(...walkFiles(full, base));
    } else {
      out.push(path.relative(base, full).split(path.sep).join("/"));
    }
  }
  return out;
}

/**
 * Path-based gate: load the manifest JSON + walk the assets dir, then run the
 * pure completeness + license assertion. Missing manifest AND missing/empty
 * dir ⇒ vacuous pass; files without a manifest ⇒ FAIL (completeness).
 */
export function assertSymbolManifestCleanAtPath(manifestPath: string, assetsDir: string): void {
  const manifestExists = fs.existsSync(manifestPath);
  const dirExists = fs.existsSync(assetsDir);

  const assetFiles = dirExists
    ? walkFiles(assetsDir).filter((f) => f !== path.basename(manifestPath))
    : [];

  if (!manifestExists) {
    if (assetFiles.length === 0) return; // vacuous pass — no art landed yet (w8 §9 #7)
    throw new Error(
      `Symbol-license gate: ${assetFiles.length} asset file(s) under ${assetsDir} ` +
        `but NO manifest at ${manifestPath} (completeness, §8 #22)`,
    );
  }

  const entries = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as SymbolAssetManifestEntry[];
  if (!Array.isArray(entries)) {
    throw new Error(`Symbol-license gate: ${manifestPath} must be a JSON array of manifest rows`);
  }
  assertSymbolManifestClean(entries, assetFiles);
}
