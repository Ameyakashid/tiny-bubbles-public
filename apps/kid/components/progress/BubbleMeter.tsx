/**
 * components/progress/BubbleMeter.tsx — the endowed liquid bubble-fill meter
 * (doc 63 Feature 7, doc 66 M8).
 *
 * A hand-rolled Reanimated + `react-native-svg` ring (the M1-named fallback we
 * own — NOT the unmaintained `react-native-circular-progress`): a track circle,
 * an animated progress arc (`strokeDashoffset`), and a "liquid" inner bubble that
 * scales up as the meter fills. It STARTS partly full and only ever grows toward
 * 100% — `bubbleFillFraction` guarantees the fill is always > 0 (never an empty
 * bar, doc 66 §5). Reaching 100% is the caller's cue for the routine celebration.
 *
 * Reads resolved tokens for colour + motion; honours reduced motion via
 * `animationDurationScale` (0 => the fill snaps, no animation). It NEVER branches
 * on raw ageMode — the caller passes `showNumbers` (from a capability flag) to
 * choose the number-free (young) vs numeric (older) centre label (doc 66 §2).
 */
import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { bubbleFillFraction } from "../../src/domain/progressMeter";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface BubbleMeterProps {
  /** completions so far (e.g. steps done) */
  value: number;
  /** the goal (e.g. total steps); 0 still renders the endowed partly-full meter */
  goal: number;
  /** numeric centre label (older) vs a bubble glyph (young) — from a capability flag */
  showNumbers?: boolean;
  /** small caption under the count (e.g. "to grow Bloop") */
  caption?: string;
  size?: number;
  /** override the endowment (defaults to the shared DEFAULT_ENDOWED_FRACTION) */
  endowedFraction?: number;
}

export default function BubbleMeter({
  value,
  goal,
  showNumbers = false,
  caption,
  size = 160,
  endowedFraction,
}: BubbleMeterProps) {
  const t = useThemeTokens();
  const c = t.colors;

  const fraction = bubbleFillFraction(value, goal, endowedFraction);

  const stroke = Math.max(10, size * 0.085);
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  // animate the fill (snap instantly when motion is reduced/off)
  const fill = useSharedValue(fraction);
  useEffect(() => {
    const dur = 520 * t.animationDurationScale;
    fill.value = dur > 0 ? withTiming(fraction, { duration: dur }) : fraction;
  }, [fraction, t.animationDurationScale, fill]);

  const arcProps = useAnimatedProps(() => {
    "worklet";
    return { strokeDashoffset: circumference * (1 - fill.value) };
  });

  // the "liquid" inner bubble grows with the fill — a filling-bubble feel
  const liquidProps = useAnimatedProps(() => {
    "worklet";
    return { r: r * 0.86 * Math.max(0.18, fill.value) };
  });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        {/* track */}
        <Circle cx={cx} cy={cy} r={r} stroke={c.surfaceSunken} strokeWidth={stroke} fill="none" />
        {/* liquid bubble fill (under the arc) */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          animatedProps={liquidProps}
          fill={c.tokenGlow}
          opacity={0.45}
        />
        {/* progress arc — starts at 12 o'clock, sweeps clockwise */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={r}
          stroke={c.token}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={arcProps}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>

      {/* centre label */}
      <View style={{ position: "absolute", alignItems: "center" }}>
        {showNumbers ? (
          <Text
            style={{
              color: c.text,
              fontFamily: t.type.display.family,
              fontSize: t.type.h1.size,
              fontWeight: "700",
            }}
          >
            {Math.max(0, value)}
            <Text style={{ color: c.textDim, fontSize: t.type.body.size }}>
              {goal > 0 ? `/${goal}` : ""}
            </Text>
          </Text>
        ) : (
          <Text style={{ fontSize: size * 0.3 }}>🫧</Text>
        )}
        {caption ? (
          <Text style={{ color: c.textDim, fontSize: t.type.caption.size, marginTop: 2 }}>
            {caption}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
