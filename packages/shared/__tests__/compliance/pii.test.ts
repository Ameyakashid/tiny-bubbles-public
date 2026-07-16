/**
 * pii.test.ts — the single PII taxonomy redacts every category, records the
 * CATEGORY (never the value), and fuzzes the heuristic categories
 * (full_name/school_name) per the honest-scope rule (M1.1 acceptance; §8 #7,
 * arch §2.5).
 */
import { describe, expect, it } from "@jest/globals";

import {
  containsPii,
  PII_DETECTION_ORDER,
  PII_PATTERNS,
  redactPii,
  type PiiCategory,
} from "../../src/compliance/pii";

/** One representative sample per category — every one MUST redact. */
const SAMPLES: Record<PiiCategory, string> = {
  email: "you can write to ricardo.castillo@example.com any time",
  phone: "call me at 301-555-0142 tomorrow",
  street_address: "we live at 123 Maple Street near the park",
  url: "my page is https://kidsite.example.com/profile",
  full_name: "my name is Ravi Kumar",
  geolocation: "we are at 19.4326, -99.1332 right now",
  school_name: "I go to Lincoln Elementary School",
  biometric: "it saved my voiceprint yesterday",
  gov_id: "her ssn: 123-45-6789 I think",
  dob: "I was born on 12/05/2017",
};

describe("redactPii — every PiiCategory redacts (§8 #7 superset)", () => {
  for (const [category, sample] of Object.entries(SAMPLES) as [PiiCategory, string][]) {
    it(`redacts ${category} and records the category, never the value`, () => {
      const { redacted, found } = redactPii(sample);
      expect(found).toContain(category);
      expect(redacted).toContain(`[redacted:`);
    });
  }

  it("the taxonomy is complete: every category has a pattern + detection order", () => {
    const categories = Object.keys(SAMPLES) as PiiCategory[];
    for (const c of categories) {
      expect(PII_PATTERNS[c]).toBeInstanceOf(RegExp);
      expect(PII_DETECTION_ORDER).toContain(c);
    }
    expect(PII_DETECTION_ORDER).toHaveLength(categories.length);
  });
});

describe("redactPii — no raw value survives (fuzz)", () => {
  it("no raw email/phone survives across mixed inputs", () => {
    const inputs = [
      "hi i am sad my email is kid123@school.org ok",
      "text me on +14155552671 please",
      "her number is (415) 555-2671!",
      "reach dad at 415.555.2671 after school",
    ];
    for (const input of inputs) {
      const { redacted } = redactPii(input);
      expect(redacted).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+/i);
      expect(redacted).not.toMatch(/\d{5,}/);
    }
  });

  it("full_name fuzz: self-disclosed First Last pairs never survive", () => {
    const names = ["Ravi Kumar", "Ana Sofia Lopez", "Tommy Lee Jones"];
    for (const name of names) {
      for (const intro of ["my name is", "My name is", "I am", "i'm", "me llamo"]) {
        const { redacted, found } = redactPii(`well ${intro} ${name} and I like dogs`);
        expect(redacted).not.toContain(name);
        expect(found).toContain("full_name");
      }
    }
  });

  it("school_name fuzz: named schools never survive", () => {
    const schools = [
      "Lincoln Elementary School",
      "St. Mary High School",
      "Sunrise Academy",
      "Kendriya Vidyalaya",
      "Escuela Benito Juarez",
    ];
    for (const school of schools) {
      const { redacted, found } = redactPii(`I go to ${school} every day`);
      expect(redacted).not.toContain(school);
      expect(found).toContain("school_name");
    }
  });

  it("records the FACT of the category, not the PII (result shape)", () => {
    const { redacted, found } = redactPii("my name is Ravi Kumar, email ravi@x.io");
    expect(found).toEqual(expect.arrayContaining(["full_name", "email"]));
    // the found list is categories only — no captured values anywhere
    for (const f of found) {
      expect(typeof f).toBe("string");
      expect(f).toMatch(/^[a-z_]+$/);
    }
    expect(redacted).toContain("[redacted:email]");
    expect(redacted).toContain("[redacted:full_name]");
  });
});

describe("redactPii — honest-scope: clean kid text passes through untouched", () => {
  const CLEAN = [
    "I like school",
    "i am so happy today",
    "we did 3 tasks and earned 5 bubbles",
    "brush teeth at 7:30 then bed",
    "", // empty is fine
  ];
  for (const text of CLEAN) {
    it(`leaves ${JSON.stringify(text)} unchanged`, () => {
      const { redacted, found } = redactPii(text);
      expect(redacted).toBe(text);
      expect(found).toEqual([]);
      expect(containsPii(text)).toBe(false);
    });
  }
});
