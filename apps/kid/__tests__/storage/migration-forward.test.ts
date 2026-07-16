/**
 * __tests__/storage/migration-forward.test.ts — the golden forward-migration
 * regression (production-readiness §3.3 rule 4 / 02-architecture §2.5).
 *
 * This is the SHARED safety net that lets every feature honestly claim "additive,
 * no bump". A realistic assembled `RawState` blob (one child: ledger, progress,
 * companion, tasks + the parent-global settings/entitlement) is run through
 * `migrateAndRepair(fixture, 1)` and asserted to:
 *   (a) never throw,
 *   (b) preserve every existing value (nothing lost or altered),
 *   (c) keep the anti-shame invariants (valid-positive mood, balances ≥ 0, no
 *       `failed` status, longest ≥ current streak), and
 *   (d) carry the Wave-A additive fields forward untouched — M-A1's
 *       `Entitlement.trialEndReminderAt`, M-A2's `AgeMode`/`CompanionStyle` union
 *       widenings (`preteen`/`avatar`), M-A3's `ParentSettings.locale`, and
 *       M-A4's optional `AppMeta.lastRecoveredAt`.
 *
 * EXTENSION CONTRACT: every later milestone that adds a persisted field/slice
 * (M-B* / M-C* new `tb/plans` · `tb/chores` · `tb/quests`, mood `moodCheckinEnabled`,
 * timer `stepTimerStartedAt`, …) MUST extend this fixture + assert it survives.
 */
import { describe, expect, it } from "@jest/globals";

import {
  DEFAULT_COMPANION_MOOD,
  type RawState,
  VALID_COMPANION_MOODS,
  clone,
  migrateAndRepair,
} from "../../src/storage/migrations";
import { SCHEMA_VERSION } from "../../src/storage/schemaVersion";

/**
 * A realistic v1-era assembled blob, populated with the Wave-A additive fields so
 * the round-trip proves they survive. Extend (do not rewrite) as new slices land.
 */
