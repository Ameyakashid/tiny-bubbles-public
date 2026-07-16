/**
 * app/(parent)/tasks.tsx — templated task library + 2–3-tap assignment (doc 63
 * Feature 5, doc 66 §M9).
 *
 * Tap a template → an Assign sheet (@gorhom/bottom-sheet, re-authored against
 * v5) with emoji/color/time/day pickers (re-authored against the installed
 * rn-emoji-keyboard / reanimated-color-picker / datetimepicker) → Assign. Default
 * destination is a routine, so the task is instantly runnable in the kid loop.
 * "Add a step" appends a templated step to a routine (momentum add-a-step). When
 * `autonomy.canAddTasks`, a gated child-proposal/approval queue is surfaced.
 */
import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { TASK_TEMPLATES } from "../../src/data/taskTemplates";
import { getMessage } from "../../src/i18n/messages";
import { PARENT_DAYPARTS, routineDaypartOf } from "../../src/domain/tasks";
import type { TaskTemplate, VerificationMode } from "../../src/domain/types";
import { useChildStore } from "../../src/state/childStore";
import {
  addStepToRoutine,
  approveProposal,
  assignTaskFromTemplate,
  dismissProposal,
  proposeTaskFromTemplate,
} from "../../src/state/gameplay";
import { useSettingsStore } from "../../src/state/settingsStore";
import { useTaskStore } from "../../src/state/taskStore";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

import {
  ColorField,
  DayPicker,
  EmojiField,
  TimeField,
  TimerField,
  formatTimeLabel,
} from "../../components/parent/pickers";
import {
  Card,
  Chip,
  Note,
  ParentScreen,
  PrimaryButton,
  SectionTitle,
  Segmented,
  Stepper,
  TextButton,
  Toggle,
} from "../../components/parent/ui";

interface AssignDraft {
  templateId: string;
  emoji?: string;
  color: string;
  label: string;
  timeOfDay?: string;
  daysOfWeek: number[];
  tokenValue: number;
  /** curated visual-transition-timer budget in seconds; undefined => Off/no timer */
  timerSeconds?: number;
  /** optional light-verify style (verify-undo §2.4); default 'none' — never a gate */
  verificationMode: VerificationMode;
  routineId: string | null;
}

/** "Ask to verify?" options (verify-undo §2.4). `required` is NEVER surfaced. */
const VERIFY_OPTIONS: { value: VerificationMode; label: string }[] = [
  { value: "none", label: "Off" },
  { value: "self", label: "Self" },
  { value: "photo", label: "Photo" },
  { value: "parent", label: "Parent" },
];

type PickContext = { kind: "step"; routineId: string } | { kind: "propose" };

/** The three real routine dayparts a parent organizes chores under (doc 70 §C2). */
type ParentDaypart = (typeof PARENT_DAYPARTS)[number];
const DAYPART_META: Record<ParentDaypart, { title: string; emoji: string }> = {
  morning: { title: "Morning", emoji: "🌅" },
  afternoon: { title: "Afternoon", emoji: "🏠" },
  evening: { title: "Evening", emoji: "🌙" },
};

