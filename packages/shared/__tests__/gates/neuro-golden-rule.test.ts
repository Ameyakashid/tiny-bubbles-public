/**
 * gates/neuro-golden-rule.test.ts — the v1 golden rule, extended to the new
 * axis (w8 §4.6; arch §3.1): NO raw `neuroProfile ==|===|!==` branch in any
 * render path of either app. Every difference flows through
 * resolveNeuroPreset → the resolvers → capability flags.
 */
import { describe, expect, it } from "@jest/globals";

import { formatHits, scanTree } from "./scanTree";

const RENDER_PATHS = [
  "apps/kid/app",
  "apps/kid/src",
  "apps/kid/components",
  "apps/parent/app",
  "apps/parent/components",
  "apps/parent/src",
];

describe("neuro golden rule (w8) — no raw axis read in a render path", () => {
  it("zero raw neuroProfile equality branches in apps/kid + apps/parent", () => {
    const hits = scanTree(RENDER_PATHS, /\bneuroProfile\s*(===|==|!==|!=)/, [
      // the shared resolver home is the ONE sanctioned consumer of the raw
      // axis (a Record lookup, not an equality branch) — and it lives in
      // packages/shared, outside these roots, by design.
    ]);
    expect(
      hits.length === 0
        ? ""
        : `raw neuroProfile branch(es) found (route through resolvers):\n${formatHits(hits)}`,
    ).toBe("");
  });

  it("the existing ageMode golden rule still holds in screen/component trees", () => {
    // extends (does not replace) the v1 gate: screens + components never
    // branch on the raw ageMode string. Resolver/domain homes under src/
    // legitimately consume the axis; app/ + components/ must not.
    const hits = scanTree(
      ["apps/kid/app", "apps/kid/components", "apps/parent/app", "apps/parent/components"],
      /\bageMode\s*(===|==|!==|!=)/,
    );
    expect(
      hits.length === 0 ? "" : `raw ageMode branch(es) in a render path:\n${formatHits(hits)}`,
    ).toBe("");
  });
});
