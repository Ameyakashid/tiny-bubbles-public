/**
 * src/sync/firebase.ts — the Firebase seam of the ONE sanctioned egress module
 * in the kid tree (w1 M1.2 — 02-architecture §1.4/§2.4).
 *
 * OFFLINE/MOCK-FIRST: `firebaseConfig` comes ONLY from `EXPO_PUBLIC_FIREBASE_*`
 * env vars (no https:// literal, no committed credential — arch §1.4). When
 * they are absent (the default), every entry point resolves to `null` and the
 * app is FULLY functional offline — Firebase is provably additive (the Moxie
 * invariant). The SDK is loaded through `import()` at CALL time, gated by
 * `cloudSyncEnabled` (default false), so a no-Firebase run never evaluates it.
 *
 * The SDK surface is wrapped in narrow PORTS (`SyncPorts`) so jest injects a
 * mock (`__setSyncPortsForTests`) and the suite runs with no emulator/network
 * (BUILD-GUIDE env floor). App Check on the native prod build is
 * `@react-native-firebase/app-check` (§8 #25) — a native/EAS concern wired at
 * M6.x, deliberately NOT imported here.
 *
 * `pairKidDevice(code, localCid)` (§8 #21c) is the kid custom-token pairing
 * seam: it exchanges the parent-issued short-lived code for a custom token
 * with claims `{role:"kid", parentUid, childId}` (childId === kid uid — §8
 * #28), signs in, and links the PRE-EXISTING local child non-destructively
 * (`linkage[localCid]` + `firestoreChildId`; the on-device storage port stays
 * the source of truth — nothing migrates).
 */
import { useChildStore } from "../state/childStore";
import { useSyncStore } from "../state/syncStore";

// ---------------------------------------------------------------------------
// Env config (EXPO_PUBLIC_* — inlined by Expo at build time; arch §1.4).
// ---------------------------------------------------------------------------

export interface FirebaseEnvConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

/**
 * Read the Firebase web config from `EXPO_PUBLIC_FIREBASE_*`. Returns null
 * unless the three load-bearing keys are ALL present — a partial config is
 * treated as unconfigured (fail closed to offline, never a half-initialized
 * SDK).
 */
export function firebaseConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): FirebaseEnvConfig | null {
  const apiKey = env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const projectId = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = env.EXPO_PUBLIC_FIREBASE_APP_ID;
  if (!apiKey || !projectId || !appId) return null;
  return {
    apiKey,
    projectId,
    appId,
    ...(env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
      ? { authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN }
      : {}),
    ...(env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
      ? { storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET }
      : {}),
    ...(env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
      ? { messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }
      : {}),
  };
}

/** True when the env carries a complete Firebase config. */
export function isFirebaseConfigured(): boolean {
  return firebaseConfigFromEnv() !== null;
}

// ---------------------------------------------------------------------------
// Narrow SDK ports (the mockable seam).
// ---------------------------------------------------------------------------

/** Minimal Firestore surface the sync adapter uses. */
export interface SyncFirestorePort {
  /** idempotent write — `set` with merge (localId === docId) */
  setDoc(path: string, data: Record<string, unknown>, opts: { merge: boolean }): Promise<void>;
  /** single-doc read (settings pulls); null when absent */
  getDoc(path: string): Promise<Record<string, unknown> | null>;
  /** a REAL SDK Timestamp for an epoch-ms instant (stamped at drain time) */
  tsFromMillis(ms: number): unknown;
}

/** Minimal Auth surface (custom-token pairing). */
export interface SyncAuthPort {
  signInWithCustomToken(token: string): Promise<{ uid: string }>;
  currentUid(): string | null;
}

/** Minimal callable-functions surface (pairKidDevice etc.). */
export interface SyncFunctionsPort {
  call<TReq, TRes>(name: string, data: TReq): Promise<TRes>;
}

export interface SyncPorts {
  firestore: SyncFirestorePort;
  auth: SyncAuthPort;
  functions: SyncFunctionsPort;
}

let testPorts: SyncPorts | null | undefined;
let realPorts: SyncPorts | null | undefined;