export default function TasksScreen() {
  const t = useThemeTokens();
  const c = t.colors;

  const params = useLocalSearchParams<{ daypart?: string }>();
  // Optional deep-link target from the dashboard's "+ add to <daypart>" (doc 70 §C2).
  const targetDaypart = PARENT_DAYPARTS.find((d) => d === params.daypart);

  const index = useChildStore((s) => s.index);
  const activeChildId = useSettingsStore((s) => s.meta.activeChildId);
  const setActiveChild = useSettingsStore((s) => s.setActiveChild);

  const list = index.filter((e) => !e.archived);
  const cid = activeChildId && list.some((e) => e.id === activeChildId) ? activeChildId : list[0]?.id ?? null;

  // Gate the proposal queue on the child's ACTUAL autonomy setting (the source
  // of truth toggled on the Children screen), not the age-default capability flag
  // (the root provider doesn't thread canAddTasks — that's an M14 concern).
  const canAddTasks = useChildStore((s) =>
    cid ? Boolean(s.profiles[cid]?.settings.autonomy.canAddTasks) : false,
  );

  const routines = useTaskStore((s) => (cid ? s.routines[cid] : undefined)) ?? [];
  const tasks = useTaskStore((s) => (cid ? s.tasks[cid] : undefined)) ?? [];
  const setRoutineActive = useTaskStore((s) => s.setRoutineActive);

  const proposals = useMemo(() => tasks.filter((t2) => t2.proposed && !t2.archived), [tasks]);

  // Group routines by daypart so chores are organized Morning / Afternoon /
  // Evening (doc 70 §C2). Derive the bucket from the routine's own daypart, else
  // its schedule anchor — the same source of truth the kid selection uses.
  const routinesByDaypart = useMemo(() => {
    const groups: Record<ParentDaypart, typeof routines> = { morning: [], afternoon: [], evening: [] };
    for (const r of routines) groups[routineDaypartOf(r) as ParentDaypart]?.push(r);
    return groups;
  }, [routines]);

  // Default the assign sheet's target to the deep-linked daypart's routine (else
  // the first routine) so "+ add to Evening" lands in the evening routine.
  const preferredRoutineId = useMemo(
    () =>
      (targetDaypart ? routines.find((r) => routineDaypartOf(r) === targetDaypart)?.id : undefined) ??
      routines[0]?.id ??
      null,
    [routines, targetDaypart],
  );

  const assignRef = useRef<BottomSheetModal>(null);
  const pickRef = useRef<BottomSheetModal>(null);
  const [draft, setDraft] = useState<AssignDraft | null>(null);
  const [pickContext, setPickContext] = useState<PickContext | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const flash = useCallback((msg: string) => {
    setBanner(msg);
    setTimeout(() => setBanner(null), 2200);
  }, []);

  const openAssign = (tpl: TaskTemplate) => {
    setDraft({
      templateId: tpl.id,
      emoji: tpl.label.emoji,
      color: tpl.label.color,
      label: tpl.label.text ?? tpl.label.spokenLabel,
      timeOfDay: tpl.schedule.timeOfDay,
      daysOfWeek: [...tpl.schedule.daysOfWeek],
      tokenValue: tpl.suggestedTokenValue,
      timerSeconds: tpl.timerSeconds,
      verificationMode: tpl.verification.mode,
      routineId: preferredRoutineId,
    });
    assignRef.current?.present();
  };

  const commitAssign = () => {
    if (!cid || !draft) return;
    assignTaskFromTemplate(cid, {
      templateId: draft.templateId,
      label: {
        emoji: draft.emoji,
        color: draft.color,
        text: draft.label,
        spokenLabel: draft.label,
      },
      schedule: { timeOfDay: draft.timeOfDay, daysOfWeek: draft.daysOfWeek },
      tokenValue: draft.tokenValue,
      timerSeconds: draft.timerSeconds,
      verificationMode: draft.verificationMode,
      routineId: draft.routineId,
    });
    assignRef.current?.dismiss();
    const where = draft.routineId
      ? routines.find((r) => r.id === draft.routineId)?.label.text ?? "routine"
      : "today";
    flash(`Added “${draft.label}” to ${where}`);
  };

  const openPicker = (ctx: PickContext) => {
    setPickContext(ctx);
    pickRef.current?.present();
  };

  const onPickTemplate = (templateId: string) => {
    if (!cid || !pickContext) return;
    if (pickContext.kind === "step") {
      addStepToRoutine(cid, pickContext.routineId, templateId);
      flash("Step added");
    } else {
      proposeTaskFromTemplate(cid, templateId);
      flash("Suggestion sent to the queue");
    }
    pickRef.current?.dismiss();
  };

  return (
    <BottomSheetModalProvider>
      <ParentScreen title="Tasks">
        {/* child selector */}
        {list.length > 1 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
            {list.map((e) => (
              <Chip key={e.id} label={e.displayName} selected={e.id === cid} onPress={() => setActiveChild(e.id)} />
            ))}
          </View>
        ) : null}

        {!cid ? (
          <Note>Add a child in “Children” first.</Note>
        ) : (
          <>
            {banner ? (
              <View style={{ backgroundColor: c.successSurface, borderRadius: t.radius, padding: t.spacing(3) }}>
                <Text style={{ color: c.success, fontWeight: "700" }}>{banner}</Text>
              </View>
            ) : null}

            {/* proposal/approval queue (gated by the child's autonomy setting) */}
            {canAddTasks ? (
              <Card>
                <SectionTitle>Suggestions from your child</SectionTitle>
                {proposals.length === 0 ? (
                  <Note>No suggestions waiting. They appear here for you to approve.</Note>
                ) : (
                  proposals.map((p) => (
                    <View
                      key={p.id}
                      style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(3), paddingVertical: t.spacing(1) }}
                    >
                      <Text style={{ fontSize: 24 }}>{p.label.emoji ?? "✅"}</Text>
                      <Text style={{ flex: 1, color: c.text, fontSize: t.type.body.size }}>
                        {p.label.text ?? p.label.spokenLabel}
                      </Text>
                      <TextButton label="Approve" onPress={() => approveProposal(cid, p.id)} />
                      <TextButton label="Dismiss" tone="dim" onPress={() => dismissProposal(cid, p.id)} />
                    </View>
                  ))
                )}
                <TextButton label="+ Suggest a task (preview as child)" onPress={() => openPicker({ kind: "propose" })} />
              </Card>
            ) : null}

            {/* routines, organized by daypart (doc 70 §C2) */}
            <Card>
              <SectionTitle>Routines by daypart</SectionTitle>
              {targetDaypart ? (
                <Note>Adding to {DAYPART_META[targetDaypart].title} — pick a task below.</Note>
              ) : null}
              {routines.length === 0 ? (
                <Note>No routines yet.</Note>
              ) : (
                PARENT_DAYPARTS.map((dp) => {
                  const inDp = routinesByDaypart[dp];
                  const meta = DAYPART_META[dp];
                  const highlight = dp === targetDaypart;
                  return (
                    <View
                      key={dp}
                      style={{
                        gap: t.spacing(1),
                        paddingVertical: t.spacing(1),
                        borderRadius: t.radius,
                        borderWidth: highlight ? 1 : 0,
                        borderColor: highlight ? c.primary : "transparent",
                        backgroundColor: highlight ? c.surfaceAlt : "transparent",
                        paddingHorizontal: highlight ? t.spacing(2) : 0,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2) }}>
                        <Text style={{ fontSize: 16 }}>{meta.emoji}</Text>
                        <Text
                          style={{
                            color: highlight ? c.primary : c.textDim,
                            fontFamily: t.type.label.family,
                            fontSize: t.type.caption.size,
                            fontWeight: "700",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          {meta.title}
                        </Text>
                      </View>
                      {inDp.length === 0 ? (
                        <Note>{getMessage("empty.tasks", { ageMode: "older" })}</Note>
                      ) : (
                        inDp.map((r) => (
                          <View key={r.id} style={{ gap: t.spacing(1), paddingVertical: t.spacing(1) }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2) }}>
                              <Text style={{ fontSize: 22 }}>{r.label.emoji ?? "🗓️"}</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: c.text, fontFamily: t.type.bodyLg.family, fontSize: t.type.bodyLg.size, fontWeight: "600" }}>
                                  {r.label.text ?? r.label.spokenLabel}
                                </Text>
                                <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>
                                  {r.stepIds.length} steps
                                  {r.schedule.timeOfDay ? ` · ${formatTimeLabel(r.schedule.timeOfDay)}` : ""}
                                  {r.active ? "" : " · off"}
                                </Text>
                              </View>
                              <Toggle value={r.active} onValueChange={(v) => setRoutineActive(cid, r.id, v)} label="Routine on" />
                            </View>
                            <TextButton label="+ Add a step" onPress={() => openPicker({ kind: "step", routineId: r.id })} />
                          </View>
                        ))
                      )}
                    </View>
                  );
                })
              )}
            </Card>

            {/* templated library */}
            <Card>
              <SectionTitle>Add a task</SectionTitle>
              <Note>Pick a template, then Assign — two taps. Customize if you like.</Note>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
                {TASK_TEMPLATES.map((tpl) => (
                  <Pressable
                    key={tpl.id}
                    onPress={() => openAssign(tpl)}
                    accessibilityRole="button"
                    accessibilityLabel={`Assign ${tpl.label.spokenLabel}`}
                    style={{
                      width: "31%",
                      minWidth: 96,
                      aspectRatio: 1,
                      borderRadius: t.radius,
                      backgroundColor: c.surfaceAlt,
                      borderWidth: 1,
                      borderColor: c.border,
                      alignItems: "center",
                      justifyContent: "center",
                      padding: t.spacing(2),
                      gap: 4,
                    }}
                  >
                    <Text style={{ fontSize: 30 }}>{tpl.label.emoji ?? "✅"}</Text>
                    <Text style={{ color: c.text, fontSize: t.type.caption.size, textAlign: "center" }} numberOfLines={2}>
                      {tpl.label.text ?? tpl.label.spokenLabel}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          </>
        )}
      </ParentScreen>

      {/* Assign sheet */}
      <BottomSheetModal
        ref={assignRef}
        snapPoints={["90%"]}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: c.surface }}
        handleIndicatorStyle={{ backgroundColor: c.border }}
        onDismiss={() => setDraft(null)}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: t.spacing(4), gap: t.spacing(4), paddingBottom: t.spacing(10) }}>
          {draft ? (
            <>
              <Text style={{ color: c.text, fontFamily: t.type.h2.family, fontSize: t.type.h2.size, fontWeight: "700" }}>
                Assign a task
              </Text>

              <View style={{ gap: t.spacing(2) }}>
                <Text style={{ color: c.textDim, fontFamily: t.type.label.family, fontSize: t.type.caption.size, fontWeight: "700" }}>
                  Label
                </Text>
                <BottomSheetTextInput
                  defaultValue={draft.label}
                  onChangeText={(v) => setDraft((d) => (d ? { ...d, label: v } : d))}
                  placeholder="Task name"
                  placeholderTextColor={c.textDim}
                  style={{
                    color: c.text,
                    fontSize: t.type.bodyLg.size,
                    backgroundColor: c.surfaceAlt,
                    borderRadius: t.radius,
                    borderWidth: 1,
                    borderColor: c.border,
                    paddingVertical: t.spacing(2),
                    paddingHorizontal: t.spacing(3),
                  }}
                />
              </View>

              <View style={{ flexDirection: "row", gap: t.spacing(4) }}>
                <EmojiField value={draft.emoji} onChange={(emoji) => setDraft((d) => (d ? { ...d, emoji } : d))} />
                <View style={{ flex: 1 }}>
                  <ColorField value={draft.color} onChange={(color) => setDraft((d) => (d ? { ...d, color } : d))} />
                </View>
              </View>

              <TimeField value={draft.timeOfDay} onChange={(timeOfDay) => setDraft((d) => (d ? { ...d, timeOfDay } : d))} />
              <DayPicker value={draft.daysOfWeek} onChange={(daysOfWeek) => setDraft((d) => (d ? { ...d, daysOfWeek } : d))} />

              {/* Curated visual-transition timer (visual-timers §4 #8). Calm pacing
                  aid on the active step — never coercive, never a deadline. */}
              <TimerField
                value={draft.timerSeconds}
                onChange={(timerSeconds) => setDraft((d) => (d ? { ...d, timerSeconds } : d))}
              />

              {/* "Ask to verify?" — an OPTIONAL bonus confirmation, NEVER a gate
                  (verify-undo §2.4). Default Off keeps verification light. */}
              <View style={{ gap: t.spacing(2) }}>
                <Text style={{ color: c.textDim, fontFamily: t.type.label.family, fontSize: t.type.caption.size, fontWeight: "700" }}>
                  Ask to verify?
                </Text>
                <Segmented
                  options={VERIFY_OPTIONS}
                  value={draft.verificationMode}
                  onChange={(verificationMode) => setDraft((d) => (d ? { ...d, verificationMode } : d))}
                />
                <Note>
                  A gentle, optional confirmation after Done — the token is always paid the moment your
                  child taps Done. Photos stay on this device.
                </Note>
              </View>

              <View style={{ gap: t.spacing(2) }}>
                <Text style={{ color: c.textDim, fontFamily: t.type.label.family, fontSize: t.type.caption.size, fontWeight: "700" }}>
                  Where
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
                  {routines.map((r) => (
                    <Chip
                      key={r.id}
                      label={r.label.text ?? r.label.spokenLabel}
                      selected={draft.routineId === r.id}
                      onPress={() => setDraft((d) => (d ? { ...d, routineId: r.id } : d))}
                    />
                  ))}
                  <Chip
                    label="Just a task"
                    selected={draft.routineId === null}
                    onPress={() => setDraft((d) => (d ? { ...d, routineId: null } : d))}
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ color: c.text, fontFamily: t.type.label.family, fontSize: t.type.label.size }}>Bubbles earned</Text>
                <Stepper value={draft.tokenValue} min={1} max={5} onChange={(tokenValue) => setDraft((d) => (d ? { ...d, tokenValue } : d))} />
              </View>

              <PrimaryButton label="Assign" onPress={commitAssign} />
            </>
          ) : null}
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* Template picker sheet (add-a-step / suggest) */}
      <BottomSheetModal
        ref={pickRef}
        snapPoints={["70%"]}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: c.surface }}
        handleIndicatorStyle={{ backgroundColor: c.border }}
        onDismiss={() => setPickContext(null)}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: t.spacing(4), gap: t.spacing(3), paddingBottom: t.spacing(10) }}>
          <Text style={{ color: c.text, fontFamily: t.type.h2.family, fontSize: t.type.h2.size, fontWeight: "700" }}>
            {pickContext?.kind === "step" ? "Add a step" : "Suggest a task"}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
            {TASK_TEMPLATES.map((tpl) => (
              <Pressable
                key={tpl.id}
                onPress={() => onPickTemplate(tpl.id)}
                accessibilityRole="button"
                accessibilityLabel={tpl.label.spokenLabel}
                style={{
                  width: "31%",
                  minWidth: 96,
                  aspectRatio: 1,
                  borderRadius: t.radius,
                  backgroundColor: c.surfaceAlt,
                  borderWidth: 1,
                  borderColor: c.border,
                  alignItems: "center",
                  justifyContent: "center",
                  padding: t.spacing(2),
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 30 }}>{tpl.label.emoji ?? "✅"}</Text>
                <Text style={{ color: c.text, fontSize: t.type.caption.size, textAlign: "center" }} numberOfLines={2}>
                  {tpl.label.text ?? tpl.label.spokenLabel}
                </Text>
              </Pressable>
            ))}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </BottomSheetModalProvider>
  );
}
