/**
 * components/task/VisualTimer.tsx — the calm depleting visual-transition timer
 * (visual-timers §2/§4 CREATE #2, M-B1).
 *
 * EXTERNAL SCAFFOLDING for a step/transition — NOT a device that "fixes the
 * internal clock." Attached by `TaskRunner` to the CURRENTLY ACTIVE step when that
 * step has a positive `timerSeconds`. It shows how much time is left as a smoothly
 * shrinking wedge (young focal) or slim bar (older) in the shared bubble language,
 * big enough to read across a room.
 *
 * Advisory, never coercive: reaching empty simply RESTS (a calm rested fill + a
 * warm "take your time" line) — it does NOT auto-complete, auto-skip, lock the UI,
 * nag, flash, or change the token/celebration payout (all of that stays in the
 * unchanged `completeStep` path). There is no red/danger colour (the kid palette
 * has none by design), no flashing, no looping tick, no per-second beep. The only
 * optional sound is a single soft `onEmpty` chime the runner fires when the parent
 * turned it on — decoupled, ducking, off by default.
 *
 * Age/sensory differences flow ONLY through resolved tokens + the caller's
 * capability-derived props (`variant`/`showNumbers`) — this component NEVER reads
 * raw `ageMode`/`sensoryMode`/`reducedMotion`. Motion honours
 * `t.animationDurationScale`: standard/lowStim run ONE non-looping `withTiming`
 * depletion; Reduce-Motion (`animationDurationScale === 0`) steps discretely on a
 * 1 Hz wall-clock recompute (no continuous worklet). Web-safe / offline.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Text, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { formatMSS, timerFraction, timerRemainingMs } from "../../src/domain/timer";
import type { EpochMs } from "../../src/domain/types";
import { decorative } from "../../src/a11y/props";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface VisualTimerProps {
  /** the active step's budget in seconds (positive; the runner only mounts us then) */
  timerSeconds: number;
  /** wall-clock ms the active step's timer started (resume-accurate) */
  startedAt: EpochMs;
  /** young focal wedge vs older slim bar — from `caps.multiStepVisible` */
  variant: "wedge" | "bar";
  /** numeric m:ss readout — from `caps.showNumbersAndCharts` (older only) */
  showNumbers: boolean;
  /** calm label while running (resolved `timer.label`) */
  label?: string;
  /** calm empty-state line (resolved `timer.rested`) — never "time's up" */
  restedLabel?: string;
  /** accessibility prefix (resolved `timer.a11y`, e.g. "Time left") */
  a11yPrefix?: string;
  /** fires ONCE when the timer first reaches empty (used only for the opt-in chime) */
  onEmpty?: () => void;
  /** wedge diameter (young) */
  size?: number;
}

const clampFrac = (v: number): number => (v <= 0 ? 0 : v >= 1 ? 1 : v);

