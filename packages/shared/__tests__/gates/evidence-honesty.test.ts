/**
 * gates/evidence-honesty.test.ts — the tree-wide copy gate (w8 §4.6; §8 #23).
 *
 * Runs the ONE authoritative banned-claim set (`checkEvidenceHonesty`) over
 * every shipped-copy surface that exists: kid copy catalogs/data + screens,
 * parent app trees, `functions/` source, the shared modules' own strings, and
 * `docs/store-listing.md` (the FTC-facing marketing surface, §8 #23b) once it
 * lands. Surfaces that don't exist yet are skipped — the gate passes
 * VACUOUSLY there and tightens as features land (M1.1 scaffold contract).
 *
 * Comment lines are stripped (shipped copy lives in string literals; guard
 * comments documenting the rules are not shipped copy). The pattern home
 * (`compliance/evidenceHonesty.ts`) is excluded, mirroring the BUILD-GUIDE
 * §3.1 grep's own exclusion.
 */
import { describe, expect, it } from "@jest/globals";

import { checkEvidenceHonesty } from "../../src/compliance/evidenceHonesty";
import { collectFiles, formatHits, isCommentLine, REPO_ROOT, type ScanHit } from "./scanTree";

import * as fs from "node:fs";
import * as path from "node:path";

const COPY_SURFACES = [
  // kid-facing copy homes (v1 shipped + future v2 additions)
  "apps/kid/src/i18n",
  "apps/kid/src/data",
  "apps/kid/app",
  "apps/kid/components",
  // parent app (M1.0 shell; grows in M3.x)
  "apps/parent/app",
  "apps/parent/components",
  "apps/parent/src",
  // server-side persona/copy (lands M2.x)
  "functions/src",
  // the shared modules' own shipped strings (consent body, crisis copy, …)
  "packages/shared/src",
  // marketing/store copy (lands with SHIP-GATE work; §8 #23b)
  "docs/store-listing.md",
];

const EXCLUDE = [
  /packages\/shared\/src\/compliance\/evidenceHonesty\.ts$/, // the pattern home
];

function scanForClaims(): ScanHit[] {
  const hits: ScanHit[] = [];
  for (const rel of COPY_SURFACES) {
    for (const file of collectFiles(path.join(REPO_ROOT, rel))) {
      const relFile = path.relative(REPO_ROOT, file).split(path.sep).join("/");
      if (EXCLUDE.some((ex) => ex.test(relFile))) continue;
      const lines = fs.readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (isCommentLine(line)) return;
        const result = checkEvidenceHonesty(line);
        if (!result.clean) {
          for (const hit of result.hits) {
            hits.push({
              file: relFile,
              line: i + 1,
              text: `[${hit.class}] "${hit.match}" — ${line.trim().slice(0, 120)}`,
            });
          }
        }
      });
    }
  }
  return hits;
}

describe("evidence-honesty gate (w8 §4.6 / §8 #23)", () => {
  it("zero banned claims across every shipped copy surface", () => {
    const hits = scanForClaims();
    expect(
      hits.length === 0
        ? ""
        : `banned claim(s) found (scaffolds, not therapy):\n${formatHits(hits)}`,
    ).toBe("");
  });

  it("docs/store-listing.md is scanned the moment it exists (§8 #23b)", () => {
    // the FTC-facing surface: absent now (created with the SHIP-GATE work);
    // this test documents that ONCE present it is part of the scan set above.
    expect(COPY_SURFACES).toContain("docs/store-listing.md");
  });
});
