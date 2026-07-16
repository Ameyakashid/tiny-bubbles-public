/**
 * evidenceHonesty.test.ts — the ONE authoritative claim gate: rejects the
 * BARE trademarks (no efficacy word needed), the AAC speech near-misses, and
 * the word-bounded cure/therapy claims; accepts the scaffold allowlist + the
 * legit uses the word boundaries protect (M1.1 acceptance; §8 #23).
 */
import { describe, expect, it } from "@jest/globals";

import {
  assertEvidenceHonestCatalog,
  checkEvidenceHonesty,
  isEvidenceHonest,
  SCAFFOLD_ALLOWLIST,
  type BannedClaimClass,
} from "../../src/compliance/evidenceHonesty";

// Banned samples are ASSEMBLED here so no banned phrase is a contiguous
// literal in the repo (mirrors the BANNED_REMINDER_PATTERNS discipline).
const j = (...parts: string[]) => parts.join("");

const BANNED_SAMPLES: { text: string; cls: BannedClaimClass }[] = [
  { text: j("this app can cu", "re meltdowns"), cls: "cure" },
  { text: j("it cu", "res anxiety fast"), cls: "cure" },
  { text: j("designed to treat", " ADHD symptoms"), cls: "treats" },
  { text: j("a treat", "ment for autism"), cls: "treats" },
  { text: j("thera", "py for kids with autism"), cls: "therapy" },
  { text: j("this is thera", "py that works"), cls: "therapy" },
  { text: j("the app provides thera", "py at home"), cls: "therapy" },
  { text: j("clinical", "ly proven results"), cls: "clinical_efficacy" },
  { text: j("an evidence", "-based treatment"), cls: "clinical_efficacy" },
  // BARE trademark hits — no efficacy word anywhere (§8 #23):
  { text: j("based on zones ", "of regulation"), cls: "zones_efficacy" },
  { text: j("uses the Zones ", "of Regulation approach"), cls: "zones_efficacy" },
  { text: j("includes social ", "stories for bedtime"), cls: "social_stories_efficacy" },
  { text: j("a social ", "story about the dentist"), cls: "social_stories_efficacy" },
  // AAC speech near-misses:
  { text: j("provides real speech ", "gains"), cls: "speech_gain" },
  { text: j("your child will learn to ", "talk"), cls: "speech_gain" },
  { text: j("AAC may im", "prove your child's speech"), cls: "speech_gain" },
  { text: j("AAC does not in", "hibit speech"), cls: "speech_gain" },
  { text: j("helps kids talk ", "more"), cls: "speech_gain" },
  { text: j("sensory inte", "gration therapy at home"), cls: "sensory_integration" },
  { text: j("Ayres thera", "py delivered digitally"), cls: "sensory_integration" },
];

describe("isEvidenceHonest — rejects every banned class", () => {
  for (const { text, cls } of BANNED_SAMPLES) {
    it(`rejects [${cls}]: "${text}"`, () => {
      expect(isEvidenceHonest(text)).toBe(false);
      const result = checkEvidenceHonesty(text);
      expect(result.clean).toBe(false);
      expect(result.hits.map((h) => h.class)).toContain(cls);
    });
  }
});

describe("isEvidenceHonest — word boundaries protect legitimate copy (§8 #23)", () => {
  const LEGIT = [
    "keep your data secure", // \bcure\b must not match "secure"
    "we procure licensed art only", // …or "procure"
    "talk with your occupational therapist", // bare OT mention is fine
    "ask about occupational therapy options", // no for/that/works frame
    "this is not therapy", // the honest disclaimer
    "a small treat after the routine", // the v1 reward noun — never a claim
    "auto-approve small treats", // v1 parent copy
    "saved for a treat", // v1 TokenMeter copy
    "we treat every child with respect", // treat + non-condition object
    "story time is at seven", // "story" alone is not the trademark
  ];
  for (const text of LEGIT) {
    it(`accepts: "${text}"`, () => {
      expect(isEvidenceHonest(text)).toBe(true);
    });
  }
});

describe("SCAFFOLD_ALLOWLIST — every approved phrasing passes its own gate", () => {
  for (const phrase of SCAFFOLD_ALLOWLIST) {
    it(`allowlisted: "${phrase}"`, () => {
      expect(isEvidenceHonest(phrase)).toBe(true);
    });
  }
});

describe("assertEvidenceHonestCatalog — the per-catalog assertion", () => {
  it("passes a clean catalog (array + record forms)", () => {
    expect(() => assertEvidenceHonestCatalog(["helps you practice", "a calm-down tool"])).not.toThrow();
    expect(() =>
      assertEvidenceHonestCatalog({ "aac.hint": "communication access", "bloop.disclosure": "not a doctor" }),
    ).not.toThrow();
  });

  it("throws listing EVERY dirty entry with its class", () => {
    const dirty = {
      ok: "helps you practice",
      bad1: j("cu", "res anxiety"),
      bad2: j("social ", "stories included"),
    };
    expect(() => assertEvidenceHonestCatalog(dirty)).toThrow(/bad1[\s\S]*cure|cure[\s\S]*bad1/);
    expect(() => assertEvidenceHonestCatalog(dirty)).toThrow(/social_stories_efficacy/);
  });
});
