/**
 * src/domain/companionName.ts — the companion-name curated-autonomy exception
 * (child-autonomy §2.2 PII caveat).
 *
 * Renaming the buddy is the ONE free-text kid input in the app. Because a child
 * could type inappropriate words (and the name is persisted + carried in the
 * on-device backup), the Name field is mitigated with (a) a hard length cap and
 * (b) this LIGHT, on-device, OFFLINE profanity check — a small bundled word-list,
 * NO network and NO AI (ZERO-AI invariant). The clinician report separately OMITS
 * the free-text name (handled in report.ts), so typed PII never reaches a shared
 * report. Pure + unit-testable.
 */

/** Hard length cap for the free-text buddy name (§2.2 mitigation (a)). */
export const MAX_COMPANION_NAME_LEN = 20;

/**
 * A small bundled list of clearly-inappropriate words. Intentionally short and
 * strong — kept to terms unlikely to appear inside a benign short buddy name, so
 * the token-based check below does not false-positive on ordinary words. This is
 * a light guard, not a comprehensive filter (offline, no network).
 */
const BLOCKLIST: readonly string[] = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "asshole",
  "bastard",
  "dick",
  "piss",
  "slut",
  "whore",
  "nigger",
  "faggot",
  "rape",
  "penis",
  "vagina",
  "porn",
  "sex",
];

/** Common leetspeak → letter folds so "sh1t" / "f@ck" don't slip past. */
function foldLeet(s: string): string {
  return s
    .replace(/[@4]/g, "a")
    .replace(/[3]/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/[7]/g, "t");
}

/**
 * True when `name` is safe to save. Empty/whitespace-only is NOT allowed (there
 * is nothing to save). The check is case-insensitive, leet-folded, and matches on
 * whole alphanumeric TOKENS (avoiding the "Scunthorpe" problem — e.g. "assistant"
 * is fine) plus the fully-collapsed string (catches spaced-out evasions).
 */
export function isCompanionNameAllowed(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length === 0) return false;

  const folded = foldLeet(trimmed.toLowerCase());
  const tokens = folded.split(/[^a-z]+/).filter(Boolean);
  const collapsed = folded.replace(/[^a-z]/g, "");
  const block = new Set(BLOCKLIST);

  if (block.has(collapsed)) return false;
  return !tokens.some((tok) => block.has(tok));
}

/**
 * Normalize a candidate name for saving: trim + hard-cap to `MAX_COMPANION_NAME_LEN`.
 * (Filtering is a separate allow/reject decision via `isCompanionNameAllowed`.)
 */
export function normalizeCompanionName(name: string): string {
  return name.trim().slice(0, MAX_COMPANION_NAME_LEN);
}
