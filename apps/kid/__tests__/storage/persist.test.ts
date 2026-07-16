import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { SCHEMA_VERSION } from "../../src/storage/schemaVersion";
import {
  __resetHydrationRegistry,
  allStoresHydrated,
  createTbPersistOptions,
  type PersistApi,
  registerPersistedStore,
  subscribeHydration,
} from "../../src/storage/persist";
import { createAsyncStoragePort, setStoragePort } from "../../src/storage/storage";

const flush = () => new Promise<void>((r) => setTimeout(r, 10));

interface CounterState {
  count: number;
  bump: () => void;
}

function makeCounterStore() {
  return create<CounterState>()(
    persist(
      (set) => ({ count: 0, bump: () => set((s) => ({ count: s.count + 1 })) }),
      createTbPersistOptions<CounterState>({ name: "counter", version: 1 }),
    ),
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  setStoragePort(createAsyncStoragePort());
  __resetHydrationRegistry();
});

afterEach(async () => {
  await AsyncStorage.clear();
  __resetHydrationRegistry();
});

describe("createTbPersistOptions", () => {
  it("namespaces the store key and defaults the version", () => {
    const opts = createTbPersistOptions({ name: "meta" });
    expect(opts.name).toBe("tb/meta");
    expect(opts.version).toBe(SCHEMA_VERSION);
  });
});

describe("persist round-trip (write survives a simulated reload)", () => {
  it("rehydrates persisted state into a fresh store instance", async () => {
    const a = makeCounterStore();
    await a.persist.rehydrate();

    a.getState().bump();
    a.getState().bump(); // count = 2
    await flush(); // let the async setItem flush to the AsyncStorage mock

    // It is actually on disk, under the tb/-namespaced key.
    const raw = await AsyncStorage.getItem("tb/counter");
    expect(raw).toContain('"count":2');

    // Simulated reload: a brand-new store with the same name reads it back.
    const b = makeCounterStore();
    await b.persist.rehydrate();
    expect(b.getState().count).toBe(2);
  });
});

describe("hydration coordination (for StoreHydrationGate)", () => {
  it("is vacuously hydrated with no stores registered", () => {
    expect(allStoresHydrated()).toBe(true);
  });

  it("waits for a not-yet-hydrated store and resolves + notifies on finish", () => {
    let finishCb: (() => void) | null = null;
    let hydrated = false;
    const fakeApi: PersistApi = {
      hasHydrated: () => hydrated,
      onFinishHydration: (cb) => {
        finishCb = cb;
        return () => {};
      },
    };

    let notified = 0;
    const unsub = subscribeHydration(() => {
      notified += 1;
    });

    registerPersistedStore(fakeApi);
    expect(allStoresHydrated()).toBe(false);

    // simulate hydration completing
    hydrated = true;
    (finishCb as unknown as () => void)();

    expect(allStoresHydrated()).toBe(true);
    expect(notified).toBeGreaterThan(0);
    unsub();
  });

  it("reports a real persisted store as hydrated after rehydrate()", async () => {
    const a = makeCounterStore();
    registerPersistedStore(a.persist);
    await a.persist.rehydrate();
    await flush();
    expect(allStoresHydrated()).toBe(true);
  });
});
