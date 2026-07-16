/**
 * components/task/TaskRunner.tsx — the core loop (doc 66 M7, CP E).
 *
 * One routine, run one step at a time. Layout is chosen from a RESOLVED
 * capability flag, NEVER raw ageMode (doc 66 §2):
 *   - young (multiStepVisible=false): ONE focal step + a giant Done button.
 *   - older (multiStepVisible=true):  the full checklist; complete in any order;
 *     completed rows grey out calmly (never "failed"); reorder when allowed.
 *
 * On every Done: `completeStep` (gameplay orchestrator) pays the base token
 * ALWAYS + the deterministic cadence bonus, advances the persisted run (so a
 * force-quit resumes at the next incomplete step), and drives the companion.
 * Then `useCelebration` fires the sub-300ms multisensory burst — size from
 * `resolveCelebration` ONLY (never reduced by reinforcement phase, doc 66 §1b.3).
 * The final step routes to the `(kid)/celebrate` milestone modal.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { UNDO_WINDOW_MS } from "../../src/domain/constants";
import { daypartFromSchedule, isoDay, selectionDaypart } from "../../src/domain/dates";
import { plansForStep } from "../../src/domain/plans";
import { findSoundscape, resolveSoundscapeSettings } from "../../src/domain/soundscapes";
import { nextStepId } from "../../src/domain/tasks";
import { hasVisualTimer } from "../../src/domain/timer";
import { getTaskTemplate } from "../../src/data/taskTemplates";
import type { Daypart, Plan, Routine, Task, VerificationMode } from "../../src/domain/types";
import { announce } from "../../src/a11y/announce";
import { useCopy } from "../../src/i18n/useLocale";
import { playCue } from "../../src/services/playCue";
import { playSoundscape, stopSoundscape } from "../../src/services/soundscape";
import { capturePhoto, isPhotoVerifyAvailable } from "../../src/services/photoVerify";
import { completeStep, skipStep, undoStep, verifyStep } from "../../src/state/gameplay";
import { useChildStore } from "../../src/state/childStore";
import { usePlanStore } from "../../src/state/planStore";
import { useRunProgressStore } from "../../src/state/runProgressStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { useTaskStore } from "../../src/state/taskStore";
import { resolveContent } from "../../src/theme/resolveContent";
import { useCapabilities, useThemeInputs } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";
import {
  useCelebration,
  type CelebrationToggles,
} from "../../hooks/useCelebration";
import CelebrationOverlay from "../celebration/CelebrationOverlay";
import DaypartDonePanel from "../kid/DaypartDonePanel";

import DoneButton from "./DoneButton";
import NextStepChooser from "./NextStepChooser";
import StepCard, { type StepState } from "./StepCard";
import UndoBar from "./UndoBar";
import VerifyPrompt from "./VerifyPrompt";
import VisualTimer from "./VisualTimer";
import PlanCuePanel from "../plans/PlanCuePanel";

/** The just-resolved step, held transiently for the quick-undo + verify window. */
interface RecentAction {
  taskId: string;
  mode: VerificationMode;
  /** the tokens granted on that Done — reversed from the run total on undo */
  delta: number;
  /** the self/photo verify was stamped this run (show a calm confirmation) */
  verified: boolean;
  /** the photo prompt was skipped/declined (never nag twice) */
  skipped: boolean;
  at: number;
}

export interface TaskRunnerProps {
  childId: string;
  routine: Routine;
  /** the routine's steps, already ordered (the screen derives these) */
  steps: Task[];
  /**
   * The current daypart (time-resolved by the screen, doc 70 §B1/§B2). Drives the
   * per-day completion marker + the calm "see you this <next>" copy. Optional so
   * non-daypart callers still work; falls back to the routine's own bucket.
   */
  daypart?: Daypart;
}

/** Same SET of ids (order-independent) — reorder must not look like a new run. */
function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((id) => sb.has(id));
}

/** Device-local quiet-hours check (M13 makes this child-tz-correct). */
function isQuietHoursNow(q: { start: string; end: string }): boolean {
  const d = new Date();
  const cur = d.getHours() * 60 + d.getMinutes();
  const [sh, sm] = q.start.split(":").map((n) => parseInt(n, 10));
  const [eh, em] = q.end.split(":").map((n) => parseInt(n, 10));
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  return s <= e ? cur >= s && cur < e : cur >= s || cur < e; // wraps midnight
}

