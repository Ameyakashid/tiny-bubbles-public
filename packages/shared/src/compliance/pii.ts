/**
 * packages/shared/src/compliance/pii.ts — the SINGLE PII taxonomy + redaction
 * home (w8 M1.1; 02-architecture §2.5 + §8 #7 + §8 #20 barrel ownership).
 *
 * ONE definition of "what PII is": w1's transcript-write chokepoint and w2's
 * `functions/src/bloop/redact.ts` both IMPORT this module (the former
 * `firestore/redaction.ts` draft is dropped entirely). Redaction records the
 * FACT of a hit (`[redacted:<category>]` + the category list) — never the
 * value (COPPA data minimization).
 *
 * HONEST-SCOPE RULE (§8 #30): deterministic regex reliably catches
 * email/phone/street_address/url/gov_id/dob; it CANNOT reliably catch
 * arbitrary `full_name`/`school_name`/`geolocation` — those patterns here are
 * self-disclosure heuristics ("my name is …", "… Elementary School",
 * coordinates), and the chips/AAC input is PII-free by construction. For any
 * free-text-enabled child, a server-side DLP entity pass MUST additionally
 * run (w2); this module remains the canonical taxonomy both paths agree on.
 *
 * Pure + deterministic + RN-free. No I/O.
 */

/**
 * The canonical PII category superset (§8 #7): the w8 base taxonomy merged
 * with the COPPA-2025 expansions (`biometric` — voiceprint/faceprint) and the
 * register's additions (`gov_id`, `dob`).
 */
export type PiiCategory =
  | "email"
  | "phone"
  | "street_address"
  | "url"
  | "full_name"
  | "geolocation"
  | "school_name"
  | "biometric"
  | "gov_id"
  | "dob";

export interface RedactionResult {
  /** the text with every hit replaced by `[redacted:<category>]` */
  redacted: string;
  /** categories found (deduped, in detection order) — the FACT, never the value */
  found: PiiCategory[];
}

/**
 * Detection order matters: more-specific digit shapes run BEFORE `phone` so an
 * SSN/DOB is recorded under its own category, and `url` runs before heuristics
 * that could nibble at hostnames. This ordered list is the one place to tune.
 */
export const PII_DETECTION_ORDER: readonly PiiCategory[] = [
  "email",
  "url",
  "gov_id",
  "dob",
  "phone",
  "geolocation",
  "street_address",
  "school_name",
  "full_name",
  "biometric",
];

/**
 * The canonical per-category patterns. All global + case-insensitive; each is
 * duplicated defensively at use (fresh `lastIndex`) so shared state never
 * leaks between calls.
 */
export const PII_PATTERNS: Record<PiiCategory, RegExp> = {
  email: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  // Separated three/four-digit groups (US seven/ten-digit shapes, MX city
  // shapes, optional +country/(area)) or a contiguous seven-to-thirteen digit
  // run. Requires ≥7 digits so bare years/short codes never false-positive;
  // ISO date shapes fail the group requirement. Over-matching a long number
  // is SAFE-side (over-redaction), never a leak.
  phone:
    /(?:\+?\d{1,3}[-.\s])?(?:\(\d{2,4}\)[-.\s]?)?\d{3,4}[-.\s]\d{3,4}(?:[-.\s]\d{3,4})?\b|\b\+?\d{7,13}\b/g,
  // "123 Maple Street/Ave/Road…" self-disclosure shapes (heuristic).
  street_address:
    /\b\d{1,5}\s+[A-Z0-9][A-Za-z0-9'.\s]{2,40}\s(?:street|st\.?|avenue|ave\.?|road|rd\.?|lane|ln\.?|drive|dr\.?|boulevard|blvd\.?|court|ct\.?|colony|nagar|sector|calle|avenida)\b/gi,
  url: /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi,
  // Self-disclosure heuristic: "my (full) name is First Last" / "I am First
  // Last". Case-sensitive on the NAME (two+ Capitalized words) so "i am so
  // happy" never false-positives; the intro tolerates either case.
  full_name:
    /\b(?:[Mm]y\s+(?:full\s+)?name\s+is|[Ii]\s+am|[Ii]'m|[Mm]e\s+llamo|[Mm]era\s+naam)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g,
  // decimal coordinate pairs, geo: URIs, or "latitude x … longitude y".
  geolocation:
    /\bgeo:\s*-?\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+|\b-?\d{1,3}\.\d{3,},\s*-?\d{1,3}\.\d{3,}\b|\blat(?:itude)?\s*[:=]?\s*-?\d{1,3}\.\d+.{0,12}\blong(?:itude)?\s*[:=]?\s*-?\d{1,3}\.\d+/gi,
  // "<Name> Elementary/Primary/Middle/High School / Academy / Vidyalaya /
  // Escuela <Name>" — case-sensitive Capitalized-name heuristic so a plain
  // lowercase "school" mention ("I like school") is NEVER redacted.
  school_name:
    /\b(?:[A-Z][A-Za-z'.-]+\s+){1,4}(?:(?:Elementary|Primary|Middle|High)\s+)?School\b|\b(?:[A-Z][A-Za-z'.-]+\s+){1,4}(?:Academy|Vidyalaya|Gurukul)\b|\bEscuela\s+(?:[A-Z][A-Za-z'.-]+\s*){1,4}/g,
  // COPPA-2025 expanded biometric identifiers — category-flag keywords for the
  // voice/vision future (no biometric data flows today; the flag is the gate).
  biometric: /\b(?:voice\s*print|face\s*print|face\s*scan|fingerprint|iris\s*scan|retina\s*scan)\b/gi,
  // SSN 123-45-6789, Aadhaar 1234 5678 9012, passport self-disclosure.
  gov_id:
    /\b\d{3}-\d{2}-\d{4}\b|\b\d{4}\s\d{4}\s\d{4}\b|\b(?:ssn|aadhaar|aadhar|passport\s*(?:no\.?|number))\s*[:#]?\s*[A-Z0-9-]{4,}\b/gi,
  // date-of-birth self-disclosure + dated birthday shapes.
  dob: /\b(?:born\s+on|birthday\s+is|date\s+of\s+birth|dob)\s*[:]?\s*[A-Za-z0-9,\s/.-]{4,24}\d/gi,
};

/** True iff `text` contains at least one detectable PII hit. */
export function containsPii(text: string): boolean {
  return PII_DETECTION_ORDER.some((category) => {
    const re = new RegExp(PII_PATTERNS[category].source, PII_PATTERNS[category].flags);
    return re.test(text);
  });
}

/**
 * Replace every detectable hit with `[redacted:<category>]` and record WHICH
 * categories were found — the fact, never the PII (§2.5). Deterministic; never
 * throws; empty/clean text round-trips unchanged.
 */
export function redactPii(text: string): RedactionResult {
  let redacted = text;
  const found: PiiCategory[] = [];

  for (const category of PII_DETECTION_ORDER) {
    const re = new RegExp(PII_PATTERNS[category].source, PII_PATTERNS[category].flags);
    if (re.test(redacted)) {
      found.push(category);
      const replaceRe = new RegExp(PII_PATTERNS[category].source, PII_PATTERNS[category].flags);
      redacted = redacted.replace(replaceRe, `[redacted:${category}]`);
    }
  }

  return { redacted, found };
}
