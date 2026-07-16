/**
 * theme/resolveCapabilities.ts — [extracted v1 → @tiny-bubbles/shared, M1.1b] capability flags (doc 65 §3.3, doc 66 M2).
 *
 * Components read FLAGS, never the raw `ageMode` string — this keeps screens
 * mode-agnostic and lets a future band (teen 13+) drop in with zero component
 * rewrites (doc 65 §7.7).
 *
 * `ageMode` provides DEFAULTS; the high-churn axes are INDEPENDENTLY parent-
 * overridable (doc 66 §1b.6): `companionStyle` (drives `companionFraming`),
 * `textFirst` (drives `textPrimary`), and the three granular customization
 * booleans that REPLACE the old `customizationDepth` string. `delegateToChild`,
 * `canAddTasks`, and `moodCheckin` are parent-grantable on top of age defaults.
 *
 * w8 (M1.1): `neuroProfile` joins `ageMode` as a resolver INPUT (never a
 * component branch — the neuro-golden-rule gate enforces it). The preset
 * composes BELOW explicit overrides and ABOVE the ageMode base
 * (02-architecture §3.2); with `neuroProfile` ABSENT the output is
 * byte-identical to pre-w8 (NEUTRAL preset, §8 #13 — proven in
 * `resolveCapabilities.test.ts`).
 *
 * Pure + unit-testable.
 */
import { resolveNeuroPreset } from "./resolveNeuroPreset";

import type {
  AgeMode,
  CelebrationLevel,
  CompanionStyle,
  FeedbackTempo,
  NeuroProfile,
  NoveltyMode,
} from "../domain/types";

export interface ModeCapabilities {
  /** TTS on by default (young: pervasive; older: on but quiet/mutable) */
  ttsDefault: boolean;
  /** text is the primary channel (from `textFirst`; young false / older true) */
  textPrimary: boolean;
  /** curated-autonomy cap (doc 61 §5.4): young 3, older 6 */
  maxChoices: 3 | 6;
  /** show a short multi-step agenda (older) vs one step at a time (young) */
  multiStepVisible: boolean;
  /** show numbers/charts/light stats (older) — never to a young non-reader */
  showNumbersAndCharts: boolean;
  /** the three granular customization grants (replace `customizationDepth`) */
  canPickColor: boolean;
  canPickAccessory: boolean;
  canPickTheme: boolean;
  /**
   * The child may SELF-REQUEST a reward (escrow request → parent approval). When
   * false, the reward menu still shows (aspirational "save up" is motivating) but
   * the request affordance becomes a calm "ask a grown-up" line — never a
   * lock/denied state (child-autonomy §2.1). Defaults true.
   */
  canPickReward: boolean;
  /**
   * The RESOLVED companion style (aging-up §3.2 + arch §6-C1). Exposed so
   * components stop round-tripping through `companionFraming` (which structurally
   * cannot represent `"avatar"`). `resolveContent("buddy.artVariant", {
   * companionStyle })` reads this. Consumed by aging-up AND child-autonomy.
   */
  companionStyle: CompanionStyle;
  /** framing of the companion, derived from `companionStyle` (doc 66 §1b.6 + aging-up) */
  companionFraming: "care" | "levelup" | "identity";
  /** parent may delegate authoring/customization to the child (older) */
  delegateToChild: boolean;
  /** child may propose tasks into a parent-approved queue (doc 66 §age fix #24) */
  canAddTasks: boolean;
  /** optional emoji mood check-in (older, opt-in) */
  moodCheckin: boolean;
  /**
   * Whether the calm breathing activity shows a curated PATTERN CHOOSER
   * (breathing-regulation §2.1/§4 #7). HARD-CEILING age default: young `false`
   * (one calm default pattern, no chooser — curated autonomy for non-readers);
   * older/preteen `true` (a curated 3-pattern picker). Not parent-overridable —
   * it is an age-appropriateness ceiling, not a grant.
   */
  breathingChoice: boolean;
  /**
   * Whether the OPTIONAL adjustable focus-intervals scaffold is AVAILABLE at all
   * (focus-intervals §2.0/§4 #11). HARD-CEILING age default: young `false` (a 4–7
   * non-reader never sees a timed focus session); older/preteen `true`. This gates
   * AVAILABILITY only — a parent must ALSO opt in via `ChildSettings.focusIntervals
   * .enabled` before any entry point renders. Not parent-overridable (an
   * age-appropriateness ceiling, like `showNumbersAndCharts`/`breathingChoice`).
   */
  focusIntervalsAvailable: boolean;

