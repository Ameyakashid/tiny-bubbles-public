/**
 * components/kid/BreathingBubble.tsx — the reusable breathe-with-the-bubble visual
 * (feature `breathing-regulation`, M-C2).
 *
 * A large, glanceable bubble that inflates on the in-breath, holds at full, deflates
 * on the out-breath, and rests small — following a CURATED `BreathPattern`. It is a
 * self-paced calming ACTIVITY, not a health tool: nothing about the child's body is
 * read; the pacing is one deterministic elapsed-time function.
 *
 * Both the animated scale and the phase LABEL derive from the pure
 * `breathPhaseAt(pattern, elapsed)` helper (wall-clock anchored at mount), so the
 * motion and the text can never drift apart. Motion honours the resolved flags the
 * caller passes (NEVER a raw age/motion mode string, NEVER an ageMode prop):
 * standard/lowStim run ONE non-looping `withSequence` per cycle on repeat;
 * Reduce-Motion settles to a STATIC mid-pose and drives the phase label + grow
 * cadence from a 1 Hz wall-clock recompute (no continuous worklet). Web-safe. The
 * "grow" cadence is a function of completed cycles only — never of any body signal.
 *
 * No red/danger colour (the kid palette has none), no fail state, no timer-out.
 */
import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { breathPhaseAt, growStage, type BreathPattern, type BreathPhase } from "../../src/domain/breathing";
import { fireHaptic } from "../../src/services/haptics";
import { speak } from "../../src/services/tts";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

export interface BreathingBubbleProps {
  /** the curated pattern to pace (chosen by the parent / older child) */
  pattern: BreathPattern;
  /** decorative halo + hue drama (from `t.motion.loopsEnabled`; off in lowStim) */
  animate: boolean;
  /** static mid-pose + 1 Hz stepped label (from `t.animationDurationScale === 0`) */
  reducedMotion: boolean;
  /** auto-speak the phase on change (from the resolved TTS default; young=true) */
  ttsEnabled: boolean;
  /** opt-in soft Light impact on each phase change (never Warning/Error) */
  pacingHaptics: boolean;
  /** resolved phase copy (both age variants via `resolveContent`) */
  phaseLabels: Record<BreathPhase, string>;
  /** fires with the running completed-cycle count (clamped to `cyclesTarget`) */
  onCycle?: (completedCycles: number) => void;
  /** fires ONCE when the completed cycles first reach `cyclesTarget` */
  onComplete?: () => void;
  /** bubble diameter */
  size?: number;
}

function positive(ms: number, floor = 1): number {
  return Number.isFinite(ms) && ms > 0 ? ms : floor;
}
function nonNegative(ms: number): number {
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
}

