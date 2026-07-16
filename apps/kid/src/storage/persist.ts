/**
 * src/storage/persist.ts — Zustand `persist` adapter over the storage port.
 *
 * Provides:
 *   - `tbStateStorage`        : a Zustand `StateStorage` backed by the swappable
 *                               port (`storage`), so EVERY store persists through
 *                               the same AsyncStorage-default / MMKV-optional seam.
 *   - `createTbPersistOptions`: a typed `PersistOptions` builder that namespaces
 *                               the store key under `tb/`, wires the port-backed
 *                               JSON storage, sets a per-store `version`, and
 *                               registers the store for hydration gating.
 *   - hydration coordination  : `registerPersistedStore` / `useStoresHydrated`
 *                               so `<StoreHydrationGate>` can render children only
 *                               after every persisted store has rehydrated.
 *
 * NOTE: AsyncStorage hydration is ASYNC. Without the gate, the first frame would
 * read default (empty) state before disk is read — the gate prevents that flash.
 */
import { useSyncExternalStore } from "react";
import {
  createJSONStorage,
  type PersistOptions,
  type StateStorage,
} from "zustand/middleware";

import { SCHEMA_VERSION, namespacedStoreKey } from "./schemaVersion";
import { storage } from "./storage";

// ---------------------------------------------------------------------------
// Zustand StateStorage over the port.
// ---------------------------------------------------------------------------

/**
 * A Zustand `StateStorage` whose three operations delegate to the active
 * storage port (AsyncStorage by default). `createJSONStorage` wraps this to add
 * JSON (de)serialisation + the version envelope.
 */
export const tbStateStorage: StateStorage = {
  getItem: (name) => storage.getString(name),
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => storage.delete(name),
};

/** Port-backed JSON storage for a persisted state of shape `P`. */
export function createTbJSONStorage<P>() {
  return createJSONStorage<P>(() => tbStateStorage);
}

// ---------------------------------------------------------------------------
// Typed PersistOptions builder.
// ---------------------------------------------------------------------------

export interface TbPersistConfig<T, P = T> {
  /** Store key. Bare names (`"meta"`) are auto-namespaced to `tb/meta`. */
  name: string;
  /** Per-store schema version (defaults to the global `SCHEMA_VERSION`). */
  version?: number;
  /** Persist only a subset of the store (keeps transient/in-memory state out of disk). */
  partialize?: PersistOptions<T, P>["partialize"];
  /** Forward-only migration callback (see `migrations.ts` helpers). */
  migrate?: PersistOptions<T, P>["migrate"];
  /** Hook fired after rehydration completes. */
  onRehydrateStorage?: PersistOptions<T, P>["onRehydrateStorage"];
  /** Custom merge of persisted + current state (defaults to a shallow merge). */
  merge?: PersistOptions<T, P>["merge"];
}

/**
 * Build `PersistOptions` wired to the `tb/`-namespaced, port-backed storage.
 * Pass the result as the 2nd arg to Zustand's `persist(creator, options)`.
 */
export function createTbPersistOptions<T, P = T>(
  config: TbPersistConfig<T, P>,
): PersistOptions<T, P> {
  return {
    name: namespacedStoreKey(config.name),
    version: config.version ?? SCHEMA_VERSION,
    storage: createTbJSONStorage<P>(),
    ...(config.partialize ? { partialize: config.partialize } : {}),
    ...(config.migrate ? { migrate: config.migrate } : {}),
    ...(config.onRehydrateStorage ? { onRehydrateStorage: config.onRehydrateStorage } : {}),
    ...(config.merge ? { merge: config.merge } : {}),
  };
}

// ---------------------------------------------------------------------------
// Hydration coordination (for <StoreHydrationGate>).
// ---------------------------------------------------------------------------

/**
 * The slice of a Zustand persisted store's `.persist` API the gate needs. A
 * store created with `persist(...)` exposes exactly this on `store.persist`.
 */
export interface PersistApi {
  hasHydrated: () => boolean;
  onFinishHydration: (fn: () => void) => () => void;
}

const registry = new Set<PersistApi>();
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) l();
}

/**
 * Register a persisted store so the hydration gate waits for it. Call once,
 * after creating the store, e.g.:
 *
 *   export const useMetaStore = create(persist(creator, createTbPersistOptions({ name: "meta" })));
 *   registerPersistedStore(useMetaStore.persist);
 *
 * @returns an unregister function.
 */
export function registerPersistedStore(api: PersistApi): () => void {
  registry.add(api);
  // Re-notify the gate when this store finishes hydrating (if it hasn't yet).
  const unsubFinish = api.hasHydrated() ? undefined : api.onFinishHydration(notify);
  notify(); // the set of stores changed
  return () => {
    registry.delete(api);
    unsubFinish?.();
    notify();
  };
}

/** True when EVERY registered store has rehydrated (vacuously true with none registered). */
export function allStoresHydrated(): boolean {
  for (const api of registry) {
    if (!api.hasHydrated()) return false;
  }
  return true;
}

/** Subscribe to hydration / registration changes. Returns an unsubscribe fn. */
export function subscribeHydration(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test-only: clear the registry + listeners between cases. */
export function __resetHydrationRegistry(): void {
  registry.clear();
  listeners.clear();
}

/**
 * React hook: `true` once all persisted stores have rehydrated. Backed by
 * `useSyncExternalStore` so it tracks both store-registration and
 * hydration-finish events without polling.
 */
export function useStoresHydrated(): boolean {
  return useSyncExternalStore(subscribeHydration, allStoresHydrated, allStoresHydrated);
}
