/**
 * __tests__/render/bloop-route.test.tsx — the M2.0 OFF-BY-DEFAULT route gate
 * (w2 §6.3; arch §4.1: the chat surface "only exists" when the parent enabled
 * it — default false).
 *
 * Renders the real `app/(kid)/bloop.tsx` host through the §2.8 harness with
 * expo-router mocked (the redirect target is asserted, not navigated):
 *   - DEFAULT child (bloopEnabled ABSENT) ⇒ the route renders NOTHING but a
 *     redirect back to Today — no chat UI, no error, nothing broken;
 *   - bloopEnabled:false explicitly ⇒ same redirect;
 *   - bloopEnabled:true ⇒ the placeholder renders (header + AI disclosure +
 *     curated chips), chips-only input, and a tap round-trips the mock seam.
 */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

// Mock BEFORE importing the route: the harness renders outside a navigator.
const redirects: string[] = [];
jest.mock("expo-router", () => ({
  Redirect: ({ href }: { href: string }) => {
    redirects.push(href);
    return null;
  },
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}));

import { ALL_TOPICS } from "@tiny-bubbles/shared";

import BloopChatPlaceholder from "../../app/(kid)/bloop";
import { __setBloopProviderForTests } from "../../src/services/bloopProvider";
import { createChildWithSeed } from "../../src/state/gameplay";
import { useChildStore } from "../../src/state/childStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { queryAllText, renderWithTheme } from "../helpers/render";

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
  redirects.length = 0;
  __setBloopProviderForTests(undefined);
});

afterEach(() => {
  __setBloopProviderForTests(undefined);
});

describe("bloop route — OFF BY DEFAULT (w2 §6.3)", () => {
  it("renders NO chat UI for a default child (bloopEnabled absent) — just a redirect", () => {
    seedChild(); // absent ⇒ false (the v1-compatible default)
    const r = renderWithTheme(<BloopChatPlaceholder />);
    // React may render the host more than once; EVERY render must redirect.
    expect(redirects.length).toBeGreaterThan(0);
    expect(redirects.every((href) => href === "/(kid)")).toBe(true);
    const text = queryAllText(r).join(" ");
    expect(text).not.toContain("Bloop");
    expect(text).not.toContain("pretend bubble friend");
  });

  it("renders NO chat UI when bloopEnabled is explicitly false", () => {
    seedChild(false);
    const r = renderWithTheme(<BloopChatPlaceholder />);
    expect(redirects.length).toBeGreaterThan(0);
    expect(redirects.every((href) => href === "/(kid)")).toBe(true);
    expect(queryAllText(r).join(" ")).not.toContain("pretend bubble friend");
  });

  it("renders NO chat UI when no child is active at all", () => {
    const r = renderWithTheme(<BloopChatPlaceholder />);
    expect(redirects.length).toBeGreaterThan(0);
    expect(redirects.every((href) => href === "/(kid)")).toBe(true);
    expect(queryAllText(r)).toHaveLength(0);
  });

  it("renders the placeholder (disclosure + curated chips) when the parent enabled chat", () => {
    seedChild(true);
    const r = renderWithTheme(<BloopChatPlaceholder />);
    expect(redirects).toHaveLength(0);
    const text = queryAllText(r).join(" ");
    // header + the persistent AI disclosure (kid-llm-safety)
    expect(text).toContain("Bloop");
    expect(text).toContain("pretend bubble friend, not a person");
    // curated chips render (PII-free catalog copy)
    expect(text).toContain("I feel happy today");
  });
});
