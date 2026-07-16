/**
 * app/(kid)/calm.tsx — the calm / non-gamified path (doc 61 §8.4/§9 / doc 66 M13),
 * now hosting the calm breathing / regulation mini-game (breathing-regulation, M-C2).
 *
 * A deliberately UN-gamified destination (distinct from `calmMode`/`lowStim`,
 * which are themes): there are NO tokens, NO confetti, NO celebration here — just a
 * self-paced breathe-with-the-bubble activity (a `<BreathingBubble>` paced by a
 * curated `BreathPattern`), a soft "stay-calm-to-grow" `<CalmGarden>` that grows one
 * stage per completed cycle (elapsed time only — never any reading of the child's
 * calm), and an optional loopable soundscape the child turns on/off.
 *
 * It reads nothing about the child's body: the growth is purely a function of
 * cycles finished, resets each visit (so nothing can ever be lost), and completing
 * a set only settles the buddy to a positive restful mood — no token, no
 * celebration. Age/motion differences flow ONLY through resolved tokens / capability
 * flags / resolveContent (never a raw ageMode branch). Background parallax bubbles
 * drift only in `standard` motion (off in lowStim / OS Reduce-Motion, via
 * `motion.loopsEnabled`).
 *
 * The soundscape is the ONLY loopable cue; it ducks-not-hijacks other audio and is
 * stopped whenever the screen loses focus or unmounts (never plays in background).
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View, type DimensionValue } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import BreathingBubble from "../../components/kid/BreathingBubble";
import CalmGarden from "../../components/kid/CalmGarden";
import SoundscapePicker from "../../components/kid/SoundscapePicker";
import SpokenLabel from "../../components/ui/SpokenLabel";
import {
  breathPatternsFor,
  cycleMs,
  defaultBreathPatternId,
  getBreathPattern,
  type BreathPhase,
} from "../../src/domain/breathing";
import { stopSoundscape } from "../../src/services/soundscape";
import { useBuddyStore } from "../../src/state/buddyStore";
import { useChildStore } from "../../src/state/childStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { emitQuestSignal } from "../../src/state/gameplay";
import { emitActivity } from "../../src/sync/cloudSync";
import { resolveContent } from "../../src/theme/resolveContent";
import { useCapabilities, useThemeInputs } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

/** Device-local quiet-hours check (gates the opt-in pacing haptic). */
function isQuietHoursNow(q: { start: string; end: string }): boolean {
  const d = new Date();
  const cur = d.getHours() * 60 + d.getMinutes();
  const [sh, sm] = q.start.split(":").map((n) => parseInt(n, 10));
  const [eh, em] = q.end.split(":").map((n) => parseInt(n, 10));
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  return s <= e ? cur >= s && cur < e : cur >= s || cur < e; // wraps midnight
}

