/**
 * src/services/photoVerify.ts — the on-device optional-photo seam (verify-undo
 * §CREATE / §5, feature #17).
 *
 * The ONE isolating wrapper over `expo-image-picker` for `mode:'photo'` task
 * verification. It is FEATURE-DETECTED and NO-THROW: when the native module or the
 * camera permission is unavailable (web, Expo Go denial, or — in this build — the
 * optional dep is simply not installed), every entry point degrades to a graceful
 * no-op / `null`, so `self` / `parent` / `none` verification and ALL of undo ship
 * with ZERO hard dependency and photo is a purely additive enhancement.
 *
 * IMPORTANT (env + spec §5): `expo-image-picker` / `expo-file-system` are loaded
 * via a guarded runtime `require`, NOT a static `import`, so this module (and
 * everything that imports it — the gameplay orchestrator, VerifyPrompt) compiles
 * and bundles for web with no missing-module error even when the optional deps are
 * absent. When a target DOES ship them, the same seam lights up unchanged.
 *
 * ZERO AI / NO EGRESS (verify-undo §6.5): a captured photo is a LOCAL `file://`
 * URI only — never uploaded, never analyzed, never leaves the device. Photos are
 * copied into an excluded-from-OS-backup dir and `deletePhoto` removes them on
 * re-verify / wipe / restore so none ever orphan or leak via OS backup.
 */

/** A captured on-device photo — a local `file://` URI (never a remote URL). */
export interface CapturedPhoto {
  uri: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires */

// `undefined` = not yet probed; `null` = probed + unavailable; object = the module.
let pickerMod: any | undefined;
let fsMod: any | undefined;

function loadPicker(): any | null {
  if (pickerMod === undefined) {
    try {
      pickerMod = require("expo-image-picker");
    } catch {
      pickerMod = null;
    }
  }
  return pickerMod;
}

function loadFs(): any | null {
  if (fsMod === undefined) {
    try {
      // legacy surface is the SDK-56 stable file API (matches clinician-reporting).
      fsMod = require("expo-file-system/legacy");
    } catch {
      try {
        fsMod = require("expo-file-system");
      } catch {
        fsMod = null;
      }
    }
  }
  return fsMod;
}

/**
 * Is the on-device photo path usable right now? Drives whether the `mode:'photo'`
 * affordance is even rendered (hidden when false — verify-undo §2.1). No side
 * effects, no permission prompt; just a presence probe of the optional module.
 */
export function isPhotoVerifyAvailable(): boolean {
  return loadPicker() != null;
}

/** The dedicated, excluded-from-OS-backup photo dir, or null when fs is absent. */
function photoDir(fs: any): string | null {
  const base = fs?.cacheDirectory;
  return typeof base === "string" ? `${base}tb-photos/` : null;
}

/** Copy a captured asset into the excluded-from-backup dir; degrade to the source. */
async function persistLocally(fs: any, srcUri: string): Promise<string> {
  const dir = photoDir(fs);
  if (!dir || typeof fs.copyAsync !== "function") return srcUri;
  try {
    await fs.makeDirectoryAsync?.(dir, { intermediates: true });
    const ext = srcUri.split(".").pop()?.split("?")[0] || "jpg";
    const dest = `${dir}${Date.now()}.${ext}`;
    await fs.copyAsync({ from: srcUri, to: dest });
    return dest;
  } catch {
    return srcUri; // never block verify on a copy failure
  }
}

/**
 * Launch the on-device camera and return the captured local photo, or `null` when
 * unavailable / permission-denied / canceled / any error. NEVER throws. Verify is
 * a bonus — a null here just means "no photo," the step is already complete.
 */
export async function capturePhoto(): Promise<CapturedPhoto | null> {
  const picker = loadPicker();
  if (!picker) return null;
  try {
    const perm = await picker.requestCameraPermissionsAsync?.();
    if (perm && perm.granted === false) return null;
    const res = await picker.launchCameraAsync?.({
      allowsEditing: false,
      quality: 0.6,
      cameraType: picker.CameraType?.back,
    });
    if (!res || res.canceled) return null;
    const asset = res.assets?.[0];
    if (!asset?.uri) return null;
    const uri = await persistLocally(loadFs(), asset.uri);
    return { uri };
  } catch {
    return null;
  }
}

/**
 * Delete a prior verify photo file (verify-undo §CREATE / §9.3) — called on
 * re-verify, on `wipeAllChildData`/`removeChild`, and on restore-replace so photos
 * never orphan or leave the device via OS backup. NO-THROW; a no-op on web, when
 * fs is absent, or when the file is already gone (`idempotent`).
 */
export async function deletePhoto(uri?: string | null): Promise<void> {
  if (!uri) return;
  const fs = loadFs();
  if (!fs || typeof fs.deleteAsync !== "function") return;
  try {
    await fs.deleteAsync(uri, { idempotent: true });
  } catch {
    // never surface a delete failure — cleanup is best-effort
  }
}
