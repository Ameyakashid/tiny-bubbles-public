/**
 * components/focus/FocusSession.tsx — the stateful view for the OPTIONAL adjustable
 * focus-intervals scaffold (feature #22, `focus-intervals`, M-C3).
 *
 * A small state machine (setup → focus → break → (focus…) → done) driven by the
 * in-memory `focusSessionStore`. It is an ADVISORY, NON-coercive tool: a block
 * ending never auto-completes anything, never locks the UI, never flashes/reddens,
 * never nags, and NEVER changes tokens (token-neutral by design — this can't become
 * a focus-for-rewards grind). Pause + Stop are always one tap and always neutral;
 * ending early is calm ("come back any time"). It is an optional organizational
 * scaffold, never a medical claim, and is never marketed as clinically effective.
 *
 * Reuse: the live depleting ring is `components/task/VisualTimer.tsx` (wall-clock
 * anchored, smooth vs 1 Hz stepped under Reduce-Motion, single-fire onEmpty); the
 * paused ring is the static `FocusRing`. All time math is wall-clock; `now` comes
 * from `Date.now()` only at the moment of a user/timer action and is handed to the
 * pure store. The transition cue (`transition.swoosh`, ducking) + a positive-only
 * haptic fire ONCE when a focus block completes, gated by `config.chime` / haptics.
 *
 * Age/sensory differences flow ONLY through `useCapabilities()` /
 * `useThemeTokens()` / `resolveContent` — there is NO raw `ageMode`/`sensoryMode`/
 * `reducedMotion` branch and NO `ageMode` prop (the destructured `ageMode` is only
 * fed into `resolveContent`, the sanctioned resolver pattern). ZERO RNG.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { MOVEMENT_PROMPTS } from "../../src/data/focusBreaks";
import {
  BREAK_MINUTE_OPTIONS,
  FOCUS_MINUTE_OPTIONS,
  nextMovementPrompt,
} from "../../src/domain/focus";
import type { FocusIntervalConfig } from "../../src/domain/types";
import { fireHaptic } from "../../src/services/haptics";
import { playCue } from "../../src/services/playCue";
import { useBuddyStore } from "../../src/state/buddyStore";
import { useChildStore } from "../../src/state/childStore";
import { useFocusSessionStore } from "../../src/state/focusSessionStore";
import { resolveContent } from "../../src/theme/resolveContent";
import { useCapabilities, useThemeInputs } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";
import BubbleBuddy from "../buddy/BubbleBuddy";
import VisualTimer from "../task/VisualTimer";
import FocusRing from "./FocusRing";
import MovementBreakCard from "./MovementBreakCard";

export interface FocusSessionProps {
  childId: string;
  /** the resolved parent config (defaults pre-fill the setup pickers). */
  config: FocusIntervalConfig;
  /** returns to Today (also drops the in-memory session on unmount). */
  onClose: () => void;
}

