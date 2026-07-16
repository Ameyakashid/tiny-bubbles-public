/**
 * hooks/useCelebration.ts — the imperative celebration orchestrator (doc 66 M7).
 *
 * The load-bearing reinforcer (doc 61 §8 / feature #1): the instant a child taps
 * Done, this fires — IN ORDER, SYNCHRONOUSLY, sub-300ms — haptic + sound cue +
 * visual overlay + spoken praise, so the multisensory window is guaranteed and
 * not at the mercy of React's async render/commit cycle.
 *
 * CRITICAL ANTI-SHAME RULE (doc 66 §1b.3 / §5.3): the celebration SIZE comes from
 * `resolveCelebration` ONLY — salience sets it, ageMode caps it, sensory/calm/
 * quiet-hours clamp it. The reinforcement PHASE is NOT an input here, so the base
 * celebration fires undiminished forever. The base token is always paid upstream
 * (childStore.recordCompletion); this hook only renders the feedback.
 *
 * Sub-300ms design: the ambient axes (ageMode/sensoryMode/reducedMotion) + the
 * per-child toggles are captured into a ref every render, so the imperative
 * `celebrate()` reads current values without re-subscribing. Haptics + the audio
 * cue facade + TTS are fired imperatively; only the overlay uses React state.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import type { CelebrationLevel } from "../src/domain/types";
import { fireHaptic, type HapticCue } from "../src/services/haptics";
import { playCue, type CueId } from "../src/services/playCue";
import { speak } from "../src/services/tts";
import {
  resolveCelebration,
  type CelebrationSalience,
} from "../src/theme/resolveCelebration";
import { resolveEffectiveReducedMotion } from "../src/theme/resolveTokens";
import { useThemeInputs } from "../src/theme/ThemeProvider";
import { useReducedMotion } from "../src/theme/useReducedMotion";

/** Per-child output toggles (each channel independently respected). */
export interface CelebrationToggles {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  /** TTS praise (spoken-labels setting); independent of soundEnabled */
  ttsEnabled: boolean;
  /** the non-gamified clamp (strongest) */
  calmMode?: boolean;
  /** inside parent-set quiet hours -> softened */
  quietHours?: boolean;
}

/** One celebratory moment the runner asks for. */
export interface CelebrationMoment {
  salience: CelebrationSalience;
  /** spoken praise + on-overlay line (resolved by the caller via resolveContent) */
  copy: string;
  /** the just-earned token delta, shown as "+N" */
  tokenDelta?: number;
  /** the occasional DETERMINISTIC bonus (never Math.random) -> may step size UP */
  bonus?: boolean;
  /** per-moment overrides (else taken from the toggles) */
  calmMode?: boolean;
  quietHours?: boolean;
}

/** The active overlay payload (null when nothing is celebrating). */
export interface ActiveCelebration {
  /** bumped each trigger so the overlay remounts + restarts its animations */
  key: number;
  level: CelebrationLevel;
  salience: CelebrationSalience;
  copy: string;
  tokenDelta: number;
}

const CUE_BY_SALIENCE: Record<CelebrationSalience, CueId> = {
  step: "step.done",
  routineComplete: "routine.complete",
  levelUp: "levelup",
  newCollectible: "reward.redeem", // a new collectible = a soft "unlock" chord
};

/** How long the in-place overlay stays up per size (auto-dismiss). doc 61 §8. */
const DURATION_BY_LEVEL: Record<CelebrationLevel, number> = {
  full: 1100,
  medium: 800,
  gentle: 650,
  calm: 500,
};

/**
 * Map a resolved (level × salience) to a POSITIVE-ONLY haptic cue (doc 61
 * §10.1). The softened clamps (gentle/calm) get a single Light "tap"; a full
 * routine-complete / level-up gets its richer success sequence — never a
 * Warning/Error toward a child (the haptics service defines no such cue).
 */
function hapticCueFor(level: CelebrationLevel, salience: CelebrationSalience): HapticCue {
  if (level === "gentle" || level === "calm") return "tap"; // one light haptic (§8.4)
  if (salience === "levelUp") return "levelUp";
  if (salience === "routineComplete" || salience === "newCollectible") return "routineComplete";
  return "done";
}

export interface UseCelebration {
  /** the active overlay payload, or null */
  celebration: ActiveCelebration | null;
  /** resolve the size for a moment WITHOUT firing (size from resolver only) */
  resolveLevel: (moment: Pick<CelebrationMoment, "salience" | "bonus" | "calmMode" | "quietHours">) => CelebrationLevel;
  /** fire only the imperative sensory cues (haptic + sound + TTS); no overlay */
  fireCues: (level: CelebrationLevel, salience: CelebrationSalience, copy?: string) => void;
  /** fire cues AND show the in-place overlay; returns the resolved size */
  celebrate: (moment: CelebrationMoment) => CelebrationLevel;
  dismiss: () => void;
}

export function useCelebration(toggles: CelebrationToggles): UseCelebration {
  const inputs = useThemeInputs();
  const osReducedMotion = useReducedMotion();
  // Effective reduced-motion = OS ∨ persisted per-child/global, so a Settings
  // "Reduced motion" toggle also clamps the celebration SIZE (§2.3), not just the
  // OS flag — matching the confetti/motion zeroing that flows via resolveTokens.
  const reducedMotion = resolveEffectiveReducedMotion(inputs.reducedMotion, false, osReducedMotion);

  // capture latest ambient axes + toggles for the imperative (sub-300ms) path
  const ref = useRef({ inputs, reducedMotion, toggles });
  ref.current = { inputs, reducedMotion, toggles };

  const [celebration, setCelebration] = useState<ActiveCelebration | null>(null);
  const keyRef = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const resolveLevel = useCallback(
    (moment: Pick<CelebrationMoment, "salience" | "bonus" | "calmMode" | "quietHours">): CelebrationLevel => {
      const { inputs: i, reducedMotion: rm, toggles: tg } = ref.current;
      return resolveCelebration({
        ageMode: i.ageMode,
        sensoryMode: i.sensoryMode,
        reducedMotion: rm,
        salience: moment.salience,
        calmMode: moment.calmMode ?? tg.calmMode ?? false,
        quietHours: moment.quietHours ?? tg.quietHours ?? false,
        bonus: moment.bonus,
      });
    },
    [],
  );

  const fireCues = useCallback(
    (level: CelebrationLevel, salience: CelebrationSalience, copy?: string): void => {
      const { toggles: tg, inputs: i } = ref.current;
      // doc 61 §8.1 order: haptic + sound at t=0; spoken praise lands ~300ms
      // (speak() interrupts any in-flight utterance so rapid taps don't queue).
      fireHaptic(hapticCueFor(level, salience), { enabled: tg.hapticsEnabled });
      if (tg.soundEnabled) playCue(CUE_BY_SALIENCE[salience]);
      if (copy && tg.ttsEnabled) speak(copy, { ageMode: i.ageMode, enabled: true });
    },
    [],
  );

  const celebrate = useCallback(
    (moment: CelebrationMoment): CelebrationLevel => {
      const level = resolveLevel(moment);
      fireCues(level, moment.salience, moment.copy);
      keyRef.current += 1;
      setCelebration({
        key: keyRef.current,
        level,
        salience: moment.salience,
        copy: moment.copy,
        tokenDelta: moment.tokenDelta ?? 0,
      });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCelebration(null), DURATION_BY_LEVEL[level]);
      return level;
    },
    [resolveLevel, fireCues],
  );

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setCelebration(null);
  }, []);

  return { celebration, resolveLevel, fireCues, celebrate, dismiss };
}
