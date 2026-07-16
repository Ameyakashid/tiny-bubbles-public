/**
 * components/kid/DaypartDonePanel.tsx — the calm "all done for now" state (doc 70 §B3).
 *
 * Rendered by `(kid)/index.tsx` (when nothing is scheduled for the current
 * daypart) and by `<TaskRunner>`'s all-done branch (when the current daypart's
 * routine is finished for today). Forward-only + ANTI-SHAME by construction:
 * there is one warm line ("see you this afternoon"), the buddy, and the running
 * bubble balance — never "you failed" / "streak lost", never an auto-restart that
 * loops back to morning. A low-emphasis "See what's later" peek and an optional,
 * explicitly opt-in "Do it again" are the only actions.
 *
 * Copy + buddy art come from the resolvers ONLY — this component never branches on
 * the raw `ageMode`/`companionStyle` string (doc 66 §2).
 */
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { selectionDaypart } from "../../src/domain/dates";
import { activePlans, assemblePlanPhrase, plansForDaypart } from "../../src/domain/plans";
import type { Daypart } from "../../src/domain/types";
import { useBuddyStore } from "../../src/state/buddyStore";
import { useChildStore } from "../../src/state/childStore";
import { usePlanStore } from "../../src/state/planStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { resolveContent, type CopyKey } from "../../src/theme/resolveContent";
import { useCapabilities, useThemeInputs } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";
import BubbleBuddy from "../buddy/BubbleBuddy";
import ChildHandoffButton from "./ChildHandoffButton";

/** Headline copy per daypart. `night` shares `evening`'s "see you tomorrow" line. */
const DONE_KEY: Record<Exclude<Daypart, "night">, CopyKey> = {
  morning: "daypart.done.morning",
  afternoon: "daypart.done.afternoon",
  evening: "daypart.done.evening",
};

export interface DaypartDonePanelProps {
  childId: string;
  /** the current daypart (already time-resolved by the caller). */
  daypart: Daypart;
  /**
   * "done"  => the daypart's routine is finished for today (headline per daypart).
   * "empty" => nothing is scheduled right now (neutral "nothing to do" headline).
   */
  mode: "done" | "empty";
  /**
   * Explicit, secondary "do it again" — passed ONLY by the runner's all-done
   * branch. Never the default focus; never fires on its own (doc 70 §B2).
   */
  onRestart?: () => void;
}

