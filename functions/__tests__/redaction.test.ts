/**
 * functions/__tests__/redaction.test.ts — PII redacted BEFORE any doc write
 * (w1 M1.2 — 02-architecture §2.5, §8 #7).
 *
 * `writeTranscriptTurn` is the ONE transcript write path; because it exists,
 * redaction is provable: this suite drives RAW PII through it against a fake
 * db and asserts (a) no raw sample survives in ANY field of the WRITTEN doc,
 * (b) the doc has NO raw-text field at all (schema-level assertion), (c) the
 * FACT of the PII (`pii.found`) is stored, never the value — including the
 * name/school self-disclosure fuzz (§8 #30 honest-scope).
 */
import { describe, expect, it } from "@jest/globals";

import type { PiiCategory } from "@tiny-bubbles/shared";

import { writeTranscriptTurn, type WriteTranscriptTurnInput } from "../src/data/transcripts";
import { FakeDb, fixedClock } from "./helpers/fakes";

const NOW = 1_760_000_000_000;

/** One raw sample per canonical PiiCategory (the §8 #7 superset). */
const PII_SAMPLES: Record<PiiCategory, string> = {
  email: "write me at ari.bello@example.com ok?",
  phone: "call my mom 555-123-4567 please",
  street_address: "I live at 12 Maple Street near the park",
  url: "my page is https://kidsite.example.com/ari",
  full_name: "my name is Ari Bello Castillo",
  geolocation: "we are at 19.4326, -99.1332 right now",
  school_name: "I go to Lakewood Elementary School",
  biometric: "here is my voice print recording",
  gov_id: "my ssn: 123-45-6789",
  dob: "my date of birth: 2017-04-12",
};

/** The raw fragments that must NEVER appear in a stored doc. */
const RAW_FRAGMENTS: Record<PiiCategory, string> = {
  email: "ari.bello@example.com",
  phone: "555-123-4567",
  street_address: "12 Maple Street",
  url: "https://kidsite.example.com/ari",
  full_name: "Ari Bello Castillo",
  geolocation: "19.4326, -99.1332",
  school_name: "Lakewood Elementary School",
  biometric: "voice print",
  gov_id: "123-45-6789",
  dob: "2017-04-12",
};

function baseInput(rawChildText: string, rawReplyText = "That sounds fun!"): WriteTranscriptTurnInput {
  return {
    childId: "kid-1",
    sessionId: "s1",
    turnId: "t1",
    rawChildText,
    inputMode: "freeText",
    rawReplyText,
    status: "ok",
    model: "mock",
    inputFlags: [],
    outputFlags: [],
    flagged: false,
  };
}

describe("writeTranscriptTurn — the redaction-before-storage chokepoint", () => {
  for (const [category, sample] of Object.entries(PII_SAMPLES) as [PiiCategory, string][]) {
    it(`redacts ${category} BEFORE the write and records only the FACT`, async () => {
      const db = new FakeDb();
      await writeTranscriptTurn({ db, clock: fixedClock(NOW) }, baseInput(sample));

      expect(db.writes).toHaveLength(1);
      const written = db.writes[0]!;
      expect(written.path).toBe("children/kid-1/transcripts/t1");
      const serialized = JSON.stringify(written.data);
      expect(serialized).not.toContain(RAW_FRAGMENTS[category]); // no raw value anywhere
      expect(serialized).toContain(`[redacted:${category}]`);
      expect((written.data.pii as { found: string[] }).found).toContain(category);
    });
  }

  it("the stored doc has NO raw-text field (schema-level assertion)", async () => {
    const db = new FakeDb();
    const doc = await writeTranscriptTurn(
      { db, clock: fixedClock(NOW) },
      baseInput(PII_SAMPLES.email),
    );
    expect(Object.keys(doc)).not.toContain("rawChildText");
    expect(Object.keys(doc)).not.toContain("rawReplyText");
    expect(doc.childText).not.toContain("ari.bello@example.com");
  });

  it("redacts OUTBOUND reply PII too (both directions, §2.5)", async () => {
    const db = new FakeDb();
    const doc = await writeTranscriptTurn(
      { db, clock: fixedClock(NOW) },
      baseInput("hi", "You can visit https://evil.example.com or call 555-987-6543"),
    );
    expect(String(doc.replyText)).not.toContain("evil.example.com");
    expect(String(doc.replyText)).not.toContain("555-987-6543");
  });

  it("name/school fuzz: self-disclosure shapes never survive (§8 #30)", async () => {
    const fuzz = [
      "my name is Priya Sharma",
      "I am Diego Ramos Lopez",
      "me llamo Sofia Torres",
      "I go to Greenfield Academy after lunch",
      "Escuela Benito Juarez is my school",
    ];
    for (const text of fuzz) {
      const db = new FakeDb();
      const doc = await writeTranscriptTurn({ db, clock: fixedClock(NOW) }, baseInput(text));
      const stored = String(doc.childText);
      expect(stored).toMatch(/\[redacted:(full_name|school_name)\]/);
      // No capitalized multi-word remnant of the disclosed name survives.
      for (const name of ["Priya Sharma", "Diego Ramos", "Sofia Torres", "Greenfield Academy", "Benito Juarez"]) {
        expect(stored).not.toContain(name);
      }
    }
  });

  it("clean text round-trips unredacted with an empty pii.found", async () => {
    const db = new FakeDb();
    const doc = await writeTranscriptTurn(
      { db, clock: fixedClock(NOW) },
      baseInput("i built a huge tower today"),
    );
    expect(doc.childText).toBe("i built a huge tower today");
    expect((doc.pii as { found: string[] }).found).toEqual([]);
  });
});
