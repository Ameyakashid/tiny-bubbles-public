/**
 * app/(kid)/peek.tsx — a gentle, READ-ONLY peek at later dayparts (doc 70 §B5).
 *
 * Pushed from the calm done/empty panel. It lists the other dayparts' routines +
 * steps as STATIC chips so a curious kid can see what's coming — but it NEVER
 * starts a run, activates a routine, or changes the active run (forward-only is
 * preserved). The daypart names auto-speak for non-readers via the shared TTS
 * seam. Copy/voice come from resolvers only; no raw `ageMode` branching (doc 66 §2).
 */
import React, { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { getDaypart, selectionDaypart } from "../../src/domain/dates";
import { selectDaypartRoutine } from "../../src/domain/tasks";
import type { Daypart, Task } from "../../src/domain/types";
import { speak } from "../../src/services/tts";
import { useChildStore } from "../../src/state/childStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { useTaskStore } from "../../src/state/taskStore";
import { resolveContent } from "../../src/theme/resolveContent";
import { useThemeInputs } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

/** The three real routine dayparts (night shares evening) + neutral fallbacks. */
const PEEK_DAYPARTS: Array<Exclude<Daypart, "night">> = ["morning", "afternoon", "evening"];
const DAYPART_META: Record<Exclude<Daypart, "night">, { emoji: string; title: string }> = {
  morning: { emoji: "🌅", title: "Morning" },
  afternoon: { emoji: "🏠", title: "Afternoon" },
  evening: { emoji: "🌙", title: "Evening" },
};

export default function Peek() {
  const t = useThemeTokens();
  const c = t.colors;
  const { ageMode } = useThemeInputs();
  const router = useRouter();

  const activeChildId = useSettingsStore((s) => s.meta.activeChildId);
  const timeZone = useChildStore((s) =>
    activeChildId ? s.profiles[activeChildId]?.timeZone : undefined,
  );
  const spokenEnabled = useChildStore((s) =>
    activeChildId ? s.profiles[activeChildId]?.settings.spokenLabelsEnabled ?? true : true,
  );
  const routines = useTaskStore((s) => (activeChildId ? s.routines[activeChildId] : undefined));
  const tasks = useTaskStore((s) => (activeChildId ? s.tasks[activeChildId] : undefined));

  const tz = timeZone ?? "UTC";
  const now = Date.now();
  const currentDaypart = selectionDaypart(getDaypart(now, tz));

  const taskById = new Map((tasks ?? []).map((task) => [task.id, task]));
  const sections = PEEK_DAYPARTS.map((dp) => {
    const routine = selectDaypartRoutine(routines ?? [], dp, now, tz);
    const steps: Task[] = routine
      ? routine.stepIds
          .map((id) => taskById.get(id))
          .filter((task): task is Task => Boolean(task))
      : [];
    return {
      dp,
      isNow: dp === currentDaypart,
      emoji: routine?.label.emoji ?? DAYPART_META[dp].emoji,
      title: routine?.label.text ?? routine?.label.spokenLabel ?? DAYPART_META[dp].title,
      steps,
    };
  });

  // Auto-speak the daypart names for non-readers (young pervasive-TTS default).
  useEffect(() => {
    if (!t.spokenLabelDefault || !spokenEnabled) return;
    const spoken = sections.map((s) => s.title).join(", ");
    speak(spoken, { ageMode, enabled: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
      {/* header + close (read-only surface) */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: t.spacing(4),
          paddingTop: t.spacing(3),
          paddingBottom: t.spacing(2),
        }}
      >
        <Text
          style={{
            color: c.text,
            fontFamily: t.type.h2.family,
            fontSize: t.type.h2.size,
            fontWeight: "700",
          }}
        >
          {resolveContent("daypart.peek", { ageMode })}
        </Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <Text style={{ fontSize: 18, color: c.text }}>✕</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: t.spacing(4),
          gap: t.spacing(4),
          maxWidth: t.contentMaxWidth,
          alignSelf: "center",
          width: "100%",
        }}
      >
        {sections.map((section) => (
          <View
            key={section.dp}
            style={{
              backgroundColor: c.surface,
              borderRadius: t.radius * 1.5,
              borderWidth: 1,
              borderColor: section.isNow ? c.primary : c.border,
              padding: t.spacing(4),
              gap: t.spacing(3),
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2) }}>
              <Text style={{ fontSize: 26 }}>{section.emoji}</Text>
              <Text
                style={{
                  color: c.text,
                  fontFamily: t.type.h2.family,
                  fontSize: t.type.bodyLg.size,
                  fontWeight: "700",
                  flex: 1,
                }}
              >
                {section.title}
              </Text>
              {section.isNow ? (
                <View
                  style={{
                    backgroundColor: c.primary,
                    borderRadius: 999,
                    paddingVertical: 3,
                    paddingHorizontal: 10,
                  }}
                >
                  <Text style={{ color: c.canvas, fontSize: t.type.caption.size, fontWeight: "700" }}>
                    now
                  </Text>
                </View>
              ) : null}
            </View>

            {section.steps.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
                {section.steps.map((step) => (
                  <View
                    key={step.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: c.canvas,
                      borderRadius: 999,
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderWidth: 1,
                      borderColor: c.border,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{step.label.emoji ?? "🫧"}</Text>
                    <Text style={{ color: c.text, fontSize: t.type.label.size }}>
                      {step.label.text ?? step.label.spokenLabel}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ color: c.textDim, fontSize: t.type.body.size }}>Nothing planned</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
