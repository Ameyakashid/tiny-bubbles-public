/**
 * __tests__/bloop/mock.test.ts — MockBloopProvider determinism + coverage
 * (M2.0, w2 §6.1: "deterministic, offline, exercises EVERY status").
 *
 * Proves: (1) the mock is deterministic (same input ⇒ same reply, no RNG/
 * clock); (2) every `ModeratedReplyStatus` member is reachable OFFLINE;
 * (3) crisis routing is DIFFERENTIATED per §8 #27 (abuse/csam ⇒ NO parent
 * alert + safetyReport + legalHold; the locale card is the reviewed table's,
 * never invented); (4) raw PII is never echoed back; (5) chips stay within
 * the parent-enabled scope and empty scope grants nothing.
 */
import { describe, expect, it } from "@jest/globals";

import {
  ALL_MODERATED_REPLY_STATUSES,
  ALL_TOPICS,
  MOCK_MARKERS,
  MockBloopProvider,
  mockTurnOutcome,
  quickRepliesForScope,
  QUICK_REPLIES,
  type BloopContext,
  type BloopTurnInput,
  type ModeratedReplyStatus,
} from "@tiny-bubbles/shared";

const ctx = (over: Partial<BloopContext> = {}): BloopContext => ({
  childId: "child-1",
  sessionId: "s-1",
  neuroProfile: "both",
  ageMode: "young",
  locale: "en-US",
  topicScope: [...ALL_TOPICS],
  ...over,
});

const turn = (text: string, over: Partial<BloopTurnInput> = {}): BloopTurnInput => ({
  text,
  inputMode: "chips",
  ...over,
});

describe("determinism (no RNG, no clock)", () => {
  it("two fresh providers give byte-identical replies for the same turn", async () => {
    const a = await new MockBloopProvider().sendTurn(turn("I feel happy"), ctx());
    const b = await new MockBloopProvider().sendTurn(turn("I feel happy"), ctx());
    expect(a).toEqual(b);
  });

  it("the pure core is referentially deterministic across repeated calls", () => {
    const one = mockTurnOutcome(turn("let's take slow breaths"), ctx());
    const two = mockTurnOutcome(turn("let's take slow breaths"), ctx());
    expect(one).toEqual(two);
  });

  it("turnIds are a deterministic per-session sequence", async () => {
    const p = new MockBloopProvider();
    const r1 = await p.sendTurn(turn("hi"), ctx());
    const r2 = await p.sendTurn(turn("hi"), ctx());
    expect(r1.turnId).toBe("mock-s-1-1");
    expect(r2.turnId).toBe("mock-s-1-2");
  });
});

describe("every ModeratedReplyStatus is reachable OFFLINE (w2 §6.1)", () => {
  const CASES: Record<ModeratedReplyStatus, BloopTurnInput> = {
    ok: turn("I feel wobbly today"),
    redirect: turn("can we watch youtube"),
    filtered: turn(MOCK_MARKERS.filtered),
    refused: turn("my phone number is 555-123-4567"),
    crisis: turn("I want to hurt myself"),
    disabled: turn(MOCK_MARKERS.disabled),
    rate_limited: turn(MOCK_MARKERS.rateLimited),
    error: turn(MOCK_MARKERS.error),
  };

  it.each(ALL_MODERATED_REPLY_STATUSES.map((s) => [s] as const))(
    "reaches status %s with zero network",
    async (status) => {
      const p = new MockBloopProvider();
      const reply = await p.sendTurn(CASES[status], ctx());
      expect(reply.status).toBe(status);
    },
  );

  it("renderable statuses carry warm text; hard stops carry none", async () => {
    const p = new MockBloopProvider();
    for (const status of ALL_MODERATED_REPLY_STATUSES) {
      const reply = await p.sendTurn(CASES[status], ctx());
      if (status === "disabled" || status === "rate_limited") {
        expect(reply.text).toBe("");
      } else {
        expect(reply.text.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("crisis differentiation (§8 #27)", () => {
  it("self-harm → parent alert, no safety report, no legal hold", () => {
    const o = mockTurnOutcome(turn("sometimes I want to hurt myself"), ctx());
    expect(o).toMatchObject({
      kind: "crisis",
      crisisType: "self_harm",
      alertParent: true,
      fileSafetyReport: false,
      legalHold: false,
    });
  });

  it("abuse → NO parent auto-alert + safetyReport + legalHold", () => {
    const o = mockTurnOutcome(turn("someone hurts me at home"), ctx());
    expect(o).toMatchObject({
      kind: "crisis",
      crisisType: "abuse",
      alertParent: false,
      fileSafetyReport: true,
      legalHold: true,
    });
    // no promise-of-disclosure to the child (§8 #27)
    if (o.kind === "crisis") expect(o.childText.toLowerCase()).not.toContain("will be told");
  });

  it("crisis text is never a bare refusal and the card is locale-resolved", async () => {
    const p = new MockBloopProvider();
    const reply = await p.sendTurn(turn("I want to disappear forever"), ctx({ locale: "en-IN" }));
    expect(reply.status).toBe("crisis");
    expect(reply.text.length).toBeGreaterThan(0);
    expect(reply.crisis).toBeDefined();
    expect(reply.crisis?.locale).toBe("en-IN");
  });

  it("crisis wins over PII in the same message (I2 — nothing swallows a crisis)", () => {
    const o = mockTurnOutcome(
      turn("call me at 555-123-4567, I want to hurt myself"),
      ctx(),
    );
    expect(o.kind).toBe("crisis");
  });
});

describe("PII handling (I5 — refused, never echoed)", () => {
  it("refuses PII with a warm line that does not echo the value", async () => {
    const p = new MockBloopProvider();
    const reply = await p.sendTurn(turn("my email is kid@example.com"), ctx());
    expect(reply.status).toBe("refused");
    expect(reply.text).not.toContain("kid@example.com");
    expect(reply.flags.some((f) => f.category === "pii")).toBe(true);
  });
});

describe("topic scope + chips (fail closed)", () => {
  it("chips stay within the parent-enabled scope", async () => {
    const p = new MockBloopProvider();
    const reply = await p.sendTurn(turn("I feel happy"), ctx({ topicScope: ["calming"] }));
    expect(reply.quickReplies?.length).toBeGreaterThan(0);
    for (const chip of reply.quickReplies ?? []) expect(chip.topic).toBe("calming");
  });

  it("an empty scope yields no chips and a warm no-scope reply (never an error)", async () => {
    const p = new MockBloopProvider();
    const reply = await p.sendTurn(turn("hello"), ctx({ topicScope: [] }));
    expect(reply.status).toBe("ok");
    expect(reply.quickReplies).toEqual([]);
    expect(reply.text.length).toBeGreaterThan(0);
  });

  it("the curated catalog is PII-free and covers every canonical topic", () => {
    const topics = new Set(QUICK_REPLIES.map((q) => q.topic));
    for (const t of ALL_TOPICS) expect(topics.has(t)).toBe(true);
    // no digits/emails/links in curated chip copy (PII-free by construction)
    for (const q of QUICK_REPLIES) expect(q.title).not.toMatch(/[0-9@]|http/i);
    expect(quickRepliesForScope([])).toEqual([]);
  });
});
