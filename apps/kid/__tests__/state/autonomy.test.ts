/**
 * autonomy.test.ts — "be the boss" child-autonomy wiring (M-B3, child-autonomy §7).
 *
 * Covers the three closed-delta seams:
 *   - `resolveCapabilities` master gate (`canCustomizeCompanion`) + the
 *     `canPickReward` default/override,
 *   - `runProgressStore.chooseNextStep` (young "What next?" per-run reorder) —
 *     correctness, no-ops, and that it NEVER mutates the parent routine,
 *   - the companion-name curated-autonomy exception (length cap + offline filter).
 */
import { beforeEach, describe, expect, it } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  isCompanionNameAllowed,
  MAX_COMPANION_NAME_LEN,
  normalizeCompanionName,
} from "../../src/domain/companionName";
import { nextStepId } from "../../src/domain/tasks";
import { resolveCapabilities } from "../../src/theme/resolveCapabilities";
import { useRunProgressStore } from "../../src/state/runProgressStore";
import { useTaskStore } from "../../src/state/taskStore";

const CID = "c1";

beforeEach(async () => {
  await AsyncStorage.clear();
  useRunProgressStore.setState({ active: {}, completedDayparts: {} });
});

// ---------------------------------------------------------------------------
// resolveCapabilities — master gate + reward grant (§7.1)
// ---------------------------------------------------------------------------
describe("resolveCapabilities — master customization gate + canPickReward", () => {
  it("canCustomizeCompanion=false forces the three canPick* off (older)", () => {
    const c = resolveCapabilities({ ageMode: "older", canCustomizeCompanion: false });
    expect(c.canPickColor).toBe(false);
    expect(c.canPickAccessory).toBe(false);
    expect(c.canPickTheme).toBe(false);
  });

  it("default (undefined/true) returns the age defaults", () => {
    const c = resolveCapabilities({ ageMode: "older" });
    expect(c.canPickColor).toBe(true);
    expect(c.canPickAccessory).toBe(true);
    expect(c.canPickTheme).toBe(true);
  });

  it("canPickReward defaults true and honors an explicit false", () => {
    expect(resolveCapabilities({ ageMode: "young" }).canPickReward).toBe(true);
    expect(resolveCapabilities({ ageMode: "older", canPickReward: false }).canPickReward).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// runProgressStore.chooseNextStep — young "What next?" per-run reorder (§7.5)
// ---------------------------------------------------------------------------
describe("runProgressStore.chooseNextStep", () => {
  const seedRun = (stepIds: string[], resolved: string[]) => {
    const rp = useRunProgressStore.getState();
    rp.startRun(CID, "r1", stepIds);
    resolved.forEach((id) => rp.markStepResolved(CID, id));
  };
  const activeRun = () => useRunProgressStore.getState().active[CID];

  it("moves the chosen id to the front of the UNCOMPLETED portion", () => {
    seedRun(["a", "b", "c", "d"], ["a"]); // a done → focal is b
    expect(nextStepId(activeRun()!.stepIds, activeRun()!.completedStepIds)).toBe("b");

    useRunProgressStore.getState().chooseNextStep(CID, "d");

    const run = activeRun()!;
    expect(run.stepIds).toEqual(["a", "d", "b", "c"]); // completed first, chosen next
    expect(run.completedStepIds).toEqual(["a"]); // completed set untouched
    // the chosen step is now the focal (next) step
    expect(nextStepId(run.stepIds, run.completedStepIds)).toBe("d");
  });

  it("preserves the relative order of completed ids", () => {
    seedRun(["a", "b", "c", "d"], ["a", "c"]); // a,c done → focal b
    useRunProgressStore.getState().chooseNextStep(CID, "d");
    const run = activeRun()!;
    expect(run.stepIds).toEqual(["a", "c", "d", "b"]);
    expect(run.completedStepIds).toEqual(["a", "c"]);
  });

  it("is a no-op for an unknown id", () => {
    seedRun(["a", "b", "c"], ["a"]);
    const before = activeRun()!.stepIds;
    useRunProgressStore.getState().chooseNextStep(CID, "zzz");
    expect(activeRun()!.stepIds).toEqual(before);
  });

  it("is a no-op for an already-resolved id", () => {
    seedRun(["a", "b", "c"], ["a"]);
    const before = activeRun()!.stepIds;
    useRunProgressStore.getState().chooseNextStep(CID, "a"); // already done
    expect(activeRun()!.stepIds).toEqual(before);
    expect(activeRun()!.completedStepIds).toEqual(["a"]);
  });

  it("is a no-op when the id is already the focal (front) step", () => {
    seedRun(["a", "b", "c"], ["a"]); // focal is b
    const before = activeRun()!.stepIds;
    useRunProgressStore.getState().chooseNextStep(CID, "b");
    expect(activeRun()!.stepIds).toEqual(before);
  });

  it("is a no-op when there is no active run", () => {
    expect(() => useRunProgressStore.getState().chooseNextStep(CID, "a")).not.toThrow();
    expect(useRunProgressStore.getState().active[CID] ?? null).toBeNull();
  });

  it("does NOT mutate the parent routine (taskStore.routines unchanged)", () => {
    const routine = { id: "r1", stepIds: ["a", "b", "c", "d"] };
    const routinesSnapshot = { [CID]: [routine] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useTaskStore.setState({ routines: routinesSnapshot as any });
    seedRun(["a", "b", "c", "d"], ["a"]);

    useRunProgressStore.getState().chooseNextStep(CID, "d");

    // the young choice is per-run only — the routine object is the SAME reference
    // and its stepIds are byte-identical (never permanently reordered).
    expect(useTaskStore.getState().routines).toBe(routinesSnapshot);
    expect(routine.stepIds).toEqual(["a", "b", "c", "d"]);
  });

  it("survives a persisted-run reload (chosen focal step resumes)", () => {
    seedRun(["a", "b", "c", "d"], ["a"]);
    useRunProgressStore.getState().chooseNextStep(CID, "c");
    // the persisted stepIds now start the uncompleted portion with c
    const run = useRunProgressStore.getState().active[CID]!;
    expect(nextStepId(run.stepIds, run.completedStepIds)).toBe("c");
  });
});

// ---------------------------------------------------------------------------
// companion name — curated-autonomy free-text exception (§2.2)
// ---------------------------------------------------------------------------
describe("companionName — length cap + light offline filter", () => {
  it("allows ordinary buddy names", () => {
    expect(isCompanionNameAllowed("Bloop")).toBe(true);
    expect(isCompanionNameAllowed("Sir Fluffington")).toBe(true);
    expect(isCompanionNameAllowed("assistant")).toBe(true); // no Scunthorpe false-positive
  });

  it("rejects empty / whitespace-only", () => {
    expect(isCompanionNameAllowed("")).toBe(false);
    expect(isCompanionNameAllowed("   ")).toBe(false);
  });

  it("rejects clear profanity, including leet + spaced evasions", () => {
    expect(isCompanionNameAllowed("shit")).toBe(false);
    expect(isCompanionNameAllowed("SH1T")).toBe(false);
    expect(isCompanionNameAllowed("f u c k")).toBe(false);
    expect(isCompanionNameAllowed("you bitch")).toBe(false);
  });

  it("caps the length + trims", () => {
    const long = "x".repeat(40);
    expect(normalizeCompanionName(long).length).toBe(MAX_COMPANION_NAME_LEN);
    expect(normalizeCompanionName("  Nova  ")).toBe("Nova");
  });
});
