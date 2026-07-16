import { type ReactNode, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { importLegacyDataOnce } from "../src/storage/legacyImport";
import { useStoresHydrated } from "../src/storage/persist";

type StoreHydrationGateProps = {
  children: ReactNode;
  /** Optional custom splash shown while persisted stores rehydrate from disk. */
  fallback?: ReactNode;
};

/**
 * Max time to block the first frame on hydration before rendering on top of
 * safe defaults anyway (production-readiness §2.3). If a store is wedged/corrupt
 * and never fires `onFinishHydration`, `useStoresHydrated()` would stay false
 * forever and hang on a white screen. `validateAndRepair` guarantees the
 * top-of-defaults render is safe, so a ~4s fallback trades a brief default flash
 * for never hanging. (Tune against real cold-start, §9.5.)
 */
export const HYDRATION_MAX_WAIT_MS = 4000;

/**
 * Renders `children` ONLY after every persisted Zustand store has rehydrated
 * from the storage port (AsyncStorage is async — see src/storage/persist.ts).
 * This prevents the first frame from reading default/empty state before disk is
 * read.
 *
 * Also runs the one-time legacy-import seam on mount (a no-op on a fresh
 * install). With no stores registered yet (e.g. before M4), `useStoresHydrated`
 * is vacuously true and children render immediately.
 *
 * Provider order (doc 66 §M5): mounted ABOVE ThemeProvider so the theme/app can
 * assume hydrated stores.
 */
export default function StoreHydrationGate({
  children,
  fallback,
}: StoreHydrationGateProps) {
  const hydrated = useStoresHydrated();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    void importLegacyDataOnce();
  }, []);

  // Max-wait fallback: render children even if a store never finishes hydrating
  // (§2.3). Safe because repaired defaults are valid. Cleared on unmount.
  useEffect(() => {
    if (hydrated) return;
    const id = setTimeout(() => setTimedOut(true), HYDRATION_MAX_WAIT_MS);
    return () => clearTimeout(id);
  }, [hydrated]);

  if (!hydrated && !timedOut) {
    return (
      fallback ?? (
        <View className="flex-1 items-center justify-center bg-canvas">
          <ActivityIndicator />
        </View>
      )
    );
  }

  return <>{children}</>;
}