export default function DaypartDonePanel({
  childId,
  daypart,
  mode,
  onRestart,
}: DaypartDonePanelProps) {
  const t = useThemeTokens();
  const c = t.colors;
  const caps = useCapabilities();
  const { ageMode } = useThemeInputs();
  const router = useRouter();

  const companion = useBuddyStore((s) => s.companions[childId]);
  const balance = useChildStore((s) => s.ledgers[childId]?.balance ?? 0);
  // Opt-in, ungated kid hand-off (multi-child §2.1). Default false → switching
  // stays behind the grown-ups gate unless a parent opts in on a trusted device.
  const quickChildSwitch = useSettingsStore((s) => s.parentSettings.quickChildSwitch);
  const childCount = useChildStore((s) => s.index.filter((e) => !e.archived).length);
  // The OPTIONAL focus-intervals launcher (focus-intervals §2.0) shows ONLY when the
  // older-only capability is present AND the parent opted in — gated on the flag,
  // never a raw ageMode read. Absent config ⇒ off.
  const focusEnabled = useChildStore(
    (s) => s.profiles[childId]?.settings.focusIntervals?.enabled ?? false,
  );
  // If-then plans (if-then-plans §2.2/§2.3c): the "My plans" chip shows only when the
  // child has ≥1 active plan; when a daypart FINISHES, its `afterRoutine` plans are
  // surfaced as a single calm line under the headline.
  const planList = usePlanStore((s) => s.plans[childId]);
  const activePlanCount = activePlans(planList).length;
  const routinePlans =
    mode === "done" ? plansForDaypart(planList, selectionDaypart(daypart)) : [];

  const variant = resolveContent("buddy.artVariant", { companionStyle: caps.companionStyle });

  const key: CopyKey =
    mode === "empty"
      ? "daypart.empty"
      : DONE_KEY[selectionDaypart(daypart) as Exclude<Daypart, "night">];
  const headline = resolveContent(key, { ageMode });

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: t.spacing(6),
        gap: t.spacing(5),
      }}
    >
      <BubbleBuddy
        variant={variant}
        mood={mode === "done" ? "happy" : "content"}
        bodyHue={companion?.customization.baseColor}
        growthStage={companion?.growthStage ?? 0}
        size={168}
        animate={t.motion.loopsEnabled}
      />

      <Text
        style={{
          color: c.text,
          fontFamily: t.type.h1.family,
          fontSize: t.type.h1.size,
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        {headline}
      </Text>

      {/* after-routine if-then plans for the finished daypart — a single calm line
          under the headline (if-then-plans §2.3c), never a gate. */}
      {routinePlans.map((plan) => {
        const phrase = assemblePlanPhrase(plan, ageMode);
        return (
          <Text
            key={plan.id}
            style={{ color: c.textDim, fontSize: t.type.body.size, textAlign: "center" }}
          >
            {plan.action.label.emoji ?? "✨"} {phrase.action}
          </Text>
        );
      })}

      {/* running bubble balance (never a loss/streak state) */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: c.surface,
          borderRadius: 999,
          paddingVertical: 8,
          paddingHorizontal: 16,
          borderWidth: 1,
          borderColor: c.border,
        }}
      >
        <Text style={{ fontSize: 18 }}>🫧</Text>
        <Text
          style={{
            color: c.text,
            fontFamily: t.type.label.family,
            fontSize: t.type.bodyLg.size,
            fontWeight: "700",
          }}
        >
          {balance}
        </Text>
      </View>

      {/* low-emphasis peek at later dayparts + a calm-corner entry. The young shell
          has no tab bar, so the "Calm 🌊" affordance is the young child's (or a
          co-regulating parent's) way to reach the breathing activity (breathing-
          regulation §2.5). Both are calm, read-only doors — never hijack the run. */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(3) }}>
        <Pressable
          onPress={() => router.push("/(kid)/peek")}
          accessibilityRole="button"
          style={{ paddingVertical: 8, paddingHorizontal: 16 }}
        >
          <Text
            style={{
              color: c.textDim,
              fontFamily: t.type.label.family,
              fontSize: t.type.label.size,
            }}
          >
            {resolveContent("daypart.peek", { ageMode })} →
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(kid)/calm")}
          accessibilityRole="button"
          accessibilityLabel={resolveContent("calm.tabTitle", { ageMode })}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 999,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <Text style={{ fontSize: 15 }}>🌊</Text>
          <Text
            style={{
              color: c.textDim,
              fontFamily: t.type.label.family,
              fontSize: t.type.label.size,
              fontWeight: "700",
            }}
          >
            {resolveContent("calm.tabTitle", { ageMode })}
          </Text>
        </Pressable>

        {/* low-emphasis, OPTIONAL focus-timer launcher (focus-intervals §2.0) — a calm
            "all done for now" moment is a natural place to offer focused work. Older-
            only capability + parent opt-in; never a primary CTA, never auto-opens. */}
        {caps.focusIntervalsAvailable && focusEnabled ? (
          <Pressable
            onPress={() => router.push("/(kid)/focus")}
            accessibilityRole="button"
            accessibilityLabel={resolveContent("focus.launch", { ageMode })}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 999,
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.border,
            }}
          >
            <Text style={{ fontSize: 15 }}>🎯</Text>
            <Text
              style={{
                color: c.textDim,
                fontFamily: t.type.label.family,
                fontSize: t.type.label.size,
                fontWeight: "700",
              }}
            >
              {resolveContent("focus.launch", { ageMode })}
            </Text>
          </Pressable>
        ) : null}

        {/* low-emphasis "My plans" chip (if-then-plans §2.2) — peer of the peek
            link, shown ONLY when the child has ≥1 active plan; a calm read-only door. */}
        {activePlanCount > 0 ? (
          <Pressable
            onPress={() => router.push("/(kid)/plans")}
            accessibilityRole="button"
            accessibilityLabel={resolveContent("plans.entry", { ageMode })}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 999,
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.border,
            }}
          >
            <Text style={{ fontSize: 15 }}>🗒️</Text>
            <Text
              style={{
                color: c.textDim,
                fontFamily: t.type.label.family,
                fontSize: t.type.label.size,
                fontWeight: "700",
              }}
            >
              {resolveContent("plans.entry", { ageMode })}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* optional, low-emphasis mood check-in chip (mood-checkin §2.1) — a peer of
          the peek link, only when the parent has opted in (caps.moodCheckin). */}
      {caps.moodCheckin ? (
        <Pressable
          onPress={() => router.push("/(kid)/mood")}
          accessibilityRole="button"
          accessibilityLabel={resolveContent("mood.prompt", { ageMode })}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 999,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <Text style={{ fontSize: 15 }}>💛</Text>
          <Text style={{ color: c.textDim, fontFamily: t.type.label.family, fontSize: t.type.label.size }}>
            {resolveContent("mood.prompt", { ageMode })}
          </Text>
        </Pressable>
      ) : null}

      {/* opt-in kid hand-off (multi-child §2.1) — only when the parent enabled the
          ungated quick-switch AND there are ≥2 children. Shows names + colors only. */}
      {quickChildSwitch && childCount >= 2 ? <ChildHandoffButton childId={childId} /> : null}

      {/* explicit, secondary opt-in only — never the primary focus (doc 70 §B2) */}
      {onRestart ? (
        <Pressable
          onPress={onRestart}
          accessibilityRole="button"
          style={{ paddingVertical: 6, paddingHorizontal: 16 }}
        >
          <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>↻ Do it again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
