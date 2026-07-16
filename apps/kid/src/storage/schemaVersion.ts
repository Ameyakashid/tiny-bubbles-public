/**
 * src/storage/schemaVersion.ts — schema version + `tb/`-namespaced key helpers.
 *
 * Single source of truth for the AsyncStorage / MMKV key layout (doc 62 §2).
 * Every persisted key lives under the `tb/` namespace so "delete my data" can
 * filter the keyspace precisely (`getAllKeys()` -> filter `tb/` -> delete) and
 * so a future sync layer can reason about ownership scopes.
 *
 * Ownership scopes (doc 62 §1):
 *   - app-global   : tb/meta, tb/seedState
 *   - parent-global: tb/parentSettings, tb/entitlement, tb/childIndex
 *   - per-child    : tb/child/<cid>/<slice>
 */

/**
 * Bump on ANY breaking shape change to a persisted slice (doc 62 §3). The
 * migration engine (`migrations.ts`) runs forward-only migrations whenever a
 * persisted blob's stored version is below this value.
 *
 * w1 M1.2 NOTE: the `tb/sync` store slice (state/syncStore.ts — pairing
 * linkage + offline outbox + cursors) is a brand-new INDEPENDENT slice and
 * the new `ChildSettings` cloud fields are all optional — the additive shapes
 * the engine handles with NO migration entry. SCHEMA_VERSION stays 1;
 * MIGRATIONS stays [] (proven in __tests__/storage/migration-forward.test.ts).
 */
export const SCHEMA_VERSION = 1;

/** The namespace every Tiny Bubbles key is prefixed with. */
export const TB_PREFIX = "tb/";

/** App-global + parent-global (non-per-child) keys. */
export const APP_KEYS = {
  meta: "tb/meta",
  parentSettings: "tb/parentSettings",
  entitlement: "tb/entitlement",
  childIndex: "tb/childIndex",
  seedState: "tb/seedState",
} as const;

export type AppKey = (typeof APP_KEYS)[keyof typeof APP_KEYS];

/**
 * The per-child slice names (doc 62 §2). Each becomes a key of the form
 * `tb/child/<cid>/<slice>` and is written independently so the hot path (token
 * earn -> ledger write) never rewrites unrelated slices.
 */
export const CHILD_SLICES = [
  "profile",
  "companion",
  "routines",
  "tasks",
  "runs",
  "ledger",
  "reinforcement",
  "progress",
  "rewards",
  "redemptions",
  "moods",
  "events",
] as const;

export type ChildSlice = (typeof CHILD_SLICES)[number];

/** Prefix for all keys belonging to a single child. */
export function childPrefix(childId: string): string {
  return `${TB_PREFIX}child/${childId}/`;
}

/** Build the namespaced key for one slice of one child. */
export function childKey(childId: string, slice: ChildSlice): string {
  return `${childPrefix(childId)}${slice}`;
}

/** True for any key inside the Tiny Bubbles namespace. */
export function isTbKey(key: string): boolean {
  return key.startsWith(TB_PREFIX);
}

/** True for any key belonging to the given child. */
export function isChildKey(key: string, childId: string): boolean {
  return key.startsWith(childPrefix(childId));
}

/**
 * Ensure a Zustand `persist` store name lives in the `tb/` namespace. Stores may
 * pass either a bare name (`"meta"`) or a fully-qualified key (`"tb/meta"`);
 * both resolve to the same namespaced key.
 */
export function namespacedStoreKey(name: string): string {
  return isTbKey(name) ? name : `${TB_PREFIX}${name}`;
}
