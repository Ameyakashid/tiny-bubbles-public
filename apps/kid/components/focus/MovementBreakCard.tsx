/**
 * components/focus/MovementBreakCard.tsx — the ACTIVE-movement break card for the
 * focus scaffold (feature #22, `focus-intervals`, M-C3).
 *
 * The science-honest bit for kids: get-up-and-MOVE breaks, not sit-and-wait. Shows
 * one curated movement prompt (emoji + big spoken-label text, e.g. 🤸 "Do 5 star
 * jumps") chosen by a DETERMINISTIC rotating index (no `Math.random`) — or, when the
 * child turned movement breaks off, a plain "take a breather" rest. A shorter
 * depleting break ring reuses `VisualTimer` (wall-clock anchored, smooth vs 1 Hz
 * stepped under Reduce-Motion).
 *
 * Breaks are framed as POSITIVE movement, never "your reward for suffering". Controls
 * are always one tap and neutral: "I moved!" / "Skip break" advance immediately; when
 * the break ring empties a calm "Back to focus" + "I'm done" appear. Nothing
 * auto-advances, nothing is penalised. Age/sensory differences flow ONLY through
 * resolved tokens + the caller's `showNumbers` flag — no raw ageMode read here.
 */
import React, { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { MovementPrompt } from "../../src/domain/types";
import { useThemeTokens } from "../../src/theme/useThemeTokens";
import VisualTimer from "../task/VisualTimer";

export interface MovementBreakCardProps {
  /** the chosen curated prompt for this break (undefined ⇒ plain rest / movement off). */
  prompt?: MovementPrompt;
  /** whether this is an active-movement break (vs a plain rest). */
  movement: boolean;
  /** break length in minutes. */
  breakMinutes: number;
  /** wall-clock ms the break phase started (resume-accurate). */
  phaseStartedAt: number;
  /** numeric m:ss readout — from `caps.showNumbersAndCharts` (older only). */
  showNumbers: boolean;
  title: string;
  hint: string;
  movedLabel: string;
  skipLabel: string;
  backLabel: string;
  doneLabel: string;
  a11yPrefix: string;
  /** advance to the next focus block ("I moved!" / "Skip break" / "Back to focus"). */
  onBackToFocus: () => void;
  /** end the session calmly ("I'm done"). */
  onDone: () => void;
}

export default function MovementBreakCard({
  prompt,
  movement,
  breakMinutes,
  phaseStartedAt,
  showNumbers,
  title,
  hint,
  movedLabel,
  skipLabel,
  backLabel,
  doneLabel,
  a11yPrefix,
  onBackToFocus,
  onDone,
}: MovementBreakCardProps) {
  const t = useThemeTokens();
  const c = t.colors;

  // The break ring emptying does NOT auto-advance — it just reveals the calm
  // "Back to focus" / "I'm done" options (anti-shame: no alarm, no forced jump).
  const [broke, setBroke] = useState(false);
  const onEmpty = useCallback(() => setBroke(true), []);

  const showPrompt = movement && prompt;

  return (
    <View style={{ alignItems: "center", gap: t.spacing(5), width: "100%" }}>
      <Text
        style={{
          color: c.text,
          fontFamily: t.type.h1.family,
          fontSize: t.type.h1.size,
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        {title}
      </Text>

      {/* the movement prompt (emoji + big spoken-label text) or a plain rest hint */}
      <View
        accessibilityLabel={showPrompt ? prompt!.spokenLabel : hint}
        style={{ alignItems: "center", gap: t.spacing(2) }}
      >
        <Text style={{ fontSize: 64 }}>{showPrompt ? prompt!.emoji : "🫧"}</Text>
        <Text
          style={{
            color: c.text,
            fontFamily: t.type.h2.family,
            fontSize: t.type.h2.size,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          {showPrompt ? prompt!.spokenLabel : hint}
        </Text>
      </View>

      {/* the shorter depleting break ring (reused VisualTimer, wall-clock anchored) */}
      <VisualTimer
        timerSeconds={Math.max(1, Math.round(breakMinutes * 60))}
        startedAt={phaseStartedAt}
        variant="wedge"
        showNumbers={showNumbers}
        a11yPrefix={a11yPrefix}
        onEmpty={onEmpty}
        size={160}
      />

      {/* controls — always one tap, always neutral */}
      <View style={{ width: "100%", alignItems: "center", gap: t.spacing(3) }}>
        <Pressable
          onPress={onBackToFocus}
          accessibilityRole="button"
          accessibilityLabel={broke ? backLabel : movedLabel}
          style={{
            minHeight: t.primaryActionMin,
            width: "100%",
            maxWidth: 420,
            borderRadius: t.radius,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: t.spacing(4),
            backgroundColor: c.primary,
          }}
        >
          <Text
            style={{
              color: c.onPrimary,
              fontFamily: t.type.label.family,
              fontSize: t.type.bodyLg.size,
              fontWeight: "700",
            }}
          >
            {broke ? backLabel : movedLabel}
          </Text>
        </Pressable>

        {/* before empty: a low-emphasis "Skip break"; after empty: "I'm done" */}
        {broke ? (
          <Pressable
            onPress={onDone}
            accessibilityRole="button"
            accessibilityLabel={doneLabel}
            style={{ paddingVertical: 8, paddingHorizontal: 16 }}
          >
            <Text style={{ color: c.textDim, fontFamily: t.type.label.family, fontSize: t.type.label.size }}>
              {doneLabel}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onBackToFocus}
            accessibilityRole="button"
            accessibilityLabel={skipLabel}
            style={{ paddingVertical: 8, paddingHorizontal: 16 }}
          >
            <Text style={{ color: c.textDim, fontFamily: t.type.label.family, fontSize: t.type.label.size }}>
              {skipLabel}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
