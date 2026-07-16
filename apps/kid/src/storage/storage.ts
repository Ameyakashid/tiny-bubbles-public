/**
 * src/storage/storage.ts — the swappable `storage` PORT.
 *
 * ADAPTATION (doc 69 §3): the default key-value backend is **AsyncStorage**
 * (`@react-native-async-storage/async-storage`). It ships with an automatic web
 * shim (localStorage) so the same code runs in Expo Go, native, and the web
 * subset with NO custom native module — keeping the app Expo-Go-runnable.
 *
 * The port exists so the backend is swappable: an optional MMKV adapter
 * (`createMmkvPort`, below) implements the SAME interface for users who build a
 * dev client and want synchronous, faster reads. MMKV is **not** wired by
 * default and `react-native-mmkv` is **not** a dependency (see ./README.md).
 *
 * Because AsyncStorage is asynchronous and MMKV is synchronous, the port is
 * Promise-based (the common denominator): the MMKV adapter simply wraps its
 * synchronous results in resolved promises.
 *
 * Port note (doc 62 §2): the `lockin` `getAllKeys()` + reset pattern is
 * re-expressed here through `getAllKeys` + `delete`; nothing is copied verbatim.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import { isChildKey, isTbKey } from "./schemaVersion";

/**
 * The storage port. Four operations are enough for the whole persistence layer:
 * read a string, write a string, delete a key, and enumerate keys (for the
 * `tb/`-scoped reset). Higher-level JSON shaping lives in `persist.ts` /
 * `migrations.ts`, never here.
 */
export interface StoragePort {
  /** Read a stored string, or `null` if the key is absent. */
  getString(key: string): Promise<string | null>;
  /** Write (or overwrite) a string value. */
  set(key: string, value: string): Promise<void>;
  /** Remove a single key. Absent keys are a no-op. */
  delete(key: string): Promise<void>;
  /** Enumerate every key currently present in the backend. */
  getAllKeys(): Promise<string[]>;
}

/**
 * The DEFAULT adapter: AsyncStorage behind the port.
 *
 * - `getString` maps `getItem` and normalises `null` (absent) through.
 * - `getAllKeys` copies the readonly array AsyncStorage returns into a mutable
 *   `string[]` to satisfy the port contract.
 */
export function createAsyncStoragePort(): StoragePort {
  return {
    async getString(key) {
      return AsyncStorage.getItem(key);
    },
    async set(key, value) {
      await AsyncStorage.setItem(key, value);
    },
    async delete(key) {
      await AsyncStorage.removeItem(key);
    },
    async getAllKeys() {
      const keys = await AsyncStorage.getAllKeys();
      return [...keys];
    },
  };
}

/**
 * The active backend. Defaults to AsyncStorage. Swappable at runtime via
 * `setStoragePort` (used by tests, or by an app that opts into MMKV after
 * building a dev client). Kept behind the stable `storage` facade below so
 * long-lived references (e.g. the Zustand persist adapter) never go stale when
 * the backend is swapped.
 */
let activePort: StoragePort = createAsyncStoragePort();

/** Replace the active backend. Returns the previous port (handy for test teardown). */
export function setStoragePort(port: StoragePort): StoragePort {
  const prev = activePort;
  activePort = port;
  return prev;
}

/** The currently-active backend (rarely needed directly; prefer `storage`). */
export function getStoragePort(): StoragePort {
  return activePort;
}

/**
 * The stable storage facade. Always delegates to the active backend, so callers
 * can hold this reference forever even if `setStoragePort` swaps the underlying
 * adapter. This is the object the rest of the app imports.
 */
export const storage: StoragePort = {
  getString: (key) => activePort.getString(key),
  set: (key, value) => activePort.set(key, value),
  delete: (key) => activePort.delete(key),
  getAllKeys: () => activePort.getAllKeys(),
};

