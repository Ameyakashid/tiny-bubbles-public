/**
 * components/plans/PlanCard.tsx — the read-only if-then card (if-then-plans §2.2).
 *
 * Shows one plan's assembled "when X → I will Y" phrase, resolver-styled and
 * spoken. It NEVER starts a run and NEVER gates anything. Layout flows from a
 * RESOLVED capability flag (`caps.multiStepVisible`), NEVER a raw `ageMode`
 * branch — `ageMode` only ever FEEDS the pure `assemblePlanPhrase` resolver:
 *   - young (two big stacked lines + an arrow; auto-speaks on open);
 *   - older (one calm sentence; speaks on tap).
 *
 * For a `situational` plan an OPTIONAL, POSITIVE-only "I did it! 🫧" nod is shown
 * (wired by the screen); there is NO negative / "not done" affordance anywhere.
 */
import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";

import { assemblePlanPhrase } from "../../src/domain/plans";
import type { Plan } from "../../src/domain/types";
import { speak } from "../../src/services/tts";
import { resolveContent } from "../../src/theme/resolveContent";
import { useCapabilities, useThemeInputs } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

export interface PlanCardProps {
  plan: Plan;
  /** master TTS toggle for this child; default on */
  spokenEnabled?: boolean;
  /** auto-speak once on mount IF the mode wants pervasive TTS (young) */
  autoSpeak?: boolean;
  /** situational-only positive nod handler; when omitted no nod is shown */
  onDidIt?: () => void;
}

function PlanCard({
  plan,
  spokenEnabled = true,
  autoSpeak = false,
  onDidIt,
}: PlanCardProps) {
  const t = useThemeTokens();
  const c = t.colors;
  const caps = useCapabilities();
  const { ageMode } = useThemeInputs();

  const phrase = assemblePlanPhrase(plan, ageMode);
  const stacked = !caps.multiStepVisible; // young: two stacked lines + arrow
  const isSituational = plan.cue.type === "situational";
  const cueEmoji = plan.cue.label.emoji ?? "🫧";
  const actionEmoji = plan.action.label.emoji ?? "✨";

  // young pervasive-TTS default: speak the plan once when it opens.
  useEffect(() => {
    if (autoSpeak && spokenEnabled && t.spokenLabelDefault) {
      speak(phrase.spoken, { ageMode, enabled: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: t.radius * 1.5,
        borderWidth: 1,
        borderColor: c.border,
        padding: t.spacing(4),
        gap: t.spacing(3),
      }}
    >
      <Pressable
        onPress={() => speak(phrase.spoken, { ageMode, enabled: spokenEnabled })}
        accessibilityRole="button"
        accessibilityLabel={phrase.spoken}
        accessibilityHint="Tap to hear it"
      >
        {stacked ? (
          <View style={{ gap: t.spacing(2), alignItems: "flex-start" }}>
            <BigLine emoji={cueEmoji} text={phrase.cue} c={c} t={t} />
            <Text style={{ color: c.primary, fontSize: 28, paddingLeft: 40 }}>↓</Text>
            <BigLine emoji={actionEmoji} text={phrase.action} c={c} t={t} strong />
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2) }}>
            <Text style={{ fontSize: 22 }}>{cueEmoji}</Text>
            <Text
              style={{
                flex: 1,
                color: c.text,
                fontFamily: t.type.bodyLg.family,
                fontSize: t.type.bodyLg.size,
              }}
            >
              {phrase.cue},{" "}
              <Text style={{ fontWeight: "700" }}>{phrase.action}</Text> {actionEmoji}
            </Text>
          </View>
        )}
      </Pressable>

      {/* situational-only, POSITIVE-only nod — no tokens, no streak, no negative. */}
      {isSituational && onDidIt ? (
        <Pressable
          onPress={onDidIt}
          accessibilityRole="button"
          accessibilityLabel={resolveContent("plans.didIt", { ageMode })}
          hitSlop={8}
          style={{
            alignSelf: stacked ? "center" : "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingVertical: stacked ? t.spacing(3) : t.spacing(2),
            paddingHorizontal: stacked ? t.spacing(5) : t.spacing(4),
            borderRadius: 999,
            backgroundColor: c.surfaceAlt,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <Text
            style={{
              color: c.primary,
              fontFamily: t.type.label.family,
              fontSize: stacked ? t.type.bodyLg.size : t.type.label.size,
              fontWeight: "700",
            }}
          >
            {resolveContent("plans.didIt", { ageMode })}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// M-D2 (§2.4): memoized leaf so a list re-render doesn't re-render every plan.
export default React.memo(PlanCard);

type Tokens = ReturnType<typeof useThemeTokens>;
type Colors = Tokens["colors"];

function BigLine({
  emoji,
  text,
  c,
  t,
  strong,
}: {
  emoji: string;
  text: string;
  c: Colors;
  t: Tokens;
  strong?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2) }}>
      <Text style={{ fontSize: 30 }}>{emoji}</Text>
      <Text
        style={{
          flex: 1,
          color: c.text,
          fontFamily: t.type.h2.family,
          fontSize: t.type.h2.size,
          fontWeight: strong ? "700" : "600",
        }}
      >
        {text}
      </Text>
    </View>
  );
}
