/**
 * __tests__/domain/soundscapes.test.ts — the pure soundscape resolver + catalog
 * (feature `soundscapes`, M-C1 / §7). Deterministic + offline: no audio, no store
 * writes. Proves the catalog is valid, volume is clamped, a missing blob resolves
 * to defaults, ownership is HONOURED (acquisition-only), and pickers stay curated.
 */
import { describe, expect, it } from "@jest/globals";

import { DEFAULT_SOUNDSCAPE_SETTINGS } from "../../src/domain/constants";
import {
  clampVolume,
  findSoundscape,
  isSceneAvailable,
  pickableScenes,
  resolveSoundscapeSettings,
} from "../../src/domain/soundscapes";
import type { Entitlement, Soundscape } from "../../src/domain/types";
import { SOUNDSCAPES, SOUNDSCAPE_ASSET_KEYS } from "../../src/data/soundscapes";

const FREE: Entitlement = { tier: "free", source: "none", mockPurchases: [], updatedAt: 0 };
const PREMIUM: Entitlement = {
  tier: "premium",
  source: "mock_purchase",
  mockPurchases: [],
  updatedAt: 0,
};

/** A synthetic premium scene (its asset need not be bundled to test the gate). */
const PREMIUM_SCENE: Soundscape = {
  id: "brown_noise",
  label: { spokenLabel: "Brown Noise", emoji: "🟤", color: "#8B6B4A" },
  kind: "focus",
  premium: true,
  assetKey: "brown_noise",
};

describe("soundscape catalog", () => {
  it("has at least one FREE scene with a valid spokenLabel", () => {
    const free = SOUNDSCAPES.filter((s) => !s.premium);
    expect(free.length).toBeGreaterThanOrEqual(1);
    for (const s of free) {
      expect(typeof s.label.spokenLabel).toBe("string");
      expect(s.label.spokenLabel.length).toBeGreaterThan(0);
    }
  });

  it("the free `waves` scene is present (calm-corner default, reuses calm-ambient.wav)", () => {
    const waves = findSoundscape("waves");
    expect(waves).toBeDefined();
    expect(waves!.premium).toBe(false);
    expect(waves!.kind).toBe("calm");
  });

  it("every scene's assetKey has a bundled asset (never points at a missing file)", () => {
    for (const s of SOUNDSCAPES) {
      expect(SOUNDSCAPE_ASSET_KEYS).toContain(s.assetKey);
    }
  });

  it("every scene carries a unique id", () => {
    const ids = SOUNDSCAPES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("resolveSoundscapeSettings", () => {
  it("defaults a missing/undefined blob to DEFAULT_SOUNDSCAPE_SETTINGS", () => {
    expect(resolveSoundscapeSettings(undefined)).toEqual(DEFAULT_SOUNDSCAPE_SETTINGS);
    expect(resolveSoundscapeSettings(null)).toEqual(DEFAULT_SOUNDSCAPE_SETTINGS);
  });

  it("clamps volume to [0,1] and coerces NaN to the default", () => {
    expect(resolveSoundscapeSettings({ volume: 5 }).volume).toBe(1);
    expect(resolveSoundscapeSettings({ volume: -3 }).volume).toBe(0);
    expect(resolveSoundscapeSettings({ volume: Number.NaN }).volume).toBe(
      DEFAULT_SOUNDSCAPE_SETTINGS.volume,
    );
    expect(resolveSoundscapeSettings({ volume: 0.3 }).volume).toBe(0.3);
  });

  it("coerces a non-existent scene id back to a safe value (premium-lock is NOT invalid)", () => {
    const out = resolveSoundscapeSettings({ calmSceneId: "ghost", focusSceneId: "nope" });
    expect(out.calmSceneId).toBe("waves");
    expect(out.focusSceneId).toBeNull();
  });

  it("coerces focusDuringTasks to a boolean", () => {
    expect(resolveSoundscapeSettings({ focusDuringTasks: 1 as unknown as boolean }).focusDuringTasks).toBe(
      true,
    );
    expect(resolveSoundscapeSettings({}).focusDuringTasks).toBe(false);
  });

  it("clampVolume is a pure [0,1] clamp", () => {
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume("x")).toBe(DEFAULT_SOUNDSCAPE_SETTINGS.volume);
  });
});

describe("isSceneAvailable (acquisition-only, ownership-honoured)", () => {
  const waves = findSoundscape("waves")!;

  it("a free scene is always available", () => {
    expect(isSceneAvailable(waves, FREE)).toBe(true);
    expect(isSceneAvailable(waves, PREMIUM)).toBe(true);
  });

  it("a premium scene is available to premium/trial children", () => {
    expect(isSceneAvailable(PREMIUM_SCENE, PREMIUM)).toBe(true);
  });

  it("a premium scene is NOT newly-selectable by a free child", () => {
    expect(isSceneAvailable(PREMIUM_SCENE, FREE)).toBe(false);
  });

  it("HONOURS ownership: a premium scene already selected stays available after a downgrade", () => {
    // simulate trial-expiry with the premium scene still the selected id
    expect(isSceneAvailable(PREMIUM_SCENE, FREE, PREMIUM_SCENE.id)).toBe(true);
  });
});

describe("pickableScenes", () => {
  it("never exceeds maxChoices", () => {
    expect(pickableScenes("calm", 3, FREE, "waves").length).toBeLessThanOrEqual(3);
    expect(pickableScenes("focus", 6, FREE, null).length).toBeLessThanOrEqual(6);
    expect(pickableScenes("calm", 0, FREE, "waves").length).toBe(0);
  });

  it("always includes the free `waves` bed in both contexts", () => {
    expect(pickableScenes("calm", 6, FREE, "waves").some((s) => s.id === "waves")).toBe(true);
    expect(pickableScenes("focus", 6, FREE, null).some((s) => s.id === "waves")).toBe(true);
  });

  it("puts the currently-selected scene first", () => {
    const list = pickableScenes("calm", 6, FREE, "waves");
    expect(list[0]?.id).toBe("waves");
  });
});
