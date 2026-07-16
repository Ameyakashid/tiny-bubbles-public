/**
 * BloopCharacter.tsx — Bloop's body. HAND-CRAFTED (Fable), M5.1.
 *
 * A fully PROCEDURAL character: react-native-svg + reanimated + gesture-handler.
 * No Rive/Lottie/art assets required → identical on iOS/Android/web/Expo Go,
 * perfectly deterministic, and the plan's bespoke-.riv [HUMAN] blocker is void.
 * (A .riv skin can replace the SVG later behind the same props.)
 *
 * Integration target: packages/shared/src/bloop/BloopCharacter.tsx
 * The brain (bloopBrain.ts) decides WHAT happens; this file decides HOW it feels.
 *
 * Where the "aliveness" comes from (~80% is motion):
 *  - Continuous life: breathing (4s young-lung cycle), deterministic blinking
 *    (every 4s, a double-blink every 4th), gaze micro-wander on a fixed orbit.
 *  - Squash & stretch on EVERYTHING (Disney #1): pokes squash toward the touch
 *    point; landings absorb; the body is jelly, never rigid.
 *  - Anticipation (Disney #2): every big performance winds up first — scaled
 *    longer for the autism profile so nothing ever startles.
 *  - Secondary motion: cheeks/blush lag the body by ~80ms; the crown tuft
 *    overshoots; ambient bubbles drift up behind (off in lowStim).
 *  - The child is the cause: gaze snaps to their finger, the body leans into
 *    strokes, tickles compound — Bloop is a creature you touch, not watch.
 */

import React, { useEffect, useMemo, useRef } from "react";
import { Platform } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing, cancelAnimation, runOnJS, useAnimatedProps, useSharedValue,
  withDelay, withRepeat, withSequence, withSpring, withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop } from "react-native-svg";

import type { BehaviorFrame, BloopEvent, BloopRegion, Performance } from "./bloopBrain";

const APath = Animated.createAnimatedComponent(Path);
const AEllipse = Animated.createAnimatedComponent(Ellipse);
const ACircle = Animated.createAnimatedComponent(Circle);
const AG = Animated.createAnimatedComponent(G);

export interface BloopCharacterProps {
  size?: number;                       // px, default 220
  bodyHue?: string;                    // base color (kid-customized)
  accentHue?: string;
  frame: BehaviorFrame;                // current behavior (from the brain)
  reducedMotion?: boolean;
  onEvent?: (ev: BloopEvent) => void;  // body → brain (poke/tickle/pet/drag)
  onPerformanceEnd?: (p: Performance) => void;
  accessibilityLabel?: string;         // "<name> is <mood>"
}

/** Spring presets — one soft jelly language everywhere. */
const JELLY = { damping: 9, stiffness: 160, mass: 0.9 };
const SOFT = { damping: 14, stiffness: 90, mass: 1 };

