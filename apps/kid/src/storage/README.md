# Storage / persistence layer (M3)

Offline-first persistence behind a **swappable `storage` port**. Plan refs:
doc 66 §M3, doc 69 §3, doc 62 §2/§3.

## Files

| File | Purpose |
|---|---|
| `storage.ts` | The `StoragePort` interface (`getString` / `set` / `delete` / `getAllKeys`), the **default AsyncStorage adapter**, the swappable active-port facade (`storage`, `setStoragePort`), the `tb/`-scoped reset helpers, and the **optional MMKV adapter stub** (`createMmkvPort`). |
| `schemaVersion.ts` | `SCHEMA_VERSION` + the `tb/`-namespaced key helpers (doc 62 §2). |
| `persist.ts` | Zustand `persist` adapter over the port (`createTbPersistOptions`, per-store `version`, `partialize`) + hydration coordination for the gate. |
| `migrations.ts` | Forward-only migration engine + `mergeWithDefaults` + `validateAndRepair` invariants (incl. the canonical `CompanionMood` → `content` coercion). |
| `legacyImport.ts` | One-time legacy-import seam (a **no-op** — we ship fresh). |
| `../../components/StoreHydrationGate.tsx` | Renders children only after every persisted store rehydrates. |

## Default backend: AsyncStorage (Expo Go friendly)

The default is `@react-native-async-storage/async-storage` (doc 69 §3). It works
in **Expo Go**, native dev clients, and the web subset (its built-in
localStorage shim) with **no custom native module**, so the app stays
Expo-Go-runnable. Because AsyncStorage is asynchronous, the port is Promise-based.

## Optional upgrade: MMKV (dev-client only — NOT wired by default)

MMKV (`react-native-mmkv`) is a synchronous, faster native key-value store. It
is a documented **performance upgrade**, not the default, because it requires a
**custom dev client** (it cannot run in Expo Go) — see doc 69 §1/§3.
`react-native-mmkv` is intentionally **not** a dependency.

`createMmkvPort()` in `storage.ts` is a guarded stub implementing the same
`StoragePort` interface. It uses an indirect `require` so the default
(MMKV-less) build type-checks and bundles cleanly. To enable MMKV:

```sh
npx expo install react-native-mmkv      # 1) add the native dep
npx expo run:ios   # or run:android     # 2) build a dev client (NOT Expo Go)
```

```ts
// 3) BEFORE any persisted store hydrates (e.g. top of the root layout):
import { setStoragePort, createMmkvPort } from "@/src/storage";
setStoragePort(createMmkvPort());
```

Everything else (persist adapter, migrations, repair, reset) is backend-agnostic
and keeps working unchanged.

## Anti-shame invariants enforced on load

`validateAndRepair` (in `migrations.ts`) guarantees a corrupt/partial blob can
never produce a punishing state:

- companion `mood` is always a **valid positive member** (out-of-set → `content`);
- token `balance` / `heldTokens` / lifetime totals are **never negative**;
- streaks are **never below 0** and `longestStreakDays` is **never lowered**;
- task `status` is never `failed` (that state does not exist) → coerced to `todo`.