// ---------------------------------------------------------------------------
// Reset helpers ("delete my data") — doc 62 §2 / §13.
// ---------------------------------------------------------------------------

/**
 * Delete EVERY `tb/`-namespaced key, leaving any non-Tiny-Bubbles keys (e.g.
 * keys written by other libraries that share AsyncStorage) untouched. This is
 * the "delete all my data" action. Re-authored from the `lockin`
 * `getAllKeys()` + `multiRemove` pattern (doc 62 §2) against our port.
 *
 * @returns the list of keys that were removed.
 */
export async function resetAllTbData(port: StoragePort = storage): Promise<string[]> {
  const keys = await port.getAllKeys();
  const tbKeys = keys.filter(isTbKey);
  await Promise.all(tbKeys.map((k) => port.delete(k)));
  return tbKeys;
}

/**
 * Delete only the keys belonging to ONE child (`tb/child/<cid>/...`). Used by
 * the per-child "remove this child's data" action; never touches app-global,
 * parent-global, or sibling-child keys.
 *
 * @returns the list of keys that were removed.
 */
export async function resetChildData(
  childId: string,
  port: StoragePort = storage,
): Promise<string[]> {
  const keys = await port.getAllKeys();
  const childKeys = keys.filter((k) => isChildKey(k, childId));
  await Promise.all(childKeys.map((k) => port.delete(k)));
  return childKeys;
}

// ---------------------------------------------------------------------------
// OPTIONAL MMKV adapter (STUB — not wired, not a dependency). See ./README.md.
// ---------------------------------------------------------------------------
//
// MMKV is a synchronous, fast native key-value store. It is a documented perf
// UPGRADE for users who build a custom dev client (it cannot run in Expo Go,
// doc 69 §1). To enable it:
//   1) `npx expo install react-native-mmkv`
//   2) build a dev client (`npx expo run:ios` / `run:android`)
//   3) at app start, BEFORE any persisted store hydrates:
//        import { setStoragePort } from "@/src/storage/storage";
//        setStoragePort(createMmkvPort());
//
// The factory below uses an INDIRECT require so neither TypeScript nor Metro
// tries to statically resolve `react-native-mmkv` when it is absent (the
// default). It is exported so the port architecture is real, but is NEVER
// called by default.

/**
 * Build an MMKV-backed port (optional; requires `react-native-mmkv` + a dev
 * client). Throws a clear error if the native module is not installed. The
 * synchronous MMKV results are wrapped in resolved promises to satisfy the
 * async port contract.
 *
 * @remarks STUB / opt-in only — not wired into the default app.
 */
export function createMmkvPort(): StoragePort {
  // Indirect require: keep the optional dependency out of static resolution so
  // the default (MMKV-less) build type-checks and bundles cleanly.
  const indirectRequire = (
    (): ((name: string) => unknown) | undefined =>
      typeof require === "function" ? (require as (name: string) => unknown) : undefined
  )();

  if (!indirectRequire) {
    throw new Error(
      "[storage] createMmkvPort: no CommonJS require available in this runtime.",
    );
  }

  let mmkvModule: { MMKV: new () => MmkvLike };
  try {
    mmkvModule = indirectRequire("react-native-mmkv") as typeof mmkvModule;
  } catch {
    throw new Error(
      "[storage] createMmkvPort: 'react-native-mmkv' is not installed. " +
        "MMKV is an optional dev-client-only upgrade — see src/storage/README.md.",
    );
  }

  const mmkv = new mmkvModule.MMKV();
  return {
    async getString(key) {
      const v = mmkv.getString(key);
      return v === undefined ? null : v;
    },
    async set(key, value) {
      mmkv.set(key, value);
    },
    async delete(key) {
      mmkv.delete(key);
    },
    async getAllKeys() {
      return mmkv.getAllKeys();
    },
  };
}

/** Minimal structural type for the bits of the MMKV instance we use. */
interface MmkvLike {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
  getAllKeys(): string[];
}
