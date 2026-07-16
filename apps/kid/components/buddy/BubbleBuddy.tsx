/**
 * components/buddy/BubbleBuddy.tsx — the procedural companion (doc 61 §6, doc 66 M6).
 *
 * One fully-procedural `react-native-svg` + Reanimated component: a glassy
 * squircle body (animated `Path` `d` + `<RadialGradient>` + specular highlight),
 * eyes that gaze/blink, a mouth whose curve is driven by a single `smile` shared
 * value, an idle bob + breathe, a celebratory jump, a restful sleepy lid, and a
 * RENDERED growth-stage change (body scale + orbiting bubbles).
 *
 * ARCHITECTURE re-authored from the donor sprites (lockin ExecutionSprite.tsx +
 * ScannerSprite.tsx) — we keep ONLY the float/gaze/blink/breathe machinery
 * (`useSharedValue` + `useAnimatedProps`/`useAnimatedStyle` +
 * `withRepeat/withSequence/withTiming/withSpring`). Every shame mechanic of the
 * donors is ABSENT BY CONSTRUCTION here: there is no irate state, no irate/“> <”
 * eyes, no mocking phase, no tears, no insult text — the `mood` it renders is a
 * member of the positive-only `CompanionMood` union, and the mouth curve can
 * never bend into a frown (`smile` is clamped >= 0 in `buddyVisuals`).
 *
 * It takes `variant` + `mood` + cosmetic props (bodyHue/finish/accessory/name)
 * and `growthStage` — NEVER an `ageMode` prop (doc 66 §1b.7). The art variant is
 * chosen UPSTREAM via `resolveContent('buddy.artVariant', { companionStyle })`.
 */
import React, { useEffect, useId, useMemo } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from "react-native-svg";

import type { CompanionMood } from "../../src/domain/types";
import { useCopy } from "../../src/i18n/useLocale";
import type { BuddyArtVariant } from "../../src/theme/resolveContent";

import {
  buddyPose,
  growthVisual,
  VARIANT_PRESETS,
  type BuddyFinish,
} from "./buddyVisuals";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedStop = Animated.createAnimatedComponent(Stop);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Fixed 200x200 drawing space (all geometry below is in these units).
const CX = 100;
const CY = 100;
const R = 64;
const BEZIER_K = 0.5523; // circle-approximation constant for cubic beziers
const BREATHE_PX = 5; // squash/stretch amplitude

const EYE_Y = CY - 8;
const EYE_DX = 26;
const EYE_RX = 11;
const EYE_RY = 13;

const MOUTH_Y = CY + 30;
const MOUTH_HW = 22;
const MOUTH_DEPTH = 22; // max downward control => max upward smile

