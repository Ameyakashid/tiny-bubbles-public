/**
 * runProgressStore — per-daypart completion marker (doc 70 §A3/§A4).
 *
 * This is the durable "done for today" signal that stops the runner re-arming
 * and looping back to morning (the shipped bug). It must:
 *   - report a finished daypart as complete for THE SAME local day (no re-loop),
 *   - roll over automatically at local midnight (a stale day's marks drop),
 *   - survive an app kill (persisted, so a resume reads it back — no re-arm).
 */
import { beforeEach, describe, expect, it } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useRunProgressStore } from "../../src/state/runProgressStore";

/** Let the Zustand `persist` middleware flush its async write to (mock) AsyncStorage. */
const flush = () => new Promise<void>((r) => setTimeout(r, 10));

const CID = "c1";
const TODAY = "2026-06-27";
const TOMORROW = "2026-06-28";

beforeEach(async () => {
  await AsyncStorage.clear();
  useRunProgressStore.setState({ active: {}, completedDayparts: {} });
});

describe("markDaypartComplete / isDaypartComplete", () => {
  it("a finished daypart is complete for today — the runner will NOT re-arm/loop", () => {
    const { markDaypartComplete, isDaypartComplete } = useRunProgressStore.getState();
    expect(isDaypartComplete(CID, TODAY, "morning")).toBe(false);

    markDaypartComplete(CID, TODAY, "morning");

    // Completing morning does NOT loop back to morning: it now reads as done.
    expect(useRunProgressStore.getState().isDaypartComplete(CID, TODAY, "morning")).toBe(true);
    // Other dayparts remain open (forward-only, still to come today).
    expect(useRunProgressStore.getState().isDaypartComplete(CID, TODAY, "afternoon")).toBe(false);
    expect(useRunProgressStore.getState().isDaypartComplete(CID, TODAY, "evening")).toBe(false);
  });

  it("unions multiple dayparts within the same day (idempotent)", () => {
    const s = () => useRunProgressStore.getState();
    s().markDaypartComplete(CID, TODAY, "morning");
    s().markDaypartComplete(CID, TODAY, "afternoon");
    s().markDaypartComplete(CID, TODAY, "morning"); // duplicate — no double entry

    expect(s().isDaypartComplete(CID, TODAY, "morning")).toBe(true);
    expect(s().isDaypartComplete(CID, TODAY, "afternoon")).toBe(true);
    expect(s().completedDayparts[CID]).toEqual({ day: TODAY, completed: ["morning", "afternoon"] });
  });

  it("keeps completion per-child isolated", () => {
    const s = () => useRunProgressStore.getState();
    s().markDaypartComplete(CID, TODAY, "morning");
    expect(s().isDaypartComplete("c2", TODAY, "morning")).toBe(false);
  });

  it("rolls over at local midnight — yesterday's mark does not count today", () => {
    const s = () => useRunProgressStore.getState();
    s().markDaypartComplete(CID, TODAY, "morning");

    // A new local day => automatically "not done" (no cron/reset needed).
    expect(s().isDaypartComplete(CID, TOMORROW, "morning")).toBe(false);

    // Marking on the new day REPLACES the stale record (fresh list for the day).
    s().markDaypartComplete(CID, TOMORROW, "afternoon");
    expect(s().completedDayparts[CID]).toEqual({ day: TOMORROW, completed: ["afternoon"] });
    expect(s().isDaypartComplete(CID, TOMORROW, "morning")).toBe(false);
    expect(s().isDaypartComplete(CID, TOMORROW, "afternoon")).toBe(true);
  });
});

describe("clearDaypartComplete — the explicit 'do it again' opt-in (doc 70 §B2)", () => {
  it("un-marks a finished daypart so a fresh run can be re-armed intentionally", () => {
    const s = () => useRunProgressStore.getState();
    s().markDaypartComplete(CID, TODAY, "morning");
    s().markDaypartComplete(CID, TODAY, "afternoon");
    expect(s().isDaypartComplete(CID, TODAY, "morning")).toBe(true);

    s().clearDaypartComplete(CID, TODAY, "morning");

    // Only the targeted daypart is reopened; the rest of the day stays as-is.
    expect(s().isDaypartComplete(CID, TODAY, "morning")).toBe(false);
    expect(s().isDaypartComplete(CID, TODAY, "afternoon")).toBe(true);
  });

  it("is a no-op for a stale day or an unmarked daypart (never throws)", () => {
    const s = () => useRunProgressStore.getState();
    s().markDaypartComplete(CID, TODAY, "morning");

    s().clearDaypartComplete(CID, TOMORROW, "morning"); // wrong day
    s().clearDaypartComplete(CID, TODAY, "evening"); // never marked
    expect(s().completedDayparts[CID]).toEqual({ day: TODAY, completed: ["morning"] });
  });
});

describe("resume-after-kill (persisted, survives a simulated reload)", () => {
  it("rehydrates completedDayparts so a resumed app does not re-arm the daypart", async () => {
    useRunProgressStore.getState().markDaypartComplete(CID, TODAY, "morning");
    await flush(); // let the async setItem reach the AsyncStorage mock

    // It is actually on disk under the tb/-namespaced key (partialize persists it).
    const killSnapshot = await AsyncStorage.getItem("tb/runProgress");
    expect(killSnapshot).toContain("completedDayparts");
    expect(killSnapshot).toContain(TODAY);
    expect(killSnapshot).toContain("morning");

    // Simulate a kill: drop in-memory state (this re-persists empty), then let
    // that write settle and restore the on-disk snapshot as it stood at kill.
    useRunProgressStore.setState({ active: {}, completedDayparts: {} });
    await flush();
    await AsyncStorage.setItem("tb/runProgress", killSnapshot as string);
    expect(useRunProgressStore.getState().isDaypartComplete(CID, TODAY, "morning")).toBe(false);

    // Resume: rehydrate from disk — the finished daypart comes back, so the
    // runner reads it as done and will NOT re-arm/loop to morning.
    await useRunProgressStore.persist.rehydrate();
    expect(useRunProgressStore.getState().isDaypartComplete(CID, TODAY, "morning")).toBe(true);
  });
});
