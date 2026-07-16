/**
 * __tests__/components/breathingBubble.test.tsx — the breathe-with-the-bubble
 * render-tests (breathing-regulation §4 CREATE #5), on the M-A4 render harness +
 * Reanimated jest mock.
 *
 * Asserts: a phase label from `resolveContent` renders (both age variants exist);
 * `onCycle`/`onComplete` fire the right number of times for a fixed elapsed
 * sequence; the Reduce-Motion stepped path renders without a thrown worklet; and
 * the kid palette carries NO red/danger token (the activity's anti-alarm guarantee).
 * The component takes only resolved booleans + resolved copy — never an ageMode prop.
 *
 * Fake timers throughout so the internal 200ms/1s label tick never fires outside an
 * `act(...)` (no stray state updates).
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, type ReactTestRenderer } from "react-test-renderer";

import BreathingBubble from "../../components/kid/BreathingBubble";
import { getBreathPattern, type BreathPhase } from "../../src/domain/breathing";
import { REEF, TIDE_LIGHT } from "../../src/theme/tokens";
import { resolveContent } from "../../src/theme/resolveContent";
import { queryAllText, renderWithTheme } from "../helpers/render";

const bubble = getBreathPattern("bubble")!; // cycle 8000ms, target 5

function labelsFor(ageMode: "young" | "older"): Record<BreathPhase, string> {
  return {
    inhale: resolveContent("breathe.in", { ageMode }),
    hold: resolveContent("breathe.hold", { ageMode }),
    exhale: resolveContent("breathe.out", { ageMode }),
    holdOut: resolveContent("breathe.rest", { ageMode }),
  };
}

const unmount = (r: ReactTestRenderer) => act(() => r.unmount());

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe("BreathingBubble", () => {
  it("renders the resolved phase label (both age variants)", () => {
    const young = renderWithTheme(
      <BreathingBubble
        pattern={bubble}
        animate
        reducedMotion={false}
        ttsEnabled={false}
        pacingHaptics={false}
        phaseLabels={labelsFor("young")}
      />,
      { theme: { ageMode: "young" } },
    );
    // starts on the inhale phase → the young "Breathe in…" copy renders
    expect(queryAllText(young)).toContain("Breathe in…");
    unmount(young);

    const older = renderWithTheme(
      <BreathingBubble
        pattern={bubble}
        animate
        reducedMotion={false}
        ttsEnabled={false}
        pacingHaptics={false}
        phaseLabels={labelsFor("older")}
      />,
      { theme: { ageMode: "older" } },
    );
    expect(queryAllText(older)).toContain("Breathe in");
    unmount(older);
  });

  it("fires onCycle per completed cycle and onComplete exactly once at the target", () => {
    const onCycle = jest.fn();
    const onComplete = jest.fn();
    const r = renderWithTheme(
      <BreathingBubble
        pattern={bubble}
        animate
        reducedMotion={false}
        ttsEnabled={false}
        pacingHaptics={false}
        phaseLabels={labelsFor("young")}
        onCycle={onCycle}
        onComplete={onComplete}
      />,
    );
    // Walk the (fake) wall clock forward through all 5 cycles (5 × 8000ms).
    act(() => {
      jest.advanceTimersByTime(40_200);
    });
    expect(onCycle).toHaveBeenCalledTimes(5);
    expect(onCycle).toHaveBeenLastCalledWith(5);
    expect(onComplete).toHaveBeenCalledTimes(1);
    unmount(r);
  });

  it("does not fire onComplete before the target is reached", () => {
    const onComplete = jest.fn();
    const r = renderWithTheme(
      <BreathingBubble
        pattern={bubble}
        animate
        reducedMotion={false}
        ttsEnabled={false}
        pacingHaptics={false}
        phaseLabels={labelsFor("young")}
        onComplete={onComplete}
      />,
    );
    act(() => {
      jest.advanceTimersByTime(16_000); // only 2 of 5 cycles
    });
    expect(onComplete).not.toHaveBeenCalled();
    unmount(r);
  });

  it("renders the Reduce-Motion static path without a thrown worklet", () => {
    const r = renderWithTheme(
      <BreathingBubble
        pattern={bubble}
        animate={false}
        reducedMotion
        ttsEnabled={false}
        pacingHaptics={false}
        phaseLabels={labelsFor("older")}
      />,
      { theme: { ageMode: "older", reducedMotion: true } },
    );
    expect(queryAllText(r)).toContain("Breathe in");
    unmount(r);
  });

  it("uses no red/danger colour token (anti-alarm — none exists in the kid palette)", () => {
    for (const palette of [REEF, TIDE_LIGHT] as const) {
      expect("danger" in palette).toBe(false);
      expect("error" in palette).toBe(false);
      expect("fail" in palette).toBe(false);
    }
  });
});
