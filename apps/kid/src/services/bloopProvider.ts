/**
 * src/services/bloopProvider.ts — THE mock-first Bloop seam (M2.0, w2 §6.3 +
 * arch §4.2; mirrors `src/services/purchases.ts`).
 *
 * *** MOCK BY DEFAULT. CHAT OFF BY DEFAULT. ***
 *   - Provider selection: `MockBloopProvider` (deterministic, offline,
 *     exercises EVERY `ModeratedReplyStatus` with zero network) unless the
 *     build sets `EXPO_PUBLIC_TB_BLOOP_PROXY=1` (`BLOOP_PROXY_ENABLED`), in
 *     which case the callable-backed transport (`bloopProxyProvider.ts`)
 *     is wrapped into the port. Unconfigured/failed remote ⇒ the warm
 *     deterministic fallback line — NEVER a broken surface (w2 §8.4).
 *   - The PARENT GATE is re-checked here on every turn (defense in depth —
 *     a stale route/deep-link can never chat): `ChildSettings.bloopEnabled`
 *     absent/false ⇒ a `disabled` reply with NO provider call at all.
 *
 * Every chat call site goes through `sendBloopTurn` — never a provider
 * directly (BUILD-GUIDE §3 grep: `sendTurn` outside this file fails CI).
 * The chat surface itself only exists behind the same gate (app/(kid)/
 * bloop.tsx); with chat off or offline the deterministic character (w7) is
 * simply present WITHOUT chat — the child core never depends on any of this.
 */
import {
  MockBloopProvider,
  SAFE_FALLBACK_TEXT,
  quickRepliesForScope,
  resolveChatAvailability,
  resolveCrisisCard,
  toModeratedReply,
  toTopicCategory,
  type BloopContext,
  type BloopProvider,
  type BloopTurnInput,
  type ChatAvailability,
  type ChildSettings,
  type ModeratedReply,
  type TopicCategory,
} from "@tiny-bubbles/shared";

import { BLOOP_PROXY_ENABLED } from "../config/flags";
import { useChildStore } from "../state/childStore";
import { useSettingsStore } from "../state/settingsStore";

import { callBloopTurn, isBloopProxyConfigured } from "./bloopProxyProvider";

// ---------------------------------------------------------------------------
// Provider selection (the seam).
// ---------------------------------------------------------------------------

/**
 * The callable-backed provider: wraps the transport-only module into the
 * port. A `null` transport result (unconfigured/offline/threw/malformed)
 * maps to the warm canned `error` reply — fail closed, never a throw (I1).
 */
function createProxyProvider(): BloopProvider {
  return {
    id: "proxy",
    async sendTurn(input: BloopTurnInput, ctx: BloopContext): Promise<ModeratedReply> {
      const outcome = await callBloopTurn({ input, ctx });
      if (outcome === null) return { status: "error", text: SAFE_FALLBACK_TEXT, flags: [] };
      const crisisCard =
        outcome.kind === "crisis" ? resolveCrisisCard(ctx.locale, outcome.crisisType) : undefined;
      return toModeratedReply(outcome, {
        quickReplies: quickRepliesForScope(ctx.topicScope),
        ...(crisisCard ? { crisis: crisisCard } : {}),
      });
    },
  };
}

let testProvider: BloopProvider | undefined;
let activeProvider: BloopProvider | undefined;

/** TEST SEAM: inject a provider double (pass undefined to restore selection). */
export function __setBloopProviderForTests(provider: BloopProvider | undefined): void {
  testProvider = provider;
  activeProvider = undefined;
}

/**
 * Resolve the active provider: the injected test double, else the flag-picked
 * singleton — `MockBloopProvider` by DEFAULT, the proxy only under
 * `EXPO_PUBLIC_TB_BLOOP_PROXY=1` (arch §4.2).
 */
export function getBloopProvider(): BloopProvider {
  if (testProvider) return testProvider;
  if (!activeProvider)
    activeProvider = BLOOP_PROXY_ENABLED ? createProxyProvider() : new MockBloopProvider();
  return activeProvider;
}

// ---------------------------------------------------------------------------
// The parent gate + availability (chat is OFF by default).
// ---------------------------------------------------------------------------

/** The parent master switch — ABSENT ⇒ false (LLM OFF by default, §8 #15). */
export function isBloopChatEnabled(settings: Partial<ChildSettings> | undefined): boolean {
  return settings?.bloopEnabled === true;
}

/** The child's parent-enabled topic scope, mapped onto the canonical enum (§8 #3). */
export function bloopTopicScopeOf(settings: Partial<ChildSettings> | undefined): TopicCategory[] {
  const raw = settings?.bloopTopicScope ?? [];
  const out: TopicCategory[] = [];
  for (const id of raw) {
    const topic = toTopicCategory(id);
    if (topic && !out.includes(topic)) out.push(topic);
  }
  return out;
}

/**
 * Client-side chat availability for the kid surface. FAIL CLOSED on the
 * parent gate; the mock provider is shielded/online by construction, the
 * proxy path is `offline` until Firebase is env-configured (unconfigured =
 * unavailable). Quiet hours / budget are SERVER-authoritative (§8 #28) — the
 * proxy hard-stops them per turn; the client never pretends to know them.
 */
export function getBloopChatAvailability(
  settings: Partial<ChildSettings> | undefined,
): ChatAvailability {
  const proxy = getBloopProvider().id === "proxy";
  return resolveChatAvailability({
    bloopEnabled: isBloopChatEnabled(settings),
    shieldAvailable: true, // enforced server-side per turn (§8 #30 hard-stop)
    online: proxy ? isBloopProxyConfigured() : true,
    withinQuietHours: false, // server-authoritative (§8 #28)
    turnsRemainingToday: 1, // server-authoritative (§8 #28)
  });
}

/** Warm "chat is asleep" line (shown only if a stale surface ever gets here). */
const DISABLED_TEXT = "Bloop is resting right now. Let's play together instead!";

/** The active child's settings (defense-in-depth read — never trusted from a route). */
function activeChildSettings(): Partial<ChildSettings> | undefined {
  const cid = useSettingsStore.getState().meta.activeChildId;
  if (!cid) return undefined;
  return useChildStore.getState().profiles[cid]?.settings;
}

/**
 * THE one chat entry point (every call site goes through here — BUILD-GUIDE
 * §3 grep). Re-checks the parent gate on EVERY turn: disabled ⇒ a calm
 * `disabled` reply with NO provider call (off-by-default is structural, not
 * a UI courtesy). Never throws.
 */
export async function sendBloopTurn(
  input: BloopTurnInput,
  ctx: BloopContext,
): Promise<ModeratedReply> {
  if (!isBloopChatEnabled(activeChildSettings()))
    return { status: "disabled", text: DISABLED_TEXT, flags: [] };
  try {
    return await getBloopProvider().sendTurn(input, ctx);
  } catch {
    return { status: "error", text: SAFE_FALLBACK_TEXT, flags: [] }; // I1
  }
}
