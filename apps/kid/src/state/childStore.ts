/**
 * src/state/childStore.ts — per-child profiles + economy/progress (persisted).
 *
 * Owns the per-child slices that are NOT the task/reward/companion stores:
 * profiles, token ledgers, forgiving progress, reinforcement counters, and the
 * opt-in mood/event logs. Also tracks the app-global `seed` state (which packs
 * are applied + which children have been seeded).
 *
 * The brain of the token economy lives in `recordCompletion`, which composes the
 * pure domain functions (gamification.earn + reinforcement + streaks) into one
 * atomic update — base token ALWAYS paid, only the bonus cadence thins, the
 * streak is forgiving (freeze/pause, never zero). Companion mood/nurture is
 * wired separately in buddyStore (see gameplay.ts orchestrator).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  EVENTS_CAP,
  MOODS_CAP,
  defaultChildSettings,
  defaultProgressConfig,
  freshLedger,
  freshProgress,
  freshReinforcementState,
} from "../domain/constants";
import { earn } from "../domain/gamification";
import { computeReinforcement, habitKeyFor, newHabit } from "../domain/reinforcement";
import { applyCompletionToStreak } from "../domain/streaks";
import type {
  ActivityEvent,
  AgeMode,
  ChildIndexEntry,
  ChildProfile,
  ChildSettings,
  MoodLog,
  ProgressState,
  ReinforcementState,
  SeedState,
  Task,
  TokenEntry,
  TokenLedger,
  TokenReason,
} from "../domain/types";
import { SEED_PACKS, freshSeedState } from "../data/seed";
import { createTbPersistOptions, registerPersistedStore } from "../storage/persist";
// NOTE: deliberate module cycle childStore ↔ cloudSync (the shared emit seam,
// w1 M1.2 §2.4). Safe: cloudSync only touches childStore INSIDE function
// bodies (call time), never at module init — same live-binding pattern jest
// (CJS) and Metro both support.
import { emitActivity } from "../sync/cloudSync";

import { newId, now } from "./ids";

export interface CreateChildInput {
  displayName: string;
  ageMode: AgeMode;
  timeZone: string;
  avatarColor?: string;
  /** partial overrides applied on top of the age-derived defaults */
  settings?: Partial<ChildSettings>;
}

export interface CompletionResult {
  entry: TokenEntry;
  bonus: boolean;
  bonusTokens: number;
  lifetimeEarned: number;
  progress: ProgressState;
}

export interface ChildStoreState {
  index: ChildIndexEntry[];
  profiles: Record<string, ChildProfile>;
  ledgers: Record<string, TokenLedger>;
  progress: Record<string, ProgressState>;
  reinforcement: Record<string, ReinforcementState>;
  moods: Record<string, MoodLog[]>;
  events: Record<string, ActivityEvent[]>;
  seed: SeedState;

  // lifecycle
  createChild: (input: CreateChildInput) => string;
  updateProfile: (cid: string, patch: Partial<ChildProfile>) => void;
  updateSettings: (cid: string, patch: Partial<ChildSettings>) => void;
  archiveChild: (cid: string) => void;

  // low-level slice setters (used by the gameplay orchestrator / redemption)
  setLedger: (cid: string, ledger: TokenLedger) => void;
  setProgress: (cid: string, progress: ProgressState) => void;
  setReinforcement: (cid: string, state: ReinforcementState) => void;

  // economy / progress
  recordCompletion: (cid: string, task: Task) => CompletionResult | null;
  /**
   * Add tokens outside the core-loop payout (parent gift, or a DETERMINISTIC
   * quest/spotlight reward when `reason: "quest_reward"` — novelty-refresh §4.2).
   * `reason` defaults to `"parent_gift"` so existing callers are unchanged. Only
   * ever ADDS (never a debt); lifetime totals move up with it.
   */
  giftTokens: (cid: string, amount: number, note?: string, reason?: TokenReason) => void;