export interface BubbleBuddyProps {
  /** "bloop" (cuddly) | "orbit" (cool) | "nova" (avatar) — resolved from companionStyle, NOT ageMode. */
  variant: BuddyArtVariant;
  /** a member of the canonical POSITIVE companion-mood union. */
  mood: CompanionMood;
  /** body hue (hex); from the equipped color cosmetic. */
  bodyHue?: string;
  /** surface finish; from the equipped finish cosmetic. */
  finish?: BuddyFinish;
  /** head accessory emoji (hat/accessory cosmetic), or null/undefined for none. */
  accessory?: string | null;
  /** child-given name — used for the accessibility label / greeting only. */
  name?: string;
  /** monotonic growth stage; drives the rendered body-size change (doc 66 M6). */
  growthStage?: number;
  /** drawing box in px (default 200). */
  size?: number;
  /** false => static pose (OS reduced-motion / lowStim); no loops, no blink. */
  animate?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export default function BubbleBuddy({
  variant,
  mood,
  bodyHue = "#5BC8F5",
  finish = "plain",
  accessory,
  name,
  growthStage = 0,
  size = 200,
  animate = true,
  onPress,
  style,
  testID,
}: BubbleBuddyProps) {
  const preset = VARIANT_PRESETS[variant];
  const pose = buddyPose(mood);
  const growth = growthVisual(growthStage);
  const copy = useCopy();

  // A single resolved "name is/looks mood" label (§2.1). The mood is always a
  // POSITIVE member of the union, so a reader can never announce a sad/sick pet
  // (§7). The animated SVG internals are grouped under this one focal node.
  const a11yLabel = name
    ? copy("a11y.buddy.state", { name, mood })
    : copy("a11y.buddy.stateNoName", { mood });

  const svgSize = size * 0.82;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradId = `bb-grad-${uid}`;

  // base eye/body geometry adjusted per art variant
  const eyeRx = EYE_RX * preset.eyeScale;
  const eyeRy = EYE_RY * preset.eyeScale;
  const rx0 = R / Math.sqrt(preset.bodyStretch);
  const ry0 = R * Math.sqrt(preset.bodyStretch);
  // capture a primitive (not the preset object) for the mouth worklet closure
  const expressiveness = preset.expressiveness;

  // ---- shared values (the animation machinery) -------------------------------
  const breath = useSharedValue(0);
  const bobY = useSharedValue(0);
  const jumpY = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const mouthSmile = useSharedValue(pose.smile);
  const eyeOpenV = useSharedValue(pose.eyeOpen);
  const blinkV = useSharedValue(1);
  const pupilX = useSharedValue(0);
  const pupilY = useSharedValue(0);
  const tiltV = useSharedValue(pose.tilt);
  const puffV = useSharedValue(pose.puff);
  const spin = useSharedValue(0);
  const zDrift = useSharedValue(0);

  const GROWTH_SCALE = growth.bodyScale;

  // ---- breathe loop ----------------------------------------------------------
  useEffect(() => {
    if (!animate) {
      cancelAnimation(breath);
      breath.value = 0;
      return;
    }
    breath.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(breath);
  }, [animate, breath]);

  // ---- idle bob (amplitude from the mood pose) -------------------------------
  useEffect(() => {
    const amp = buddyPose(mood).bob;
    if (!animate) {
      cancelAnimation(bobY);
      bobY.value = 0;
      return;
    }
    bobY.value = withRepeat(
      withSequence(
        withTiming(-amp, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(bobY);
  }, [animate, mood, bobY]);

  // ---- pose targets (mouth / eyelids / tilt / puff) + entry jump -------------
  useEffect(() => {
    const p = buddyPose(mood);
    const dur = animate ? 320 : 0;
    mouthSmile.value = withTiming(p.smile, { duration: dur });
    eyeOpenV.value = withTiming(p.eyeOpen, { duration: dur });
    tiltV.value = withTiming(p.tilt, { duration: dur });
    puffV.value = withTiming(p.puff, { duration: dur });
    if (animate && p.jump) {
      jumpY.value = withSequence(
        withSpring(-24, { damping: 9, stiffness: 140, mass: 0.8 }),
        withSpring(0, { damping: 16, stiffness: 120, mass: 0.9 }),
      );
    } else {
      jumpY.value = 0;
    }
  }, [mood, animate, mouthSmile, eyeOpenV, tiltV, puffV, jumpY]);

  // ---- blink (skipped when resting with near-shut lids) ----------------------
  useEffect(() => {
    const p = buddyPose(mood);
    if (!animate || p.eyeOpen < 0.3) {
      blinkV.value = 1;
      return;
    }
    const id = setInterval(() => {
      blinkV.value = withSequence(
        withTiming(0.08, { duration: 90 }),
        withTiming(1, { duration: 90 }),
      );
    }, 4000);
    return () => clearInterval(id);
  }, [mood, animate, blinkV]);

  // ---- gaze: random saccades (idle) vs a soft fixed gaze ---------------------
  useEffect(() => {
    const p = buddyPose(mood);
    if (!animate) {
      pupilX.value = 0;
      pupilY.value = 0;
      return;
    }
    if (p.gaze === "saccade") {
      // deterministic saccade ring (NO Math.random — the buddy never needs RNG)
      const targets: ReadonlyArray<readonly [number, number]> = [
        [-5, 1],
        [4, -1],
        [0, 2],
        [6, 0],
        [-3, -2],
        [2, 1],
      ];
      let i = 0;
      const id = setInterval(() => {
        const [x, y] = targets[i % targets.length];
        pupilX.value = withSpring(x, { damping: 14 });
        pupilY.value = withSpring(y, { damping: 14 });
        i += 1;
      }, 2500);
      return () => clearInterval(id);
    }
    const fixed =
      p.gaze === "up" ? [0, -3] : p.gaze === "down" ? [0, 4] : [0, 0];
    pupilX.value = withSpring(fixed[0], { damping: 14 });
    pupilY.value = withSpring(fixed[1], { damping: 14 });
  }, [mood, animate, pupilX, pupilY]);

  // ---- orbiting growth satellites --------------------------------------------
  useEffect(() => {
    if (!animate || growth.satellites === 0) {
      cancelAnimation(spin);
      spin.value = 0;
      return;
    }
    spin.value = withRepeat(
      withTiming(360, { duration: 14000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(spin);
  }, [animate, growth.satellites, spin]);

  // ---- sleepy "z" drift ------------------------------------------------------
  useEffect(() => {
    if (!animate || !pose.drowsy) {
      cancelAnimation(zDrift);
      zDrift.value = 0;
      return;
    }
    zDrift.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
    return () => cancelAnimation(zDrift);
  }, [animate, pose.drowsy, zDrift]);

  // ---- animated props / styles ----------------------------------------------
  const bodyProps = useAnimatedProps(() => {
    "worklet";
    const t = breath.value;
    const rx = rx0 + BREATHE_PX * t;
    const ry = ry0 - BREATHE_PX * t;
    const kx = BEZIER_K * rx;
    const ky = BEZIER_K * ry;
    const d =
      `M ${CX} ${CY - ry} ` +
      `C ${CX + kx} ${CY - ry} ${CX + rx} ${CY - ky} ${CX + rx} ${CY} ` +
      `C ${CX + rx} ${CY + ky} ${CX + kx} ${CY + ry} ${CX} ${CY + ry} ` +
      `C ${CX - kx} ${CY + ry} ${CX - rx} ${CY + ky} ${CX - rx} ${CY} ` +
      `C ${CX - rx} ${CY - ky} ${CX - kx} ${CY - ry} ${CX} ${CY - ry} Z`;
    return { d };
  });

  const highlightProps = useAnimatedProps(() => {
    "worklet";
    return { stopOpacity: 0.55 + 0.4 * breath.value };
  });

  const leftEyeProps = useAnimatedProps(() => {
    "worklet";
    return {
      cx: CX - EYE_DX + pupilX.value,
      cy: EYE_Y + pupilY.value,
      ry: eyeRy * eyeOpenV.value * blinkV.value,
    };
  });
  const rightEyeProps = useAnimatedProps(() => {
    "worklet";
    return {
      cx: CX + EYE_DX + pupilX.value,
      cy: EYE_Y + pupilY.value,
      ry: eyeRy * eyeOpenV.value * blinkV.value,
    };
  });
  const leftCatchProps = useAnimatedProps(() => {
    "worklet";
    return {
      cx: CX - EYE_DX + pupilX.value + 3.5,
      cy: EYE_Y + pupilY.value - 4,
      opacity: eyeOpenV.value * blinkV.value,
    };
  });
  const rightCatchProps = useAnimatedProps(() => {
    "worklet";
    return {
      cx: CX + EYE_DX + pupilX.value + 3.5,
      cy: EYE_Y + pupilY.value - 4,
      opacity: eyeOpenV.value * blinkV.value,
    };
  });

  const mouthProps = useAnimatedProps(() => {
    "worklet";
    const s = mouthSmile.value;
    const depth = (0.25 + s) * MOUTH_DEPTH * expressiveness;
    const x1 = CX - MOUTH_HW;
    const x2 = CX + MOUTH_HW;
    const d = `M ${x1} ${MOUTH_Y} Q ${CX} ${MOUTH_Y + depth} ${x2} ${MOUTH_Y}`;
    return { d };
  });

  const bodyStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [
        { translateY: bobY.value + jumpY.value },
        { rotate: `${tiltV.value}deg` },
        { scale: pressScale.value * puffV.value * GROWTH_SCALE },
      ],
    };
  });

  const spinStyle = useAnimatedStyle(() => {
    "worklet";
    return { transform: [{ rotate: `${spin.value}deg` }] };
  });

  const zStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: 0.2 + 0.6 * (1 - zDrift.value),
      transform: [{ translateY: -14 * zDrift.value }, { scale: 0.8 + 0.4 * zDrift.value }],
    };
  });

  const handlePress = () => {
    if (animate) {
      pressScale.value = withSequence(
        withSpring(1.08, { damping: 9, stiffness: 160, mass: 0.7 }),
        withSpring(1, { damping: 14, stiffness: 140, mass: 0.9 }),
      );
    }
    onPress?.();
  };

  // ---- finish-driven gradient stops + decorative extras ----------------------
  // (react-native-svg's gradient `children` is typed as an array of stops)
  const isGalaxy = finish === "galaxy";
  const gradientStops: React.ReactElement[] = isGalaxy
    ? [
        <Stop key="g0" offset="0%" stopColor="#9A8CF5" stopOpacity={0.95} />,
        <AnimatedStop key="g1" offset="42%" stopColor="#4A3A9A" animatedProps={highlightProps} />,
        <Stop key="g2" offset="100%" stopColor="#160F33" stopOpacity={1} />,
      ]
    : [
        <Stop key="s0" offset="0%" stopColor="#FFFFFF" stopOpacity={0.94} />,
        <AnimatedStop key="s1" offset="40%" stopColor={bodyHue} animatedProps={highlightProps} />,
        <Stop key="s2" offset="100%" stopColor={bodyHue} stopOpacity={1} />,
      ];

  // sparkle / galaxy star marks (computed in render; positive accents only)
  const sparkleDots = useMemo(() => {
    const dots: Array<{ x: number; y: number; r: number }> = [];
    if (finish === "sparkle") {
      const pts = [
        [70, 60],
        [128, 72],
        [82, 118],
        [120, 122],
        [100, 50],
        [62, 96],
      ];
      pts.forEach(([x, y]) => dots.push({ x, y, r: 2.4 }));
    } else if (isGalaxy) {
      const pts = [
        [66, 58],
        [130, 64],
        [78, 86],
        [122, 96],
        [92, 70],
        [108, 130],
        [70, 124],
        [134, 118],
        [100, 56],
      ];
      pts.forEach(([x, y], i) => dots.push({ x, y, r: i % 2 ? 2.2 : 1.4 }));
    }
    return dots;
  }, [finish, isGalaxy]);

  // mood sparkles around the body (happy/excited/celebrating/proud)
  const moodSparkles = useMemo(() => {
    const pts = [
      [44, 52],
      [156, 52],
      [40, 150],
    ];
    return pts.slice(0, pose.sparkles);
  }, [pose.sparkles]);

  // ---- satellite layout (growth) ---------------------------------------------
  const satellites = useMemo(() => {
    const n = growth.satellites;
    const out: Array<{ left: number; top: number; s: number }> = [];
    const radius = size * 0.46;
    const sSize = size * 0.07;
    for (let i = 0; i < n; i += 1) {
      const a = (i / Math.max(1, n)) * Math.PI * 2;
      out.push({
        left: size / 2 + radius * Math.cos(a) - sSize / 2,
        top: size / 2 + radius * Math.sin(a) - sSize / 2,
        s: sSize,
      });
    }
    return out;
  }, [growth.satellites, size]);

  return (
    <Pressable
      onPress={handlePress}
      accessible
      accessibilityRole="image"
      accessibilityLabel={a11yLabel}
      testID={testID}
      style={[
        { width: size, height: size, alignItems: "center", justifyContent: "center" },
        style,
      ]}
    >
      {/* growth halo (later stages) */}
      {growth.halo ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: svgSize * 1.2,
            height: svgSize * 1.2,
            borderRadius: 999,
            borderWidth: svgSize * 0.035,
            borderColor: "#7FE3C0",
            opacity: 0.18,
          }}
        />
      ) : null}

      {/* soft ground shadow (sells the float) */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: size * 0.08,
          width: svgSize * 0.5,
          height: svgSize * 0.09,
          borderRadius: 999,
          backgroundColor: "rgba(12,40,64,0.12)",
        }}
      />

      {/* the body (squircle + face) */}
      <Animated.View style={[{ width: svgSize, height: svgSize }, bodyStyle]}>
        <Svg width={svgSize} height={svgSize} viewBox="0 0 200 200">
          <Defs>
            <RadialGradient id={gradId} cx="38%" cy="30%" r="75%">
              {gradientStops}
            </RadialGradient>
          </Defs>

          {/* Nova identity ring (avatar variant) — a thin, low-opacity orbital
              "signature" so the avatar reads as an identity, not a pet. Static
              (renders under reduced-motion too); drawn behind the body. */}
          {preset.identityRing ? (
            <>
              <Circle
                cx={CX}
                cy={CY}
                r={R + 8}
                stroke={bodyHue}
                strokeOpacity={0.45}
                strokeWidth={2.5}
                fill="none"
              />
              <Circle
                cx={CX}
                cy={CY}
                r={R + 15}
                stroke={bodyHue}
                strokeOpacity={0.2}
                strokeWidth={1.5}
                fill="none"
              />
            </>
          ) : null}

          {/* body */}
          <AnimatedPath animatedProps={bodyProps} fill={`url(#${gradId})`} fillOpacity={0.95} />

          {/* rim light (lower-right arc) */}
          <Path
            d={`M ${CX + 40} ${CY + 44} Q ${CX + 60} ${CY + 8} ${CX + 44} ${CY - 34}`}
            stroke="#FFFFFF"
            strokeOpacity={0.35}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />

          {/* specular highlight (top-left) */}
          <Ellipse cx={CX - 24} cy={CY - 30} rx={16} ry={10} fill="#FFFFFF" opacity={0.6} />
          {finish === "glass" ? (
            <Ellipse cx={CX - 30} cy={CY + 18} rx={8} ry={20} fill="#FFFFFF" opacity={0.22} />
          ) : null}

          {/* finish star dots (sparkle / galaxy) */}
          {sparkleDots.map((d, i) => (
            <Circle key={`sd-${i}`} cx={d.x} cy={d.y} r={d.r} fill="#FFFFFF" opacity={0.9} />
          ))}

          {/* cheeks (cuddly variant only) */}
          {preset.cheeks ? (
            <>
              <Ellipse cx={CX - 40} cy={CY + 12} rx={9} ry={6} fill="#FF9EC2" opacity={0.5} />
              <Ellipse cx={CX + 40} cy={CY + 12} rx={9} ry={6} fill="#FF9EC2" opacity={0.5} />
            </>
          ) : null}

          {/* eyes (dark) + catchlights — gaze via cx/cy, blink via ry */}
          <AnimatedEllipse animatedProps={leftEyeProps} rx={eyeRx} fill="#10303F" />
          <AnimatedEllipse animatedProps={rightEyeProps} rx={eyeRx} fill="#10303F" />
          <AnimatedCircle animatedProps={leftCatchProps} r={3} fill="#FFFFFF" />
          <AnimatedCircle animatedProps={rightCatchProps} r={3} fill="#FFFFFF" />

          {/* mouth — a single curve driven by the `smile` shared value */}
          <AnimatedPath
            animatedProps={mouthProps}
            stroke="#10303F"
            strokeWidth={4.5}
            strokeLinecap="round"
            fill="none"
          />

          {/* mood sparkles */}
          {moodSparkles.map(([x, y], i) => (
            <Circle key={`ms-${i}`} cx={x} cy={y} r={4} fill="#FFD166" opacity={0.95} />
          ))}
        </Svg>
      </Animated.View>

      {/* orbiting growth satellites */}
      {satellites.length > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[{ position: "absolute", width: size, height: size }, spinStyle]}
        >
          {satellites.map((s, i) => (
            <View
              key={`sat-${i}`}
              style={{
                position: "absolute",
                left: s.left,
                top: s.top,
                width: s.s,
                height: s.s,
                borderRadius: 999,
                backgroundColor: bodyHue,
                opacity: 0.55,
              }}
            />
          ))}
        </Animated.View>
      ) : null}

      {/* head accessory (emoji) */}
      {accessory ? (
        <View
          pointerEvents="none"
          style={{ position: "absolute", top: size * 0.03, left: 0, right: 0, alignItems: "center" }}
        >
          <Text style={{ fontSize: size * 0.2 }}>{accessory}</Text>
        </View>
      ) : null}

      {/* sleepy "z" (resting, never sick) */}
      {pose.drowsy ? (
        <Animated.Text
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: size * 0.14,
              right: size * 0.18,
              fontSize: size * 0.12,
              fontWeight: "700",
              color: "#8FA7B8",
            },
            zStyle,
          ]}
        >
          z
        </Animated.Text>
      ) : null}
    </Pressable>
  );
}