export default function TaskRunner({ childId, routine, steps, daypart }: TaskRunnerProps) {
  const t = useThemeTokens();
  const c = t.colors;
  const caps = useCapabilities();
  const { ageMode } = useThemeInputs();
  const copy = useCopy();
  const router = useRouter();

  const settings = useChildStore((s) => s.profiles[childId]?.settings);
  const updateSettings = useChildStore((s) => s.updateSettings);
  const balance = useChildStore((s) => s.ledgers[childId]?.balance ?? 0);
  const tz = useChildStore((s) => s.profiles[childId]?.timeZone) ?? "UTC";
  const run = useRunProgressStore((s) => s.active[childId] ?? null);
  const completion = useRunProgressStore((s) => s.completedDayparts[childId] ?? null);
  const quietWindow = useSettingsStore((s) => s.parentSettings.quietHours);
  // Opt-in, DECOUPLED timer chime (default OFF) — visual-timers §2.7.
  const timerSoundEnabled = useSettingsStore((s) => s.parentSettings.timerSoundEnabled ?? false);

  const [completedThisRun, setCompletedThisRun] = useState(false);
  const [runTokens, setRunTokens] = useState(0);
  // Transient quick-undo + light-verify affordance for the JUST-resolved step
  // (verify-undo §2.1/§2.2). Never persisted — a safety net must not survive a kill.
  const [recent, setRecent] = useState<RecentAction | null>(null);
  // Feature-detected once: hidden/degraded when the camera module/permission is
  // unavailable (web / Expo Go denial) so photo never crashes (verify-undo §2.1).
  const [photoAvailable] = useState(() => isPhotoVerifyAvailable());
  // The point-of-performance if-then cue for the JUST-completed step (if-then-plans
  // §2.3b): a calm, non-blocking card shown the moment a linked step completes. Held
  // locally; REPLACED (with null) on the next Done/Skip; NEVER gates the loop.
  const [cuePlan, setCuePlan] = useState<Plan | null>(null);
  // Focus-bed (soundscapes M-C1): true only while this runner screen is focused.
  const [screenFocused, setScreenFocused] = useState(true);
  const soundscape = useMemo(
    () => resolveSoundscapeSettings(settings?.soundscape),
    [settings?.soundscape],
  );

  const stepIds = useMemo(() => steps.map((s) => s.id), [steps]);

  // The daypart this run settles into: the screen's time-resolved one, else the
  // routine's own bucket. `today` (child-tz) keys the per-day completion marker —
  // the durable "done" signal that stops the runner re-arming/looping to morning.
  const dp: Daypart = selectionDaypart(daypart ?? daypartFromSchedule(routine.schedule.timeOfDay));
  const today = isoDay(Date.now(), tz);
  const dpComplete =
    !!completion && completion.day === today && completion.completed.includes(dp);

  const toggles: CelebrationToggles = {
    soundEnabled: settings?.soundEnabled ?? true,
    hapticsEnabled: settings?.hapticsEnabled ?? true,
    ttsEnabled: settings?.spokenLabelsEnabled ?? true,
    calmMode: settings?.calmMode ?? false,
    quietHours: isQuietHoursNow(quietWindow),
  };
  const { celebration, celebrate, fireCues, resolveLevel, dismiss } = useCelebration(toggles);

  // --- run lifecycle: resume a matching persisted run, else start a fresh one ---
  const startedRef = useRef<string | null>(null);
  useEffect(() => {
    if (stepIds.length === 0) return;
    const rp = useRunProgressStore.getState();
    const cur = rp.active[childId];
    // a reorder changes ORDER, not the id SET — keep the run (preserve progress)
    const matches = !!cur && cur.routineId === routine.id && sameSet(cur.stepIds, stepIds);
    if (!matches) {
      // No matching persisted run. Re-arm ONLY when this daypart is NOT already
      // finished today — otherwise reopening a completed daypart would clear the
      // steps and start over, looping back to the routine (the shipped bug, doc 70
      // §A4). A finished daypart stays finished: the calm done panel renders below.
      if (!rp.isDaypartComplete(childId, today, dp)) {
        stepIds.forEach((id) => useTaskStore.getState().setTaskStatus(childId, id, "todo"));
        rp.startRun(childId, routine.id, stepIds);
        setCompletedThisRun(false);
        setRunTokens(0);
      }
    }
    startedRef.current = routine.id;
    // keyed on routine + daypart/day only (reorder won't re-arm; the marker gates)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, routine.id, dp, today]);

  const completedIds = run?.completedStepIds ?? [];
  // Which ordering the FOCAL/current step follows. Older reorders the ROUTINE
  // (prop `stepIds`), so its focal tracks the visible checklist order (unchanged).
  // Young "What next?" reorders only THIS RUN (`run.stepIds`, via chooseNextStep),
  // so the chosen step becomes focal immediately AND survives a force-quit (run
  // order is persisted) — child-autonomy §2.3. Branch on the capability flag,
  // never raw ageMode.
  const orderedStepIds = caps.multiStepVisible ? stepIds : run?.stepIds ?? stepIds;
  const currentId = nextStepId(orderedStepIds, completedIds);
  const currentStep = useMemo(
    () => steps.find((s) => s.id === currentId) ?? null,
    [steps, currentId],
  );
  const doneCount = completedIds.length;
  const total = stepIds.length;

  // --- non-blocking "Take a breath" offer (breathing-regulation §2.6) ----------
  // A calming skill offered INSIDE the loop, never a gate. Tapping it opens the
  // calm/breathing surface; the persisted run pointer preserves position, so the
  // child returns to the SAME step and completes/skips exactly as before. Using
  // OR ignoring it never changes completion, tokens, or celebration. A regulation
  // step (the seeded `calm_breaths`, detected via its template category — no
  // data-model change) additionally offers a "Breathe with me" secondary action.
  const isRegulationStep =
    !!currentStep && getTaskTemplate(currentStep.templateId ?? "")?.category === "regulation";
  const openBreathing = useCallback(() => router.push("/(kid)/calm"), [router]);

  // If a completed run gets RE-ARMED with an unresolved current step (e.g. the
  // child tapped the secondary "Oops, undo" on the celebrate modal, which reverses
  // the last step and re-creates the active run), leave the local "all done" latch
  // so the runner yields back to that step instead of the calm done panel (§2.2).
  useEffect(() => {
    if (completedThisRun && run && currentId !== null) setCompletedThisRun(false);
  }, [completedThisRun, run, currentId]);

  // --- visual transition timer (M-B1) -----------------------------------------
  // Seed/clear the ACTIVE step's timer start (wall-clock anchored; persisted for
  // resume-after-kill accuracy). Each new timed active step records its own start;
  // a step without a timer clears any stale one. This is EXTERNAL SCAFFOLDING —
  // it never touches completion, tokens, or celebration.
  useEffect(() => {
    const rp = useRunProgressStore.getState();
    const cur = rp.active[childId];
    if (!cur) return;
    const timed = !!currentStep && hasVisualTimer(currentStep.timerSeconds);
    if (timed) {
      if (cur.stepTimerStartedAt == null) rp.setStepTimerStart(childId, Date.now());
    } else if (cur.stepTimerStartedAt != null) {
      rp.setStepTimerStart(childId, undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, currentId]);

  const timerStartedAt = run?.stepTimerStartedAt;

  // The optional, DECOUPLED empty chime: default OFF; suppressed by master-sound-off
  // + quiet hours like every cue; ducks (never stops) other audio (§2.7). Reaching
  // empty changes NOTHING else — no auto-advance, no token/celebration change.
  const onTimerEmpty = useCallback(() => {
    if (!timerSoundEnabled) return;
    if (!(settings?.soundEnabled ?? true)) return;
    if (isQuietHoursNow(quietWindow)) return;
    playCue("timer.done");
  }, [timerSoundEnabled, settings?.soundEnabled, quietWindow]);

  const stepStateOf = useCallback(
    (task: Task): StepState => {
      if (completedIds.includes(task.id)) {
        return task.status === "skipped" ? "skipped" : "done";
      }
      return task.id === currentId ? "active" : "upcoming";
    },
    [completedIds, currentId],
  );

  // --- completing a step ------------------------------------------------------
  const onDone = useCallback(
    (task: Task) => {
      const already = useRunProgressStore.getState().active[childId]?.completedStepIds ?? [];
      if (already.includes(task.id)) return; // guard a double-tap
      const remainingAfter = stepIds.filter((id) => id !== task.id && !already.includes(id));
      const isLast = remainingAfter.length === 0;

      const res = completeStep(childId, task, { isRoutineComplete: isLast });
      const delta = res?.tokensAwarded ?? task.tokenValue;
      const bonus = res?.bonus ?? false;
      // Novelty-refresh (M-C4): completing today's DETERMINISTIC "spotlight" daypart
      // steps the routine-complete celebration UP one level (magnitude variety, never
      // a chance drop). Folds into the existing `bonus` step-up seam.
      const spotlight = res?.spotlight ?? false;
      const newRunTokens = runTokens + delta;
      setRunTokens(newRunTokens);

      // Point-of-performance: surface any active `afterStep` plan for THIS step the
      // moment it completes (if-then-plans §2.3b). Non-blocking, never a celebration
      // and never a token — REPLACES any previous cue (cleared on the next step).
      const stepPlans = plansForStep(usePlanStore.getState().plans[childId] ?? [], task.id);
      setCuePlan(stepPlans[0] ?? null);

      if (isLast) {
        // Durable "this daypart is done for today" mark — the runner reads this on
        // remount and stays calm instead of re-arming/looping (doc 70 §A4/§B2).
        useRunProgressStore.getState().markDaypartComplete(childId, today, dp);
        setCompletedThisRun(true);
        const routineCopy = resolveContent("celebrate.routine", { ageMode });
        // fire the immediate cues (<300ms) BEFORE the modal navigation
        const level = resolveLevel({ salience: "routineComplete", bonus: bonus || spotlight });
        fireCues(level, "routineComplete", routineCopy);
        // Screen-reader parallel: the routine-complete modal has no overlay, so
        // announce the warm completion line here (fire-and-forget, §2.1).
        announce(copy("a11y.celebrate.routine"));
        router.push({
          pathname: "/(kid)/celebrate",
          params: {
            childId,
            level,
            copy: routineCopy,
            tokens: String(newRunTokens),
            steps: String(total),
            // the last step's id — celebrate offers a secondary "Oops, undo" that
            // reverses it and returns to the routine (verify-undo §2.2, stateless).
            undoTaskId: task.id,
          },
        });
      } else {
        celebrate({
          salience: "step",
          bonus,
          copy: resolveContent("celebrate.step", { ageMode }),
          tokenDelta: delta,
        });
        // Arm the transient quick-undo + optional verify for this just-done step.
        setRecent({
          taskId: task.id,
          mode: task.verification.mode,
          delta,
          verified: false,
          skipped: false,
          at: Date.now(),
        });
      }
    },
    [childId, stepIds, runTokens, ageMode, total, today, dp, celebrate, fireCues, resolveLevel, router, copy],
  );

  // --- quick undo + light verify handlers (verify-undo §2.1/§2.2) ---------------
  const clearRecent = useCallback(() => setRecent(null), []);

  const onUndoRecent = useCallback(() => {
    if (!recent) return;
    undoStep(childId, recent.taskId);
    // reverse the run token counter too (the celebrate total stays honest)
    setRunTokens((rt) => Math.max(0, rt - recent.delta));
    playCue("tap.soft"); // a soft neutral cue only — NEVER a Warning/Error haptic
    setRecent(null);
  }, [recent, childId]);

  const onSelfVerify = useCallback(() => {
    if (!recent) return;
    void verifyStep(childId, recent.taskId, { by: "child" });
    setRecent((r) => (r ? { ...r, verified: true } : r));
  }, [recent, childId]);

  const onPhotoVerify = useCallback(() => {
    if (!recent) return;
    const taskId = recent.taskId;
    void (async () => {
      const photo = await capturePhoto();
      if (photo) {
        await verifyStep(childId, taskId, { by: "child", photoUri: photo.uri });
        setRecent((r) => (r && r.taskId === taskId ? { ...r, verified: true } : r));
      } else {
        // canceled / unavailable — never nag; just retire the prompt (no penalty).
        setRecent((r) => (r && r.taskId === taskId ? { ...r, skipped: true } : r));
      }
    })();
  }, [recent, childId]);

  const onSkipVerify = useCallback(() => {
    setRecent((r) => (r ? { ...r, skipped: true } : r));
  }, []);

  // Persistent older fallback: long-press a resolved row → "Mark not done".
  const onLongPressUndo = useCallback(
    (taskId: string) => {
      undoStep(childId, taskId);
      setRecent((r) => (r && r.taskId === taskId ? null : r));
    },
    [childId],
  );

  const onSkip = useCallback(
    (task: Task) => {
      const already = useRunProgressStore.getState().active[childId]?.completedStepIds ?? [];
      if (already.includes(task.id)) return;
      const remainingAfter = stepIds.filter((id) => id !== task.id && !already.includes(id));
      skipStep(childId, task.id); // free, never penalized (doc 62 §5)
      setCuePlan(null); // skipping a step retires any pending point-of-performance cue
      // skipping the last unresolved step ends the run calmly (no celebration —
      // skipping is neutral, never shamed; the run just settles to "all done").
      // Stamp the daypart done so a skip-to-end also stays finished (no re-loop).
      if (remainingAfter.length === 0) {
        useRunProgressStore.getState().markDaypartComplete(childId, today, dp);
        setCompletedThisRun(true);
      }
    },
    [childId, stepIds, today, dp],
  );

  const move = useCallback(
    (taskId: string, dir: -1 | 1) => {
      const ids = [...stepIds];
      const i = ids.indexOf(taskId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ids.length) return;
      const tmp = ids[i];
      ids[i] = ids[j];
      ids[j] = tmp;
      useTaskStore.getState().reorderRoutineSteps(childId, routine.id, ids);
    },
    [stepIds, childId, routine.id],
  );

  // "Do it now" on a plan cue whose action links a task (if-then-plans §2.3b): in
  // the young single-step shell, pull that linked task to the front of THIS run so
  // it becomes the focal step; older already sees it in the checklist. Always just
  // dismisses the cue — it never gates or skips anything.
  const doPlanTaskNow = useCallback(
    (plan: Plan) => {
      const linked = plan.action.linkedTaskId;
      setCuePlan(null);
      if (!linked) return;
      const rp = useRunProgressStore.getState();
      const cur = rp.active[childId];
      const inRun = !!cur && cur.stepIds.includes(linked) && !cur.completedStepIds.includes(linked);
      if (inRun && !caps.multiStepVisible) rp.chooseNextStep(childId, linked);
    },
    [childId, caps.multiStepVisible],
  );

  const restart = useCallback(() => {
    // EXPLICIT opt-in only (never on remount): un-mark the daypart so the calm
    // done panel yields back to a fresh run, then re-arm just this routine.
    const rp = useRunProgressStore.getState();
    rp.clearDaypartComplete(childId, today, dp);
    stepIds.forEach((id) => useTaskStore.getState().setTaskStatus(childId, id, "todo"));
    rp.startRun(childId, routine.id, stepIds);
    setCompletedThisRun(false);
    setRunTokens(0);
    dismiss();
  }, [stepIds, childId, routine.id, today, dp, dismiss]);

  const canReorder = caps.multiStepVisible && (settings?.autonomy.canReorderSteps ?? false);

  // Young "What next?" chooser (child-autonomy §2.3): the SAME `canReorderSteps`
  // grant, but young mode has no ▲/▼ handles — instead a curated strip lets the
  // child pull an upcoming step to the front of THIS run (per-run only; the
  // parent routine is never permanently reordered). Upcoming = not-yet-resolved
  // steps (includes the current focal one so the child sees the small set to pick
  // from). Only when there are ≥2 to make it a real, low-stakes choice.
  const canChooseNext = !caps.multiStepVisible && (settings?.autonomy.canReorderSteps ?? false);
  // Upcoming = not-yet-resolved steps in the RUN order (so the focal is first and
  // a chosen step visibly moves to the front). Includes the current focal so the
  // child sees the small set to pick from.
  const upcomingSteps = useMemo(
    () =>
      orderedStepIds
        .map((id) => steps.find((s) => s.id === id))
        .filter((s): s is Task => !!s && !completedIds.includes(s.id)),
    [orderedStepIds, steps, completedIds],
  );
  const chooseNext = useCallback(
    (taskId: string) => useRunProgressStore.getState().chooseNextStep(childId, taskId),
    [childId],
  );
  // Also "all done" when the daypart marker says so (a resumed/remounted app with
  // no active run must show the calm panel, NOT re-arm the first step — doc 70 §B2).
  const allDone = completedThisRun || dpComplete || (total > 0 && currentId === null);

  // --- optional focus bed (soundscapes M-C1) ---------------------------------
  // A quiet, mix-not-hijack ambient bed that plays ONLY when the parent (or older
  // child) enabled it AND a focus scene is chosen AND master sound is on. It STOPS
  // on routine completion (`allDone`), when the runner loses focus, and — via the
  // root AppState listener (app/_layout.tsx) — when the app backgrounds. It never
  // touches completion / tokens / celebration (external, additive scaffolding).
  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      return () => {
        setScreenFocused(false);
        stopSoundscape();
      };
    }, []),
  );
  const focusScene = findSoundscape(soundscape.focusSceneId);
  const shouldPlayFocus =
    screenFocused &&
    !allDone &&
    soundscape.focusDuringTasks &&
    !!soundscape.focusSceneId &&
    (settings?.soundEnabled ?? true);
  useEffect(() => {
    if (shouldPlayFocus && soundscape.focusSceneId) playSoundscape(soundscape.focusSceneId);
    else stopSoundscape();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPlayFocus, soundscape.focusSceneId]);

  // Older-only in-runner toggle: flip the focus bed on/off for this child; seed a
  // default free scene when none is chosen so turning it on plays immediately.
  const toggleFocusSound = useCallback(() => {
    updateSettings(childId, {
      soundscape: {
        ...soundscape,
        focusDuringTasks: !soundscape.focusDuringTasks,
        focusSceneId: soundscape.focusSceneId ?? "waves",
      },
    });
  }, [soundscape, updateSettings, childId]);

  // Depleting visual on the ACTIVE step only, when it carries a positive budget.
  // Variant/readout resolve from CAPABILITY FLAGS (never raw ageMode): young focal
  // wedge vs older slim bar; numbers only when `showNumbersAndCharts`.
  const showTimer =
    !allDone && !!currentStep && hasVisualTimer(currentStep.timerSeconds) && timerStartedAt != null;
  const timerNode =
    showTimer && currentStep ? (
      <VisualTimer
        timerSeconds={currentStep.timerSeconds as number}
        startedAt={timerStartedAt as number}
        variant={caps.multiStepVisible ? "bar" : "wedge"}
        showNumbers={caps.showNumbersAndCharts}
        label={resolveContent("timer.label", { ageMode })}
        restedLabel={resolveContent("timer.rested", { ageMode })}
        a11yPrefix={resolveContent("timer.a11y", { ageMode })}
        onEmpty={onTimerEmpty}
      />
    ) : null;

  // The transient quick-undo + optional verify affordance for the just-resolved
  // step. Variant flows from a CAPABILITY flag (never raw ageMode); all copy is
  // resolved here and passed in, so UndoBar/VerifyPrompt read no ageMode.
  const recentNode =
    recent && !allDone ? (
      <View
        // remount per resolved step so the undo window/ring restarts on each Done
        key={recent.at}
        style={{
          gap: t.spacing(2),
          alignItems: caps.multiStepVisible ? "flex-start" : "center",
          paddingTop: t.spacing(1),
        }}
      >
        {!recent.skipped ? (
          <VerifyPrompt
            mode={recent.mode}
            variant={caps.multiStepVisible ? "row" : "focal"}
            selfLabel={resolveContent("verify.self", { ageMode })}
            photoLabel={resolveContent("verify.photo", { ageMode })}
            skipLabel={resolveContent("verify.skip", { ageMode })}
            confirmedLabel={resolveContent("verify.parentConfirm", { ageMode })}
            photoAvailable={photoAvailable}
            calm={toggles.calmMode ?? false}
            verified={recent.verified}
            onSelfVerify={onSelfVerify}
            onPhoto={onPhotoVerify}
            onSkip={onSkipVerify}
          />
        ) : null}
        <UndoBar
          variant={caps.multiStepVisible ? "row" : "focal"}
          label={resolveContent("undo.step", { ageMode })}
          windowMs={UNDO_WINDOW_MS}
          onUndo={onUndoRecent}
          onExpire={clearRecent}
        />
      </View>
    ) : null;

  // The point-of-performance if-then cue for the just-completed step (if-then-plans
  // §2.3b): calm + non-blocking + dismissible; NOT a celebration (no confetti/token).
  const cueNode =
    cuePlan && !allDone ? (
      <PlanCuePanel
        plan={cuePlan}
        variant={caps.multiStepVisible ? "compact" : "focal"}
        calm={toggles.calmMode ?? false}
        onDismiss={() => setCuePlan(null)}
        onDoItNow={cuePlan.action.linkedTaskId ? () => doPlanTaskNow(cuePlan) : undefined}
      />
    ) : null;

  return (
    <View style={{ flex: 1 }}>
      {/* header — routine + forgiving "X of N" + the running bubble balance.
          Hidden on the calm done panel so it reads as a full, uncluttered surface. */}
      {!allDone ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: t.spacing(4),
            // extra right room so the persistent "Grown-ups 🔒" corner door
            // (kid shell overlay, doc 70 §D) never overlaps the balance chip.
            paddingRight: t.spacing(4) + 44,
            paddingTop: t.spacing(3),
            paddingBottom: t.spacing(2),
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2), flex: 1 }}>
            <Text style={{ fontSize: 28 }}>{routine.label.emoji ?? "🫧"}</Text>
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                style={{
                  color: c.text,
                  fontFamily: t.type.h2.family,
                  fontSize: t.type.h2.size,
                  fontWeight: "700",
                }}
              >
                {routine.label.text ?? routine.label.spokenLabel}
              </Text>
              <Text style={{ color: c.textDim, fontSize: t.type.caption.size }}>
                {doneCount} of {total} done
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing(2) }}>
            {/* non-blocking "Take a breath" invitation (breathing-regulation §2.6):
                a low-emphasis chip → the calm/breathing surface. Never gates the
                Done button; the run resumes at the same step on return. */}
            <BreatheChip
              label={resolveContent("breathe.offer", { ageMode })}
              onPress={openBreathing}
              c={c}
              t={t}
            />
            {/* older-only focus-sound toggle (gated by caps.multiStepVisible, never
                raw ageMode). Young stays uncluttered — its focus bed is fully
                parent-managed (soundscapes §2.4/§2.5). */}
            {caps.multiStepVisible ? (
              <FocusSoundChip
                on={soundscape.focusDuringTasks}
                emoji={focusScene?.label.emoji ?? "🎧"}
                label={copy("soundscape.focusToggle")}
                onToggle={toggleFocusSound}
                c={c}
                t={t}
              />
            ) : null}
            <BalanceChip balance={balance} c={c} t={t} />
          </View>
        </View>
      ) : null}

      {/* body */}
      {allDone ? (
        // Calm, forward-only "all done for now" — no auto-restart, no morning loop.
        // "Do it again" is the ONLY (secondary) restart, never the default focus.
        <DaypartDonePanel childId={childId} daypart={dp} mode="done" onRestart={restart} />
      ) : caps.multiStepVisible ? (
        // ---- older: the checklist -------------------------------------------
        <View style={{ flex: 1 }}>
          {/* if-then cue ABOVE the checklist (if-then-plans §2.3b, older) */}
          {cueNode ? (
            <View style={{ paddingHorizontal: t.spacing(4), paddingTop: t.spacing(2) }}>{cueNode}</View>
          ) : null}
          <ScrollView
            contentContainerStyle={{
              padding: t.spacing(4),
              gap: t.spacing(2),
              maxWidth: t.contentMaxWidth,
              alignSelf: "center",
              width: "100%",
            }}
          >
            {steps.map((task) => {
              const st = stepStateOf(task);
              const resolved = st === "done" || st === "skipped";
              return (
                <StepCard
                  key={task.id}
                  label={task.label}
                  state={st}
                  variant="row"
                  ttsEnabled={toggles.ttsEnabled}
                  onComplete={() => onDone(task)}
                  onMoveUp={canReorder ? () => move(task.id, -1) : undefined}
                  onMoveDown={canReorder ? () => move(task.id, 1) : undefined}
                  onLongPressUndo={resolved ? () => onLongPressUndo(task.id) : undefined}
                  longPressUndoLabel={resolveContent("undo.done", { ageMode })}
                />
              );
            })}
          </ScrollView>
          {currentStep ? (
            <View style={{ padding: t.spacing(4), paddingTop: 0, gap: t.spacing(3) }}>
              {/* slim depleting bar reads as "time for THIS step" (§2.4) */}
              {timerNode}
              {/* just-resolved step: inline Undo + optional verify chip (§2.2) */}
              {recentNode}
              {/* regulation-step "Breathe with me" — advisory, NEVER a precondition:
                  doing or skipping it never affects completion/tokens/celebration. */}
              {isRegulationStep ? (
                <BreatheWithMe
                  label={resolveContent("breathe.withMe", { ageMode })}
                  onPress={openBreathing}
                  c={c}
                  t={t}
                />
              ) : null}
              <DoneButton
                label={`${resolveContent("task.done", { ageMode })} · ${
                  currentStep.label.text ?? currentStep.label.spokenLabel
                }`}
                onPress={() => onDone(currentStep)}
              />
            </View>
          ) : null}
        </View>
      ) : (
        // ---- young: one focal step ------------------------------------------
        <View style={{ flex: 1, justifyContent: "center", padding: t.spacing(5), gap: t.spacing(6) }}>
          {currentStep ? (
            <>
              <StepCard
                key={currentStep.id}
                label={currentStep.label}
                state="active"
                variant="focal"
                autoSpeak
                ttsEnabled={toggles.ttsEnabled}
              />
              {/* large draining wedge between the focal tile and the giant Done */}
              {timerNode}
              <View style={{ gap: t.spacing(3), alignItems: "center", width: "100%" }}>
                <DoneButton
                  label={resolveContent("task.done", { ageMode })}
                  onPress={() => onDone(currentStep)}
                />
                {/* regulation-step "Breathe with me" — advisory, never a gate */}
                {isRegulationStep ? (
                  <BreatheWithMe
                    label={resolveContent("breathe.withMe", { ageMode })}
                    onPress={openBreathing}
                    c={c}
                    t={t}
                  />
                ) : null}
                <SkipLink onPress={() => onSkip(currentStep)} c={c} t={t} />
              </View>
              {/* young "be the boss": a curated "What next?" strip to pick the focal
                  step (per-run only; optional — ignoring it keeps the default order) */}
              {canChooseNext && upcomingSteps.length >= 2 ? (
                <NextStepChooser
                  steps={upcomingSteps}
                  currentId={currentId}
                  maxChoices={caps.maxChoices}
                  title={resolveContent("task.next", { ageMode })}
                  ttsEnabled={toggles.ttsEnabled}
                  onChoose={chooseNext}
                />
              ) : null}
              {/* if-then cue BELOW the focal step (if-then-plans §2.3b, young) */}
              {cueNode}
              {/* just-done step: the "Oops — undo?" bubble + optional verify (§2.2) */}
              {recentNode}
            </>
          ) : null}
        </View>
      )}

      {/* the in-place celebration burst (non-blocking, sub-300ms) */}
      <CelebrationOverlay celebration={celebration} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Small presentational helpers (resolved tokens only; no raw-ageMode branches).
