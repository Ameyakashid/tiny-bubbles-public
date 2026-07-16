/**
 * gates/symbol-license.test.ts — the license-clean symbol-set gate over the
 * ONE canonical manifest `apps/kid/assets/symbols/manifest.json` (w8 §4.6;
 * §8 #22): validates every row's license AND completeness. Passes VACUOUSLY
 * until w4 lands art (no manifest + no files), then tightens automatically —
 * a dir with files but no manifest FAILS.
 */
import { describe, expect, it } from "@jest/globals";

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { assertSymbolManifestCleanAtPath } from "../../src/compliance/symbolLicenseNode";
import { REPO_ROOT, scanTree, formatHits } from "./scanTree";

const CANONICAL_MANIFEST = path.join(REPO_ROOT, "apps/kid/assets/symbols/manifest.json");
const CANONICAL_ASSETS_DIR = path.join(REPO_ROOT, "apps/kid/assets/symbols");

function makeFixtureDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "tb-symbols-"));
}

describe("symbol-license gate (w8 §4.6 / §8 #22)", () => {
  it("the ONE canonical manifest+dir is clean (vacuous until w4 lands art)", () => {
    expect(() =>
      assertSymbolManifestCleanAtPath(CANONICAL_MANIFEST, CANONICAL_ASSETS_DIR),
    ).not.toThrow();
  });

  it("a fixture manifest containing an ARASAAC (CC-BY-NC-SA) row THROWS", () => {
    const dir = makeFixtureDir();
    fs.writeFileSync(path.join(dir, "a.png"), "png");
    const manifest = path.join(dir, "manifest.json");
    fs.writeFileSync(
      manifest,
      JSON.stringify([{ file: "a.png", source: "ARASAAC", license: "CC-BY-SA", attribution: "ARASAAC" }]),
    );
    expect(() => assertSymbolManifestCleanAtPath(manifest, dir)).toThrow(/not license-clean/);
  });

  it("a fixture manifest containing a Sclera / CC-BY-NC row THROWS", () => {
    const dir = makeFixtureDir();
    fs.writeFileSync(path.join(dir, "b.png"), "png");
    const manifest = path.join(dir, "manifest.json");
    fs.writeFileSync(
      manifest,
      JSON.stringify([{ file: "b.png", source: "Sclera (CC-BY-NC)", license: "CC-BY", attribution: "s" }]),
    );
    expect(() => assertSymbolManifestCleanAtPath(manifest, dir)).toThrow(/not license-clean/);
  });

  it("an ORPHAN asset with no manifest row THROWS (completeness — a renamed NC asset cannot slip)", () => {
    const dir = makeFixtureDir();
    fs.writeFileSync(path.join(dir, "ok.png"), "png");
    fs.writeFileSync(path.join(dir, "orphan.png"), "png");
    const manifest = path.join(dir, "manifest.json");
    fs.writeFileSync(
      manifest,
      JSON.stringify([{ file: "ok.png", source: "original tiny-bubbles art", license: "original" }]),
    );
    expect(() => assertSymbolManifestCleanAtPath(manifest, dir)).toThrow(/orphan/);
  });

  it("asset files WITHOUT any manifest at all THROW (no unmanifested art ships)", () => {
    const dir = makeFixtureDir();
    fs.writeFileSync(path.join(dir, "sneaky.png"), "png");
    expect(() =>
      assertSymbolManifestCleanAtPath(path.join(dir, "manifest.json"), dir),
    ).toThrow(/NO manifest/);
  });

  it("no ARASAAC/Sclera/NC/GPL marker in shipped asset provenance or the aac module", () => {
    const hits = scanTree(
      ["apps/kid/assets", "packages/shared/src/aac"],
      /ARASAAC|Sclera|CC-?BY-?NC|-NC-|AGPL|GPL-3/i,
      [/packages\/shared\/src\/compliance\//], // the gate's own pattern home
    );
    expect(
      hits.length === 0 ? "" : `non-commercial/copyleft marker(s):\n${formatHits(hits)}`,
    ).toBe("");
  });
});