function goldenFixture(): RawState {
  return {
    meta: {
      schemaVersion: 1,
      activeChildId: "c1",
      installId: "install-abc",
      // M-A4: optional ErrorBoundary breadcrumb (additive, no bump).
      lastRecoveredAt: 1_700_000_500_000,
    },
    // M-A3: household locale rides on the parent-global settings slice.
    // M-B1: optional `timerSoundEnabled` (opt-in timer chime, default false).
    // M-B5: optional `quickChildSwitch` (ungated kid switcher opt-in, default false).
    parentSettings: {
      locale: "en",
      moodLoggingEnabled: false,
      localAnalyticsEnabled: false,
      timerSoundEnabled: false,
      quickChildSwitch: false,
      quietHours: { start: "20:00", end: "07:00" },
    },
    // M-A1: the honest trial-end reminder idempotency marker.
    entitlement: {
      tier: "premium",
      source: "trial",
      trialStartedAt: 1_699_000_000_000,
      trialEndsAt: 1_700_000_000_000,
      premiumSince: 1_699_000_000_000,
      mockPurchases: [{ id: "p1", sku: "annual", mockedAt: 1_699_000_000_000, plan: "annual" }],
      trialEndReminderAt: 1_699_913_600_000,
      updatedAt: 1_699_000_000_000,
    },
    childIndex: [{ id: "c1", displayName: "Ari" }],
    children: {
      c1: {
        // M-A2: widened unions written into the profile slice (preserved as
        // unknown-tolerant keys by the repair layer).
        profile: {
          id: "c1",
          displayName: "Ari",
          ageMode: "preteen",
          // M1.1 (w8): the OPTIONAL third theming axis — union value + one
          // optional field only (additive, no bump). Absent ⇒ neutral preset;
          // a set value must survive the round-trip untouched.
          neuroProfile: "both",
          // M-B4: optional per-child mood consent (additive, default true when unset).
          // M-C1: optional per-child soundscape prefs (additive, no bump).
          settings: {
            companionStyle: "avatar",
            locale: "en",
            moodCheckinEnabled: false,
            soundscape: {
              volume: 0.7,
              calmSceneId: "waves",
              focusSceneId: null,
              focusDuringTasks: true,
            },
            // M-C2: optional breathing prefs (additive, no bump) — a valid curated
            // pattern id + the opt-in pacing flag; both must survive untouched.
            breathingPatternId: "box",
            breathingPacingHaptics: true,
            // M-C3: optional focus-interval config (additive, no bump) — valid curated
            // minutes + flags; must survive untouched.
            focusIntervals: {
              enabled: true,
              focusMinutes: 25,
              breakMinutes: 10,
              movementBreaks: false,
              chime: false,
            },
            // M-C4: optional novelty-quest toggle (additive, no bump) — must survive.
            questsEnabled: false,
            // M1.2 (w1): the optional cloud-sync / Bloop-control mirror fields
            // (all additive, no bump) — set values must survive untouched; a
            // profile WITHOUT them stays valid (offline default).
            bloopEnabled: false,
            bloopInputMode: "chips",
            retentionDays: 30,
            crisisLocale: "es-MX",
            cloudSyncEnabled: true,
            firestoreChildId: "cloud-kid-1",
          },
        },
        companion: {
          mood: "proud",
          bondLevel: 6,
          growthStage: 3,
          speciesId: "nova",
          name: "Nova",
        },
        ledger: {
          balance: 18,
          heldTokens: 2,
          lifetimeEarned: 40,
          lifetimeSpent: 22,
          entries: [{ id: "e1", delta: 1, reason: "task_complete" }],
        },
        progress: {
          cumulativeCount: 40,
          currentStreakDays: 5,
          longestStreakDays: 9,
          paused: false,
        },
        tasks: [
          { id: "t1", status: "done" },
          { id: "t2", status: "todo" },
          { id: "t3", status: "skipped" },
          // M-B1: a task carrying a visual-transition-timer budget (positive → kept).
          { id: "t4", status: "todo", timerSeconds: 120 },
          // M-B5: a task MATERIALISED from a rotating chore — the optional provenance
          // fields (choreId + choreHolderDay) must survive repairTask untouched.
          { id: "t5", status: "todo", choreId: "chore-1", choreHolderDay: "2026-06-15" },
          // M-B2: a task carrying an optional Verification block (photo-verify). The
          // optional field (mode + local photoUri) must survive repairTask untouched;
          // the photoUri is a device-local file:// path, never a remote URL.
          {
            id: "t6",
            status: "done",
            verification: { mode: "photo", photoUri: "file:///caches/tb-photos/1700000000000.jpg" },
          },
        ],
        // M-B4: opt-in mood logs with the additive optional fields (daypart /
        // energyScaleMax / source). Optional → no bump; must survive untouched.
        moods: [
          {
            id: "md1",
            childId: "c1",
            ts: 1_700_000_100_000,
            day: "2026-06-15",
            mood: "good",
            energy: 3,
            energyScaleMax: 3,
            daypart: "morning",
            source: "kid",
          },
        ],
      },
    },
  };
}

