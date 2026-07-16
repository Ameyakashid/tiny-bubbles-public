/**
 * __tests__/services/bloopProvider.test.ts — the M2.0 mock-first seam gate
 * (w2 §6.3 + §9-A; arch §4.2).
 *
 * Proves, all OFFLINE (no Firebase config, no network):
 *   1. the MOCK provider is the DEFAULT (flag unset ⇒ `id === "mock"`);
 *   2. the real proxy provider is selected ONLY under
 *      `EXPO_PUBLIC_TB_BLOOP_PROXY=1` (module-isolated env probe);
 *   3. chat is OFF BY DEFAULT: with `bloopEnabled` absent/false the seam
 *      returns `disabled` WITHOUT touching any provider (spy never called);
 *   4. with the parent gate on, EVERY `ModeratedReplyStatus` is reachable
 *      offline through the seam;
 *   5. the unconfigured proxy path fails closed to the warm `error` line
 *      (never a throw, never a broken surface);
 *   6. client-side availability resolves disabled-first (fail closed).
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  ALL_MODERATED_REPLY_STATUSES,
  ALL_TOPICS,
  MOCK_MARKERS,
  SAFE_FALLBACK_TEXT,
  type BloopContext,
  type BloopProvider,
  type BloopTurnInput,
  type ModeratedReplyStatus,
} from "@tiny-bubbles/shared";

import {
  __setBloopProviderForTests,
  bloopTopicScopeOf,
  getBloopChatAvailability,
  getBloopProvider,
  isBloopChatEnabled,
  sendBloopTurn,
} from "../../src/services/bloopProvider";
import { createChildWithSeed } from "../../src/state/gameplay";
import { useChildStore } from "../../src/state/childStore";
import { useSettingsStore } from "../../src/state/settingsStore";

const ctx = (over: Partial<BloopContext> = {}): BloopContext => ({
  childId: "child-1",
  sessionId: "s-1",
  neuroProfile: "both",
  ageMode: "young",
  locale: "en-US",
  topicScope: [...ALL_TOPICS],
  ...over,
});

const turn = (text: string): BloopTurnInput => ({ text, inputMode: "chips" });

function resetStores(): void {
  useChildStore.setState({
    index: [],
    profiles: {},
    ledgers: {},
    progress: {},
    reinforcement: {},
    moods: {},
    events: {},
  });
  useSettingsStore.getState().setActiveChild(null);
}

/** Seed an active child; `bloopEnabled` only when asked (default = ABSENT = off). */
function seedChild(bloopEnabled?: boolean): string {
  const cid = createChildWithSeed({ displayName: "Ari", ageMode: "young", timeZone: "UTC" });
  if (bloopEnabled !== undefined)
    useChildStore.getState().updateSettings(cid, {
      bloopEnabled,
      bloopTopicScope: [...ALL_TOPICS],
    });
  useSettingsStore.getState().setActiveChild(cid);
  return cid;
}

beforeEach(() => {
  resetStores();
  __setBloopProviderForTests(undefined);
});

afterEach(() => {
  __setBloopProviderForTests(undefined);
});

describe("provider selection (mock-first, arch §4.2)", () => {
  it("the MOCK provider is the default (flag unset in CI/dev/web)", () => {
    expect(process.env.EXPO_PUBLIC_TB_BLOOP_PROXY).toBeUndefined();
    expect(getBloopProvider().id).toBe("mock");
  });

  it("selects the proxy provider ONLY under EXPO_PUBLIC_TB_BLOOP_PROXY=1", () => {
    jest.isolateModules(() => {
      process.env.EXPO_PUBLIC_TB_BLOOP_PROXY = "1";
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fresh = require("../../src/services/bloopProvider") as {
          getBloopProvider(): BloopProvider;
        };
        expect(fresh.getBloopProvider().id).toBe("proxy");
      } finally {
        delete process.env.EXPO_PUBLIC_TB_BLOOP_PROXY;
      }
    });
  });

  it("any other flag value keeps the mock (fail closed)", () => {
    jest.isolateModules(() => {
      process.env.EXPO_PUBLIC_TB_BLOOP_PROXY = "true"; // not the exact "1"
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fresh = require("../../src/services/bloopProvider") as {
          getBloopProvider(): BloopProvider;
        };
        expect(fresh.getBloopProvider().id).toBe("mock");
      } finally {
        delete process.env.EXPO_PUBLIC_TB_BLOOP_PROXY;
      }
    });
  });
});

