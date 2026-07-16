/**
 * packages/shared/src/compliance/evidenceHonesty.ts — the ONE authoritative
 * evidence-honesty copy gate (w8 M1.1; 02-architecture §8 #23).
 *
 * EVIDENCE-HONESTY is hard law of the product: build GENERIC mechanisms; ship
 * NO Zones-of-Regulation™ / Social-Stories™ efficacy claim (not EBPs — Mason
 * 2024; Qi 2018), NO AAC speech-gain promise (promise *communication access*
 * — Flippin 2010), NO sensory-integration / therapy / cure claim. Scaffolds,
 * not therapy.
 *
 * THE LOCKED STANDARD (§8 #23):
 * - the BARE trademarks "zones of regulation" and "social stor(y|ies)" are
 *   hits INDEPENDENT of any efficacy word (stronger than "brand + works");
 * - AAC near-misses are hits: "may (increase|improve|help)…speech",
 *   "does not inhibit speech", "talk more";
 * - cure/therapy claims are WORD-BOUNDED so `secure`/`occupational therapy`
 *   never false-positive;
 * - "treats" is banned as a CLAIM (treat(s) <condition>), not as the shipped
 *   v1 reward noun ("a small treat" stays anti-shame-clean and legal).
 *
 * Every downstream grep (BUILD-GUIDE §3.1, w3/w5/w6 local gates) matches THIS
 * function's standard. Patterns are authored from FRAGMENTS (mirroring the v1
 * `BANNED_REMINDER_PATTERNS` discipline in apps/kid/src/services/
 * notifications.ts) so a banned phrase never appears as a contiguous literal
 * in this file.
 *
 * Pure + RN-free + unit-tested.
 */

export type BannedClaimClass =
  | "cure"
  | "treats"
  | "therapy"
  | "clinical_efficacy"
  | "zones_efficacy"
  | "social_stories_efficacy"
  | "speech_gain"
  | "sensory_integration";

export interface ClaimGateResult {
  clean: boolean;
  hits: { class: BannedClaimClass; match: string }[];
}

/** Join fragments into one case-insensitive regex (no contiguous literal). */
function fragments(...parts: string[]): RegExp {
  return new RegExp(parts.join(""), "i");
}

const W = "\\s+"; // whitespace joiner fragment

/**
 * The authoritative banned-claim patterns (§8 #23). Word boundaries are
 * load-bearing — do not loosen them:
 * - `\bcure(s|d)?\b` excludes "secure"/"procure";
 * - therapy requires a DELIVERY/EFFICACY frame ("therapy for/that/works" or
 *   "provides/delivers/is therapy") so a parent-facing "occupational therapy"
 *   mention or the honest "not therapy" disclaimer never false-positives;
 * - the two brand names are BARE hits (no efficacy word needed).
 */