  // --- w8 (M1.1) neuroProfile-preset caps (02-architecture §3.4). Consumed as
  //     FLAGS by w5 (schedule/transition), w6 (regulation), w7 (Bloop), w2
  //     (persona ctx) — a feature surface never learns which profile is active.
  //     With `neuroProfile` absent these equal the NEUTRAL preset (v1 behavior).
  /** how the novelty layer behaves (quests/seasonal): deterministic | previewed | lively */
  noveltyMode: NoveltyMode;
  /** HARD `false` for every profile (§8 #14 — the kid always taps "ready") */
  autoAdvanceSteps: boolean;
  /** advance-warning + priming before a transition (autism/both default true) */
  transitionWarnings: boolean;
  /** celebration CEILING (dampens only — anti-shame; explicit settings still clamp downstream) */
  celebrationCeiling: CelebrationLevel;
  /** feedback pacing: calm (steady/identical) vs bright (fast/immediate) */
  feedbackTempo: FeedbackTempo;
  /** literal copy voice — no idioms/sarcasm (autism/both default true) */
  literalLanguage: boolean;
  /** novelty is opt-in + forewarned, never a surprise UI change (both default true) */
  previewNovelty: boolean;
  /** default AAC/Bloop input surface (aac/chips are PII-free by construction) */
  neuroInputModeDefault: "aac" | "chips" | "freeText";
}

export interface ResolveCapabilitiesInput {
  ageMode: AgeMode;
  /**
   * w8 (M1.1): the third axis. ABSENT ⇒ NEUTRAL preset ⇒ output byte-identical
   * to pre-w8 (§8 #13). Composes BELOW the explicit overrides, ABOVE the
   * ageMode base (§3.2).
   */
  neuroProfile?: NeuroProfile;
  /** independent override; defaults from ageMode if omitted */
  companionStyle?: CompanionStyle;
  /** independent override of textPrimary; defaults from ageMode if omitted */
  textFirst?: boolean;
  // parent-grantable overrides (each defaults from ageMode if omitted)
  ttsDefault?: boolean;
  canPickColor?: boolean;
  canPickAccessory?: boolean;
  canPickTheme?: boolean;
  /**
   * MASTER customization grant (child-autonomy §2.2). When false it forces the
   * three `canPick*` off (Color/Finish/Accessory sections hide); the Name field
   * stays ungated in `BuddyRoom`. Defaults true. Never strips owned cosmetics.
   */
  canCustomizeCompanion?: boolean;
  /** child may self-request a reward; when false the kid asks a grown-up (§2.1). Defaults true. */
  canPickReward?: boolean;
  delegateToChild?: boolean;
  canAddTasks?: boolean;
  moodCheckin?: boolean;
  // --- w8 (M1.1): explicit per-child overrides of the neuro-preset caps
  //     (precedence: explicit override > preset > base — §3.2). Each defaults
  //     from `resolveNeuroPreset(neuroProfile)` when omitted. NOTE: there is
  //     deliberately NO `autoAdvanceSteps` override — it is a hard safety
  //     ceiling, `false` for every profile (§8 #14), not a grant.
  noveltyMode?: NoveltyMode;
  transitionWarnings?: boolean;
  celebrationCeiling?: CelebrationLevel;
  feedbackTempo?: FeedbackTempo;
  literalLanguage?: boolean;
  previewNovelty?: boolean;
  neuroInputModeDefault?: "aac" | "chips" | "freeText";
}

/** Default companion style derived from age (doc 66 §1b.6 + aging-up §3.2). Overridable. */
export function defaultCompanionStyle(ageMode: AgeMode): CompanionStyle {
  if (ageMode === "young") return "cuddly";
  if (ageMode === "older") return "cool";
  return "avatar"; // preteen — the less-childish identity companion
}

/** Default text-first behavior derived from age (doc 66 §1b.6 + aging-up §3.2). Overridable. */
export function defaultTextFirst(ageMode: AgeMode): boolean {
  return ageMode !== "young"; // older + preteen are text-first
}

interface AgeCapBase {
  ttsDefault: boolean;
  maxChoices: 3 | 6;
  multiStepVisible: boolean;
  showNumbersAndCharts: boolean;
  canPickColor: boolean;
  canPickAccessory: boolean;
  canPickTheme: boolean;
  delegateToChild: boolean;
  canAddTasks: boolean;
  moodCheckin: boolean;
  breathingChoice: boolean;
  focusIntervalsAvailable: boolean;
}

