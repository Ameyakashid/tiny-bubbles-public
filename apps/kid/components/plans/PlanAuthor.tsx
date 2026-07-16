/**
 * components/plans/PlanAuthor.tsx — the parent authoring form (if-then-plans §2.1).
 *
 * Template-first, ≤4 taps: pick a cue TYPE (Segmented) → a curated cue → an action
 * (a curated template OR a linked existing task) → preview the spoken sentence →
 * save. ZERO AI: every piece is PICKED from curated content or the child's own
 * routines/steps — there is no free-text kid input and no suggestion engine. The
 * assembled preview flows from `assemblePlanPhrase` (the child's ageMode only
 * feeds the resolver, never a branch). The Save affordance is provided by the
 * host via `renderSave` so the parent screen can wrap it in `<PremiumGate>`.
 *
 * Situational cues carry a plain Note: the app CANNOT sense them (anti-overclaim).
 */
import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";

import {
  PLAN_ACTION_TEMPLATES,
  SITUATION_TEMPLATES,
  actionFromTask,
  actionFromTemplate,
  routineCue,
  situationCue,
  stepCue,
  timeCue,
} from "../../src/data/planTemplates";
import { assemblePlanPhrase } from "../../src/domain/plans";
import { daypartFromSchedule, selectionDaypart } from "../../src/domain/dates";
import { planFromTemplates } from "../../src/data/planTemplates";
import type {
  Plan,
  PlanAction,
  PlanCue,
  PlanCueType,
  Routine,
  Task,
} from "../../src/domain/types";
import { newId, now } from "../../src/state/ids";
import { speak } from "../../src/services/tts";
import { useThemeInputs } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

import { DayPicker, TimeField } from "../parent/pickers";
import { Card, Chip, Note, PrimaryButton, SectionTitle, Segmented, TextButton } from "../parent/ui";

const CUE_TYPES: { value: PlanCueType; label: string }[] = [
  { value: "time", label: "A time" },
  { value: "afterStep", label: "After a step" },
  { value: "afterRoutine", label: "After a routine" },
  { value: "situational", label: "A situation" },
];

export interface PlanAuthorProps {
  childId: string;
  /** the child's tasks (for afterStep cues + linking an action) */
  tasks: Task[];
  /** the child's routines (for afterRoutine cues) */
  routines: Routine[];
  /** persist the assembled plan */
  onSave: (plan: Plan) => void;
  /** the save affordance — the host wraps it in <PremiumGate>; defaults to a plain button */
  renderSave?: (onPress: () => void, disabled: boolean) => React.ReactNode;
}