export default function FocusSession({ childId, config, onClose }: FocusSessionProps) {
  const t = useThemeTokens();
  const c = t.colors;
  const caps = useCapabilities();
  // Sanctioned resolver pattern (never a raw age branch): ageMode only feeds resolveContent.
  const { ageMode } = useThemeInputs();
  const showNumbers = caps.showNumbersAndCharts;

  const session = useFocusSessionStore((s) => s.session);
  const start = useFocusSessionStore((s) => s.start);
  const toBreak = useFocusSessionStore((s) => s.toBreak);
  const toFocus = useFocusSessionStore((s) => s.toFocus);
  const finish = useFocusSessionStore((s) => s.finish);
  const pause = useFocusSessionStore((s) => s.pause);
  const resume = useFocusSessionStore((s) => s.resume);
  const stop = useFocusSessionStore((s) => s.stop);

  // Positive-only haptic respect: never a Warning/Error toward a child.
  const hapticsEnabled = useChildStore(
    (s) => s.profiles[childId]?.settings.hapticsEnabled ?? true,
  );
  const companion = useBuddyStore((s) => s.companions[childId]);
  const variant = resolveContent("buddy.artVariant", { companionStyle: caps.companionStyle });

  // Drop the in-memory session when the screen unmounts (hardware back / navigate
  // away). A killed session is simply gone — anti-shame-fine, never a "loss".
  useEffect(() => () => stop(), [stop]);

  // ---- setup-phase local pickers (pre-filled from the parent config) ----------
  const [focusMinutes, setFocusMinutes] = useState<number>(config.focusMinutes);
  const [breakMinutes, setBreakMinutes] = useState<number>(config.breakMinutes);
  const [movementBreaks, setMovementBreaks] = useState<boolean>(config.movementBreaks);

  const handleStart = useCallback(() => {
    start({ childId, focusMinutes, breakMinutes, movementBreaks }, Date.now());
  }, [start, childId, focusMinutes, breakMinutes, movementBreaks]);

  // A focus block completed → break. Fire the ONE ducking transition cue (gated by
  // chime) + a single positive haptic (gated by hapticsEnabled). NO token change.
  const handleFocusEmpty = useCallback(() => {
    if (config.chime) playCue("transition.swoosh");
    fireHaptic("done", { enabled: hapticsEnabled });
    toBreak(Date.now());
  }, [config.chime, hapticsEnabled, toBreak]);

  const handleBackToFocus = useCallback(() => {
    fireHaptic("select", { enabled: hapticsEnabled });
    toFocus(Date.now());
  }, [hapticsEnabled, toFocus]);

  const handlePause = useCallback(() => pause(Date.now()), [pause]);
  const handleResume = useCallback(() => resume(Date.now()), [resume]);
  const handleStop = useCallback(() => finish(), [finish]);

  // The movement prompt for the current break (deterministic — no RNG).
  const currentPrompt = useMemo(
    () =>
      session && session.phase === "break"
        ? nextMovementPrompt(session.promptIndex, MOVEMENT_PROMPTS).prompt
        : undefined,
    [session],
  );

  // ---- render ----------------------------------------------------------------
  // No live session → the setup surface (curated pickers, "be the boss" autonomy).
  if (!session) {
    return (
      <ScrollView
        contentContainerStyle={{
          padding: t.spacing(6),
          gap: t.spacing(6),
          alignItems: "center",
          maxWidth: t.contentMaxWidth,
          alignSelf: "center",
          width: "100%",
        }}
      >
        <Text
          style={{
            color: c.textDim,
            fontFamily: t.type.body.family,
            fontSize: t.type.body.size,
            textAlign: "center",
          }}
        >
          {resolveContent("focus.setupHint", { ageMode })}
        </Text>

        <PickerRow
          label={resolveContent("focus.focusLength", { ageMode })}
          options={FOCUS_MINUTE_OPTIONS}
          value={focusMinutes}
          onChange={setFocusMinutes}
          suffix="min"
        />
        <PickerRow
          label={resolveContent("focus.breakLength", { ageMode })}
          options={BREAK_MINUTE_OPTIONS}
          value={breakMinutes}
          onChange={setBreakMinutes}
          suffix="min"
        />

        {/* movement-break toggle (curated: On / Off) */}
        <View style={{ width: "100%", gap: t.spacing(2) }}>
          <Text style={{ color: c.text, fontFamily: t.type.label.family, fontSize: t.type.label.size, fontWeight: "700" }}>
            {resolveContent("focus.movementToggle", { ageMode })}
          </Text>
          <View style={{ flexDirection: "row", gap: t.spacing(2) }}>
            <OptionChip label="On" selected={movementBreaks} onPress={() => setMovementBreaks(true)} />
            <OptionChip label="Off" selected={!movementBreaks} onPress={() => setMovementBreaks(false)} />
          </View>
        </View>

        <PrimaryAction label={resolveContent("focus.start", { ageMode })} onPress={handleStart} />
      </ScrollView>
    );
  }

  // done → a calm close (buddy proud/happy + one warm line; at most a neutral count).
  if (session.phase === "done") {
    // Suppress the count entirely at 0 (a "Focus blocks today: 0" would read as a
    // shaming zero). Only show it when older (showNumbers) AND >= 1 block completed.
    const showCount = showNumbers && session.blocksCompleted >= 1;
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
          mood={session.blocksCompleted >= 1 ? "proud" : "happy"}
          bodyHue={companion?.customization.baseColor}
          growthStage={companion?.growthStage ?? 0}
          size={160}
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
          {resolveContent("focus.done", { ageMode })}
        </Text>
        {showCount ? (
          <Text
            style={{
              color: c.textDim,
              fontFamily: t.type.label.family,
              fontSize: t.type.body.size,
              fontVariant: ["tabular-nums"],
            }}
          >
            {resolveContent("focus.blocks", { ageMode })}: {session.blocksCompleted}
          </Text>
        ) : null}
        <PrimaryAction label={resolveContent("focus.close", { ageMode })} onPress={onClose} />
      </View>
    );
  }

  // break → the active-movement (or plain rest) card.
  if (session.phase === "break") {
    return (
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: t.spacing(6),
          gap: t.spacing(5),
          maxWidth: t.contentMaxWidth,
          alignSelf: "center",
          width: "100%",
        }}
      >
        <MovementBreakCard
          prompt={currentPrompt}
          movement={session.movementBreaks}
          breakMinutes={session.breakMinutes}
          phaseStartedAt={session.phaseStartedAt}
          showNumbers={showNumbers}
          title={resolveContent(
            session.movementBreaks ? "focus.breakTitle" : "focus.restTitle",
            { ageMode },
          )}
          hint={resolveContent(session.movementBreaks ? "focus.breakHint" : "focus.restHint", { ageMode })}
          movedLabel={resolveContent("focus.moved", { ageMode })}
          skipLabel={resolveContent("focus.skipBreak", { ageMode })}
          backLabel={resolveContent("focus.backToFocus", { ageMode })}
          doneLabel={resolveContent("focus.imDone", { ageMode })}
          a11yPrefix={resolveContent("focus.a11y", { ageMode })}
          onBackToFocus={handleBackToFocus}
          onDone={handleStop}
        />
      </ScrollView>
    );
  }

  // focus → the big depleting ring + Pause/Resume + Stop (both neutral, always free).
  const focusTotalMs = session.focusMinutes * 60_000;
  const pausedRemaining = session.pausedRemainingMs ?? 0;
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: t.spacing(6),
        gap: t.spacing(6),
      }}
    >
      {session.paused ? (
        <FocusRing
          fraction={focusTotalMs > 0 ? pausedRemaining / focusTotalMs : 0}
          remainingMs={pausedRemaining}
          showNumbers={showNumbers}
          label={resolveContent("focus.paused", { ageMode })}
          a11yPrefix={resolveContent("focus.a11y", { ageMode })}
          size={240}
        />
      ) : (
        <VisualTimer
          timerSeconds={Math.max(1, Math.round(session.focusMinutes * 60))}
          startedAt={session.phaseStartedAt}
          variant="wedge"
          showNumbers={showNumbers}
          label={resolveContent("focus.focusing", { ageMode })}
          restedLabel={resolveContent("focus.focusing", { ageMode })}
          a11yPrefix={resolveContent("focus.a11y", { ageMode })}
          onEmpty={handleFocusEmpty}
          size={240}
        />
      )}

      <View style={{ flexDirection: "row", gap: t.spacing(3), alignItems: "center" }}>
        <SecondaryAction
          label={
            session.paused
              ? resolveContent("focus.resume", { ageMode })
              : resolveContent("focus.pause", { ageMode })
          }
          onPress={session.paused ? handleResume : handlePause}
          tone="primary"
        />
        <SecondaryAction
          label={resolveContent("focus.stop", { ageMode })}
          onPress={handleStop}
          tone="neutral"
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Small kid-sized controls (self-contained; token-driven; no raw ageMode).
// ---------------------------------------------------------------------------
function PickerRow({
  label,
  options,
  value,
  onChange,
  suffix,
}: {
  label: string;
  options: readonly number[];
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  const t = useThemeTokens();
  const c = t.colors;
  return (
    <View style={{ width: "100%", gap: t.spacing(2) }}>
      <Text style={{ color: c.text, fontFamily: t.type.label.family, fontSize: t.type.label.size, fontWeight: "700" }}>
        {label}
      </Text>
      <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
        {options.map((o) => (
          <OptionChip
            key={o}
            label={suffix ? `${o} ${suffix}` : `${o}`}
            selected={o === value}
            onPress={() => onChange(o)}
          />
        ))}
      </View>
    </View>
  );
}

function OptionChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const t = useThemeTokens();
  const c = t.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={{
        minHeight: t.touchTargetMin,
        justifyContent: "center",
        paddingVertical: t.spacing(2),
        paddingHorizontal: t.spacing(4),
        borderRadius: 999,
        backgroundColor: selected ? c.primary : c.surfaceAlt,
        borderWidth: selected ? 0 : 1,
        borderColor: c.border,
      }}
    >
      <Text
        style={{
          color: selected ? c.onPrimary : c.text,
          fontFamily: t.type.label.family,
          fontSize: t.type.bodyLg.size,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PrimaryAction({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useThemeTokens();
  const c = t.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
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
      <Text style={{ color: c.onPrimary, fontFamily: t.type.label.family, fontSize: t.type.h2.size, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function SecondaryAction({
  label,
  onPress,
  tone,
}: {
  label: string;
  onPress: () => void;
  tone: "primary" | "neutral";
}) {
  const t = useThemeTokens();
  const c = t.colors;
  const bg = tone === "primary" ? c.primary : c.surfaceAlt;
  const fg = tone === "primary" ? c.onPrimary : c.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        minHeight: t.touchTargetMin,
        justifyContent: "center",
        paddingVertical: t.spacing(2),
        paddingHorizontal: t.spacing(5),
        borderRadius: t.radius,
        backgroundColor: bg,
        borderWidth: tone === "neutral" ? 1 : 0,
        borderColor: c.border,
      }}
    >
      <Text style={{ color: fg, fontFamily: t.type.label.family, fontSize: t.type.bodyLg.size, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  );
}