export const BANNED_CLAIM_PATTERNS: readonly { class: BannedClaimClass; re: RegExp }[] = [
  { class: "cure", re: fragments("\\bcu", "re(s|d)?\\b") },
  // a treatment CLAIM: "treat(s|ing|ed) <condition>" / "treatment for" —
  // never the reward noun ("a small treat").
  {
    class: "treats",
    re: fragments(
      "\\btreat",
      "(s|ing|ed)?\\b",
      "[\\s\\S]{0,24}?",
      "\\b(adhd|autism|asd|anxiety|depression|meltdowns?|symptoms?|disorders?|conditions?)\\b",
    ),
  },
  { class: "treats", re: fragments("\\btreat", "ment", W, "for\\b") },
  {
    class: "therapy",
    re: fragments("therap", "(y|ies)", W, "(for|that|works)\\b"),
  },
  {
    class: "therapy",
    re: fragments("\\b(is|as|provides?|delivers?|replaces?)", W, "therap", "(y|ies)\\b"),
  },
  {
    class: "clinical_efficacy",
    re: fragments("clinical", "ly", W, "(proven|validated|effective)"),
  },
  {
    class: "clinical_efficacy",
    re: fragments("(scientifical|medical)", "ly", W, "proven"),
  },
  {
    class: "clinical_efficacy",
    re: fragments("evidence", "[- ]based", W, "(treatment|therap(y|ies)|intervention)"),
  },
  // BARE trademark hits (§8 #23 — independent of any efficacy word).
  { class: "zones_efficacy", re: fragments("zones", W, "of", W, "regu", "lation") },
  { class: "social_stories_efficacy", re: fragments("social", W, "stor", "(y|ies)\\b") },
  // AAC speech claims incl. the near-misses. Only "communication access" ships.
  { class: "speech_gain", re: fragments("speech", W, "gain") },
  { class: "speech_gain", re: fragments("learn", W, "to", W, "(talk|speak)\\b") },
  { class: "speech_gain", re: fragments("will", W, "(talk|speak)\\b") },
  {
    class: "speech_gain",
    // apostrophes included so "may improve your child's speech" is still a hit
    re: fragments("may", W, "(increase|improve|help)", "[a-z'’\\s]*", "speech"),
  },
  {
    class: "speech_gain",
    re: fragments("does", W, "not", W, "inhibit", W, "speech"),
  },
  { class: "speech_gain", re: fragments("\\btalk", W, "more\\b") },
  // sensory-integration DELIVERY claims (Ayres SI is clinic OT — Schaaf 2014).
  {
    class: "sensory_integration",
    re: fragments("sensory", W, "integration", W, "(therap(y|ies)|delivered|treatment|protocol)"),
  },
  {
    class: "sensory_integration",
    re: fragments("\\b(si|ayres)", W, "therap", "(y|ies)\\b"),
  },
];

/**
 * Approved honest phrasings (the *scaffolds-not-therapy* voice). These are the
 * sanctioned ways to talk about what the product does; each MUST itself pass
 * the gate (unit-tested), so copy authors can lift them verbatim.
 */
export const SCAFFOLD_ALLOWLIST: readonly string[] = [
  "communication access",
  "helps you practice",
  "a calm-down tool",
  "a tool that helps kids practice",
  "not a doctor",
  "Bloop is an AI helper, not a person or a doctor",
  "a scaffold, not a treatment",
  "supports daily routines",
  "a gentle way to get familiar with what happens next",
];

/** True iff `text` contains no banned claim. */
export function isEvidenceHonest(text: string): boolean {
  return BANNED_CLAIM_PATTERNS.every(({ re }) => !re.test(text));
}

/** Full gate result: every banned-class hit with its matched excerpt. */
export function checkEvidenceHonesty(text: string): ClaimGateResult {
  const hits: { class: BannedClaimClass; match: string }[] = [];
  for (const { class: claimClass, re } of BANNED_CLAIM_PATTERNS) {
    const m = re.exec(text);
    if (m) hits.push({ class: claimClass, match: m[0] });
  }
  return { clean: hits.length === 0, hits };
}

/**
 * Dev-time assertion over a resolved copy catalog (mirrors the v1
 * `assertReminderCopyClean` pattern). Accepts an array or a key→string map;
 * throws listing EVERY dirty entry so the author fixes them all in one pass.
 * Feature workstreams (w2 persona, w3 parent copy, w4 AAC labels, w5
 * schedule/narrative templates, w6 emotion copy) call this over their
 * resolved catalogs; the CI gate re-runs it tree-wide.
 */
export function assertEvidenceHonestCatalog(
  strings: readonly string[] | Record<string, string>,
): void {
  const entries: [string, string][] = Array.isArray(strings)
    ? strings.map((s, i) => [String(i), s] as [string, string])
    : Object.entries(strings);

  const problems: string[] = [];
  for (const [key, text] of entries) {
    const result = checkEvidenceHonesty(text);
    if (!result.clean) {
      for (const hit of result.hits) {
        problems.push(`[${key}] class=${hit.class} match="${hit.match}"`);
      }
    }
  }
  if (problems.length > 0) {
    throw new Error(
      `Evidence-honesty gate: ${problems.length} banned claim(s) found ` +
        `(scaffolds, not therapy — §8 #23):\n${problems.join("\n")}`,
    );
  }
}
