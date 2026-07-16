import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

/**
 * M13 haptic cue registry (doc 61 §10 / doc 66 §5). jest-expo does not mock
 * expo-haptics, so we mock it and pin:
 *   - the per-cue API mapping (doc 61 §10.1)
 *   - master + per-call toggle gating
 *   - the HARD anti-shame rule: NO Warning/Error haptic is EVER fired toward a
 *     child (the service defines no such cue).
 */
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));

import * as Haptics from "expo-haptics";

import {
  fireHaptic,
  isHapticsEnabled,
  setHapticsEnabled,
  type HapticCue,
} from "../../src/services/haptics";

const impactMock = Haptics.impactAsync as unknown as jest.Mock;
const notifyMock = Haptics.notificationAsync as unknown as jest.Mock;

const ALL_CUES: HapticCue[] = ["tap", "select", "done", "token", "routineComplete", "levelUp"];

describe("haptics service", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    impactMock.mockClear();
    notifyMock.mockClear();
    setHapticsEnabled(true);
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("maps step-complete to a Success notification", () => {
    fireHaptic("done");
    expect(notifyMock).toHaveBeenCalledWith("success");
  });

  it("maps token-land to a Medium impact", () => {
    fireHaptic("token");
    expect(impactMock).toHaveBeenCalledWith("medium");
  });

  it("levelUp is a Heavy thump then two Light sparkles", () => {
    fireHaptic("levelUp");
    expect(impactMock).toHaveBeenCalledWith("heavy");
    jest.advanceTimersByTime(200);
    const lightCalls = impactMock.mock.calls.filter((c) => c[0] === "light");
    expect(lightCalls.length).toBe(2);
  });

  it("does nothing when the master toggle is off", () => {
    setHapticsEnabled(false);
    expect(isHapticsEnabled()).toBe(false);
    ALL_CUES.forEach((cue) => fireHaptic(cue));
    jest.runOnlyPendingTimers();
    expect(impactMock).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("respects a per-call enabled override even when master is on", () => {
    fireHaptic("done", { enabled: false });
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("NEVER fires a Warning/Error notification for ANY cue (anti-shame)", () => {
    ALL_CUES.forEach((cue) => fireHaptic(cue));
    jest.advanceTimersByTime(500);
    const types = notifyMock.mock.calls.map((c) => c[0]);
    expect(types).not.toContain("warning");
    expect(types).not.toContain("error");
    // only the positive Success notification is ever used
    types.forEach((ty) => expect(ty).toBe("success"));
  });
});
