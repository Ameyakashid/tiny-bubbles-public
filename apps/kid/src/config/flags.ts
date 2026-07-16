/**
 * src/config/flags.ts — central build/runtime flags (production-readiness §2.6/§3.1).
 *
 * NOT persisted. Derived at module load from `__DEV__` + Expo's public-env
 * mechanism (`process.env.EXPO_PUBLIC_*`). This is the ONE switch that gates the
 * dev-only diagnostic screens (`/_sandbox`, `/_theme-gallery`) so a store build
 * never surfaces them:
 *
 *   - ON  in `__DEV__` (local development), and
 *   - ON  in any EAS profile that sets `EXPO_PUBLIC_TB_DEV_SCREENS=1`
 *         (the `development` / `preview` profiles — eas.json §2.1), and
 *   - OFF in `production` (the env var is unset there).
 *
 * The same flag can gate any future debug affordance so there is a single seam.
 */

/** True when the dev-only diagnostic screens should be reachable/registered. */
export const DEV_SCREENS_ENABLED: boolean =
  (typeof __DEV__ !== "undefined" && __DEV__) ||
  process.env.EXPO_PUBLIC_TB_DEV_SCREENS === "1";

/**
 * M2.0 (w2, arch §4.2): selects the REAL callable-backed Bloop provider
 * instead of the deterministic offline `MockBloopProvider`. DEFAULT false —
 * the mock is the provider in dev, CI, Expo Go, web, and any build that does
 * not explicitly set `EXPO_PUBLIC_TB_BLOOP_PROXY=1` (a native/EAS profile
 * concern, §8 #25 — that build also adds App Check). NOTE: this flag selects
 * the TRANSPORT only; chat itself stays parent-gated by
 * `ChildSettings.bloopEnabled` (absent ⇒ false) on EVERY path.
 */
export const BLOOP_PROXY_ENABLED: boolean =
  process.env.EXPO_PUBLIC_TB_BLOOP_PROXY === "1";
