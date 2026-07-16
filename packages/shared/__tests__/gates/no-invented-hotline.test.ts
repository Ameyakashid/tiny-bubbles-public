/**
 * gates/no-invented-hotline.test.ts — a phone/988 literal may live ONLY in
 * the reviewed shared table `packages/shared/src/compliance/crisisResources.ts`
 * (w8 §4.6; mirrors w2 §9-B's grep, hoisted to the shared gate).
 *
 * This is the mechanical backstop for the "never a model-invented number,
 * never a wrong-region number" rule: any hotline-looking literal anywhere
 * else in the client/server trees fails the build.
 */
import { describe, expect, it } from "@jest/globals";

import { formatHits, scanTree } from "./scanTree";

const SCAN_ROOTS = [
  "apps/kid/app",
  "apps/kid/src",
  "apps/kid/components",
  "apps/kid/store",
  "apps/parent/app",
  "apps/parent/src",
  "apps/parent/components",
  "functions/src",
  "packages/shared/src",
];

// \b988\b OR phone-shaped digit groups (three digits, dash, three-or-more).
const HOTLINE_LITERAL = /\b988\b|\b[0-9]{3}-[0-9]{3,}\b/;

describe("no-invented-hotline gate (w8 §4.6)", () => {
  it("hotline-looking literals appear ONLY in compliance/crisisResources.ts", () => {
    const hits = scanTree(SCAN_ROOTS, HOTLINE_LITERAL, [
      /packages\/shared\/src\/compliance\/crisisResources\.ts$/, // the ONE reviewed home
    ]);
    expect(
      hits.length === 0
        ? ""
        : `hotline/phone literal(s) outside the reviewed table:\n${formatHits(hits)}`,
    ).toBe("");
  });
});