describe("migration-forward golden fixture (§3.3)", () => {
  it("round-trips through migrateAndRepair(fixture, 1) without throwing", () => {
    const fixture = goldenFixture();
    expect(() => migrateAndRepair(fixture, 1)).not.toThrow();
  });

  it("stays at SCHEMA_VERSION 1 with an empty migration registry (additive-only)", () => {
    expect(SCHEMA_VERSION).toBe(1);
    // A no-op migration at v1 leaves the blob structurally intact.
    const out = migrateAndRepair(goldenFixture(), 1);
    expect(out.children!.c1.ledger!.lifetimeEarned).toBe(40);
  });

  it("preserves every existing value (nothing lost or altered)", () => {
    const out = migrateAndRepair(goldenFixture(), 1);
    const c1 = out.children!.c1;
    expect(c1.ledger!.balance).toBe(18);
    expect(c1.ledger!.heldTokens).toBe(2);
    expect(c1.ledger!.lifetimeEarned).toBe(40);
    expect(c1.ledger!.lifetimeSpent).toBe(22);
    expect(c1.progress!.cumulativeCount).toBe(40);
    expect(c1.progress!.currentStreakDays).toBe(5);
    expect(c1.progress!.longestStreakDays).toBe(9);
    expect(c1.companion!.mood).toBe("proud");
    expect(c1.companion!.bondLevel).toBe(6);
    expect((c1.tasks as Array<{ status: string }>).map((t) => t.status)).toEqual([
      "done",
      "todo",
      "skipped",
      "todo",
      "todo",
      "done",
    ]);
  });

  it("carries the Wave-A additive fields forward untouched", () => {
    const out = migrateAndRepair(goldenFixture(), 1);
    // M-A1: trial-end reminder marker survives.
    expect(out.entitlement!.trialEndReminderAt).toBe(1_699_913_600_000);
    // M-A2: widened union values survive (preteen / avatar / nova).
    const profile = out.children!.c1.profile as Record<string, unknown>;
    expect(profile.ageMode).toBe("preteen");
    // M1.1 (w8): the optional neuroProfile axis survives untouched — additive,
    // SCHEMA_VERSION still 1, MIGRATIONS [] (asserted above). A profile
    // WITHOUT the field stays valid too (the corrupted-variant test's blob
    // predates the axis entirely).
    expect(profile.neuroProfile).toBe("both");
    expect((profile.settings as Record<string, unknown>).companionStyle).toBe("avatar");
    expect(out.children!.c1.companion!.speciesId).toBe("nova");
    // M-A3: locale survives.
    expect((out.parentSettings as Record<string, unknown>).locale).toBe("en");
    // M-A4: lastRecoveredAt survives.
    expect((out.meta as Record<string, unknown>).lastRecoveredAt).toBe(1_700_000_500_000);
    // M-B1: optional timer fields survive (parent chime flag + a task's budget).
    expect((out.parentSettings as Record<string, unknown>).timerSoundEnabled).toBe(false);
    const timedTask = (out.children!.c1.tasks as Array<Record<string, unknown>>).find(
      (t) => t.id === "t4",
    );
    expect(timedTask?.timerSeconds).toBe(120);
    // M-B4: per-child mood consent + the additive MoodLog fields survive untouched.
    expect((profile.settings as Record<string, unknown>).moodCheckinEnabled).toBe(false);
    const moods = out.children!.c1.moods as Array<Record<string, unknown>>;
    expect(moods).toHaveLength(1);
    expect(moods[0].daypart).toBe("morning");
    expect(moods[0].energyScaleMax).toBe(3);
    expect(moods[0].source).toBe("kid");
    // M-B5: the ungated-kid-switcher opt-in + the rotating-chore Task provenance survive.
    expect((out.parentSettings as Record<string, unknown>).quickChildSwitch).toBe(false);
    const choreTask = (out.children!.c1.tasks as Array<Record<string, unknown>>).find(
      (t) => t.id === "t5",
    );
    expect(choreTask?.choreId).toBe("chore-1");
    expect(choreTask?.choreHolderDay).toBe("2026-06-15");
    // M-C1: the per-child soundscape prefs survive untouched (valid values kept).
    const ss = (profile.settings as Record<string, unknown>).soundscape as Record<
      string,
      unknown
    >;
    expect(ss.volume).toBe(0.7);
    expect(ss.calmSceneId).toBe("waves");
    expect(ss.focusSceneId).toBeNull();
    expect(ss.focusDuringTasks).toBe(true);
    // M-C2: the per-child breathing prefs survive untouched (valid values kept).
    expect((profile.settings as Record<string, unknown>).breathingPatternId).toBe("box");
    expect((profile.settings as Record<string, unknown>).breathingPacingHaptics).toBe(true);
    // M-C3: the per-child focus-interval config survives untouched (valid values kept).
    const fi = (profile.settings as Record<string, unknown>).focusIntervals as Record<
      string,
      unknown
    >;
    expect(fi.enabled).toBe(true);
    expect(fi.focusMinutes).toBe(25);
    expect(fi.breakMinutes).toBe(10);
    expect(fi.movementBreaks).toBe(false);
    expect(fi.chime).toBe(false);
    // M-C4: the optional novelty-quest toggle survives untouched.
    expect((profile.settings as Record<string, unknown>).questsEnabled).toBe(false);
    // M1.2 (w1): the optional cloud-sync/Bloop mirror fields survive untouched
    // (additive; a profile WITHOUT them stays valid — offline default; the
    // corrupted-variant blob predates them entirely). SCHEMA_VERSION stays 1.
    const settings = profile.settings as Record<string, unknown>;
    expect(settings.bloopEnabled).toBe(false);
    expect(settings.bloopInputMode).toBe("chips");
    expect(settings.retentionDays).toBe(30);
    expect(settings.crisisLocale).toBe("es-MX");
    expect(settings.cloudSyncEnabled).toBe(true);
    expect(settings.firestoreChildId).toBe("cloud-kid-1");
    // M-B2: the optional Verification block (photo-verify) survives repairTask —
    // the local file:// photoUri is preserved verbatim (never rewritten to a URL).
    const verifyTask = (out.children!.c1.tasks as Array<Record<string, unknown>>).find(
      (t) => t.id === "t6",
    );
    const verification = verifyTask?.verification as Record<string, unknown> | undefined;
    expect(verification?.mode).toBe("photo");
    expect(verification?.photoUri).toBe("file:///caches/tb-photos/1700000000000.jpg");
  });

  it("holds the anti-shame invariants on the repaired output", () => {
    const out = migrateAndRepair(goldenFixture(), 1);
    const c1 = out.children!.c1;
    expect(VALID_COMPANION_MOODS).toContain(c1.companion!.mood);
    expect(c1.ledger!.balance as number).toBeGreaterThanOrEqual(0);
    expect(c1.ledger!.heldTokens as number).toBeLessThanOrEqual(c1.ledger!.balance as number);
    expect(c1.progress!.currentStreakDays as number).toBeGreaterThanOrEqual(0);
    expect(c1.progress!.longestStreakDays as number).toBeGreaterThanOrEqual(
      c1.progress!.currentStreakDays as number,
    );
    for (const task of c1.tasks as Array<{ status: string }>) {
      expect(["todo", "done", "skipped"]).toContain(task.status);
      expect(task.status).not.toBe("failed");
    }
  });

  it("repairs a corrupted variant UP to safe positives (never punishing)", () => {
    const corrupt = clone(goldenFixture());
    corrupt.children!.c1.companion!.mood = "angry"; // banned mood
    corrupt.children!.c1.ledger!.balance = -50; // corruption
    corrupt.children!.c1.progress!.currentStreakDays = -3;
    (corrupt.children!.c1.tasks as Array<{ status: string }>)[0].status = "failed";
    corrupt.meta!.activeChildId = "ghost";
    // M-C1: a corrupt soundscape blob (out-of-range volume, stale scene ids,
    // non-boolean flag) is coerced toward safe values — never a shame state.
    (corrupt.children!.c1.profile!.settings as Record<string, unknown>).soundscape = {
      volume: 9,
      calmSceneId: "ghost",
      focusSceneId: "nope",
      focusDuringTasks: "yes",
    };
    // M-C2: an unknown breathing pattern id + a non-boolean pacing flag coerce to
    // undefined (fall back to the resolved age default) — never a shame state.
    (corrupt.children!.c1.profile!.settings as Record<string, unknown>).breathingPatternId =
      "ghost";
    (corrupt.children!.c1.profile!.settings as Record<string, unknown>).breathingPacingHaptics =
      "yes";
    // M-C3: a corrupt focus-interval config (off-list minutes, non-boolean flags) is
    // coerced toward safe curated values — never a shame state.
    (corrupt.children!.c1.profile!.settings as Record<string, unknown>).focusIntervals = {
      enabled: "sure",
      focusMinutes: 14, // → nearest curated (15)
      breakMinutes: 99, // → nearest curated (10)
      movementBreaks: "no",
      chime: 1,
    };

    const out = migrateAndRepair(corrupt, 1);
    const c1 = out.children!.c1;
    // focus-interval config repaired: minutes snapped to curated options, flags → defaults.
    const fi = (c1.profile!.settings as Record<string, unknown>).focusIntervals as Record<
      string,
      unknown
    >;
    expect(fi.focusMinutes).toBe(15);
    expect(fi.breakMinutes).toBe(10);
    expect(fi.enabled).toBe(false); // non-boolean → default (off)
    expect(fi.movementBreaks).toBe(true); // non-boolean → default (on)
    expect(fi.chime).toBe(true); // non-boolean → default (on)
    // soundscape repaired: volume clamped, stale ids coerced, flag → boolean.
    const ss = (c1.profile!.settings as Record<string, unknown>).soundscape as Record<
      string,
      unknown
    >;
    expect(ss.volume).toBe(1);
    expect(ss.calmSceneId).toBe("waves");
    expect(ss.focusSceneId).toBeNull();
    expect(ss.focusDuringTasks).toBe(true);
    // breathing prefs coerced: unknown id + non-boolean flag → undefined.
    expect((c1.profile!.settings as Record<string, unknown>).breathingPatternId).toBeUndefined();
    expect(
      (c1.profile!.settings as Record<string, unknown>).breathingPacingHaptics,
    ).toBeUndefined();
    // banned mood → the canonical positive default.
    expect(c1.companion!.mood).toBe(DEFAULT_COMPANION_MOOD);
    // negative balance → restored from monotonic lifetimes (40 - 22 = 18), never 0.
    expect(c1.ledger!.balance).toBe(18);
    // negative streak → floored at 0; longest not lowered.
    expect(c1.progress!.currentStreakDays).toBe(0);
    expect(c1.progress!.longestStreakDays).toBe(9);
    // 'failed' status → coerced to 'todo'.
    expect((c1.tasks as Array<{ status: string }>)[0].status).toBe("todo");
    // dangling active child → repaired to an existing child.
    expect(out.meta!.activeChildId).toBe("c1");
  });
});

