/**
 * __tests__/services/backup.test.ts — local backup / restore (clinician-reporting
 * §3.4/§3.5, M-D1). Round-trip export→import equality; a foreign/empty/canceled
 * file touches nothing; a hand-edited negative balance / bad companion mood is
 * repaired UP on import; and restore reconciles the in-memory session/focus stores
 * + re-derives the trial reminder.
 *
 * The four native modules are jest.mock()ed with in-memory stubs (mirroring how
 * notifications.test.ts mocks expo-notifications) so backup.ts's lazy native
 * requires resolve off-device.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";

// --- in-memory native mocks (names must be `mock*` for the hoisted factories) ---
const mockFsFiles = new Map<string, string>();
let mockPickerResult: unknown = { canceled: true, assets: null };

jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  documentDirectory: "file:///docs/",
  writeAsStringAsync: jest.fn(async (uri: string, contents: string) => {
    mockFsFiles.set(uri, contents);
  }),
  readAsStringAsync: jest.fn(async (uri: string) => {
    if (!mockFsFiles.has(uri)) throw new Error("no such file");
    return mockFsFiles.get(uri) as string;
  }),
  deleteAsync: jest.fn(async (uri: string) => {
    mockFsFiles.delete(uri);
  }),
}));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));
jest.mock("expo-print", () => ({
  printAsync: jest.fn(async () => undefined),
  printToFileAsync: jest.fn(async () => ({ uri: "file:///cache/report.pdf" })),
}));
jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn(async () => mockPickerResult),
}));

import {
  applyRestore,
  buildBackupFile,
  collectTbSlices,
  exportBackup,
  importBackup,
  repairBackupSlices,
  validateBackupFile,
  type BackupFile,
} from "../../src/services/backup";
import * as notifications from "../../src/services/notifications";
import { useBuddyStore } from "../../src/state/buddyStore";
import { useChildStore } from "../../src/state/childStore";
import { useFocusSessionStore } from "../../src/state/focusSessionStore";
import { useRewardStore } from "../../src/state/rewardStore";
import { useRunProgressStore } from "../../src/state/runProgressStore";
import { useSessionStore } from "../../src/state/sessionStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { useTaskStore } from "../../src/state/taskStore";
import {
  defaultChildSettings,
  freshLedger,
  freshProgress,
  defaultProgressConfig,
} from "../../src/domain/constants";
import type { ChildProfile, CompanionState, Task } from "../../src/domain/types";

const flush = () => new Promise<void>((r) => setTimeout(r, 25));

function resetStores() {
  useChildStore.setState({
    index: [],
    profiles: {},
    ledgers: {},
    progress: {},
    reinforcement: {},
    moods: {},
    events: {},
    seed: { seedVersion: 1, appliedPacks: [], perChildSeeded: [] },
  });
  useTaskStore.setState({ tasks: {}, routines: {}, runs: {}, lastRolloverDay: {} });
  useRewardStore.setState({ rewards: {}, redemptions: {} });
  useBuddyStore.setState({ companions: {} });
  useRunProgressStore.setState({ active: {}, completedDayparts: {} });
  useSessionStore.getState().reset();
  useFocusSessionStore.getState().stop();
}

beforeEach(async () => {
  mockFsFiles.clear();
  mockPickerResult = { canceled: true, assets: null };
  await AsyncStorage.clear();
  resetStores();
  jest.spyOn(notifications, "scheduleTrialEndingReminder").mockResolvedValue(null);
  jest.spyOn(notifications, "cancelTrialEndingReminder").mockResolvedValue(undefined);
  await flush();
});

function seedChild(): { profile: ChildProfile; task: Task; companion: CompanionState } {
  const profile: ChildProfile = {
    id: "c1",
    displayName: "Robin",
    ageMode: "older",
    avatarColor: "#5BC8F5",
    timeZone: "UTC",
    createdAt: 1,
    updatedAt: 1,
    archived: false,
    settings: defaultChildSettings("older"),
  };
  const ledger = { ...freshLedger("c1"), balance: 12, lifetimeEarned: 30, lifetimeSpent: 18 };
  const progress = { ...freshProgress("c1", defaultProgressConfig("older")), cumulativeCount: 30, currentStreakDays: 3, longestStreakDays: 7 };
  const task: Task = {
    id: "t1",
    childId: "c1",
    templateId: null,
    routineId: "rm",
    order: 0,
    label: { spokenLabel: "Brush teeth", color: "#fff" },
    verification: { mode: "none", required: false },
    tokenValue: 1,
    deadline: "anytime",
    schedule: { daysOfWeek: [] },
    status: "todo",
    createdAt: 1,
    updatedAt: 1,
    archived: false,
  };
  const companion: CompanionState = {
    childId: "c1",
    speciesId: "bloop",
    name: "Bub",
    mood: "happy",
    moodSince: 1,
    bondLevel: 2,
    growthStage: 1,
    lastInteractionAt: 1,
    customization: { baseColor: "#fff", accentColor: "#000", accessories: [] },
    unlockedItems: [],
    equipped: {},
  };

  useChildStore.setState({
    index: [{ id: "c1", displayName: "Robin", ageMode: "older", avatarColor: "#5BC8F5", createdAt: 1, archived: false }],
    profiles: { c1: profile },
    ledgers: { c1: ledger },
    progress: { c1: progress },
    reinforcement: { c1: { childId: "c1", habits: {} } },
    moods: { c1: [] },
    events: { c1: [] },
    seed: { seedVersion: 1, appliedPacks: ["tasks.v1"], perChildSeeded: ["c1"] },
  });
  useTaskStore.setState({ tasks: { c1: [task] }, routines: {}, runs: {}, lastRolloverDay: {} });
  useRewardStore.setState({
    rewards: { c1: [{ id: "rw1", childId: "c1", label: { spokenLabel: "Park", color: "#f0f" }, category: "outing", costTokens: 10, active: true, requiresParentApproval: true, createdAt: 1, updatedAt: 1 }] },
    redemptions: {},
  });
  useBuddyStore.setState({ companions: { c1: companion } });
  useSettingsStore.getState().setActiveChild("c1");
  return { profile, task, companion };
}

describe("validateBackupFile", () => {
  it("accepts a well-formed envelope and rejects everything else", () => {
    const good = buildBackupFile({ "tb/children": { state: {}, version: 1 } }, 123);
    expect(validateBackupFile(good)).toBe(true);
    expect(validateBackupFile({ hello: "world" })).toBe(false);
    expect(validateBackupFile(null)).toBe(false);
    expect(validateBackupFile("nope")).toBe(false);
    expect(validateBackupFile({ app: "tiny-bubbles-backup", schemaVersion: 1, exportedAt: 1 })).toBe(false);
  });
});

describe("export → import round-trip", () => {
  it("restores children / tasks / rewards / companions / ledgers to equality", async () => {
    seedChild();
    await flush();

    const before = {
      children: JSON.parse(JSON.stringify(pickChild())),
      tasks: JSON.parse(JSON.stringify(useTaskStore.getState().tasks)),
      rewards: JSON.parse(JSON.stringify(useRewardStore.getState().rewards)),
      companions: JSON.parse(JSON.stringify(useBuddyStore.getState().companions)),
    };

    const res = await exportBackup();
    expect(res.itemCount).toBeGreaterThan(0);
    expect(mockFsFiles.has(res.fileUri)).toBe(true);

    // wipe → then import the saved file
    resetStores();
    await flush();
    expect(useChildStore.getState().index).toHaveLength(0);
    mockPickerResult = { canceled: false, assets: [{ uri: res.fileUri, name: "backup.json" }] };

    const imported = await importBackup();
    expect(imported.ok).toBe(true);
    await flush();

    expect(pickChild()).toEqual(before.children);
    expect(useTaskStore.getState().tasks).toEqual(before.tasks);
    expect(useRewardStore.getState().rewards).toEqual(before.rewards);
    expect(useBuddyStore.getState().companions).toEqual(before.companions);
  });

  it("stamps lastBackupAt on export", async () => {
    seedChild();
    await flush();
    expect(useSettingsStore.getState().parentSettings.lastBackupAt).toBeUndefined();
    await exportBackup();
    expect(typeof useSettingsStore.getState().parentSettings.lastBackupAt).toBe("number");
  });
});

describe("import safety — a bad file touches nothing", () => {
  it.each([
    ["a foreign JSON", JSON.stringify({ some: "other app" }), "not_a_backup"],
    ["an unreadable blob", "{not json", "unreadable"],
    ["a valid-but-empty envelope", JSON.stringify(buildBackupFile({}, 1)), "empty"],
  ])("rejects %s without calling setState", async (_label, contents, reason) => {
    seedChild();
    await flush();
    const snapshot = JSON.stringify(pickChild());

    mockFsFiles.set("file:///cache/foreign.json", contents as string);
    mockPickerResult = { canceled: false, assets: [{ uri: "file:///cache/foreign.json", name: "x.json" }] };

    const res = await importBackup();
    expect(res).toEqual({ ok: false, reason });
    expect(JSON.stringify(pickChild())).toBe(snapshot);
  });

  it("returns canceled and changes nothing when the picker is canceled", async () => {
    seedChild();
    await flush();
    const snapshot = JSON.stringify(pickChild());
    mockPickerResult = { canceled: true, assets: null };
    const res = await importBackup();
    expect(res).toEqual({ ok: false, reason: "canceled" });
    expect(JSON.stringify(pickChild())).toBe(snapshot);
  });

  it("does not apply when the confirm-replace step is declined", async () => {
    seedChild();
    await flush();
    const valid = handEditedBackup({ balance: 5 });
    mockFsFiles.set("file:///cache/v.json", JSON.stringify(valid));
    mockPickerResult = { canceled: false, assets: [{ uri: "file:///cache/v.json", name: "v.json" }] };
    const snapshot = JSON.stringify(pickChild());
    const res = await importBackup(() => false); // decline the replace
    expect(res).toEqual({ ok: false, reason: "canceled" });
    expect(JSON.stringify(pickChild())).toBe(snapshot);
  });
});

describe("import repair — non-punishing (coerce UP, never zero)", () => {
  it("repairs a hand-edited negative balance and a bad companion mood", async () => {
    resetStores();
    const file = handEditedBackup({ balance: -50, mood: "sad" });
    mockFsFiles.set("file:///cache/edited.json", JSON.stringify(file));
    mockPickerResult = { canceled: false, assets: [{ uri: "file:///cache/edited.json", name: "e.json" }] };

    const res = await importBackup();
    expect(res.ok).toBe(true);
    await flush();

    // balance recomputed from monotonic totals (100 - 20 = 80) — restored UP, not zeroed
    expect(useChildStore.getState().ledgers.c1.balance).toBe(80);
    // out-of-set mood coerced to the positive default
    expect(useBuddyStore.getState().companions.c1.mood).toBe("content");
  });

  it("repairBackupSlices leaves valid slices intact", () => {
    const file = handEditedBackup({ balance: 40 });
    const repaired = repairBackupSlices(file);
    const ledger = (repaired["tb/children"] as { state: { ledgers: Record<string, { balance: number }> } }).state.ledgers.c1;
    expect(ledger.balance).toBe(40);
  });
});

describe("restore reconciliation", () => {
  it("clears in-memory session + focus stores and re-derives the trial reminder", async () => {
    resetStores();
    // stale in-memory pointers that the restored data won't contain
    useSessionStore.getState().setActiveRun("run-that-wont-exist");
    useFocusSessionStore.getState().start({ childId: "c1", focusMinutes: 15, breakMinutes: 5, movementBreaks: true }, Date.now());
    expect(useSessionStore.getState().activeRunId).not.toBeNull();
    expect(useFocusSessionStore.getState().session).not.toBeNull();

    const file = handEditedBackup({ balance: 10 });
    await applyRestore(file as BackupFile);

    expect(useSessionStore.getState().activeRunId).toBeNull();
    expect(useFocusSessionStore.getState().session).toBeNull();
    // the restored (free) entitlement has no live trial → the stale reminder is canceled
    expect(notifications.cancelTrialEndingReminder).toHaveBeenCalled();
  });
});

describe("collectTbSlices", () => {
  it("collects every persisted tb/ key as a parsed envelope", async () => {
    seedChild();
    await flush();
    const slices = await collectTbSlices();
    expect(Object.keys(slices)).toEqual(expect.arrayContaining(["tb/children", "tb/tasks", "tb/rewards", "tb/buddy"]));
    for (const key of Object.keys(slices)) expect(key.startsWith("tb/")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** The comparable data slices of the child store. */