export default function PlanAuthor({
  childId,
  tasks,
  routines,
  onSave,
  renderSave,
}: PlanAuthorProps) {
  const t = useThemeTokens();
  const c = t.colors;
  // Sanctioned resolver pattern (never a raw branch): ageMode only feeds the pure
  // `assemblePlanPhrase` preview. The parent area is themed by the active (selected)
  // child, so this reflects the child being authored.
  const { ageMode } = useThemeInputs();

  const liveTasks = tasks.filter((tk) => !tk.archived && !tk.proposed);
  const liveRoutines = routines.filter((r) => r.active);

  const [cueType, setCueType] = useState<PlanCueType>("time");
  const [time, setTime] = useState<string | undefined>("16:00");
  const [days, setDays] = useState<number[]>([]);
  const [stepTaskId, setStepTaskId] = useState<string | undefined>(liveTasks[0]?.id);
  const [routineId, setRoutineId] = useState<string | undefined>(liveRoutines[0]?.id);
  const [situationId, setSituationId] = useState<string>(SITUATION_TEMPLATES[0].id);

  // Action: a curated template OR a linked existing task.
  const [actionMode, setActionMode] = useState<"curated" | "task">("curated");
  const [actionTemplateId, setActionTemplateId] = useState<string>(PLAN_ACTION_TEMPLATES[0].id);
  const [linkedTaskId, setLinkedTaskId] = useState<string | undefined>(liveTasks[0]?.id);

  // --- build the cue from the current selection -----------------------------
  const cue: PlanCue | null = useMemo(() => {
    switch (cueType) {
      case "time":
        return time ? timeCue(time, days) : null;
      case "afterStep": {
        const step = liveTasks.find((tk) => tk.id === stepTaskId);
        return step ? stepCue(step.id, step.label) : null;
      }
      case "afterRoutine": {
        const routine = liveRoutines.find((r) => r.id === routineId);
        if (!routine) return null;
        const dp = selectionDaypart(routine.daypart ?? daypartFromSchedule(routine.schedule.timeOfDay));
        return routineCue(routine.id, dp, routine.label);
      }
      case "situational": {
        const tpl = SITUATION_TEMPLATES.find((s) => s.id === situationId);
        return tpl ? situationCue(tpl) : null;
      }
    }
  }, [cueType, time, days, stepTaskId, routineId, situationId, liveTasks, liveRoutines]);

  // --- build the action -----------------------------------------------------
  const action: PlanAction | null = useMemo(() => {
    if (actionMode === "task") {
      const task = liveTasks.find((tk) => tk.id === linkedTaskId);
      return task ? actionFromTask(task.id, task.label) : null;
    }
    const tpl = PLAN_ACTION_TEMPLATES.find((a) => a.id === actionTemplateId);
    return tpl ? actionFromTemplate(tpl) : null;
  }, [actionMode, actionTemplateId, linkedTaskId, liveTasks]);

  const preview = useMemo(() => {
    if (!cue || !action) return null;
    const draft = planFromTemplates({ id: "preview", childId, now: 0, cue, action });
    return assemblePlanPhrase(draft, ageMode);
  }, [cue, action, ageMode, childId]);

  const canSave = !!cue && !!action;

  const doSave = () => {
    if (!cue || !action) return;
    onSave(planFromTemplates({ id: newId(), childId, now: now(), cue, action }));
    // reset the volatile per-plan fields (keep the cue type for a quick second add)
    if (cueType === "time") setTime("16:00");
  };

  return (
    <Card>
      <SectionTitle>New plan — when this, I will that</SectionTitle>

      {/* 1. cue TYPE */}
      <Segmented<PlanCueType> value={cueType} onChange={setCueType} options={CUE_TYPES} />

      {/* 1b. per-type cue picker */}
      {cueType === "time" ? (
        <View style={{ gap: t.spacing(3) }}>
          <TimeField value={time} onChange={setTime} label="When it's" />
          <DayPicker value={days} onChange={setDays} label="On" />
        </View>
      ) : null}

      {cueType === "afterStep" ? (
        <View style={{ gap: t.spacing(2) }}>
          <Text style={cueLabelStyle(t, c)}>After I finish…</Text>
          {liveTasks.length === 0 ? (
            <Note>Add a task for this child first.</Note>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
              {liveTasks.map((tk) => (
                <Chip
                  key={tk.id}
                  label={tk.label.text ?? tk.label.spokenLabel}
                  emoji={tk.label.emoji}
                  selected={tk.id === stepTaskId}
                  onPress={() => setStepTaskId(tk.id)}
                />
              ))}
            </View>
          )}
        </View>
      ) : null}

      {cueType === "afterRoutine" ? (
        <View style={{ gap: t.spacing(2) }}>
          <Text style={cueLabelStyle(t, c)}>When this routine is done…</Text>
          {liveRoutines.length === 0 ? (
            <Note>Add a routine for this child first.</Note>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
              {liveRoutines.map((r) => (
                <Chip
                  key={r.id}
                  label={r.label.text ?? r.label.spokenLabel}
                  emoji={r.label.emoji}
                  selected={r.id === routineId}
                  onPress={() => setRoutineId(r.id)}
                />
              ))}
            </View>
          )}
        </View>
      ) : null}

      {cueType === "situational" ? (
        <View style={{ gap: t.spacing(2) }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
            {SITUATION_TEMPLATES.map((s) => (
              <Chip
                key={s.id}
                label={s.label.text ?? s.label.spokenLabel}
                emoji={s.label.emoji}
                selected={s.id === situationId}
                onPress={() => setSituationId(s.id)}
              />
            ))}
          </View>
          <Note>The app can&apos;t sense this one — it&apos;s a plan you&apos;ll remember together.</Note>
        </View>
      ) : null}

      {/* 2. action */}
      <SectionTitle>I will…</SectionTitle>
      <Segmented<"curated" | "task">
        value={actionMode}
        onChange={setActionMode}
        options={[
          { value: "curated", label: "Pick an action" },
          { value: "task", label: "Link a task" },
        ]}
      />
      {actionMode === "curated" ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
          {PLAN_ACTION_TEMPLATES.map((a) => (
            <Chip
              key={a.id}
              label={a.label.text ?? a.label.spokenLabel}
              emoji={a.label.emoji}
              selected={a.id === actionTemplateId}
              onPress={() => setActionTemplateId(a.id)}
            />
          ))}
        </View>
      ) : liveTasks.length === 0 ? (
        <Note>Add a task for this child first.</Note>
      ) : (
        <View style={{ gap: t.spacing(1) }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
            {liveTasks.map((tk) => (
              <Chip
                key={tk.id}
                label={tk.label.text ?? tk.label.spokenLabel}
                emoji={tk.label.emoji}
                selected={tk.id === linkedTaskId}
                onPress={() => setLinkedTaskId(tk.id)}
              />
            ))}
          </View>
          <Note>Completing this task pays bubbles as usual — the plan itself never pays.</Note>
        </View>
      )}

      {/* 3. preview + hear it + save */}
      {preview ? (
        <View
          style={{
            backgroundColor: c.surfaceAlt,
            borderRadius: t.radius,
            borderWidth: 1,
            borderColor: c.border,
            padding: t.spacing(3),
            gap: t.spacing(2),
          }}
        >
          <Text style={{ color: c.text, fontFamily: t.type.bodyLg.family, fontSize: t.type.bodyLg.size }}>
            {preview.cue}, <Text style={{ fontWeight: "700" }}>{preview.action}</Text>
          </Text>
          <TextButton
            label="🔊 Hear it"
            onPress={() => speak(preview.spoken, { ageMode, enabled: true })}
          />
        </View>
      ) : null}

      {renderSave ? (
        renderSave(doSave, !canSave)
      ) : (
        <PrimaryButton label="Save plan" onPress={doSave} disabled={!canSave} />
      )}
    </Card>
  );
}

type Tokens = ReturnType<typeof useThemeTokens>;
function cueLabelStyle(t: Tokens, c: Tokens["colors"]) {
  return {
    color: c.textDim,
    fontFamily: t.type.label.family,
    fontSize: t.type.caption.size,
    fontWeight: "700" as const,
  };
}