export default function Calm() {
  const t = useThemeTokens();
  const c = t.colors;
  const router = useRouter();
  const caps = useCapabilities();
  const { ageMode } = useThemeInputs();

  const activeChildId = useSettingsStore((s) => s.meta.activeChildId);
  const settings = useChildStore((s) =>
    activeChildId ? s.profiles[activeChildId]?.settings : undefined,
  );
  const updateSettings = useChildStore((s) => s.updateSettings);
  const addEvent = useChildStore((s) => s.addEvent);
  const applyBuddyEvent = useBuddyStore((s) => s.applyEvent);
  const localAnalyticsEnabled = useSettingsStore((s) => s.parentSettings.localAnalyticsEnabled);
  const quietWindow = useSettingsStore((s) => s.parentSettings.quietHours);

  const animate = t.motion.loopsEnabled; // false in lowStim / reduced-motion
  const reducedMotion = t.animationDurationScale === 0;

  // The active pattern: the child's chosen id, else the age-resolved default. An
  // unknown/removed id falls back to the default without crashing.
  const activePattern = useMemo(
    () =>
      getBreathPattern(settings?.breathingPatternId) ??
      getBreathPattern(defaultBreathPatternId(ageMode)) ??
      breathPatternsFor(ageMode)[0],
    [settings?.breathingPatternId, ageMode],
  );

  // The curated chooser list — young gets exactly one default (no chooser shown).
  const patternChoices = useMemo(() => breathPatternsFor(ageMode), [ageMode]);

  // Within-session grow stage — resets each visit / on a pattern change, so there
  // is no persistent score and nothing can ever be lost (anti-shame §2.1). The
  // `session` counter bumps on each focus so the bubble REMOUNTS with a fresh clock
  // (a returning child starts a brand-new set, never resuming a stale count).
  const [stage, setStage] = useState(0);
  const [session, setSession] = useState(0);

  // Phase copy resolved once per age (both variants exist); passed to the bubble so
  // the animation and the label are driven by the SAME source and can't drift.
  const phaseLabels = useMemo<Record<BreathPhase, string>>(
    () => ({
      inhale: resolveContent("breathe.in", { ageMode }),
      hold: resolveContent("breathe.hold", { ageMode }),
      exhale: resolveContent("breathe.out", { ageMode }),
      holdOut: resolveContent("breathe.rest", { ageMode }),
    }),
    [ageMode],
  );

  // Reset the grow visual whenever the screen refocuses (leaving/returning resets —
  // nothing can be lost) and stop the soundscape on blur/unmount.
  useFocusEffect(
    useCallback(() => {
      setStage(0);
      setSession((n) => n + 1); // fresh breathing set on every visit
      // Novelty-refresh (M-C4): a calm-corner visit advances any `tryCalm` quest.
      // `emitQuestSignal` self-suppresses on the calm path, so this is silent for a
      // calm-mode child (no tokens/celebration here — the calm contract holds).
      const cid = useSettingsStore.getState().meta.activeChildId;
      if (cid) emitQuestSignal(cid, { kind: "tryCalm", delta: 1 });
      return () => {
        stopSoundscape();
      };
    }, []),
  );
  useEffect(() => () => stopSoundscape(), []);
  // A pattern change begins a fresh set.
  useEffect(() => setStage(0), [activePattern.id]);

  const onCycle = useCallback((completed: number) => setStage(completed), []);

  const onComplete = useCallback(() => {
    if (!activeChildId) return;
    // Settle the buddy to a positive restful mood — NO token, NO confetti, NO
    // celebration (the calm destination's contract). `rest` → sleepy/content.
    applyBuddyEvent(activeChildId, "rest");
    // One-way-up mirror via the SHARED seam (w1 M1.2 §2.4c): a completed
    // breathing set mirrors as `breathing_done` — counts only, fail-closed
    // no-op unless cloudSyncEnabled + paired. Independent of the opt-in
    // LOCAL analytics log below (which never leaves the device).
    emitActivity(
      "breathing_done",
      { cycles: activePattern.cyclesTarget },
      { cid: activeChildId },
    );
    // Opt-in, on-device-only session log — ONLY when the parent turned on local
    // analytics (default OFF). When off, nothing is logged; the activity still
    // works fully. The event never leaves the device (childStore events slice).
    if (localAnalyticsEnabled) {
      addEvent(activeChildId, {
        ts: Date.now(),
        type: "breathing_session",
        payload: {
          patternId: activePattern.id,
          cycles: activePattern.cyclesTarget,
          durationMs: cycleMs(activePattern) * activePattern.cyclesTarget,
        },
      });
    }
  }, [activeChildId, applyBuddyEvent, localAnalyticsEnabled, addEvent, activePattern]);

  const choosePattern = useCallback(
    (id: string) => {
      if (!activeChildId) return;
      updateSettings(activeChildId, { breathingPatternId: id });
    },
    [activeChildId, updateSettings],
  );

  // Auto-speak the phase for non-readers (resolved default; young=true). Older gets
  // tap-to-speak only. Respects the child's TTS toggle.
  const ttsEnabled = (t.spokenLabelDefault ?? false) && (settings?.spokenLabelsEnabled ?? true);
  // Opt-in soft pacing pulse: default OFF; gated by hapticsEnabled; off in lowStim
  // (no decorative motion), off under Reduce-Motion, off in quiet hours.
  const pacingHaptics =
    (settings?.breathingPacingHaptics ?? false) &&
    (settings?.hapticsEnabled ?? true) &&
    animate &&
    !reducedMotion &&
    !isQuietHoursNow(quietWindow);

  const target = activePattern.cyclesTarget;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
      {/* drifting background bubbles — standard motion only */}
      {animate ? <DriftingBubbles hue={c.primary} /> : null}

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "space-between",
          gap: t.spacing(5),
          paddingHorizontal: t.spacing(6),
          paddingVertical: t.spacing(6),
        }}
      >
        {/* gentle title (no token meter, no progress, no score) */}
        <View style={{ alignItems: "center", gap: t.spacing(1) }}>
          <SpokenLabel text="Calm corner" variant="h1" autoSpeak />
          <Text
            style={{
              color: c.textDim,
              fontFamily: t.type.body.family,
              fontSize: t.type.body.size,
              textAlign: "center",
            }}
          >
            A quiet place to slow down and breathe.
          </Text>

          {/* low-emphasis, OPT-IN mood check-in (mood-checkin §2.1) — only when the
              parent has turned it on (caps.moodCheckin). Never the focus here. */}
          {caps.moodCheckin ? (
            <Pressable
              onPress={() => router.push("/(kid)/mood")}
              accessibilityRole="button"
              accessibilityLabel={resolveContent("mood.checkIn", { ageMode })}
              hitSlop={8}
              style={{
                marginTop: t.spacing(1),
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingVertical: 6,
                paddingHorizontal: 14,
                borderRadius: 999,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <Text style={{ fontSize: 15 }}>💛</Text>
              <Text
                style={{
                  color: c.textDim,
                  fontFamily: t.type.label.family,
                  fontSize: t.type.label.size,
                  fontWeight: "700",
                }}
              >
                {resolveContent("mood.checkIn", { ageMode })}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* the breathing bubble — remounts on a pattern change OR a new visit for a
            fresh, clock-anchored set (so a returning child never resumes a stale count) */}
        <BreathingBubble
          key={`${activePattern.id}:${session}`}
          pattern={activePattern}
          animate={animate}
          reducedMotion={reducedMotion}
          ttsEnabled={ttsEnabled}
          pacingHaptics={pacingHaptics}
          phaseLabels={phaseLabels}
          onCycle={onCycle}
          onComplete={onComplete}
          size={Math.min(t.contentMaxWidth * 0.62, 240)}
        />

        {/* curated pattern chooser — older/preteen only (young gets one default) */}
        {caps.breathingChoice && patternChoices.length > 1 ? (
          <View
            accessibilityRole="radiogroup"
            style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: t.spacing(2) }}
          >
            {patternChoices.map((p) => {
              const active = p.id === activePattern.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => choosePattern(p.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={p.label.spokenLabel}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingVertical: t.spacing(2),
                    paddingHorizontal: t.spacing(3),
                    borderRadius: 999,
                    backgroundColor: active ? c.surfaceAlt : c.surface,
                    borderWidth: active ? 2 : 1,
                    borderColor: active ? c.primary : c.border,
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{p.label.emoji ?? "🫧"}</Text>
                  <Text
                    style={{
                      color: c.text,
                      fontFamily: t.type.label.family,
                      fontSize: t.type.label.size,
                      fontWeight: active ? "700" : "500",
                    }}
                  >
                    {p.label.text ?? p.label.spokenLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* the "stay-calm-to-grow" garden + a warm, never-scoring caption */}
        <View style={{ alignItems: "center", gap: t.spacing(2) }}>
          <CalmGarden stage={stage} target={target} animate={animate && !reducedMotion} />
          <Text
            style={{
              color: c.textDim,
              fontFamily: t.type.label.family,
              fontSize: t.type.label.size,
              textAlign: "center",
            }}
          >
            {resolveContent("breathe.grow", { ageMode })}
          </Text>
          {/* older-only calm cycle readout — never red, never "you missed N" */}
          {caps.showNumbersAndCharts ? (
            <Text
              style={{
                color: c.textDim,
                fontFamily: t.type.caption.family,
                fontSize: t.type.caption.size,
                fontVariant: ["tabular-nums"],
              }}
            >
              {stage} of {target} breaths
            </Text>
          ) : null}
        </View>

        {/* soundscape picker — scene + volume + on/off. Ducks (never hijacks) other
            media; stops on blur/unmount. Only when there is an active child. Premium
            EXTRA beds preview through the parent gate (inside the picker); the base
            bed + the breathing activity are always FREE and never gated here. */}
        {activeChildId ? (
          <SoundscapePicker context="calm" childId={activeChildId} />
        ) : (
          <View />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** A sparse layer of slow rising bubbles (parallax). Standard motion only. */
function DriftingBubbles({ hue }: { hue: string }) {
  // deterministic, sparse set (doc 61 §7.1: 4–7 bubbles)
  const specs = useMemo(
    (): { left: DimensionValue; size: number; dur: number; delay: number }[] => [
      { left: "12%", size: 26, dur: 12000, delay: 0 },
      { left: "30%", size: 16, dur: 15000, delay: 2200 },
      { left: "52%", size: 34, dur: 14000, delay: 800 },
      { left: "68%", size: 20, dur: 17000, delay: 3400 },
      { left: "84%", size: 14, dur: 13000, delay: 1500 },
    ],
    [],
  );
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      {specs.map((s, i) => (
        <DriftBubble key={i} hue={hue} left={s.left} size={s.size} dur={s.dur} delay={s.delay} />
      ))}
    </View>
  );
}

function DriftBubble({
  hue,
  left,
  size,
  dur,
  delay,
}: {
  hue: string;
  left: DimensionValue;
  size: number;
  dur: number;
  delay: number;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    const id = setTimeout(() => {
      p.value = withRepeat(withTiming(1, { duration: dur, easing: Easing.linear }), -1, false);
    }, delay);
    return () => {
      clearTimeout(id);
      cancelAnimation(p);
    };
  }, [p, dur, delay]);

  const style = useAnimatedStyle(() => {
    "worklet";
    // rise from just below the screen to the top; fade in then out
    const translateY = interpolate(p.value, [0, 1], [40, -640]);
    const opacity = interpolate(p.value, [0, 0.15, 0.85, 1], [0, 0.5, 0.5, 0]);
    return { transform: [{ translateY }], opacity };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          bottom: 0,
          left,
          width: size,
          height: size,
          borderRadius: 999,
          backgroundColor: hue,
        },
        style,
      ]}
    />
  );
}
