/**
 * components/celebration/Confetti.tsx — the Reanimated bubble-burst (doc 61 §8.1).
 *
 * A one-shot fountain of small bubbles that rise, drift, and fade. There is NO
 * donor confetti (it's a net-new Reanimated build); every particle's trajectory
 * is DETERMINISTIC — there is no `Math.random` anywhere (the same no-RNG rule the
 * payout path obeys, doc 66 §5.4, kept here so the visual is reproducible and the
 * grep gate stays clean). Restart by changing the `playKey` prop (the overlay
 * bumps it each tap so a fast double-tap re-bursts).
 *
 * Self-contained: plain Animated.Views (no SVG) so it composes inside any screen
 * and stays cheap. `count === 0` renders nothing (lowStim/reduced-motion paths
 * use the overlay's single ripple instead of a multi-particle burst).
 */
import React, { useEffect, useMemo } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

export interface ConfettiProps {
  /** number of particles (0 = render nothing) */
  count: number;
  /** ordered hue palette (tokens.colors.celebration) */
  hues: readonly string[];
  /** bump to restart the burst (the overlay passes the celebration key) */
  playKey: number;
  /** overall burst diameter in px (default 240) */
  spread?: number;
  /** master enable (false during reduced-motion -> overlay shows a ripple only) */
  enabled?: boolean;
}

export default function Confetti({
  count,
  hues,
  playKey,
  spread = 240,
  enabled = true,
}: ConfettiProps) {
  const particles = useMemo(
    () => buildParticles(count, spread),
    [count, spread],
  );

  if (!enabled || count <= 0 || hues.length === 0) return null;

  return (
    <View pointerEvents="none" style={{ position: "absolute", width: spread, height: spread }}>
      {particles.map((p, i) => (
        <Particle
          key={`p-${i}`}
          playKey={playKey}
          dx={p.dx}
          dy={p.dy}
          delay={p.delay}
          dur={p.dur}
          dia={p.dia}
          color={hues[i % hues.length]}
          centerX={spread / 2}
          centerY={spread / 2}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Deterministic particle layout — index-derived angles/distances/timing. No RNG.
// ---------------------------------------------------------------------------
interface ParticleSpec {
  dx: number;
  dy: number;
  delay: number;
  dur: number;
  dia: number;
}

function buildParticles(count: number, spread: number): ParticleSpec[] {
  const out: ParticleSpec[] = [];
  const maxR = spread * 0.42;
  for (let i = 0; i < count; i += 1) {
    // bias the spray upward (a rising fountain) with a deterministic fan
    const angle = -Math.PI / 2 + ((i / Math.max(1, count - 1)) - 0.5) * Math.PI * 1.1;
    // two interleaved rings so it reads as a burst, not a single arc
    const reach = maxR * (i % 2 === 0 ? 1 : 0.7);
    const dx = Math.cos(angle) * reach;
    const dy = Math.sin(angle) * reach; // negative => up
    out.push({
      dx,
      dy,
      delay: (i % 6) * 28, // staggered, deterministic
      dur: 760 + (i % 5) * 70,
      dia: 9 + (i % 4) * 3,
    });
  }
  return out;
}

interface ParticleProps {
  playKey: number;
  dx: number;
  dy: number;
  delay: number;
  dur: number;
  dia: number;
  color: string;
  centerX: number;
  centerY: number;
}

function Particle({ playKey, dx, dy, delay, dur, dia, color, centerX, centerY }: ParticleProps) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = 0;
    t.value = withDelay(delay, withTiming(1, { duration: dur, easing: Easing.out(Easing.cubic) }));
    return () => cancelAnimation(t);
  }, [playKey, delay, dur, t]);

  const style = useAnimatedStyle(() => {
    "worklet";
    const p = t.value;
    const tx = dx * p;
    const ty = dy * p - 12 * p; // a little extra lift
    const scale = interpolate(p, [0, 0.25, 1], [0, 1, 0.6]);
    const opacity = interpolate(p, [0, 0.7, 1], [1, 1, 0]);
    return {
      transform: [{ translateX: tx }, { translateY: ty }, { scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: centerX - dia / 2,
          top: centerY - dia / 2,
          width: dia,
          height: dia,
          borderRadius: 999,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}
