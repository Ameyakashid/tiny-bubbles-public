/**
 * packages/shared/src/compliance/crisisResources.ts — the human-reviewed,
 * region-localized crisis data (w8 M1.1; 02-architecture §5.2 + §8 #16b/#20/#27).
 *
 * CANONICAL HOME of `CrisisCard`/`CrisisResource`/`SafeMessaging`/
 * `resolveCrisisCard` (§8 #20 barrel ownership — w2's transcript module and
 * w1's GlobalConfig IMPORT these, never re-declare).
 *
 * HARD RULES (locked):
 * - PRE-WRITTEN + HUMAN-REVIEWED only; never model-generated, NEVER an
 *   invented number, never a wrong-region number. The `no-invented-hotline`
 *   gate greps the whole tree: a phone/988 literal may live ONLY here.
 * - EVERY card ships `reviewed:false` — INCLUDING `en-US`/988 — until a
 *   recorded psychologist `CRISIS_REVIEW_SIGNOFF` flips it (§8 #16b). A
 *   verified NUMBER ≠ reviewed crisis COPY. `reviewed:false` BLOCKS SHIP for
 *   that locale (crisisReview.ts).
 * - NO means/method anywhere (988 Media Toolkit / reportingonsuicide.org):
 *   validate + hope + tell-a-trusted-grown-up-NOW + no-secrecy.
 * - Unknown/unreviewed locale → `GENERIC_FALLBACK_CARD` (no number) — a child
 *   is NEVER shown a guessed number. `resolveCrisisCard` never throws.
 * - Crisis-type differentiation (§8 #27): abuse/CSAM resolves to the
 *   child-protection card (NO parent auto-alert path — w2 owns escalation);
 *   self-harm/distress resolves to the hotline card.
 *
 * Numbers below come ONLY from the reviewed spec seed (kid-llm-safety.md /
 * w8 §4.3) — this module adds none. India/Mexico review is LAUNCH-CRITICAL-
 * PATH (named clinical owner), not "candidates pending".
 */

export interface CrisisResource {
  label: string;
  contact: string;
  note?: string;
}

export interface CrisisCard {
  /** BCP-47, e.g. "en-US" | "en-IN" | "hi-IN" | "es-MX" */
  locale: string;
  /** grown-up-facing headline */
  headline: string;
  /** NO means/method text — validate/hope/act lines only */
  bodyLines: string[];
  /** reviewed numbers ONLY (empty on the generic fallback) */
  resources: CrisisResource[];
  /** FALSE blocks ship for the locale until human sign-off (§8 #16b) */
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
}

/** Pre-written, human-reviewed safe-messaging strings; NEVER model-generated. */
export interface SafeMessaging {
  validate: string;
  hope: string;
  trustedGrownUp: string;
  noSecrecy: string;
}

/** Crisis differentiation (§8 #27) — routing differs; the card data lives here. */
export type CrisisType = "self_harm" | "severe_distress" | "abuse" | "csam";

/**
 * The child-facing safe-messaging block (validate / hope / act / no-secrecy).
 * Follows the 988 Media Toolkit rules: supportive, no means/method, action-
 * oriented toward a trusted grown-up, and never a secrecy promise.
 */
export const SAFE_MESSAGING: SafeMessaging = {
  validate: "Those feelings are really big, and it is brave of you to say them out loud.",
  hope: "Feelings like this can get better, and you do not have to handle them alone.",
  trustedGrownUp: "Please tell a trusted grown-up right now — like a parent, teacher, or family member.",
  noSecrecy: "This is too important to keep secret. A grown-up who cares about you will be told so they can help.",
};

/**
 * Generic fallback (unknown/unreviewed locale): action-oriented, NO number —
 * never a guessed or wrong-region number.
 */
export const GENERIC_FALLBACK_CARD: CrisisCard = {
  locale: "generic",
  headline: "Get help right now",
  bodyLines: [
    "If a child may be in danger or crisis, contact your local emergency services immediately.",
    "Stay with the child and let them know they are not alone.",
    "Reach out to a doctor, counselor, or local crisis service you trust.",
  ],
  resources: [], // deliberately empty — no invented number, ever
  reviewed: false,
};

/**
 * Generic child-protection fallback (§8 #27 abuse/csam path, unknown locale):
 * child-directed, no promise-of-disclosure, no number invented.
 */
export const GENERIC_CHILD_PROTECTION_CARD: CrisisCard = {
  locale: "generic",
  headline: "Help is available",
  bodyLines: [
    "What is happening is not your fault.",
    "Please tell a trusted grown-up — like a teacher, school counselor, or doctor.",
    "Local child-protection services can help keep you safe.",
  ],
  resources: [],
  reviewed: false,
};

/**
 * The seeded hotline table, keyed by BCP-47 locale. EVERY entry ships
 * `reviewed:false` (incl. en-US — §8 #16b) until a psychologist sign-off in
 * `crisisReview.ts` flips it. Numbers are the spec-verified seed only.
 */
