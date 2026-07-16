/**
 * functions/src/ports.ts — narrow admin-SDK ports (w1 M1.2).
 *
 * Every handler is written against these interfaces and receives them as
 * `deps`, so the WHOLE functions suite unit-tests with in-memory fakes — no
 * emulator/Java on the CI floor (BUILD-GUIDE §2.3 env note). The real
 * adapters over firebase-admin live in `firebaseAdmin.ts` and are exercised
 * by the needs-Java emulator suite (`__emulator__/`) before deploy.
 *
 * Handlers throw `HandlerError` (a transport-free {code,message}); the
 * `index.ts` wrappers map it onto `HttpsError` — keeping firebase-functions
 * OUT of the unit-tested modules.
 */

export interface DocHit {
  id: string;
  /** full document path, e.g. "children/abc/activity/x1" */
  path: string;
  data: Record<string, unknown>;
}

export type QueryOp = "==" | "<" | "<=";

/** Minimal Firestore surface (admin). */
export interface DbPort {
  getDoc(path: string): Promise<Record<string, unknown> | null>;
  setDoc(path: string, data: Record<string, unknown>, opts?: { merge?: boolean }): Promise<void>;
  updateDoc(path: string, data: Record<string, unknown>): Promise<void>;
  deleteDoc(path: string): Promise<void>;
  /** all docs of one collection (small, bounded collections only) */
  listDocs(collectionPath: string): Promise<DocHit[]>;
  /** single-field filter on one collection */
  query(collectionPath: string, field: string, op: QueryOp, value: unknown): Promise<DocHit[]>;
  /** single-field filter across a collection GROUP (ttlSweep) */
  queryGroup(collectionGroup: string, field: string, op: QueryOp, value: unknown): Promise<DocHit[]>;
  /** a REAL admin Timestamp for an epoch-ms instant */
  tsFromMillis(ms: number): unknown;
  /** best-effort epoch-ms from a stored Timestamp-ish value (null = unreadable) */
  tsToMillis(value: unknown): number | null;
}

/** Minimal Auth surface (admin). */
export interface AuthPort {
  setCustomUserClaims(uid: string, claims: Record<string, unknown>): Promise<void>;
  getUser(
    uid: string,
  ): Promise<{ uid: string; email?: string; customClaims?: Record<string, unknown> } | null>;
  createCustomToken(uid: string, claims: Record<string, unknown>): Promise<string>;
  deleteUser(uid: string): Promise<void>;
}

/** Minimal FCM surface (admin.messaging). */
export interface MessagingPort {
  /** resolves on accepted send; throws on rejection (e.g. an APNs token) */
  send(message: { token: string; title: string; body: string; data?: Record<string, string> }): Promise<void>;
}

/**
 * The crisis EMAIL fallback channel (§8 #26). The concrete transport (e.g.
 * a mail extension / SMTP relay) is a deploy-time binding; unit tests fake it.
 */
export interface EmailPort {
  send(to: string, subject: string, body: string): Promise<void>;
}

/** Storage cleanup surface (deleteChildData / ttlSweep orphan purge). */
export interface StoragePort {
  /** delete every object under a path prefix; resolves with the count */
  deletePrefix(prefix: string): Promise<number>;
}

export interface Clock {
  nowMs(): number;
}

/** Every handler's dependency bundle (subset per handler). */
export interface Deps {
  db: DbPort;
  auth: AuthPort;
  messaging: MessagingPort;
  email: EmailPort;
  storage: StoragePort;
  clock: Clock;
}

/** Transport-free callable error; index.ts maps it to HttpsError 1:1. */
export class HandlerError extends Error {
  readonly code:
    | "unauthenticated"
    | "permission-denied"
    | "invalid-argument"
    | "failed-precondition"
    | "not-found";

  constructor(code: HandlerError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "HandlerError";
  }
}

/** The decoded auth context a callable receives (server-verified). */
export interface CallerAuth {
  uid: string;
  token: Record<string, unknown>;
}

/** Require a signed-in parent with the role claim. */
export function requireParent(auth: CallerAuth | null | undefined): CallerAuth {
  if (!auth) throw new HandlerError("unauthenticated", "sign in required");
  if (auth.token.role !== "parent") {
    throw new HandlerError("permission-denied", "parent role required");
  }
  return auth;
}
