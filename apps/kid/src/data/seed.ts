/**
 * src/data/seed.ts — apply-once seed packs + per-child starter seeding (doc 62 §14).
 *
 * Two layers:
 *   1. App-global pack tracking (`tb/seedState`): which seed packs/version have
 *      been applied, so built-ins are re-merged by id on migration without
 *      clobbering edits, and never double-applied.
 *   2. Per-child seeding (`seedChild`): on first child creation, instantiate the
 *      3 starter routines (with their steps), the reward menu, and a companion.
 *
 * Pure: `now` + an `newId` factory are passed in (the store supplies real ones),
 * so seeding is deterministic and unit-testable with no device.
 */
import type {
  AgeMode,
  CompanionState,
  CompanionStyle,
  Reward,
  Routine,
  SeedState,
  Task,
  TaskTemplate,
} from "../domain/types";
import { freshCompanion } from "../domain/constants";

import { COMPANION_SEEDS, COMPANION_SEEDS_BY_SPECIES } from "./buddyCosmetics";
import { REWARD_PRESETS } from "./rewardPresets";
import { ROUTINE_TEMPLATES } from "./routinePresets";
import { TASK_TEMPLATES_BY_ID } from "./taskTemplates";

export const SEED_VERSION = 1;
export const SEED_PACKS = ["tasks.v1", "routines.v1", "rewards.v1", "companions.v1"] as const;
export type SeedPackId = (typeof SEED_PACKS)[number];

export function freshSeedState(): SeedState {
  return { seedVersion: SEED_VERSION, appliedPacks: [], perChildSeeded: [] };
}

/** Mark all base packs applied (idempotent). App-global, doc 62 §14. */
export function applyBasePacks(state: SeedState): SeedState {
  const appliedPacks = Array.from(new Set([...state.appliedPacks, ...SEED_PACKS]));
  return { ...state, seedVersion: SEED_VERSION, appliedPacks };
}

export function isChildSeeded(state: SeedState, childId: string): boolean {
  return state.perChildSeeded.includes(childId);
}

export function markChildSeeded(state: SeedState, childId: string): SeedState {
  if (state.perChildSeeded.includes(childId)) return state;
  return { ...state, perChildSeeded: [...state.perChildSeeded, childId] };
}

// ---------------------------------------------------------------------------
// Instantiation helpers.
// ---------------------------------------------------------------------------

export interface TaskFromTemplateOpts {
  id: string;
  childId: string;
  routineId: string | null;
  order: number;
  now: number;
}

/** Instantiate a per-child `Task` from a library `TaskTemplate` (doc 62 §5/§14). */
export function taskFromTemplate(template: TaskTemplate, opts: TaskFromTemplateOpts): Task {
  return {
    id: opts.id,
    childId: opts.childId,
    templateId: template.id,
    routineId: opts.routineId,
    order: opts.order,
    label: { ...template.label },
    verification: { ...template.verification },
    tokenValue: template.suggestedTokenValue,
    ...(template.timerSeconds !== undefined ? { timerSeconds: template.timerSeconds } : {}),
    deadline: template.deadline,
    schedule: { ...template.schedule, daysOfWeek: [...template.schedule.daysOfWeek] },
    status: "todo",
    createdAt: opts.now,
    updatedAt: opts.now,
    archived: false,
  };
}

/** Which step template ids apply to a given age mode for a routine (doc 62 §14). */
function stepsForAge(
  stepTemplateIds: string[],
  ageOnly: Partial<Record<string, AgeMode>> | undefined,
  ageMode: AgeMode,
): string[] {
  if (!ageOnly) return stepTemplateIds;
  return stepTemplateIds.filter((id) => {
    const only = ageOnly[id];
    return only === undefined || only === ageMode;
  });
}

export interface SeedChildInput {
  childId: string;
  ageMode: AgeMode;
  companionStyle: CompanionStyle;
  now: number;
  /** id factory (the store supplies a crypto-backed one; tests supply a counter) */
  newId: () => string;
  /** optional companion name override (autonomy: the child can rename) */
  companionName?: string;
}

export interface SeededChild {
  routines: Routine[];
  /** routine steps (Tasks with a routineId) for all seeded routines */
  tasks: Task[];
  rewards: Reward[];
  companion: CompanionState;
}

/**
 * Build the starter content for a brand-new child (doc 62 §14). Routines are
 * created `active: false` until the parent confirms; the reward menu is copied;
 * a companion is instantiated with a placeholder name the child renames.
 */
export function seedChild(input: SeedChildInput): SeededChild {
  const { childId, ageMode, companionStyle, now, newId } = input;

  const routines: Routine[] = [];
  const tasks: Task[] = [];

  for (const rt of ROUTINE_TEMPLATES) {
    const routineId = newId();
    const stepTemplateIds = stepsForAge(rt.stepTemplateIds, rt.ageOnly, ageMode);
    const stepIds: string[] = [];

    stepTemplateIds.forEach((templateId, order) => {
      const template = TASK_TEMPLATES_BY_ID[templateId];
      if (!template) return; // defensive: skip an unknown template id
      const task = taskFromTemplate(template, {
        id: newId(),
        childId,
        routineId,
        order,
        now,
      });
      tasks.push(task);
      stepIds.push(task.id);
    });

    routines.push({
      id: routineId,
      childId,
      label: { ...rt.label },
      stepIds,
      schedule: { ...rt.schedule, daysOfWeek: [...rt.schedule.daysOfWeek] },
      // carry the preset's daypart so the time-driven kid flow can select it
      ...(rt.daypart !== undefined ? { daypart: rt.daypart } : {}),
      mode: "gamified",
      active: false, // parent/onboarding confirms before it goes live (doc 70 §E3b)
      createdAt: now,
      updatedAt: now,
    });
  }

  const rewards: Reward[] = REWARD_PRESETS.map((preset) => ({
    ...preset,
    label: { ...preset.label },
    childId,
    createdAt: now,
    updatedAt: now,
  }));

  // Pick the species from companionStyle (NOT ageMode) — doc 66 §1b.7.
  const seed =
    COMPANION_SEEDS.find((c) => c.style === companionStyle) ?? COMPANION_SEEDS[0];
  const speciesSeed = COMPANION_SEEDS_BY_SPECIES[seed.speciesId] ?? seed;
  const companion = freshCompanion(childId, {
    speciesId: speciesSeed.speciesId,
    name: input.companionName ?? speciesSeed.defaultName,
    now,
    baseColor: speciesSeed.defaultCustomization.baseColor,
    accentColor: speciesSeed.defaultCustomization.accentColor,
    starterCosmeticIds: speciesSeed.starterCosmeticIds,
  });

  return { routines, tasks, rewards, companion };
}
