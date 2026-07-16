/**
 * src/storage — public surface of the persistence layer (doc 66 M3, doc 69 §3).
 *
 * Default backend: AsyncStorage behind the swappable `storage` port. Optional
 * MMKV adapter (`createMmkvPort`) implements the same interface for dev-client
 * builds — see ./README.md. Persisted state is `tb/`-namespaced, versioned, and
 * migration-/repair-guarded with structural anti-shame invariants.
 */
export * from "./schemaVersion";
export * from "./storage";
export * from "./persist";
export * from "./migrations";
export * from "./legacyImport";
