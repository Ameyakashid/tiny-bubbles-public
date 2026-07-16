/**
 * components/focus/FocusRing.tsx — a calm, STATIC depleting ring for the focus
 * scaffold (feature #22, `focus-intervals`, M-C3).
 *
 * The LIVE, animated depletion during a running focus/break block is handled by the
 * reused `components/task/VisualTimer.tsx` (wall-clock anchored, smooth vs 1 Hz
 * stepped under Reduce-Motion, single-fire onEmpty — soft reuse per focus-intervals
 * §4 #6). This component is the PRESENTATIONAL ring the session shows when a block is
 * PAUSED: it renders a given `fraction` with no animation and no clock of its own.
 *
 * There is NO red/danger colour (the kid palette has none by design) and NO flashing:
 * a calm single hue eases the arc. Age/sensory differences flow ONLY through
 * `useThemeTokens()` + the caller's `showNumbers` flag — this component NEVER reads
 * raw `ageMode`/`sensoryMode`/`reducedMotion`. The `m:ss` readout is shown only when
 * the caller passes `showNumbers` (older ⇒ `showNumbersAndCharts`). Web-safe.
 */
import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { formatMSS } from "../../src/domain/focus";
import { decorative } from "../../src/a11y/props";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

export interface FocusRingProps {
  /** remaining fraction in [0,1] (1 = full, 0 = empty). */
  fraction: number;
  /** remaining ms — drives the optional m:ss readout. */
  remainingMs: number;
  /** numeric m:ss readout — from `caps.showNumbersAndCharts` (older only). */
  showNumbers: boolean;
  /** calm caption under the ring (e.g. "Paused"). */
  label?: string;
  /** accessibility label (defaults to a "Time remaining" prefix + m:ss). */
  a11yPrefix?: string;
  size?: number;
}

const clampFrac = (v: number): number =>
  !Number.isFinite(v) || v <= 0 ? 0 : v >= 1 ? 1 : v;

export default function FocusRing({
  fraction,
  remainingMs,
  showNumbers,
  label,
  a11yPrefix,
  size = 220,
}: FocusRingProps) {
  const t = useThemeTokens();
  const c = t.colors;

  const f = clampFrac(fraction);
  const stroke = Math.max(12, size * 0.09);
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const a11yLabel = `${a11yPrefix ?? "Time remaining"}: ${formatMSS(remainingMs)}`;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={a11yLabel}
      style={{ alignItems: "center", gap: t.spacing(2) }}
    >
      <View {...decorative()} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cy} r={r} stroke={c.surfaceSunken} strokeWidth={stroke} fill="none" />
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={c.primary}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - f)}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </Svg>
        {showNumbers ? (
          <View style={{ position: "absolute", alignItems: "center" }}>
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{
                color: c.text,
                fontFamily: t.type.token.family,
                fontSize: t.type.h1.size,
                fontVariant: ["tabular-nums"],
                fontWeight: "700",
              }}
            >
              {formatMSS(remainingMs)}
            </Text>
          </View>
        ) : null}
      </View>
      {label ? (
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            color: c.textDim,
            fontFamily: t.type.label.family,
            fontSize: t.type.body.size,
            textAlign: "center",
          }}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}
