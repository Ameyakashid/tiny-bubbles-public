/**
 * src/state/ids.ts — id + clock helpers for the store layer.
 *
 * IMPORTANT (doc 66 §5.4): id generation uses `expo-crypto`'s `randomUUID` — it
 * is NOT a payout path and contains NO random-number generation (the fallback is a
 * monotonic counter + timestamp, also random-free). The domain layer never
 * generates ids itself; the stores pass these in, keeping `src/domain` pure.
 */
import * as Crypto from "expo-crypto";

let counter = 0;

/**
 * A unique id (RFC4122 v4 via expo-crypto; counter+timestamp fallback).
 *
 * The fallback fires not only when `randomUUID` throws but also when it returns
 * a non-string/empty value (some runtimes/test mocks return `undefined`) — so
 * `newId` can NEVER yield a falsy id. The fallback is monotonic + timestamped
 * and contains no random-number generation.
 */
export function newId(): string {
  try {
    const uuid = Crypto.randomUUID();
    if (typeof uuid === "string" && uuid.length > 0) return uuid;
  } catch {
    // fall through to the deterministic fallback below
  }
  counter += 1;
  return `id_${Date.now().toString(36)}_${counter.toString(36)}`;
}

/** Current epoch ms. Wrapped so tests/stores can inject a fixed clock if needed. */
export function now(): number {
  return Date.now();
}
