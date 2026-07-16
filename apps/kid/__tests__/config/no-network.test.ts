/**
 * __tests__/config/no-network.test.ts — the offline no-egress CI gate
 * (production-readiness §2.5 / v2 02-architecture §1.4). Codifies the
 * BUILD-GUIDE §3 shell grep as a test so the "nothing leaves the device"
 * floor is enforced as features land, not just asserted once.
 *
 * RETARGETED in M1.0 (monorepo migration): it scans BOTH client app trees —
 * `apps/kid/{app,src,components}` AND `apps/parent/{app,src,components}` —
 * and EXCLUDES `functions/` (the ONE sanctioned raw-egress zone; it is
 * import-graph-unreachable from any app entry). It FAILS on any hit OUTSIDE
 * the exact BUILD-GUIDE §3 exclusion set — so a generated report HTML/SVG
 * namespace (`xmlns="http://www.w3.org/2000/svg"`), a documentation URL
 * (`docs.expo.dev`), a `schema` literal, or a comment line never
 * false-positive.
 *
 * KEEP IN LOCKSTEP with BUILD-GUIDE §3:
 *   grep -rniE "fetch\(|axios|XMLHttpRequest|WebSocket|sendBeacon|https?://[a-z]" \
 *     apps/kid/{app,src,components} apps/parent/{app,src,components} \
 *     | grep -viE "^[^:]+:[0-9]+: *(//|\*)|__tests__|docs.expo.dev|schema|xmlns"
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join, resolve } from "path";

import { describe, expect, it } from "@jest/globals";

/** Real client-call tokens (the egress signature). */
const EGRESS =
  /fetch\(|axios|XMLHttpRequest|WebSocket|sendBeacon|https?:\/\/[a-z]/i;

/**
 * The shared exclusion set (BUILD-GUIDE §3). A line is EXEMPT when its trimmed
 * content starts with a comment marker, OR it contains one of these non-egress
 * literals. Keep identical to the shell grep's `-viE` set.
 */
const EXCLUDE_CONTAINS = /docs\.expo\.dev|schema|xmlns/i;
const COMMENT_LINE = /^\s*(\/\/|\*)/;

/** The monorepo root (this file lives at apps/kid/__tests__/config/). */
const ROOT = resolve(__dirname, "..", "..", "..", "..");
/**
 * Client trees under scan (arch §1.4). `functions/` is deliberately ABSENT —
 * it is the only sanctioned raw-egress zone. A parent tree that does not
 * exist yet (e.g. apps/parent/src before M3.0) is skipped by walk()'s
 * readdir try/catch, never a false pass for the kid tree (see the sanity
 * assertions below).
 */
const SCAN_DIRS = [
  "apps/kid/app",
  "apps/kid/src",
  "apps/kid/components",
  "apps/parent/app",
  "apps/parent/src",
  "apps/parent/components",
];
const CODE_EXT = /\.(ts|tsx)$/;

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name === "__tests__" || name === "node_modules") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (CODE_EXT.test(name)) out.push(full);
  }
}

describe("no network egress (§2.5, retargeted M1.0)", () => {
  it("finds zero real client-call tokens in the kid + parent client trees (excluding the §3 set)", () => {
    const files: string[] = [];
    for (const d of SCAN_DIRS) walk(join(ROOT, d), files);
    // Sanity: BOTH app trees were actually scanned (never a silent no-op).
    expect(files.some((f) => f.includes(join("apps", "kid")))).toBe(true);
    expect(files.some((f) => f.includes(join("apps", "parent")))).toBe(true);

    const violations: string[] = [];
    for (const file of files) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (!EGRESS.test(line)) return;
        if (COMMENT_LINE.test(line) || EXCLUDE_CONTAINS.test(line)) return;
        violations.push(`${file.slice(ROOT.length + 1)}:${i + 1}: ${line.trim()}`);
      });
    }

    expect(violations).toEqual([]);
  });

  it("the exclusion set does not false-positive on an SVG xmlns or a doc URL", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg">';
    const doc = "// see https://docs.expo.dev/versions/v56.0.0/";
    const exempt = (line: string) =>
      EGRESS.test(line) && (COMMENT_LINE.test(line) || EXCLUDE_CONTAINS.test(line));
    expect(exempt(svg)).toBe(true);
    expect(exempt(doc)).toBe(true);
    // …but a genuine client call is NOT exempt.
    const real = 'const r = fetch("https://api.example.com/track");';
    expect(EGRESS.test(real)).toBe(true);
    expect(COMMENT_LINE.test(real) || EXCLUDE_CONTAINS.test(real)).toBe(false);
  });
});