function pickChild() {
  const s = useChildStore.getState();
  return {
    index: s.index,
    profiles: s.profiles,
    ledgers: s.ledgers,
    progress: s.progress,
    reinforcement: s.reinforcement,
    moods: s.moods,
    events: s.events,
    seed: s.seed,
  };
}

/** A minimal, structurally-valid backup file with one child (optionally corrupt). */
function handEditedBackup(opts: { balance: number; mood?: string }): BackupFile {
  return {
    app: "tiny-bubbles-backup",
    schemaVersion: 1,
    exportedAt: 123,
    slices: {
      "tb/children": {
        state: {
          index: [{ id: "c1", displayName: "Robin", ageMode: "older", avatarColor: "#fff", createdAt: 1, archived: false }],
          profiles: {
            c1: {
              id: "c1",
              displayName: "Robin",
              ageMode: "older",
              avatarColor: "#fff",
              timeZone: "UTC",
              createdAt: 1,
              updatedAt: 1,
              archived: false,
              settings: defaultChildSettings("older"),
            },
          },
          ledgers: {
            c1: { childId: "c1", balance: opts.balance, heldTokens: 0, lifetimeEarned: 100, lifetimeSpent: 20, lastEarnedAt: 0, entries: [] },
          },
          progress: {
            c1: { childId: "c1", cumulativeCount: 5, currentStreakDays: 2, longestStreakDays: 4, lastActiveDate: null, freezeTokens: 1, freezeUsedDates: [], weekCompletions: 0, paused: false },
          },
          reinforcement: { c1: { childId: "c1", habits: {} } },
          moods: { c1: [] },
          events: { c1: [] },
          seed: { seedVersion: 1, appliedPacks: [], perChildSeeded: ["c1"] },
        },
        version: 1,
      },
      "tb/buddy": {
        state: {
          companions: {
            c1: {
              childId: "c1",
              speciesId: "bloop",
              name: "Bub",
              mood: opts.mood ?? "content",
              moodSince: 0,
              bondLevel: 0,
              growthStage: 0,
              lastInteractionAt: 0,
              customization: { baseColor: "#fff", accentColor: "#000", accessories: [] },
              unlockedItems: [],
              equipped: {},
            },
          },
        },
        version: 1,
      },
    },
  };
}