export default function VisualTimer({
  timerSeconds,
  startedAt,
  variant,
  showNumbers,
  label,
  restedLabel,
  a11yPrefix,
  onEmpty,
  size = 132,
}: VisualTimerProps) {
  const t = useThemeTokens();
  const c = t.colors;

  // Smooth single-`withTiming` depletion vs discrete 1 Hz stepping (Reduce-Motion).
  const smooth = t.animationDurationScale > 0;
  // Multi-hue colour-ease is allowed only where confetti is (standard). lowStim /
  // reduced-motion → a single muted hue, no colour-ease drama (§2.5). Keyed on a
  // resolved token, never on the raw sensoryMode string.
  const colorEase = t.confetti;
  const fullHue = c.grow; // calm start
  const emptyHue = c.accent; // warm (never red/danger — none exists for kids)
  const calmHue = c.primary; // lowStim / reduced-motion single hue

  const [remainingMs, setRemainingMs] = useState<number>(() =>
    timerRemainingMs(startedAt, timerSeconds, Date.now()),
  );
  const empty = remainingMs <= 0;

  // Fire `onEmpty` exactly once per active step (guarded); reset when the step
  // (startedAt/timerSeconds) changes so the next timed step can fire again.
  const firedRef = useRef(false);
  const fireEmpty = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    onEmpty?.();
  }, [onEmpty]);

  // 0..1 depletion driver (1 full → 0 empty). Seeded from the wall clock.
  const fill = useSharedValue(timerFraction(startedAt, timerSeconds, Date.now()));

  // --- smooth path: ONE non-looping withTiming to empty (no withRepeat) ---------
  // Re-anchored to the wall clock on mount, on step change, and on foreground so a
  // background pause never drifts. The empty cue is a single wall-clock `setTimeout`
  // (below) — NOT this animation's callback — so it can't false-fire under a test
  // mock and stays correct across background.
  useEffect(() => {
    firedRef.current = false;
    setRemainingMs(timerRemainingMs(startedAt, timerSeconds, Date.now()));

    const seed = () => {
      const now = Date.now();
      const frac = timerFraction(startedAt, timerSeconds, now);
      const remaining = timerRemainingMs(startedAt, timerSeconds, now);
      if (smooth && remaining > 0) {
        fill.value = frac;
        fill.value = withTiming(0, { duration: remaining });
      } else {
        // rested (empty) OR stepped mode: snap to the exact wall-clock fraction.
        fill.value = frac;
      }
    };
    seed();

    // Foreground re-anchor keeps the visual + readout drift-free after a background
    // gap. Purely presentational; never touches tokens/completion.
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") {
        setRemainingMs(timerRemainingMs(startedAt, timerSeconds, Date.now()));
        seed();
      }
    });
    return () => sub.remove();
  }, [smooth, startedAt, timerSeconds, fill]);

  // --- wall-clock recompute: the discrete Reduce-Motion stepping AND the calm m:ss
  //     readout share ONE 1 Hz `setInterval` (the ONLY interval in this file). It
  //     recomputes `remaining` from the wall clock so a stepped bar / readout stays
  //     correct across background/foreground. It is NEVER a per-second tick SOUND
  //     and there is NO `withRepeat` on the depletion. ---------------------------
  const needsTick = !smooth || showNumbers;
  useEffect(() => {
    if (!needsTick) return;
    const stepTick = () => {
      const now = Date.now();
      const remaining = timerRemainingMs(startedAt, timerSeconds, now);
      setRemainingMs(remaining);
      if (!smooth) fill.value = timerFraction(startedAt, timerSeconds, now); // stepped
    };
    stepTick();
    const id = setInterval(stepTick, 1000);
    return () => clearInterval(id);
  }, [needsTick, smooth, startedAt, timerSeconds, fill]);

  // --- the empty cue: one wall-clock `setTimeout` (fires once, then rests) -------
  useEffect(() => {
    const remaining = timerRemainingMs(startedAt, timerSeconds, Date.now());
    if (remaining <= 0) {
      fireEmpty();
      return;
    }
    const id = setTimeout(fireEmpty, remaining);
    return () => clearTimeout(id);
  }, [startedAt, timerSeconds, fireEmpty]);

  // --- animated drivers (declared unconditionally — one per variant) ------------
  const stroke = Math.max(10, size * 0.09);
  const rr = (size - stroke) / 2;
  const circumference = 2 * Math.PI * rr;

  const arcProps = useAnimatedProps(() => {
    "worklet";
    const f = clampFrac(fill.value);
    const strokeColor = colorEase
      ? (interpolateColor(f, [0, 1], [emptyHue, fullHue]) as string)
      : calmHue;
    return {
      strokeDashoffset: circumference * (1 - f),
      stroke: empty ? c.textDim : strokeColor,
    };
  });

  const barStyle = useAnimatedStyle(() => {
    "worklet";
    const f = clampFrac(fill.value);
    const bg = empty
      ? c.textDim
      : colorEase
        ? (interpolateColor(f, [0, 1], [emptyHue, fullHue]) as string)
        : calmHue;
    return {
      width: `${f * 100}%`,
      backgroundColor: bg,
    };
  });

  // ---- render ----------------------------------------------------------------
  const readout = showNumbers ? (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        color: empty ? c.textDim : c.text,
        fontFamily: t.type.token.family,
        fontSize: t.type.token.size,
        fontVariant: ["tabular-nums"],
        fontWeight: "700",
      }}
    >
      {formatMSS(remainingMs)}
    </Text>
  ) : null;

  const a11yLabel = `${a11yPrefix ?? "Time left"}: ${formatMSS(remainingMs)}`;
  const caption = empty ? restedLabel ?? label : label;

  if (variant === "wedge") {
    const cx = size / 2;
    const cy = size / 2;
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={a11yLabel}
        style={{ alignItems: "center", gap: t.spacing(1) }}
      >
        <View {...decorative()} style={{ width: size, height: size }}>
          <Svg width={size} height={size}>
            <Circle cx={cx} cy={cy} r={rr} stroke={c.surfaceSunken} strokeWidth={stroke} fill="none" />
            <AnimatedCircle
              cx={cx}
              cy={cy}
              r={rr}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animatedProps={arcProps}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          </Svg>
        </View>
        {readout}
        <TimerCaption text={caption} c={c} t={t} />
      </View>
    );
  }

  // ---- bar (older) -----------------------------------------------------------
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={a11yLabel} style={{ gap: t.spacing(1) }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(3) }}>
        <View
          {...decorative()}
          style={{
            flex: 1,
            height: 10,
            borderRadius: 999,
            backgroundColor: c.surfaceSunken,
            overflow: "hidden",
          }}
        >
          <Animated.View style={[{ height: "100%", borderRadius: 999 }, barStyle]} />
        </View>
        {readout}
      </View>
      <TimerCaption text={caption} c={c} t={t} />
    </View>
  );
}

// ---------------------------------------------------------------------------
type Tokens = ReturnType<typeof useThemeTokens>;

function TimerCaption({ text, c, t }: { text?: string; c: Tokens["colors"]; t: Tokens }) {
  if (!text) return null;
  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        color: c.textDim,
        fontFamily: t.type.caption.family,
        fontSize: t.type.caption.size,
        textAlign: "center",
      }}
    >
      {text}
    </Text>
  );
}