/** TEST SEAM: inject mock ports (pass undefined to restore the real loader). */
export function __setSyncPortsForTests(ports: SyncPorts | null | undefined): void {
  testPorts = ports;
  realPorts = undefined;
}

/**
 * Resolve the live ports: the injected test double, else the real SDK (loaded
 * once, only when env-configured), else null (offline/unconfigured — callers
 * queue and carry on; nothing throws, nothing bricks).
 */
export async function getSyncPorts(): Promise<SyncPorts | null> {
  if (testPorts !== undefined) return testPorts;
  if (realPorts !== undefined) return realPorts;
  const cfg = firebaseConfigFromEnv();
  if (!cfg) {
    realPorts = null;
    return null;
  }
  try {
    realPorts = await loadRealPorts(cfg);
  } catch {
    // SDK unavailable/failed to init — behave exactly like unconfigured.
    realPorts = null;
  }
  return realPorts;
}

/** Dynamic-import the Firebase JS SDK and adapt it onto the ports. */
async function loadRealPorts(cfg: FirebaseEnvConfig): Promise<SyncPorts> {
  const appMod = await import("firebase/app");
  const app = appMod.getApps().length > 0 ? appMod.getApp() : appMod.initializeApp(cfg);
  const [fs, auth, fns] = await Promise.all([
    import("firebase/firestore"),
    import("firebase/auth"),
    import("firebase/functions"),
  ]);
  const db = fs.getFirestore(app);
  const authInstance = auth.getAuth(app);
  const functionsInstance = fns.getFunctions(app);
  return {
    firestore: {
      async setDoc(path, data, opts) {
        await fs.setDoc(fs.doc(db, path), data, { merge: opts.merge });
      },
      async getDoc(path) {
        const snap = await fs.getDoc(fs.doc(db, path));
        return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
      },
      tsFromMillis(ms) {
        return fs.Timestamp.fromMillis(ms);
      },
    },
    auth: {
      async signInWithCustomToken(token) {
        const cred = await auth.signInWithCustomToken(authInstance, token);
        return { uid: cred.user.uid };
      },
      currentUid() {
        return authInstance.currentUser?.uid ?? null;
      },
    },
    functions: {
      async call<TReq, TRes>(name: string, data: TReq): Promise<TRes> {
        const callable = fns.httpsCallable<TReq, TRes>(functionsInstance, name);
        const res = await callable(data);
        return res.data;
      },
    },
  };
}

// ---------------------------------------------------------------------------
// pairKidDevice — the kid custom-token pairing seam (§8 #21c).
// ---------------------------------------------------------------------------

export type PairResult =
  | { ok: true; childId: string; parentUid: string }
  | { ok: false; reason: "unconfigured" | "rejected" };

interface PairKidDeviceResponse {
  token: string;
  childId: string;
  parentUid: string;
}

/**
 * Exchange a parent-issued pairing code for the kid custom token and link the
 * PRE-EXISTING local child `localCid` to its cloud identity — additive, never
 * a destructive migration (§8 #21c): the storage port stays the source of
 * truth; only `linkage` + `firestoreChildId` are written. No-throw: an
 * unconfigured build returns `{ok:false, reason:"unconfigured"}` and a bad/
 * expired code returns `{ok:false, reason:"rejected"}`.
 */
export async function pairKidDevice(code: string, localCid: string): Promise<PairResult> {
  const ports = await getSyncPorts();
  if (!ports) return { ok: false, reason: "unconfigured" };
  try {
    const res = await ports.functions.call<{ code: string; localCid: string }, PairKidDeviceResponse>(
      "pairKidDevice",
      { code, localCid },
    );
    await ports.auth.signInWithCustomToken(res.token);
    useSyncStore.getState().setLinkage(localCid, {
      childId: res.childId,
      parentUid: res.parentUid,
    });
    useSyncStore.getState().setStatus("pending");
    // Record the link on the child settings (additive optional field).
    useChildStore.getState().updateSettings(localCid, {
      firestoreChildId: res.childId,
      cloudSyncEnabled: true,
    });
    return { ok: true, childId: res.childId, parentUid: res.parentUid };
  } catch {
    return { ok: false, reason: "rejected" };
  }
}