export const CRISIS_RESOURCES: Record<string, CrisisCard> = {
  "en-US": {
    locale: "en-US",
    headline: "Get support now (United States)",
    bodyLines: [
      "You are not alone, and support is available right now.",
      "If there is immediate danger, call 911.",
    ],
    resources: [
      {
        label: "988 Suicide & Crisis Lifeline",
        contact: "Call or text 988",
        note: "Chat at 988lifeline.org",
      },
      {
        label: "Crisis Text Line",
        contact: "Text HELLO to 741741",
      },
    ],
    reviewed: false, // §8 #16b: a correct number ≠ reviewed crisis copy
  },
  "en-IN": {
    locale: "en-IN",
    headline: "Get support now (India)",
    bodyLines: [
      "You are not alone, and support is available right now.",
      "If there is immediate danger, call your local emergency number.",
    ],
    resources: [
      { label: "Tele-MANAS", contact: "Call 14416 or 1-800-891-4416" },
      { label: "KIRAN Helpline", contact: "Call 1800-599-0019" },
      { label: "Childline (children in need of care)", contact: "Call 1098" },
    ],
    reviewed: false, // launch-critical-path clinical review pending (named owner)
  },
  "hi-IN": {
    locale: "hi-IN",
    headline: "अभी मदद पाएँ (भारत)",
    bodyLines: [
      "आप अकेले नहीं हैं — मदद अभी उपलब्ध है।",
      "तुरंत ख़तरा होने पर अपने स्थानीय आपातकालीन नंबर पर कॉल करें।",
    ],
    resources: [
      { label: "Tele-MANAS", contact: "14416 / 1-800-891-4416 पर कॉल करें" },
      { label: "KIRAN हेल्पलाइन", contact: "1800-599-0019 पर कॉल करें" },
      { label: "चाइल्डलाइन", contact: "1098 पर कॉल करें" },
    ],
    reviewed: false,
  },
  "es-MX": {
    locale: "es-MX",
    headline: "Busca apoyo ahora (México)",
    bodyLines: [
      "No estás solo; hay apoyo disponible ahora mismo.",
      "Si hay peligro inmediato, llama al 911.",
    ],
    resources: [
      { label: "Línea de la Vida", contact: "Llama al 800-911-2000" },
      { label: "SAPTEL", contact: "Llama al 55-5259-8121" },
      { label: "Emergencias", contact: "Llama al 911" },
    ],
    reviewed: false,
  },
  "en-MX": {
    locale: "en-MX",
    headline: "Get support now (Mexico)",
    bodyLines: [
      "You are not alone, and support is available right now.",
      "If there is immediate danger, call 911.",
    ],
    resources: [
      { label: "Línea de la Vida", contact: "Call 800-911-2000" },
      { label: "SAPTEL", contact: "Call 55-5259-8121" },
      { label: "Emergency services", contact: "Call 911" },
    ],
    reviewed: false,
  },
};

/**
 * Child-protection cards for the abuse/CSAM path (§8 #27) — separate from the
 * hotline table because the ROUTING differs (no parent auto-alert; w2 owns the
 * mandated-reporter/NCMEC queue). Only spec-seeded numbers appear (India
 * Childline 1098); other locales use the generic child-protection card until
 * a reviewed entry lands.
 */
export const CHILD_PROTECTION_RESOURCES: Record<string, CrisisCard> = {
  "en-IN": {
    locale: "en-IN",
    headline: "Help for children (India)",
    bodyLines: [
      "What is happening is not your fault.",
      "You deserve to be safe, and there are people whose job is to help you.",
    ],
    resources: [{ label: "Childline", contact: "Call 1098" }],
    reviewed: false,
  },
  "hi-IN": {
    locale: "hi-IN",
    headline: "बच्चों के लिए मदद (भारत)",
    bodyLines: [
      "जो हो रहा है वह आपकी गलती नहीं है।",
      "आप सुरक्षित रहने के हक़दार हैं — मदद करने वाले लोग मौजूद हैं।",
    ],
    resources: [{ label: "चाइल्डलाइन", contact: "1098 पर कॉल करें" }],
    reviewed: false,
  },
};

/** exact locale → language-prefix match → generic fallback. Never throws. */
function pickByLocale(table: Record<string, CrisisCard>, locale: string): CrisisCard | undefined {
  const exact = table[locale];
  if (exact) return exact;
  const language = locale.split("-")[0]?.toLowerCase();
  if (!language) return undefined;
  const key = Object.keys(table).find((k) => k.toLowerCase().startsWith(`${language}-`));
  return key ? table[key] : undefined;
}

/**
 * Resolve the crisis card for a locale (+ optional crisis type, §8 #27):
 * exact → language → GENERIC fallback. NEVER throws, NEVER invents a number —
 * an unknown locale gets the no-number generic card. w2's proxy renders the
 * RESULT of this function only; it hard-codes nothing.
 */
export function resolveCrisisCard(locale: string, crisisType: CrisisType = "self_harm"): CrisisCard {
  if (crisisType === "abuse" || crisisType === "csam") {
    return pickByLocale(CHILD_PROTECTION_RESOURCES, locale) ?? GENERIC_CHILD_PROTECTION_CARD;
  }
  return pickByLocale(CRISIS_RESOURCES, locale) ?? GENERIC_FALLBACK_CARD;
}
