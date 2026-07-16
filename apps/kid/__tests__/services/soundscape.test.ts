import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

/**
 * M-C1 soundscape looping-bed player (feature `soundscapes`). jest-expo does not
 * mock expo-audio, so we mock it and pin the off-device-testable contract:
 *   - the service NEVER configures the audio session (mix-not-hijack lives ONLY in
 *     sound.ts) — it reuses the ducking session configured there;
 *   - playSoundscape creates a LOOPING player + seekTo(0)+play at the set volume;
 *   - setSoundscapeVolume clamps [0,1] + applies to the live bed;
 *   - stopSoundscape pauses;
 *   - it NO-OPS (no throw, no player) when master sound / the ambient category is
 *     off, or for an unknown/unbundled scene.
 * Real audio ducking/latency is a device-verify item (RUN.md).
 */
jest.mock("expo-audio", () => ({
  setAudioModeAsync: jest.fn(async () => {}),
  createAudioPlayer: jest.fn(() => ({
    volume: 1,
    loop: false,
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(async () => {}),
    remove: jest.fn(),
  })),
}));

import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

import { SOUNDSCAPE_ASSET_KEYS } from "../../src/data/soundscapes";
import { setSoundCategoryEnabled, setSoundEnabled } from "../../src/services/sound";
import {
  SOUNDSCAPE_ASSET,
  getSoundscapeState,
  playSoundscape,
  setSoundscapeVolume,
  stopSoundscape,
  teardownSoundscape,
} from "../../src/services/soundscape";

const createMock = createAudioPlayer as unknown as jest.Mock;
const modeMock = setAudioModeAsync as unknown as jest.Mock;

type FakePlayer = {
  volume: number;
  loop: boolean;
  play: jest.Mock;
  pause: jest.Mock;
  seekTo: jest.Mock;
  remove: jest.Mock;
};

function lastPlayer(): FakePlayer | undefined {
  const results = createMock.mock.results;
  return results.length ? (results[results.length - 1].value as FakePlayer) : undefined;
}

describe("soundscape bed player", () => {
  beforeEach(() => {
    setSoundEnabled(true);
    setSoundCategoryEnabled("ambient", true);
    setSoundscapeVolume(0.55);
    createMock.mockClear();
    modeMock.mockClear();
  });
  afterEach(() => {
    teardownSoundscape();
  });

  it("keeps the require-map in sync with the catalog's SOUNDSCAPE_ASSET_KEYS", () => {
    expect(Object.keys(SOUNDSCAPE_ASSET).sort()).toEqual([...SOUNDSCAPE_ASSET_KEYS].sort());
  });

  it("bundles the free `waves` scene (reuses calm-ambient.wav)", () => {
    expect(SOUNDSCAPE_ASSET.waves).toBeDefined();
  });

  it("NEVER configures the audio session (mix-not-hijack + no-background live in sound.ts)", () => {
    playSoundscape("waves");
    expect(modeMock).not.toHaveBeenCalled();
  });

  it("plays a LOOPING bed: creates a player, loops, seekTo(0) then play", () => {
    playSoundscape("waves");
    const p = lastPlayer()!;
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(p.loop).toBe(true);
    expect(p.seekTo).toHaveBeenCalledWith(0);
    expect(p.play).toHaveBeenCalledTimes(1);
    const st = getSoundscapeState();
    expect(st.activeSceneId).toBe("waves");
    expect(st.playing).toBe(true);
  });

  it("applies the current bed volume to the player", () => {
    setSoundscapeVolume(0.2);
    playSoundscape("waves");
    expect(lastPlayer()!.volume).toBe(0.2);
  });

  it("setSoundscapeVolume clamps to [0,1] (NaN → default 0.55) and applies live", () => {
    setSoundscapeVolume(2);
    expect(getSoundscapeState().volume).toBe(1);
    setSoundscapeVolume(-1);
    expect(getSoundscapeState().volume).toBe(0);
    setSoundscapeVolume(Number.NaN);
    expect(getSoundscapeState().volume).toBe(0.55);

    playSoundscape("waves");
    setSoundscapeVolume(0.4);
    expect(lastPlayer()!.volume).toBe(0.4);
  });

  it("stopSoundscape pauses the bed", () => {
    playSoundscape("waves");
    const p = lastPlayer()!;
    stopSoundscape();
    expect(p.pause).toHaveBeenCalledTimes(1);
    expect(getSoundscapeState().playing).toBe(false);
  });

  it("re-playing the SAME scene reuses the player (no scene-swap teardown)", () => {
    playSoundscape("waves");
    playSoundscape("waves");
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(lastPlayer()!.play).toHaveBeenCalledTimes(2);
  });

  it("no-ops (no throw, no player) when master sound is off", () => {
    setSoundEnabled(false);
    expect(() => playSoundscape("waves")).not.toThrow();
    expect(createMock).not.toHaveBeenCalled();
    expect(getSoundscapeState().playing).toBe(false);
  });

  it("no-ops when the ambient mixer category is off", () => {
    setSoundCategoryEnabled("ambient", false);
    playSoundscape("waves");
    expect(createMock).not.toHaveBeenCalled();
    expect(getSoundscapeState().playing).toBe(false);
  });

  it("no-ops for an unknown / not-yet-bundled scene id (never throws)", () => {
    expect(() => playSoundscape("does_not_exist")).not.toThrow();
    expect(createMock).not.toHaveBeenCalled();
  });
});
