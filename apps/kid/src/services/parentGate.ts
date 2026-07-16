/**
 * src/services/parentGate.ts — the parental-gate challenge primitives (doc 63
 * Feature 10, doc 66 §M9 / §1b.13).
 *
 * Two challenge families:
 *   - LOW-STAKES entry (settings/dashboard): a randomized arithmetic problem a
 *     4-7yo can't do, OR a timed long-press. App-Store "parental gate" baseline.
 *   - PURCHASE route: a parent-set PIN is REQUIRED (never arithmetic/long-press)
 *     — doc 66 §1b.13. No real processor may ever ship behind the low-stakes gate.
 *
 * PIN storage NEVER keeps cleartext: we persist only a salted SHA-256 hash
 * (`ParentGateConfig.pinHash`) via expo-crypto. This is a COPPA/child-safety
 * speed bump, not bank-grade secrecy — `expo-crypto` digesting is sufficient.
 *
 * NOTE on randomness: the arithmetic challenge uses `Math.random` to be genuinely
 * unpredictable. This is a GATE challenge, NOT a token/payout path — the
 * anti-shame "no randomized payout" rule (doc 66 §5.4) is scoped to `src/domain`
 * payout code, which this module is not.
 */
import * as Crypto from "expo-crypto";

import type { ParentGateMode } from "../domain/types";

/** Fixed app salt — the PIN hash is install-local and never leaves the device. */
const PIN_SALT = "tiny-bubbles/parent-gate/pin/v1";

// ---------------------------------------------------------------------------
// Gate-mode production guard (doc 66 §1b.8 / §1b.10 / M15 ship gate).
//
// `parentGate.mode === 'none'` (a no-op gate) is DEV-ONLY and must NEVER ship:
// the parent zone is unreachable until a real challenge is configured. The
// default is 'math' (constants.ts) and onboarding configures a real challenge,
// so 'none' should never reach a shipped build — but we enforce it two ways:
//   1. `effectiveGateMode()` coerces 'none' -> 'math' at the gate boundary so a
//      child can never walk through a no-op gate, in ANY build.
//   2. `assertProductionGateMode()` throws in a non-__DEV__ build if 'none' ever
//      reaches the gate, failing fast (the M15 "production-build block").
// ---------------------------------------------------------------------------

/** Resolve the runtime challenge family, coercing the dev-only 'none' away. */
export function effectiveGateMode(
  mode: ParentGateMode,
): Exclude<ParentGateMode, "none"> {
  return mode === "none" ? "math" : mode;
}

/** Fail fast if a no-op gate ('none') reaches a production (non-__DEV__) build. */
export function assertProductionGateMode(mode: ParentGateMode): void {
  const isDev = typeof __DEV__ !== "undefined" && __DEV__;
  if (!isDev && mode === "none") {
    throw new Error(
      "parentGate.mode='none' is dev-only and must not ship (doc 66 §1b.8).",
    );
  }
}

/** Long-press hold duration for the low-stakes long-press challenge (ms). */
export const LONG_PRESS_MS = 3000;

/** Salted SHA-256 hash of a PIN (never store the PIN itself). */
export async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${PIN_SALT}:${pin}`,
  );
}

/** Constant-shape verify: true iff `pin` hashes to the stored `pinHash`. */
export async function verifyPin(
  pin: string,
  pinHash: string | undefined,
): Promise<boolean> {
  if (!pinHash || pin.length === 0) return false;
  const h = await hashPin(pin);
  return h === pinHash;
}

/** A PIN is valid input if it is 4-8 digits (numeric only). */
export function isValidPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}

// ---------------------------------------------------------------------------
// Arithmetic challenge (low-stakes).
// ---------------------------------------------------------------------------

export interface ArithmeticChallenge {
  a: number;
  b: number;
  op: "×" | "+";
  answer: number;
  /** the prompt string, e.g. "7 × 8" */
  prompt: string;
}

/** Random integer in [min, max] (inclusive). Gate-only; not a payout path. */
function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Generate a randomized arithmetic challenge. Multiplication of two single-digit
 * numbers (>= 2) is the default — comfortably beyond a 4-7yo, quick for an adult.
 */
export function makeArithmeticChallenge(): ArithmeticChallenge {
  // Mostly multiplication (harder for a young child); occasional 2-digit add.
  const useMultiply = Math.random() < 0.75;
  if (useMultiply) {
    const a = randInt(3, 9);
    const b = randInt(3, 9);
    return { a, b, op: "×", answer: a * b, prompt: `${a} × ${b}` };
  }
  const a = randInt(11, 29);
  const b = randInt(11, 29);
  return { a, b, op: "+", answer: a + b, prompt: `${a} + ${b}` };
}

/** Whether a typed answer matches the challenge (tolerant of whitespace). */
export function checkArithmetic(
  challenge: ArithmeticChallenge,
  typed: string,
): boolean {
  const n = Number.parseInt(typed.trim(), 10);
  return Number.isFinite(n) && n === challenge.answer;
}
