import { afterEach, describe, expect, it, jest } from "@jest/globals";

/**
 * Parental-gate ship-gate invariants (doc 66 §1b.8 / §1b.13 / M15).
 *
 *   - The dev-only no-op gate mode 'none' is coerced away at the gate boundary
 *     and throws in a production (non-__DEV__) build — a child can never walk
 *     through a no-op gate.
 *   - The default parent-gate mode is NEVER 'none'.
 *   - PIN primitives validate + verify against a salted hash (never cleartext).
 *   - The arithmetic challenge is beyond a young child but trivially adult.
 *
 * expo-crypto is mocked (jest-expo does not provide a native digest).
 */
jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digestStringAsync: jest.fn(
    async (_algo: string, data: string) => `hash(${data})`,
  ),
}));

import {
  assertProductionGateMode,
  checkArithmetic,
  effectiveGateMode,
  hashPin,
  isValidPin,
  makeArithmeticChallenge,
  verifyPin,
} from "../../src/services/parentGate";
import { defaultParentSettings } from "../../src/domain/constants";

describe("parentGate — 'none' is dev-only and blocked from production (§1b.8)", () => {
  const original = (globalThis as { __DEV__?: boolean }).__DEV__;
  afterEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = original;
  });

  it("effectiveGateMode coerces the no-op 'none' to a real 'math' challenge", () => {
    expect(effectiveGateMode("none")).toBe("math");
    expect(effectiveGateMode("pin")).toBe("pin");
    expect(effectiveGateMode("math")).toBe("math");
    expect(effectiveGateMode("longpress")).toBe("longpress");
  });

  it("assertProductionGateMode throws on 'none' in a production build", () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    expect(() => assertProductionGateMode("none")).toThrow(/dev-only/);
    expect(() => assertProductionGateMode("math")).not.toThrow();
    expect(() => assertProductionGateMode("pin")).not.toThrow();
  });

  it("assertProductionGateMode tolerates 'none' only in a __DEV__ build", () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    expect(() => assertProductionGateMode("none")).not.toThrow();
  });

  it("the default parent-gate mode is never the no-op 'none'", () => {
    expect(defaultParentSettings(0).parentGate.mode).not.toBe("none");
    expect(defaultParentSettings(0).parentGate.mode).toBe("math");
  });
});

describe("parentGate — PIN primitives (purchase route, §1b.13)", () => {
  it("accepts only 4-8 digit numeric PINs", () => {
    expect(isValidPin("1234")).toBe(true);
    expect(isValidPin("12345678")).toBe(true);
    expect(isValidPin("123")).toBe(false);
    expect(isValidPin("123456789")).toBe(false);
    expect(isValidPin("12a4")).toBe(false);
    expect(isValidPin("")).toBe(false);
  });

  it("verifyPin matches only the stored salted hash, never cleartext", async () => {
    const stored = await hashPin("4821");
    expect(stored).not.toContain("4821:"); // never the raw PIN as the value
    expect(await verifyPin("4821", stored)).toBe(true);
    expect(await verifyPin("0000", stored)).toBe(false);
    expect(await verifyPin("4821", undefined)).toBe(false);
    expect(await verifyPin("", stored)).toBe(false);
  });
});

describe("parentGate — arithmetic challenge (low-stakes)", () => {
  it("produces a solvable challenge whose answer checks out", () => {
    for (let i = 0; i < 50; i++) {
      const ch = makeArithmeticChallenge();
      expect(["×", "+"]).toContain(ch.op);
      const expected = ch.op === "×" ? ch.a * ch.b : ch.a + ch.b;
      expect(ch.answer).toBe(expected);
      expect(checkArithmetic(ch, String(ch.answer))).toBe(true);
      expect(checkArithmetic(ch, String(ch.answer + 1))).toBe(false);
    }
  });

  it("tolerates whitespace in the typed answer", () => {
    const ch = makeArithmeticChallenge();
    expect(checkArithmetic(ch, `  ${ch.answer}  `)).toBe(true);
  });
});