const AGE_CAP_BASE: Record<AgeMode, AgeCapBase> = {
  young: {
    ttsDefault: true,
    maxChoices: 3,
    multiStepVisible: false,
    showNumbersAndCharts: false,
    canPickColor: true, // name + a curated color is age-appropriate autonomy
    canPickAccessory: false,
    canPickTheme: false,
    delegateToChild: false,
    canAddTasks: false,
    moodCheckin: false,
    breathingChoice: false, // young: one calm default pattern, no chooser
    focusIntervalsAvailable: false, // young: never a timed focus session (hard ceiling)
  },
  older: {
    ttsDefault: true, // on but quiet/mutable (older)
    maxChoices: 6,
    multiStepVisible: true,
    showNumbersAndCharts: true,
    canPickColor: true,
    canPickAccessory: true,
    canPickTheme: true,
    delegateToChild: false, // parent-grantable
    canAddTasks: false, // parent-grantable
    moodCheckin: false, // opt-in
    breathingChoice: true, // older: a curated 3-pattern picker
    focusIntervalsAvailable: true, // older: the optional focus scaffold is available
  },
  // preteen (~10-12): mirrors `older` but with MORE autonomy (identity/SDT) —
  // delegateToChild defaults TRUE. Tabs shell + numbers + full customization.
  preteen: {
    ttsDefault: true, // on but mutable (a preteen usually mutes it)
    maxChoices: 6,
    multiStepVisible: true,
    showNumbersAndCharts: true,
    canPickColor: true,
    canPickAccessory: true,
    canPickTheme: true,
    delegateToChild: true, // more autonomy than `older` (identity/SDT)
    canAddTasks: false, // still parent-grantable
    moodCheckin: false, // opt-in
    breathingChoice: true, // preteen: same curated picker as older
    focusIntervalsAvailable: true, // preteen: the optional focus scaffold is available
  },
};

export function resolveCapabilities(input: ResolveCapabilitiesInput): ModeCapabilities {
  const { ageMode } = input;
  const base = AGE_CAP_BASE[ageMode];
  // w8 (M1.1): the neuro preset layer — DEFAULTS ONLY, below the explicit
  // overrides. Absent neuroProfile ⇒ NEUTRAL_PRESET ⇒ pre-w8 output.
  const preset = resolveNeuroPreset(input.neuroProfile);

  const companionStyle = input.companionStyle ?? defaultCompanionStyle(ageMode);
  const textPrimary = input.textFirst ?? defaultTextFirst(ageMode);

  // 3-way framing derived from the resolved style (cuddly=care, cool=levelup,
  // avatar=identity). The identity tier is a reframing only — same monotonic data.
  const companionFraming =
    companionStyle === "cuddly" ? "care" : companionStyle === "cool" ? "levelup" : "identity";

  // The MASTER customization grant composes ON TOP of the granular age defaults:
  // when a parent turns "customize buddy" off, all three canPick* go false so the
  // Color/Finish/Accessory sections hide (Name stays ungated). Default allowed.
  const master = input.canCustomizeCompanion ?? true;

  return {
    ttsDefault: input.ttsDefault ?? base.ttsDefault,
    textPrimary,
    maxChoices: base.maxChoices,
    multiStepVisible: base.multiStepVisible,
    showNumbersAndCharts: base.showNumbersAndCharts,
    canPickColor: master && (input.canPickColor ?? base.canPickColor),
    canPickAccessory: master && (input.canPickAccessory ?? base.canPickAccessory),
    canPickTheme: master && (input.canPickTheme ?? base.canPickTheme),
    canPickReward: input.canPickReward ?? true,
    companionStyle,
    companionFraming,
    delegateToChild: input.delegateToChild ?? base.delegateToChild,
    canAddTasks: input.canAddTasks ?? base.canAddTasks,
    moodCheckin: input.moodCheckin ?? base.moodCheckin,
    breathingChoice: base.breathingChoice, // age ceiling — not parent-overridable
    focusIntervalsAvailable: base.focusIntervalsAvailable, // age ceiling — not overridable

    // w8 (M1.1) neuro-preset caps: explicit override > preset (> neutral).
    noveltyMode: input.noveltyMode ?? preset.noveltyMode,
    autoAdvanceSteps: false, // HARD ceiling for every profile (§8 #14) — never a grant
    transitionWarnings: input.transitionWarnings ?? preset.transitionWarnings,
    celebrationCeiling: input.celebrationCeiling ?? preset.celebrationCeiling,
    feedbackTempo: input.feedbackTempo ?? preset.feedbackTempo,
    literalLanguage: input.literalLanguage ?? preset.literalLanguage,
    previewNovelty: input.previewNovelty ?? preset.previewNovelty,
    neuroInputModeDefault: input.neuroInputModeDefault ?? preset.neuroInputModeDefault,
  };
}