export default function BreathingBubble({
  pattern,
  animate,
  reducedMotion,
  ttsEnabled,
  pacingHaptics,
  phaseLabels,
  onCycle,
  onComplete,
  size = 220,
}: BreathingBubbleProps) {
  const t = useThemeTokens();
  const c = t.colors;

  const [phase, setPhase] = useState<BreathPhase>("inhale");

  // Latest callbacks/flags captured in refs so the wall-clock tick never reads a
  // stale closure (the tick effect is keyed only on pattern/motion, not per render).
  const onCycleRef = useRef(onCycle);
  onCycleRef.current = onCycle;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const ttsRef = useRef(ttsEnabled);
  ttsRef.current = ttsEnabled;
  const pacingRef = useRef(pacingHaptics);
  pacingRef.current = pacingHaptics;
  const labelsRef = useRef(phaseLabels);
  labelsRef.current = phaseLabels;

  // 0 = exhaled (small) .. 1 = inhaled (large).
  const scale = useSharedValue(reducedMotion ? 0.5 : 0);

  // --- the breathing scale: a single non-looping withSequence on repeat (standard
  //     + lowStim — the purposeful motion IS the screen) OR a static mid-pose under
  //     Reduce-Motion. Anchored to mount alongside the wall-clock label tick. ------
  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(scale);
      scale.value = 0.5; // calm, static mid-pose (no worklet loop)
      return;
    }
    const inhaleMs = positive(pattern.inhaleMs);
    const holdMs = nonNegative(pattern.holdMs);
    const exhaleMs = positive(pattern.exhaleMs);
    const holdOutMs = nonNegative(pattern.holdOutMs);

    const segs: number[] = [withTiming(1, { duration: inhaleMs, easing: Easing.inOut(Easing.sin) })];
    if (holdMs > 0) segs.push(withTiming(1, { duration: holdMs, easing: Easing.linear }));
    segs.push(withTiming(0, { duration: exhaleMs, easing: Easing.inOut(Easing.sin) }));
    if (holdOutMs > 0) segs.push(withTiming(0, { duration: holdOutMs, easing: Easing.linear }));

    scale.value = 0;
    scale.value = withRepeat(withSequence(...segs), -1, false);
    return () => cancelAnimation(scale);
  }, [reducedMotion, pattern.id, pattern.inhaleMs, pattern.holdMs, pattern.exhaleMs, pattern.holdOutMs, scale]);

  // --- the deterministic label + cycle tick (the ONLY interval here). Reads
  //     breathPhaseAt from the wall clock so the label + grow cadence stay correct
  //     across a background gap and can never drift from the animation. NOT a
  //     per-breath audio tick — there is no looping sound. --------------------------
  useEffect(() => {
    const start = Date.now();
    const target = Math.max(1, Math.floor(pattern.cyclesTarget) || 1);
    let lastPhase: BreathPhase | null = null;
    let lastCycle = 0;
    let completeFired = false;

    const tick = () => {
      const elapsed = Date.now() - start;
      const s = breathPhaseAt(pattern, elapsed);
      setPhase(s.phase);

      if (s.phase !== lastPhase) {
        lastPhase = s.phase;
        // opt-in soft pacing pulse — Light impact only, never a scold
        if (pacingRef.current) fireHaptic("tap");
        // spoken guidance on phase entry (young auto-speaks; calm, slowed rate)
        if (ttsRef.current) {
          const label = labelsRef.current[s.phase];
          if (label) speak(label, { enabled: true, rate: 0.9 });
        }
      }

      const completed = growStage(pattern, elapsed);
      if (completed > lastCycle) {
        lastCycle = completed;
        onCycleRef.current?.(completed);
        if (completed >= target && !completeFired) {
          completeFired = true;
          onCompleteRef.current?.();
        }
      }
    };

    tick(); // paint the first phase immediately (no blank frame)
    const id = setInterval(tick, reducedMotion ? 1000 : 200);
    return () => clearInterval(id);
  }, [reducedMotion, pattern]);

  const bubbleStyle = useAnimatedStyle(() => {
    "worklet";
    return { transform: [{ scale: interpolate(scale.value, [0, 1], [0.7, 1.15]) }] };
  });
  const haloStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [{ scale: interpolate(scale.value, [0, 1], [0.95, 1.5]) }],
      opacity: interpolate(scale.value, [0, 1], [0.26, 0.05]),
    };
  });

  const label = phaseLabels[phase];
  const inner = size * 0.6;

  return (
    <View style={{ alignItems: "center", gap: t.spacing(3) }}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        {/* soft halo — only in standard motion (off in lowStim / Reduce-Motion) */}
        {animate && !reducedMotion ? (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                width: size,
                height: size,
                borderRadius: 999,
                backgroundColor: c.tokenGlow,
              },
              haloStyle,
            ]}
          />
        ) : null}
        <Animated.View
          style={[
            {
              width: inner,
              height: inner,
              borderRadius: 999,
              backgroundColor: c.primary,
            },
            bubbleStyle,
          ]}
        />
      </View>

      {/* the calm phase label — tap to hear it (auto-spoken in young via ttsEnabled) */}
      <Pressable
        onPress={() => speak(label, { enabled: true, rate: 0.9 })}
        accessibilityRole="text"
        accessibilityLabel={label}
        hitSlop={8}
      >
        <Text
          style={{
            color: c.text,
            fontFamily: t.type.h2.family,
            fontSize: t.type.h2.size,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
}