// ---------------------------------------------------------------------------
// M1.2 (w1): the brand-new INDEPENDENT `tb/sync` slice — the third additive
// shape (new slice ⇒ no migration entry). A persisted envelope written at
// version 1 hydrates verbatim; SCHEMA_VERSION stays 1.
// ---------------------------------------------------------------------------
describe("tb/sync slice hydration (M1.2 — additive, no bump)", () => {
  it("a v1 tb/sync envelope hydrates verbatim (linkage + outbox + status survive)", async () => {
    // require (not import) — keeps the sync slice out of the pure-domain
    // module graph above while avoiding dynamic-import in the jest VM.
    /* eslint-disable @typescript-eslint/no-var-requires */
    const storageModule = require("@react-native-async-storage/async-storage") as {
      default?: typeof import("@react-native-async-storage/async-storage").default;
    };
    const AsyncStorage = (storageModule.default ??
      storageModule) as typeof import("@react-native-async-storage/async-storage").default;
    const { useSyncStore } =
      require("../../src/state/syncStore") as typeof import("../../src/state/syncStore");
    /* eslint-enable @typescript-eslint/no-var-requires */

    const persisted = {
      state: {
        linkage: { "local-1": { childId: "cloud-1", parentUid: "p1" } },
        outbox: [
          {
            localId: "e1",
            childId: "cloud-1",
            collection: "activity",
            doc: { id: "e1", kind: "step_done", atMs: 1_700_000_100_000, payload: { tokens: 1 } },
            attempts: 2,
            enqueuedAt: 1_700_000_100_000,
          },
        ],
        cursors: { settings: "2026-06-15" },
        lastPushAt: 1_700_000_200_000,
        status: "pending",
      },
      version: SCHEMA_VERSION,
    };
    await AsyncStorage.setItem("tb/sync", JSON.stringify(persisted));
    await useSyncStore.persist.rehydrate();

    const s = useSyncStore.getState();
    expect(s.linkage["local-1"]).toEqual({ childId: "cloud-1", parentUid: "p1" });
    expect(s.outbox).toHaveLength(1);
    expect(s.outbox[0]!.doc.kind).toBe("step_done");
    expect(s.outbox[0]!.attempts).toBe(2);
    expect(s.cursors.settings).toBe("2026-06-15");
    expect(s.lastPushAt).toBe(1_700_000_200_000);
    expect(s.status).toBe("pending");
    expect(SCHEMA_VERSION).toBe(1); // still 1 — the slice is purely additive
  });
});
