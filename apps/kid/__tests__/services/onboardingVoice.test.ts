import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

// Mock the TTS facade so we control voice availability without a device.
const mockGetVoices = jest.fn<() => Promise<unknown[]>>();
jest.mock("../../src/services/tts", () => ({
  getAvailableVoices: () => mockGetVoices(),
  speak: jest.fn(),
}));

import {
  ONBOARDING_VOICE_SLOTS,
  __resetVoiceProbe,
  playOnboardingClip,
  probeVoiceAvailable,
  registerOnboardingClipPlayer,
  type OnboardingVoiceSlot,
} from "../../src/services/onboardingVoice";

/**
 * The offline-TTS fallback seam (doc 66 §M11). No CC0 clip is bundled yet, so the
 * fallback is wired but inert: every slot is `null` and `playOnboardingClip` is a
 * safe no-op until both a slot asset AND a player exist. The voice probe is the
 * decision point for the "install a voice" prompt. These tests pin that contract.
 */
describe("onboarding voice fallback", () => {
  afterEach(() => {
    registerOnboardingClipPlayer(null);
    // restore any slot a test flipped
    (Object.keys(ONBOARDING_VOICE_SLOTS) as OnboardingVoiceSlot[]).forEach((k) => {
      ONBOARDING_VOICE_SLOTS[k] = null;
    });
    __resetVoiceProbe();
    mockGetVoices.mockReset();
  });

  it("ships every slot as a documented null (no fabricated binary)", () => {
    expect(Object.values(ONBOARDING_VOICE_SLOTS).every((v) => v === null)).toBe(true);
  });

  it("playOnboardingClip is a no-op when no asset is bundled", () => {
    const player = jest.fn(() => true);
    registerOnboardingClipPlayer(player);
    expect(playOnboardingClip("welcome")).toBe(false);
    expect(player).not.toHaveBeenCalled();
  });

  it("routes to the player once a slot asset + player exist (wired seam)", () => {
    ONBOARDING_VOICE_SLOTS.welcome = 42; // pretend a clip module landed
    const player = jest.fn(() => true);
    registerOnboardingClipPlayer(player);
    expect(playOnboardingClip("welcome")).toBe(true);
    expect(player).toHaveBeenCalledWith("welcome", 42);
  });

  it("swallows a throwing player (a clip can never break onboarding)", () => {
    ONBOARDING_VOICE_SLOTS.child = 7;
    registerOnboardingClipPlayer(() => {
      throw new Error("audio unavailable");
    });
    expect(playOnboardingClip("child")).toBe(false);
  });

  it("probe reports missing when the device has no voices", async () => {
    mockGetVoices.mockResolvedValue([]);
    await expect(probeVoiceAvailable()).resolves.toBe(false);
  });

  it("probe reports available when a voice exists, and caches the result", async () => {
    mockGetVoices.mockResolvedValue([{ identifier: "v1" }]);
    await expect(probeVoiceAvailable()).resolves.toBe(true);
    // cached: a second call does not re-probe
    await expect(probeVoiceAvailable()).resolves.toBe(true);
    expect(mockGetVoices).toHaveBeenCalledTimes(1);
  });
});
