/**
 * src/services/bloopProxyProvider.ts — the REAL Bloop transport (M2.0, w2
 * §6.3): the Firebase Functions callable `bloopTurn`, reached through the
 * sanctioned SDK seam (`src/sync/firebase.ts` `SyncPorts.functions.call`,
 * i.e. `httpsCallable` — App Check + the ID token attach automatically).
 *
 * *** TRANSPORT ONLY. *** No raw `fetch`/URL literal (the no-egress gate,
 * arch §1.4) and no provider port here — the `BloopProvider` that wraps this
 * transport lives in `services/bloopProvider.ts` (the ONE seam every chat
 * call site goes through; BUILD-GUIDE §3 grep enforces it).
 *
 * FAIL CLOSED, NEVER BROKEN (I1): unconfigured Firebase, a thrown callable,
 * or a malformed response all resolve to `null` — the seam serves the warm
 * deterministic fallback and the child never sees an error surface. The
 * server is authoritative over everything in the request (`ctx` is an
 * untrusted hint — §8 #28); this module adds no client-side trust.
 *
 * // TODO(M2.1): the `bloopTurn` callable lands in functions/src/bloop/*;
 * // until then a configured build simply gets `null` back (warm fallback).
 */
import { parseTurnOutcome, type TurnOutcome, type TurnRequest } from "@tiny-bubbles/shared";

import { getSyncPorts, isFirebaseConfigured } from "../sync/firebase";

/** The callable name (functions/src/index.ts exports it at M2.1). */
export const BLOOP_TURN_CALLABLE = "bloopTurn";

/** True when the remote transport could work at all (env-configured SDK). */
export function isBloopProxyConfigured(): boolean {
  return isFirebaseConfigured();
}

/**
 * Invoke the `bloopTurn` callable and fail-closed-parse the response.
 * `null` ⇔ unavailable (unconfigured / offline / threw / malformed) — the
 * caller (the seam) maps that to the warm canned fallback, never a throw.
 */
export async function callBloopTurn(request: TurnRequest): Promise<TurnOutcome | null> {
  try {
    const ports = await getSyncPorts();
    if (!ports) return null; // unconfigured = unavailable (mock/offline default)
    const raw = await ports.functions.call<TurnRequest, unknown>(BLOOP_TURN_CALLABLE, request);
    return parseTurnOutcome(raw);
  } catch {
    return null; // I1 — any transport error resolves to the safe fallback path
  }
}
