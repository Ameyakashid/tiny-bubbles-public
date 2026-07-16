/**
 * app/(kid)/celebrate.tsx — the routine-complete MILESTONE moment (doc 66 M7).
 *
 * The bigger ≈1.4s celebration reserved for genuine milestones (doc 61 §8.2):
 * the last step of a routine. The runner fires the immediate sub-300ms cues
 * (haptic + sound + TTS) and THEN navigates here, so this screen owns the visual
 * milestone card — soft tinted scrim (NOT lockin's opaque black) + a ZoomIn card,
 * the buddy entering `proud`, a denser bubble-burst, the run's bubble total, and
 * one warm line + one big Done button.
 *
 * Lifted STRUCTURE only from lockin `VictoryOverlay.tsx` (Modal + ZoomIn /
 * SlideInDown / FadeIn choreography); every shame token is gone — copy retoned,
 * `bg-swiss-red`/`bg-black` replaced with the resolved palette, and the
 * `ScannerSprite state="APPROVED"` swapped for the positive-only <BubbleBuddy>.
 * Size is whatever the runner already resolved (`level` param) — never recomputed.
 */
import React, { useEffect, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn, SlideInDown, ZoomIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import type { CelebrationLevel } from "../../src/domain/types";
import { useBuddyStore } from "../../src/state/buddyStore";
import { useChildStore } from "../../src/state/childStore";
import { undoStep } from "../../src/state/gameplay";
import { playCue } from "../../src/services/playCue";
import { resolveContent } from "../../src/theme/resolveContent";
import { useCapabilities, useThemeInputs } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";
import BubbleBuddy from "../../components/buddy/BubbleBuddy";
import Confetti from "../../components/celebration/Confetti";
import DoneButton from "../../components/task/DoneButton";

const CONFETTI_BY_LEVEL: Record<CelebrationLevel, number> = {
  full: 22,
  medium: 14,
  gentle: 0,
  calm: 0,
};

function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default function Celebrate() {
  const t = useThemeTokens();
  const c = t.colors;
  const caps = useCapabilities();
  const { ageMode } = useThemeInputs();
  const router = useRouter();
  const params = useLocalSearchParams<{
    childId?: string;
    level?: string;
    copy?: string;
    tokens?: string;
    steps?: string;
    undoTaskId?: string;
  }>();

  const childId = firstParam(params.childId) ?? "";
  const level = (firstParam(params.level) as CelebrationLevel) ?? "full";
  const copy = firstParam(params.copy) ?? resolveContent("celebrate.routine", { ageMode });
  const tokens = parseInt(firstParam(params.tokens) ?? "0", 10);
  const undoTaskId = firstParam(params.undoTaskId);

  const companion = useBuddyStore((s) => (childId ? s.companions[childId] : undefined));
  const settings = useChildStore((s) => (childId ? s.profiles[childId]?.settings : undefined));

  const variant = resolveContent("buddy.artVariant", { companionStyle: caps.companionStyle });

  // a positive milestone haptic on entry (respects the per-child toggle)
  useEffect(() => {
    if (settings?.hapticsEnabled === false) return;
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // ignore — never block the celebration
    }
  }, [settings?.hapticsEnabled]);

  const confettiCount = CONFETTI_BY_LEVEL[level];
  const hues = useMemo(
    () => (t.confetti ? c.celebration : [c.celebration[0]]),
    [t.confetti, c.celebration],
  );

  const dismiss = () => router.back();

  // Secondary, low-emphasis "Oops, undo" (verify-undo §2.2) — NEVER the focus (the
  // big Done stays primary). Reverses the final step (balance + status + run pointer,
  // leaving lifetime/growth intact) and returns to the routine at that step.
  const onUndo = () => {
    if (childId && undoTaskId) undoStep(childId, undoTaskId);
    playCue("tap.soft"); // a soft neutral cue only — never an error/warning
    router.back();
  };

  return (
    <Pressable onPress={dismiss} style={{ flex: 1, backgroundColor: c.scrim }}>
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: t.spacing(5) }}>
        {/* dense bubble-burst behind the card */}
        <View pointerEvents="none" style={{ position: "absolute", alignItems: "center", justifyContent: "center", top: "30%" }}>
          <Confetti count={confettiCount} hues={hues} playKey={1} spread={Math.min(t.contentMaxWidth, 360)} />
        </View>

        <Animated.View
          entering={ZoomIn.duration(420)}
          style={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: c.surface,
            borderRadius: t.radius * 2,
            padding: t.spacing(6),
            alignItems: "center",
            gap: t.spacing(4),
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <Animated.View entering={SlideInDown.delay(120).duration(420)}>
            <BubbleBuddy
              variant={variant}
              mood="proud"
              bodyHue={companion?.customization.baseColor}
              growthStage={companion?.growthStage ?? 0}
              size={180}
              animate={t.motion.loopsEnabled}
            />
          </Animated.View>

          <Animated.Text
            entering={FadeIn.delay(300)}
            style={{
              color: c.text,
              fontFamily: t.type.h1.family,
              fontSize: t.type.h1.size,
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            {copy}
          </Animated.Text>

          {tokens > 0 ? (
            <Animated.View
              entering={FadeIn.delay(420)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: c.successSurface,
                borderRadius: 999,
                paddingVertical: 8,
                paddingHorizontal: 16,
              }}
            >
              <Text style={{ fontSize: 18 }}>🫧</Text>
              <Text style={{ color: c.success, fontFamily: t.type.label.family, fontSize: t.type.bodyLg.size, fontWeight: "700" }}>
                +{tokens} bubbles
              </Text>
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeIn.delay(520)} style={{ width: "100%" }}>
            <DoneButton label={resolveContent("task.done", { ageMode })} onPress={dismiss} />
          </Animated.View>

          {/* secondary, quiet undo — only when a last-step id was passed */}
          {undoTaskId ? (
            <Animated.View entering={FadeIn.delay(640)}>
              <Text
                onPress={onUndo}
                accessibilityRole="button"
                style={{
                  color: c.textDim,
                  fontFamily: t.type.label.family,
                  fontSize: t.type.label.size,
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                }}
              >
                {resolveContent("undo.step", { ageMode })}
              </Text>
            </Animated.View>
          ) : null}
        </Animated.View>
      </SafeAreaView>
    </Pressable>
  );
}
