/**
 * components/task/UndoBar.tsx — the transient quick-undo safety net (verify-undo
 * §2.2 / §CREATE, feature #17).
 *
 * A calm, always-available "Oops — undo?" affordance shown for a short window
 * after an accidental Done. It is a NEUTRAL correction, never a punishment: the
 * copy is playful ("Oops — undo?" / "Undo"), the only feedback the caller fires is
 * a soft tap (never a Warning/Error haptic — none exists), and undoing NEVER
 * regresses felt progress (that split lives in the `undoStep` orchestrator).
 *
 * Two variants, chosen by the runner from `caps.multiStepVisible` (NEVER raw
 * ageMode): a big focal bubble (young, ≥64dp target, a gentle shrinking ring for
 * the window) or a compact inline text link (older row). Motion honours
 * `t.motion.loopsEnabled` — Reduce-Motion shows a static ring, no continuous
 * worklet. The window is transient/presentational only (never persisted). Copy is
 * passed in resolved, so this component reads no ageMode. Web-safe / offline.
 */
import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { decorative } from "../../src/a11y/props";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface UndoBarProps {
  variant: "focal" | "row";
  /** resolved `undo.step` copy ("Oops — undo?" / "Undo") */
  label: string;
  /** how long the affordance stays, in ms (UNDO_WINDOW_MS) */
  windowMs: number;
  /** tap → reverse the accidental completion */
  onUndo: () => void;
  /** the window elapsed → the caller clears this bar */
  onExpire: () => void;
}

const RING = 26;

export default function UndoBar({ variant, label, windowMs, onUndo, onExpire, }: UndoBarProps) {
  const t = useThemeTokens();
  const c = t.colors;
  const animate = t.motion.loopsEnabled;

  // 1 → 0 over the window (a gentle shrinking ring). Static under Reduce-Motion.
  const frac = useSharedValue(1);
  useEffect(() => {
    frac.value = 1;
    if (animate) frac.value = withTiming(0, { duration: windowMs });
    const id = setTimeout(onExpire, windowMs);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowMs]);

  const stroke = 4;
  const rr = (RING - stroke) / 2;
  const circumference = 2 * Math.PI * rr;
  const arcProps = useAnimatedProps(() => {
    "worklet";
    const f = frac.value <= 0 ? 0 : frac.value >= 1 ? 1 : frac.value;
    return { strokeDashoffset: circumference * (1 - f) };
  });

  const ring = (
    <View {...decorative()} style={{ width: RING, height: RING }}>
      <Svg width={RING} height={RING}>
        <Circle cx={RING / 2} cy={RING / 2} r={rr} stroke={c.border} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={RING / 2}
          cy={RING / 2}
          r={rr}
          stroke={c.primary}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={arcProps}
          transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
        />
      </Svg>
    </View>
  );

  if (variant === "row") {
    return (
      <Pressable
        onPress={onUndo}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={10}
        style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2), alignSelf: "flex-start", paddingVertical: 6 }}
      >
        {ring}
        <Text style={{ color: c.primary, fontFamily: t.type.label.family, fontSize: t.type.label.size, fontWeight: "700" }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  // focal (young) — one large, friendly touch target (≥64dp).
  return (
    <Pressable
      onPress={onUndo}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={{
        alignSelf: "center",
        minHeight: 64,
        flexDirection: "row",
        alignItems: "center",
        gap: t.spacing(2),
        paddingVertical: t.spacing(2),
        paddingHorizontal: t.spacing(5),
        borderRadius: 999,
        backgroundColor: c.surfaceAlt,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      {ring}
      <Text style={{ color: c.text, fontFamily: t.type.label.family, fontSize: t.type.bodyLg.size, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  );
}