// ---------------------------------------------------------------------------
type Tokens = ReturnType<typeof useThemeTokens>;
type Colors = Tokens["colors"];

function BalanceChip({ balance, c, t }: { balance: number; c: Colors; t: Tokens }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: c.surface,
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <Text style={{ fontSize: 16 }}>🫧</Text>
      <Text
        style={{
          color: c.text,
          fontFamily: t.type.label.family,
          fontSize: t.type.label.size,
          fontWeight: "700",
        }}
      >
        {balance}
      </Text>
    </View>
  );
}

/** Older-only low-emphasis focus-sound toggle chip (soundscapes §2.5). */
function FocusSoundChip({
  on,
  emoji,
  label,
  onToggle,
  c,
  t,
}: {
  on: boolean;
  emoji: string;
  label: string;
  onToggle: () => void;
  c: Colors;
  t: Tokens;
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      hitSlop={8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: on ? c.primary : c.surface,
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: on ? c.primary : c.border,
      }}
    >
      <Text style={{ fontSize: 16 }}>{on ? emoji : "🔈"}</Text>
    </Pressable>
  );
}

/** Low-emphasis header "Take a breath 🫧" invitation (breathing-regulation §2.6). */
function BreatheChip({
  label,
  onPress,
  c,
  t,
}: {
  label: string;
  onPress: () => void;
  c: Colors;
  t: Tokens;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: c.surface,
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <Text style={{ fontSize: 16 }}>🫧</Text>
    </Pressable>
  );
}

/** Regulation-step "Breathe with me" secondary action — advisory, never a gate. */
function BreatheWithMe({
  label,
  onPress,
  c,
  t,
}: {
  label: string;
  onPress: () => void;
  c: Colors;
  t: Tokens;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        alignSelf: "center",
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 999,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <Text style={{ fontSize: 16 }}>🫧</Text>
      <Text
        style={{
          color: c.textDim,
          fontFamily: t.type.label.family,
          fontSize: t.type.label.size,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SkipLink({ onPress, c, t }: { onPress: () => void; c: Colors; t: Tokens }) {
  return (
    <Text
      onPress={onPress}
      accessibilityRole="button"
      style={{
        color: c.textDim,
        fontFamily: t.type.label.family,
        fontSize: t.type.label.size,
        paddingVertical: 8,
        paddingHorizontal: 16,
      }}
    >
      Skip for now
    </Text>
  );
}