describe("OFF BY DEFAULT (the parent gate is structural — §8 #15)", () => {
  it("no active child ⇒ disabled, and NO provider is ever invoked", async () => {
    const spy = jest.fn<BloopProvider["sendTurn"]>();
    __setBloopProviderForTests({ id: "spy", sendTurn: spy });
    const reply = await sendBloopTurn(turn("hi"), ctx());
    expect(reply.status).toBe("disabled");
    expect(spy).not.toHaveBeenCalled();
  });

  it("a fresh child (bloopEnabled ABSENT) ⇒ disabled, provider untouched", async () => {
    seedChild(); // no bloop settings at all — the v1-compatible default
    const spy = jest.fn<BloopProvider["sendTurn"]>();
    __setBloopProviderForTests({ id: "spy", sendTurn: spy });
    const reply = await sendBloopTurn(turn("hi"), ctx());
    expect(reply.status).toBe("disabled");
    expect(spy).not.toHaveBeenCalled();
  });

  it("bloopEnabled:false explicitly ⇒ disabled, provider untouched", async () => {
    seedChild(false);
    const spy = jest.fn<BloopProvider["sendTurn"]>();
    __setBloopProviderForTests({ id: "spy", sendTurn: spy });
    const reply = await sendBloopTurn(turn("hi"), ctx());
    expect(reply.status).toBe("disabled");
    expect(spy).not.toHaveBeenCalled();
  });

  it("isBloopChatEnabled treats absent as false", () => {
    expect(isBloopChatEnabled(undefined)).toBe(false);
    expect(isBloopChatEnabled({})).toBe(false);
    expect(isBloopChatEnabled({ bloopEnabled: false })).toBe(false);
    expect(isBloopChatEnabled({ bloopEnabled: true })).toBe(true);
  });
});

describe("with the parent gate ON, every status is reachable OFFLINE", () => {
  const CASES: Record<ModeratedReplyStatus, string> = {
    ok: "I feel wobbly today",
    redirect: "can we watch youtube",
    filtered: MOCK_MARKERS.filtered,
    refused: "my phone number is 555-123-4567",
    crisis: "I want to hurt myself",
    disabled: MOCK_MARKERS.disabled,
    rate_limited: MOCK_MARKERS.rateLimited,
    error: MOCK_MARKERS.error,
  };

  it.each(ALL_MODERATED_REPLY_STATUSES.map((s) => [s] as const))(
    "reaches status %s through the seam with zero network",
    async (status) => {
      seedChild(true);
      const reply = await sendBloopTurn(turn(CASES[status]), ctx());
      expect(reply.status).toBe(status);
    },
  );

  it("a throwing provider fails closed to the warm error line (I1)", async () => {
    seedChild(true);
    __setBloopProviderForTests({
      id: "boom",
      sendTurn: async () => {
        throw new Error("network fell over");
      },
    });
    const reply = await sendBloopTurn(turn("hi"), ctx());
    expect(reply).toMatchObject({ status: "error", text: SAFE_FALLBACK_TEXT });
  });
});

describe("the unconfigured proxy path (unavailable, never broken)", () => {
  it("proxy provider with NO Firebase config returns the warm error reply", async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.EXPO_PUBLIC_TB_BLOOP_PROXY = "1";
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fresh = require("../../src/services/bloopProvider") as {
          getBloopProvider(): BloopProvider;
        };
        const provider = fresh.getBloopProvider();
        expect(provider.id).toBe("proxy");
        // Call the provider directly (the seam's gate is store-based and
        // already covered above); env has no EXPO_PUBLIC_FIREBASE_* keys.
        const reply = await provider.sendTurn(turn("hi"), ctx());
        expect(reply).toMatchObject({ status: "error", text: SAFE_FALLBACK_TEXT });
      } finally {
        delete process.env.EXPO_PUBLIC_TB_BLOOP_PROXY;
      }
    });
  });
});

describe("client-side chat availability (fail closed)", () => {
  it("default settings resolve to disabled (chat off)", () => {
    expect(getBloopChatAvailability(undefined)).toBe("disabled");
    expect(getBloopChatAvailability({})).toBe("disabled");
  });

  it("parent-enabled + mock provider resolves to available (offline-capable)", () => {
    expect(getBloopChatAvailability({ bloopEnabled: true })).toBe("available");
  });

  it("bloopTopicScopeOf maps legacy ids and drops unknowns (fail closed)", () => {
    expect(bloopTopicScopeOf({ bloopTopicScope: ["aac", "socialStories", "nonsense"] })).toEqual([
      "communication",
      "social",
    ]);
    expect(bloopTopicScopeOf({})).toEqual([]);
    expect(bloopTopicScopeOf(undefined)).toEqual([]);
  });
});
