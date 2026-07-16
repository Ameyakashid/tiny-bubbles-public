/**
 * src/storage/legacyImport.ts — one-time legacy-data import seam (NO-OP).
 *
 * Tiny Bubbles ships FRESH: there is no prior release whose AsyncStorage/MMKV
 * dataset we must read in. This function therefore does nothing today, but it is
 * a real, idempotent seam so a future migration (e.g. importing data from an
 * older key layout, or AsyncStorage -> MMKV) has an established, tested call
 * site at boot.
 *
 * Idempotency: a marker key records that the (no-op) import already ran, so it
 * executes at most once per install. The `<StoreHydrationGate>` invokes it on
 * mount.
 */
import { storage } from "./storage";

/** Marker recording that the one-time legacy import already ran. */
export const LEGACY_IMPORT_MARKER_KEY = "tb/_legacyImportDone";

/**
 * Run the one-time legacy import. Currently a NO-OP (we start fresh). Safe to
 * call on every boot — it self-guards via the marker key and never throws.
 *
 * @returns `true` if the import ran this call, `false` if it had already run.
 */
export async function importLegacyDataOnce(): Promise<boolean> {
  try {
    const done = await storage.getString(LEGACY_IMPORT_MARKER_KEY);
    if (done === "1") return false;

    // --- Intentionally empty: nothing to import on a fresh install. ---
    // Future legacy/AsyncStorage->MMKV import logic would transform old keys
    // and write them under the `tb/` namespace here.

    await storage.set(LEGACY_IMPORT_MARKER_KEY, "1");
    return true;
  } catch {
    // Never let the import seam crash boot — worst case it retries next launch.
    return false;
  }
}