  // opt-in logs (caller gates on parentSettings.localAnalyticsEnabled / moodLoggingEnabled)
  addMood: (cid: string, log: Omit<MoodLog, "id" | "childId">) => void;
  addEvent: (cid: string, event: Omit<ActivityEvent, "id" | "childId">) => void;

  // seed tracking
  applyBasePacks: () => void;
  markChildSeeded: (cid: string) => void;
}

export const useChildStore = create<ChildStoreState>()(
  persist(
    (set, get) => ({
      index: [],
      profiles: {},
      ledgers: {},
      progress: {},
      reinforcement: {},
      moods: {},
      events: {},
      seed: freshSeedState(),

      createChild: (input) => {
        const ts = now();
        const id = newId();
        const ageMode = input.ageMode;
        const settings: ChildSettings = {
          ...defaultChildSettings(ageMode),
          ...input.settings,
        };
        const avatarColor = input.avatarColor ?? "#5BC8F5";
        const profile: ChildProfile = {
          id,
          displayName: input.displayName,
          ageMode,
          avatarColor,
          timeZone: input.timeZone,
          createdAt: ts,
          updatedAt: ts,
          archived: false,
          settings,
        };
        const indexEntry: ChildIndexEntry = {
          id,
          displayName: input.displayName,
          ageMode,
          avatarColor,
          createdAt: ts,
          archived: false,
        };
        set((s) => ({
          index: [...s.index, indexEntry],
          profiles: { ...s.profiles, [id]: profile },
          ledgers: { ...s.ledgers, [id]: freshLedger(id) },
          progress: { ...s.progress, [id]: freshProgress(id, defaultProgressConfig(ageMode)) },
          reinforcement: { ...s.reinforcement, [id]: freshReinforcementState(id) },
          moods: { ...s.moods, [id]: [] },
          events: { ...s.events, [id]: [] },
        }));
        return id;
      },

      updateProfile: (cid, patch) =>
        set((s) => {
          const cur = s.profiles[cid];
          if (!cur) return s;
          const next = { ...cur, ...patch, updatedAt: now() };
          // keep the lightweight index in sync for the fields it mirrors
          const index = s.index.map((e) =>
            e.id === cid
              ? {
                  ...e,
                  displayName: next.displayName,
                  ageMode: next.ageMode,
                  avatarColor: next.avatarColor,
                  archived: next.archived,
                }
              : e,
          );
          return { profiles: { ...s.profiles, [cid]: next }, index };
        }),

      updateSettings: (cid, patch) =>
        set((s) => {
          const cur = s.profiles[cid];
          if (!cur) return s;
          const next = {
            ...cur,
            settings: { ...cur.settings, ...patch },
            updatedAt: now(),
          };
          return { profiles: { ...s.profiles, [cid]: next } };
        }),

      archiveChild: (cid) =>
        set((s) => ({
          index: s.index.map((e) => (e.id === cid ? { ...e, archived: true } : e)),
          profiles: s.profiles[cid]
            ? { ...s.profiles, [cid]: { ...s.profiles[cid], archived: true, updatedAt: now() } }
            : s.profiles,
        })),

      setLedger: (cid, ledger) => set((s) => ({ ledgers: { ...s.ledgers, [cid]: ledger } })),
      setProgress: (cid, progress) => set((s) => ({ progress: { ...s.progress, [cid]: progress } })),
      setReinforcement: (cid, state) =>
        set((s) => ({ reinforcement: { ...s.reinforcement, [cid]: state } })),

      recordCompletion: (cid, task) => {
        const s = get();
        const profile = s.profiles[cid];
        const ledger = s.ledgers[cid];
        const progress = s.progress[cid];
        const reinforcement = s.reinforcement[cid];
        if (!profile || !ledger || !progress || !reinforcement) return null;

        const ts = now();
        const habitKey = habitKeyFor(task);
        const habit = reinforcement.habits[habitKey] ?? newHabit(habitKey);

        // Reinforcement: only the BONUS cadence thins; base is always paid below.
        const r = computeReinforcement({
          habit,
          config: profile.settings.reinforcement,
          baseTokenValue: task.tokenValue,
          now: ts,
        });

        // Earn: base token ALWAYS paid + any deterministic bonus, as one entry.
        const { ledger: nextLedger, entry } = earn(ledger, {
          id: newId(),
          ts,
          delta: task.tokenValue + r.bonusTokens,
          reason: "task_complete",
          refId: task.id,
          baseValue: task.tokenValue,
          multiplier: r.multiplier,
          note: task.label.spokenLabel,
        });

        // Progress: forgiving, timezone-aware streak (freeze/pause, never zero).
        const nextProgress = applyCompletionToStreak(progress, {
          tz: profile.timeZone,
          now: ts,
        });

        const nextReinforcement: ReinforcementState = {
          ...reinforcement,
          habits: { ...reinforcement.habits, [habitKey]: r.habit },
        };

        set((st) => ({
          ledgers: { ...st.ledgers, [cid]: nextLedger },
          progress: { ...st.progress, [cid]: nextProgress },
          reinforcement: { ...st.reinforcement, [cid]: nextReinforcement },
        }));

        return {
          entry,
          bonus: r.bonus,
          bonusTokens: r.bonusTokens,
          lifetimeEarned: nextLedger.lifetimeEarned,
          progress: nextProgress,
        };
      },

      giftTokens: (cid, amount, note, reason = "parent_gift") =>
        set((s) => {
          const ledger = s.ledgers[cid];
          if (!ledger || amount <= 0) return s;
          const { ledger: next } = earn(ledger, {
            id: newId(),
            ts: now(),
            delta: amount,
            reason,
            ...(note !== undefined ? { note } : {}),
          });
          return { ledgers: { ...s.ledgers, [cid]: next } };
        }),

      addMood: (cid, log) => {
        set((s) => {
          const list = s.moods[cid] ?? [];
          const entry: MoodLog = { ...log, id: newId(), childId: cid };
          return { moods: { ...s.moods, [cid]: [entry, ...list].slice(0, MOODS_CAP) } };
        });
        // One-way-up mirror via the SHARED seam (w1 M1.2 §2.4) — fail-closed
        // no-op unless cloudSyncEnabled + paired. COUNTS/ENUMS ONLY: the free
        // -text `note` NEVER rides along. A w6 emotion-ID log (additive
        // `emotionCore` field, M4.3) mirrors as `emotion_logged`; the v1
        // check-in mirrors as `mood_log`.
        const emotionCore = (log as { emotionCore?: unknown }).emotionCore;
        if (typeof emotionCore === "string") {
          emitActivity("emotion_logged", { emotion: emotionCore }, { cid, atMs: log.ts });
        } else {
          emitActivity(
            "mood_log",
            {
              ...(log.mood !== undefined ? { mood: String(log.mood) } : {}),
              ...(typeof log.energy === "number" ? { energy: log.energy } : {}),
            },
            { cid, atMs: log.ts },
          );
        }
      },

      addEvent: (cid, event) =>
        set((s) => {
          const list = s.events[cid] ?? [];
          const entry: ActivityEvent = { ...event, id: newId(), childId: cid };
          return { events: { ...s.events, [cid]: [entry, ...list].slice(0, EVENTS_CAP) } };
        }),

      applyBasePacks: () =>
        set((s) => ({
          seed: {
            ...s.seed,
            appliedPacks: Array.from(new Set([...s.seed.appliedPacks, ...SEED_PACKS])),
          },
        })),

      markChildSeeded: (cid) =>
        set((s) =>
          s.seed.perChildSeeded.includes(cid)
            ? s
            : { seed: { ...s.seed, perChildSeeded: [...s.seed.perChildSeeded, cid] } },
        ),
    }),
    createTbPersistOptions<ChildStoreState>({
      name: "children",
      partialize: (s) => ({
        index: s.index,
        profiles: s.profiles,
        ledgers: s.ledgers,
        progress: s.progress,
        reinforcement: s.reinforcement,
        moods: s.moods,
        events: s.events,
        seed: s.seed,
      }) as ChildStoreState,
    }),
  ),
);

registerPersistedStore(useChildStore.persist);
