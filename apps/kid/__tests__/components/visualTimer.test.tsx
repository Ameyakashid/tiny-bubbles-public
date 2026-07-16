/**
 * __tests__/components/visualTimer.test.tsx — the depleting visual-transition
 * timer render-tests (visual-timers §4 CREATE #4), built on the M-A4 render
 * harness + Reanimated jest mock.
 *
 * Asserts: a numeric m:ss readout appears ONLY when `showNumbers` (older); the
 * calm label renders; `onEmpty` fires EXACTLY once when the timer is already empty
 * and NEVER fires while time remains (no false "time's up"); the Reduce-Motion
 * stepped path renders without a thrown worklet; and the kid palette carries NO
 * red/danger colour token (the timer's anti-alarm guarantee).
 */
import { describe, expect, it, jest } from "@jest/globals";

import VisualTimer from "../../components/task/VisualTimer";
import { REEF, TIDE_LIGHT } from "../../src/theme/tokens";
import { queryAllText, renderWithTheme } from "../helpers/render";

const MSS = /\d+:\d{2}/; // an m:ss readout like "1:00"

describe("VisualTimer", () => {
  it("shows the numeric m:ss readout only when showNumbers is true (older)", () => {
    const now = Date.now();
    const older = renderWithTheme(
      <VisualTimer
        timerSeconds={60}
        startedAt={now}
        variant="bar"
        showNumbers
        label="Time for this step"
        restedLabel="That's the time — finish when you're ready."
        a11yPrefix="Time remaining"
      />,
      { theme: { ageMode: "older" } },
    );
    expect(queryAllText(older).some((s) => MSS.test(s))).toBe(true);
    older.unmount();

    const young = renderWithTheme(
      <VisualTimer
        timerSeconds={60}
        startedAt={now}
        variant="wedge"
        showNumbers={false}
        label="A little time for this"
        restedLabel="Take your time 🫧"
        a11yPrefix="Time left"
      />,
    );
    // young shows the visual + label ONLY — no numeric countdown.
    expect(queryAllText(young).some((s) => MSS.test(s))).toBe(false);
    expect(queryAllText(young)).toContain("A little time for this");
    young.unmount();
  });

  it("fires onEmpty exactly once when the timer is already empty (rested)", () => {
    const onEmpty = jest.fn();
    const past = Date.now() - 5 * 60_000; // started long ago → already empty
    const r = renderWithTheme(
      <VisualTimer
        timerSeconds={60}
        startedAt={past}
        variant="bar"
        showNumbers
        label="Time for this step"
        restedLabel="That's the time — finish when you're ready."
        onEmpty={onEmpty}
      />,
      { theme: { ageMode: "older" } },
    );
    expect(onEmpty).toHaveBeenCalledTimes(1);
    // The empty state shows the calm rested line, never an urgency string.
    expect(queryAllText(r)).toContain("That's the time — finish when you're ready.");
    expect(queryAllText(r).join(" ")).toContain("0:00");
    r.unmount();
  });

  it("does NOT fire onEmpty while time remains (no premature 'time's up')", () => {
    const onEmpty = jest.fn();
    const r = renderWithTheme(
      <VisualTimer
        timerSeconds={120}
        startedAt={Date.now()}
        variant="wedge"
        showNumbers={false}
        label="A little time for this"
        onEmpty={onEmpty}
      />,
    );
    expect(onEmpty).not.toHaveBeenCalled();
    r.unmount();
  });

  it("renders the Reduce-Motion stepped path without a thrown worklet", () => {
    // reducedMotion → animationDurationScale 0 → discrete stepping (no withTiming loop).
    const r = renderWithTheme(
      <VisualTimer
        timerSeconds={30}
        startedAt={Date.now()}
        variant="bar"
        showNumbers
        label="Time for this step"
      />,
      { theme: { ageMode: "older", reducedMotion: true } },
    );
    expect(queryAllText(r).some((s) => MSS.test(s))).toBe(true);
    r.unmount();
  });

  it("uses no red/danger colour token (anti-alarm — none exists in the kid palette)", () => {
    // Structural guarantee the timer relies on: the palettes carry NO danger/error/
    // fail colour key, so the depleting visual can never flash red.
    for (const palette of [REEF, TIDE_LIGHT] as const) {
      expect("danger" in palette).toBe(false);
      expect("error" in palette).toBe(false);
      expect("fail" in palette).toBe(false);
    }
  });
});
