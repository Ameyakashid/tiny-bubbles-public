/**
 * app/(kid)/index.tsx — the kid home / one-step routine runner (doc 66 M7, doc 70 §B1).
 *
 * Thin screen: it resolves the active child, reads the CLOCK, and hands the
 * routine for the CURRENT daypart to <TaskRunner>. This is the time-driven,
 * FORWARD-ONLY selection (doc 70 §B1): the routine follows the child's real
 * local time and never falls back to morning. When nothing is scheduled for the
 * current daypart, the calm anti-shame "all done for now" panel renders instead
 * (a finished daypart's done panel is owned by <TaskRunner> so it can't re-arm).
 *
 * Resume-after-kill works because the run pointer + the per-day completion marker
 * are persisted (runProgressStore), so reopening a finished daypart stays calm.
 */
import React, { useEffect, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { getDaypart, selectionDaypart } from "../../src/domain/dates";
import { selectDaypartRoutine } from "../../src/domain/tasks";
import type { Task } from "../../src/domain/types";
import { useChildStore } from "../../src/state/childStore";
import { reconcileChild } from "../../src/state/gameplay";
import { useSettingsStore } from "../../src/state/settingsStore";
import { useTaskStore } from "../../src/state/taskStore";
import { useThemeTokens } from "../../src/theme/useThemeTokens";
import DaypartDonePanel from "../../components/kid/DaypartDonePanel";
import TaskRunner from "../../components/task/TaskRunner";

export default function KidHome() {
  const t = useThemeTokens();
  const activeChildId = useSettingsStore((s) => s.meta.activeChildId);

  // Forgiving rollover reconciler on app-open (doc 66 §M8): rolls incomplete
  // `today` tasks to `someday`, surfaces a multi-day gap as a RESTING (never
  // broken) streak. Idempotent + day-gated, so re-running on every open is safe.
  useEffect(() => {
    if (activeChildId) reconcileChild(activeChildId);
  }, [activeChildId]);

  const timeZone = useChildStore((s) =>
    activeChildId ? s.profiles[activeChildId]?.timeZone : undefined,
  );
  const routines = useTaskStore((s) => (activeChildId ? s.routines[activeChildId] : undefined));
  const tasks = useTaskStore((s) => (activeChildId ? s.tasks[activeChildId] : undefined));

  // --- time-driven, forward-only selection (doc 70 §B1) ----------------------
  // Follow the child's real local clock; `night` shares the evening list. There
  // is deliberately NO morning fallback — an unmatched daypart shows the calm
  // "all done for now" panel, never `routines[0]` (the shipped morning-loop bug).
  const tz = timeZone ?? "UTC";
  const daypart = selectionDaypart(getDaypart(Date.now(), tz));

  const routine = useMemo(
    () => selectDaypartRoutine(routines ?? [], daypart, Date.now(), tz),
    [routines, daypart, tz],
  );

  const steps = useMemo(() => {
    if (!routine || !tasks) return [] as Task[];
    const byId = new Map(tasks.map((task) => [task.id, task]));
    return routine.stepIds
      .map((id) => byId.get(id))
      .filter((task): task is Task => Boolean(task));
  }, [routine, tasks]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.canvas }} edges={["top"]}>
      {activeChildId && routine && steps.length > 0 ? (
        <TaskRunner childId={activeChildId} routine={routine} steps={steps} daypart={daypart} />
      ) : activeChildId ? (
        // Nothing scheduled for this daypart right now — calm, forward-only, no guilt.
        <DaypartDonePanel childId={activeChildId} daypart={daypart} mode="empty" />
      ) : null}
    </SafeAreaView>
  );
}
