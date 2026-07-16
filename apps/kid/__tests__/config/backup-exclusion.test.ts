/**
 * __tests__/config/backup-exclusion.test.ts — the OS-backup-exclusion gate
 * SCAFFOLD (production-readiness §2.7). M-A4 front-loads the Android half; the
 * iOS photo-dir exclusion assertion is COMPLETED at M-D2 once verify-undo's
 * `photoVerify.ts` (the `tb-photos` write path) exists.
 *
 * This is the load-bearing "nothing leaves the device — including via the OS"
 * fix: without `android.allowBackup:false`, Android Auto Backup / Google Drive
 * would sweep the `tb/` AsyncStorage container (mood logs, ledgers, behavioral
 * history) off-device by default — making the store "No data collected/shared"
 * answer FALSE. The no-network grep (§2.5) inspects app code only and cannot
 * catch this, so it needs its own gate. The M-D2 store gate is BLOCKED until this
 * (plus the iOS photo-dir exclusion) is green.
 */
import { readFileSync } from "fs";
import { join, resolve } from "path";

import { describe, expect, it } from "@jest/globals";

const ROOT = resolve(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const appJson = JSON.parse(read("app.json")) as {
  expo?: { android?: { allowBackup?: boolean } };
};

describe("OS backup exclusion (§2.7)", () => {
  it("app.json disables Android auto-backup of the data container", () => {
    // The precondition for an honest "No data collected/shared" store answer.
    expect(appJson.expo?.android?.allowBackup).toBe(false);
  });

  // COMPLETED AT M-D2 (§2.7): the child verify-photo write path targets the OS
  // cache dir subfolder `tb-photos/`. iOS does NOT include the caches directory
  // in iCloud/iTunes backup, so no photo file rides OS backup off-device — the
  // load-bearing half of the "nothing leaves the device" claim for photos.
  it("iOS: child verify photos are written to the backup-excluded cache dir", () => {
    const src = read("src/services/photoVerify.ts");
    // The dedicated photo dir is derived from the OS cache dir (not documents),
    // so it is excluded from iOS backup by default.
    expect(src).toMatch(/cacheDirectory/);
    expect(src).toMatch(/tb-photos/);
    // And deletePhoto exists so a prior photo is removed on re-verify / wipe /
    // restore — the dir never accumulates orphans that could ride a backup.
    expect(src).toMatch(/export\s+async\s+function\s+deletePhoto/);
  });

  it("app.json declares an honest, no-upload camera usage string (verify-undo)", () => {
    // The optional child photo-verify (expo-image-picker) discloses camera use;
    // the string must be non-medical and must say photos stay on-device.
    const raw = read("app.json");
    expect(raw).toMatch(/expo-image-picker/);
    expect(raw).toMatch(/cameraPermission/);
    expect(raw).toMatch(/stay on this device/i);
    // never over-claim a medical/required framing in the usage string.
    expect(raw).not.toMatch(/\b(treat|cure|required|must)\b/i);
  });
});