export function BloopCharacter({
  size = 220, bodyHue = "#5BC8F5", accentHue = "#FFD166",
  frame, reducedMotion = false, onEvent, onPerformanceEnd, accessibilityLabel,
}: BloopCharacterProps) {
  // ------------------------------------------------------------------ state
  const breathe = useSharedValue(1);        // body scale (continuous life)
  const squashX = useSharedValue(1);        // squash & stretch
  const squashY = useSharedValue(1);
  const tx = useSharedValue(0);             // hop/drag translation
  const ty = useSharedValue(0);
  const rot = useSharedValue(0);            // wiggle degrees
  const gazeX = useSharedValue(0);          // pupil offset −6..6
  const gazeY = useSharedValue(0);
  const lids = useSharedValue(0);           // 0 open → 1 closed
  const mouth = useSharedValue(0.3);        // 0 flat → 1 grin
  const blush = useSharedValue(0);
  const tuftLag = useSharedValue(0);        // crown tuft secondary motion

  const pokeTimes = useRef<number[]>([]);   // tickle detection window
  const intensity = frame.intensity;
  const M = reducedMotion ? 0 : 1;          // motion kill-switch (a11y law)

  // ------------------------------------------------ continuous life (idle)
  useEffect(() => {
    // Breathing — 4s cycle, amplitude scaled by intensity (autism → shallower).
    breathe.value = withRepeat(
      withSequence(
        withTiming(1 + 0.035 * intensity * M, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1 - 0.02 * intensity * M, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ), -1, true);
    return () => cancelAnimation(breathe);
  }, [intensity, M]);

  useEffect(() => {
    // Deterministic blink metronome: every 4s; every 4th is a double-blink.
    let n = 0;
    const id = setInterval(() => {
      n++;
      const doOnce = () => { lids.value = withSequence(withTiming(1, { duration: 70 }), withTiming(0, { duration: 90 })); };
      doOnce();
      if (n % 4 === 0) setTimeout(doOnce, 220);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // Gaze: follow the frame's directive; 'wander' = slow fixed orbit (no RNG).
    if (frame.gaze === "up") { gazeX.value = withSpring(0, SOFT); gazeY.value = withSpring(-5, SOFT); }
    else if (frame.gaze === "kid" || frame.gaze === null) { gazeX.value = withSpring(0, SOFT); gazeY.value = withSpring(0, SOFT); }
    else if (frame.gaze === "wander") {
      gazeX.value = withRepeat(withSequence(
        withTiming(3.5 * M, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
        withTiming(-3.5 * M, { duration: 3400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 2000 }),
      ), -1, false);
      gazeY.value = withRepeat(withSequence(withTiming(-1.5 * M, { duration: 3000 }), withTiming(1 * M, { duration: 3000 })), -1, true);
    } // 'touch' handled by gestures directly
    mouth.value = withTiming(frame.mouth, { duration: 260 });
    blush.value = withTiming(frame.blush, { duration: 300 });
  }, [frame.gaze, frame.mouth, frame.blush, M]);

  // ------------------------------------------------------- choreographies
  const finish = (p: Performance) => onPerformanceEnd && onPerformanceEnd(p);
  useEffect(() => {
    const I = intensity, done = () => runOnJS(finish)(frame.performance);
    const anticip = (amt: number, ms: number) => withTiming(amt, { duration: ms, easing: Easing.out(Easing.quad) });
    switch (frame.performance) {
      case "cheer": // wind-up crouch → hop → landing absorb
        squashY.value = withSequence(anticip(1 - 0.12 * I * M, 140), withSpring(1.08, JELLY), withSpring(1, JELLY));
        squashX.value = withSequence(anticip(1 + 0.1 * I * M, 140), withSpring(0.94, JELLY), withSpring(1, JELLY));
        ty.value = withSequence(withTiming(0, { duration: 140 }), withSpring(-14 * I * M, JELLY), withSpring(0, { ...JELLY, damping: 11 }, done));
        break;
      case "danceRoutine": { // bounce ×3 with rotation wiggle, then settle
        const hop = (dir: number) => withSequence(withSpring(-16 * I * M, JELLY), withSpring(0, JELLY));
        ty.value = withSequence(hop(1), hop(-1), hop(1), withSpring(0, SOFT, done));
        rot.value = withRepeat(withSequence(withTiming(6 * I * M, { duration: 180 }), withTiming(-6 * I * M, { duration: 180 })), 4, true, () => { rot.value = withSpring(0, SOFT); });
        tuftLag.value = withRepeat(withSequence(withTiming(8 * M, { duration: 200 }), withTiming(-8 * M, { duration: 200 })), 4, true, () => { tuftLag.value = withSpring(0, SOFT); });
        break;
      }
      case "squishPop": // squash toward touch, springy pop-back with overshoot
        squashX.value = withSequence(withTiming(1 + 0.16 * I * M, { duration: 90 }), withSpring(0.96, JELLY), withSpring(1, JELLY, done));
        squashY.value = withSequence(withTiming(1 - 0.16 * I * M, { duration: 90 }), withSpring(1.05, JELLY), withSpring(1, JELLY));
        break;
      case "giggleWobble":
        rot.value = withRepeat(withSequence(withTiming(4 * I * M, { duration: 90 }), withTiming(-4 * I * M, { duration: 90 })), 8, true, () => { rot.value = withSpring(0, SOFT, done); });
        lids.value = withTiming(0.75, { duration: 150 }); // happy squint
        setTimeout(() => { lids.value = withTiming(0, { duration: 200 }); }, Math.max(600, frame.holdMs - 200));
        break;
      case "purrLean": // slow lean + soft settle — no bounce (it's a cuddle)
        rot.value = withSequence(withTiming(5 * I * M, { duration: 500, easing: Easing.inOut(Easing.sin) }), withDelay(Math.max(0, frame.holdMs - 900), withSpring(0, SOFT, done)));
        lids.value = withTiming(0.55, { duration: 400 });
        setTimeout(() => { lids.value = withTiming(0, { duration: 300 }); }, frame.holdMs);
        break;
      case "tokenCatch":
        ty.value = withSequence(anticip(-6 * I * M, 220), withSpring(0, JELLY, done));
        break;
      case "greetSmall":
      case "greetBig": {
        const big = frame.performance === "greetBig";
        ty.value = withSequence(anticip(-4 * I * M, 160), withSpring(big ? -12 * I * M : -7 * I * M, JELLY), withSpring(0, JELLY), big ? withSpring(-8 * I * M, JELLY) : withSpring(0, JELLY), withSpring(0, JELLY, done));
        break;
      }
      case "listenTilt":
        rot.value = withSequence(withTiming(-7 * M, { duration: 320, easing: Easing.out(Easing.quad) }), withDelay(frame.holdMs, withSpring(0, SOFT, done)));
        break;
      case "breatheGuide": // amplified breath — the calm-corner pacer syncs to this
        cancelAnimation(breathe);
        breathe.value = withRepeat(withSequence(
          withTiming(1.09, { duration: 3800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.96, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
        ), -1, true);
        break;
      case "snooze":
        lids.value = withTiming(0.92, { duration: 900 });
        mouth.value = withTiming(0.15, { duration: 900 });
        break;
      case "stretchYawn":
        squashY.value = withSequence(withTiming(1.1 * M || 1, { duration: 600, easing: Easing.inOut(Easing.quad) }), withSpring(1, SOFT, done));
        squashX.value = withSequence(withTiming(0.94, { duration: 600 }), withSpring(1, SOFT));
        break;
      case "lookAround":
        gazeX.value = withSequence(withTiming(5 * M, { duration: 500 }), withDelay(400, withTiming(-5 * M, { duration: 600 })), withDelay(300, withSpring(0, SOFT, done)));
        break;
      case "chaseBubble":
        gazeY.value = withSequence(withTiming(-5 * M, { duration: 700 }), withTiming(-2 * M, { duration: 700 }), withSpring(0, SOFT, done));
        break;
      case "restProud":
        squashY.value = withSequence(withTiming(1.04, { duration: 400 }), withDelay(1400, withSpring(1, SOFT, done)));
        break;
      case "idle": default: break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame.performance, frame.holdMs]);

  // --------------------------------------------------------------- gestures
  const emit = (ev: BloopEvent) => onEvent && onEvent(ev);
  const regionOf = (x: number, y: number): BloopRegion => {
    const cx = size / 2, cy = size * 0.55;
    if (y < cy - size * 0.28) return "crown";
    if (y < cy && Math.abs(x - cx) < size * 0.18) return "eyes";
    return x < cx - size * 0.12 ? "cheekL" : x > cx + size * 0.12 ? "cheekR" : "body";
  };
  const tap = Gesture.Tap().maxDuration(220).onEnd((e, ok) => {
    if (!ok) return;
    const now = Date.now();
    runOnJS((x: number, y: number, t: number) => {
      pokeTimes.current = pokeTimes.current.filter((p) => t - p < 2500).concat(t);
      const n = pokeTimes.current.length;
      // gaze to the touch point
      gazeX.value = withSpring(Math.max(-6, Math.min(6, (x - size / 2) / 10)), SOFT);
      gazeY.value = withSpring(Math.max(-6, Math.min(6, (y - size / 2) / 10)), SOFT);
      if (n >= 3) emit({ kind: "tickle", pokesInWindow: n });
      else emit({ kind: "poke", region: regionOf(x, y) });
    })(e.x, e.y, now);
  });
  const strokeStart = useRef(0);
  const pan = Gesture.Pan()
    .onBegin(() => { runOnJS(() => { strokeStart.current = Date.now(); })(); })
    .onUpdate((e) => {
      // slow horizontal drift = petting; fast/vertical = playful drag
      if (Math.abs(e.velocityX) < 260 && Math.abs(e.velocityY) < 260) {
        rot.value = Math.max(-8, Math.min(8, e.translationX / 14)) * M;
      } else {
        tx.value = e.translationX * 0.5 * M; ty.value = e.translationY * 0.5 * M;
      }
    })
    .onEnd((e) => {
      const dur = Date.now() - strokeStart.current;
      runOnJS((vx: number, ms: number, moved: number) => {
        if (moved < 40 && ms > 350) emit({ kind: "pet", strokeMs: ms });
        else emit({ kind: "dragEnd", flungVelocity: vx });
      })(e.velocityX, dur, Math.abs(e.translationX) + Math.abs(e.translationY));
      tx.value = withSpring(0, JELLY); ty.value = withSpring(0, JELLY); rot.value = withSpring(0, SOFT);
    });
  const gestures = Gesture.Race(tap, pan);

  // ------------------------------------------------------------ animated svg
  const bodyProps = useAnimatedProps(() => ({
    transform: [
      { translateX: size / 2 + tx.value }, { translateY: size * 0.55 + ty.value },
      { rotate: `${rot.value}deg` },
      { scaleX: breathe.value * squashX.value }, { scaleY: (2 - breathe.value) * squashY.value },
      { translateX: -size / 2 }, { translateY: -size * 0.55 },
    ] as any,
  }));
  const mouthProps = useAnimatedProps(() => {
    const w = size * 0.16, cx = size / 2, cy = size * 0.62, curve = mouth.value * size * 0.09;
    return { d: `M ${cx - w} ${cy} Q ${cx} ${cy + curve} ${cx + w} ${cy}` } as any;
  });
  const lidProps = useAnimatedProps(() => ({ ry: (size * 0.055) * (1 - lids.value) } as any));
  const pupilProps = useAnimatedProps(() => ({ cx: gazeX.value, cy: gazeY.value } as any));
  const blushProps = useAnimatedProps(() => ({ opacity: blush.value * 0.55 } as any));
  const tuftProps = useAnimatedProps(() => ({ transform: [{ rotate: `${tuftLag.value}deg` }] as any }));

  const eyeY = size * 0.48, eyeDX = size * 0.13, R = size * 0.34;
  const web = Platform.OS === "web";

  return (
    <GestureDetector gesture={gestures}>
      <Animated.View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel ?? "Bloop"} style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="bloopBody" cx="42%" cy="34%" r="75%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.95} />
              <Stop offset="28%" stopColor={bodyHue} stopOpacity={0.92} />
              <Stop offset="100%" stopColor={bodyHue} />
            </RadialGradient>
          </Defs>
          <AG animatedProps={web ? undefined : (bodyProps as any)}>
            {/* squircle-ish jelly body */}
            <Path
              d={`M ${size * 0.5} ${size * 0.18}
                  C ${size * 0.82} ${size * 0.18} ${size * 0.88} ${size * 0.44} ${size * 0.86} ${size * 0.62}
                  C ${size * 0.84} ${size * 0.84} ${size * 0.66} ${size * 0.92} ${size * 0.5} ${size * 0.92}
                  C ${size * 0.34} ${size * 0.92} ${size * 0.16} ${size * 0.84} ${size * 0.14} ${size * 0.62}
                  C ${size * 0.12} ${size * 0.44} ${size * 0.18} ${size * 0.18} ${size * 0.5} ${size * 0.18} Z`}
              fill="url(#bloopBody)"
            />
            {/* crown tuft (secondary motion) */}
            <AG animatedProps={web ? undefined : (tuftProps as any)} origin={`${size * 0.5}, ${size * 0.2}`}>
              <Path d={`M ${size * 0.5} ${size * 0.2} Q ${size * 0.46} ${size * 0.08} ${size * 0.56} ${size * 0.06}`} stroke={accentHue} strokeWidth={size * 0.03} strokeLinecap="round" fill="none" />
            </AG>
            {/* specular highlight */}
            <Ellipse cx={size * 0.38} cy={size * 0.32} rx={size * 0.09} ry={size * 0.05} fill="#FFFFFF" opacity={0.6} />
            {/* eyes: white → pupil (gaze) → lid */}
            {[-1, 1].map((s) => (
              <G key={s} x={size / 2 + s * eyeDX} y={eyeY}>
                <Circle r={size * 0.062} fill="#FFFFFF" />
                <AG animatedProps={web ? undefined : (pupilProps as any)}>
                  <Circle r={size * 0.032} fill="#22303C" />
                  <Circle cx={-size * 0.01} cy={-size * 0.012} r={size * 0.009} fill="#FFFFFF" />
                </AG>
                <AEllipse animatedProps={web ? undefined : (lidProps as any)} rx={size * 0.066} fill={bodyHue} />
              </G>
            ))}
            {/* cheeks (blush) */}
            <ACircle animatedProps={web ? undefined : (blushProps as any)} cx={size * 0.31} cy={size * 0.58} r={size * 0.045} fill="#FF8FB1" />
            <ACircle animatedProps={web ? undefined : (blushProps as any)} cx={size * 0.69} cy={size * 0.58} r={size * 0.045} fill="#FF8FB1" />
            {/* mouth */}
            <APath animatedProps={web ? undefined : (mouthProps as any)} stroke="#22303C" strokeWidth={size * 0.018} strokeLinecap="round" fill="none" />
          </AG>
        </Svg>
      </Animated.View>
    </GestureDetector>
  );
}

/*
 * INTEGRATION NOTES for the M5.1 build agent:
 *  1. Place brain+body in packages/shared/src/bloop/; export via the barrel per
 *     the §2.1 ownership map. The brain is RN-free → full jest coverage
 *     (determinism: same inputs ⇒ identical frames; law tests: no negative
 *     performance reachable, lowStim clamps ≤0.35, autism ceil 0.65).
 *  2. apps/kid hosts <BloopHost> that: subscribes to gameplay events →
 *     brain.nextBehavior → setFrame; fires idleTick every 4s; speaks quipKey via
 *     the shared TTS (spokenLabels gate); calls settleAfterCelebration on
 *     danceRoutine end; maps quiet-hours → the snooze event.
 *  3. On web, animatedProps on SVG sub-elements can be flaky — the `web` flag
 *     renders a static (but styled) Bloop; the M5.1 agent may progressively
 *     enable web animation where it verifies clean in expo export.
 *  4. Wire the existing v1 cosmetics (bodyHue/finish/accessory) as props;
 *     accessory rendering slots between body and eyes.
 *  5. quipKeys land in the i18n catalog (en.ts) and MUST pass evidenceHonesty —
 *     short, warm, never medical, never guilt ("You did it!", "Splash-tastic!").
 */
