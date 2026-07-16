import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

/**
 * M13 sound cue registry (doc 61 §9 / doc 66 §1b.1). jest-expo does not mock
 * expo-audio, so we mock it and pin the off-device-testable contract:
 *   - mix-not-hijack session config (duck, never seize)
 *   - playCue() = seekTo(0)+play() on a pre-created player
 *   - master + per-category toggles silence cues app-wide (doc 61 §9.3)
 *   - the loopable calm.ambient bed starts/stops + loops
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

import { playCue } from "../../src/services/playCue";
import {
  initSoundRegistry,
  isCategoryEnabled,
  setSoundCategoryEnabled,
  setSoundEnabled,
  startAmbient,
  stopAmbient,
  teardownSoundRegistry,
} from "../../src/services/sound";

const createMock = createAudioPlayer as unknown as jest.Mock;
const modeMock = setAudioModeAsync as unknown as jest.Mock;

type FakePlayer = {
  loop: boolean;
  play: jest.Mock;
  pause: jest.Mock;
  seekTo: jest.Mock;
  remove: jest.Mock;
};

function players(): FakePlayer[] {
  return createMock.mock.results.map((r) => r.value as FakePlayer);
}
function totalPlays(): number {
  return players().reduce((n, p) => n + p.play.mock.calls.length, 0);
}
function clearPlays(): void {
  players().forEach((p) => {
    p.play.mockClear();
    p.seekTo.mockClear();
    p.pause.mockClear();
  });
}
function ambient(): FakePlayer | undefined {
  // sound.ts sets loop=true only on the calm.ambient player at init
  return players().find((p) => p.loop === true);
}

describe("sound registry", () => {
  beforeEach(() => {
    createMock.mockClear();
    modeMock.mockClear();
    initSoundRegistry();
    setSoundEnabled(true);
    setSoundCategoryEnabled("ui", true);
    setSoundCategoryEnabled("celebration", true);
    setSoundCategoryEnabled("voice", true);
    setSoundCategoryEnabled("ambient", true);
    clearPlays();
  });
  afterEach(() => {
    teardownSoundRegistry();
  });

  it("configures a mix-not-hijack (ducking) audio session", () => {
    expect(modeMock).toHaveBeenCalledTimes(1);
    const cfg = modeMock.mock.calls[0][0] as Record<string, unknown>;
    expect(cfg.interruptionMode).toBe("duckOthers");
    expect(cfg.shouldPlayInBackground).toBe(false);
  });

  it("pre-instantiates one player per cue (10 cues)", () => {
    // 9 shipped cues + the optional decoupled `timer.done` chime (visual-timers §4).
    expect(createMock).toHaveBeenCalledTimes(10);
  });

  it("playCue seeks to 0 then plays exactly one player", () => {
    playCue("step.done");
    expect(totalPlays()).toBe(1);
    const played = players().find((p) => p.play.mock.calls.length > 0)!;
    expect(played.seekTo).toHaveBeenCalledWith(0);
  });

  it("master mute silences every cue app-wide", () => {
    setSoundEnabled(false);
    playCue("step.done");
    playCue("tap.soft");
    expect(totalPlays()).toBe(0);
  });

  it("a per-category mute silences only that category", () => {
    setSoundCategoryEnabled("celebration", false);
    expect(isCategoryEnabled("celebration")).toBe(false);
    playCue("step.done"); // celebration -> muted
    expect(totalPlays()).toBe(0);
    playCue("tap.soft"); // ui -> still audible
    expect(totalPlays()).toBe(1);
  });

  it("the calm soundscape starts (looping) and stops", () => {
    const amb = ambient()!;
    expect(amb).toBeDefined();
    startAmbient();
    expect(amb.loop).toBe(true);
    expect(amb.play).toHaveBeenCalledTimes(1);
    stopAmbient();
    expect(amb.pause).toHaveBeenCalledTimes(1);
  });

  it("muting the ambient category stops the soundscape", () => {
    const amb = ambient()!;
    startAmbient();
    amb.pause.mockClear();
    setSoundCategoryEnabled("ambient", false);
    expect(amb.pause).toHaveBeenCalledTimes(1);
  });

  it("teardown unregisters the facade (playCue back to a no-op)", () => {
    teardownSoundRegistry();
    clearPlaysAfterTeardown();
    playCue("step.done");
    // players were removed + facade unregistered: no play happens
    expect(totalPlaysSafe()).toBe(0);
  });
});

// teardown removes players from the registry but createMock.results still holds
// the fake objects; these helpers guard against that for the last assertion.
function clearPlaysAfterTeardown(): void {
  createMock.mock.results.forEach((r) => (r.value as FakePlayer).play.mockClear());
}
function totalPlaysSafe(): number {
  return createMock.mock.results.reduce(
    (n, r) => n + (r.value as FakePlayer).play.mock.calls.length,
    0,
  );
}
