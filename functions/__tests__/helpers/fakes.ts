/**
 * functions/__tests__/helpers/fakes.ts — in-memory fakes of the `ports.ts`
 * seams (w1 M1.2). The unit suite runs the REAL handlers against these — no
 * emulator/Java/network on the CI floor (BUILD-GUIDE §2.3 env note). The
 * emulator-backed twin lives under `__emulator__/` (needs-Java, pre-deploy).
 */
import type {
  AuthPort,
  Clock,
  DbPort,
  DocHit,
  EmailPort,
  MessagingPort,
  QueryOp,
  StoragePort,
} from "../../src/ports";

/** Structural fake Timestamp (matches the shared `Ts` shape). */
export interface FakeTs {
  seconds: number;
  nanoseconds: number;
  toMillis(): number;
}

export function fakeTs(ms: number): FakeTs {
  return {
    seconds: Math.floor(ms / 1000),
    nanoseconds: (ms % 1000) * 1e6,
    toMillis: () => ms,
  };
}

function toMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    value !== null &&
    typeof value === "object" &&
    typeof (value as FakeTs).toMillis === "function"
  ) {
    return (value as FakeTs).toMillis();
  }
  return null;
}

function compare(op: QueryOp, a: unknown, b: unknown): boolean {
  const am = toMs(a);
  const bm = toMs(b);
  if (op === "==") return am !== null && bm !== null ? am === bm : a === b;
  if (am === null || bm === null) return false;
  return op === "<" ? am < bm : am <= bm;
}

export class FakeDb implements DbPort {
  readonly docs = new Map<string, Record<string, unknown>>();
  /** every setDoc/updateDoc call in order — redaction tests inspect these */
  readonly writes: { path: string; data: Record<string, unknown> }[] = [];

  async getDoc(path: string): Promise<Record<string, unknown> | null> {
    const doc = this.docs.get(path);
    return doc ? { ...doc } : null;
  }

  async setDoc(
    path: string,
    data: Record<string, unknown>,
    opts?: { merge?: boolean },
  ): Promise<void> {
    const existing = this.docs.get(path);
    const next = opts?.merge && existing ? { ...existing, ...data } : { ...data };
    this.docs.set(path, next);
    this.writes.push({ path, data: next });
  }

  async updateDoc(path: string, data: Record<string, unknown>): Promise<void> {
    const existing = this.docs.get(path);
    if (!existing) throw new Error(`update on missing doc ${path}`);
    const next = { ...existing, ...data };
    this.docs.set(path, next);
    this.writes.push({ path, data: next });
  }

  async deleteDoc(path: string): Promise<void> {
    this.docs.delete(path);
  }

  async listDocs(collectionPath: string): Promise<DocHit[]> {
    const prefix = `${collectionPath}/`;
    const hits: DocHit[] = [];
    for (const [path, data] of this.docs) {
      if (!path.startsWith(prefix)) continue;
      const rest = path.slice(prefix.length);
      if (rest.includes("/")) continue; // direct children only
      hits.push({ id: rest, path, data: { ...data } });
    }
    return hits;
  }

  async query(
    collectionPath: string,
    field: string,
    op: QueryOp,
    value: unknown,
  ): Promise<DocHit[]> {
    return (await this.listDocs(collectionPath)).filter((h) => compare(op, h.data[field], value));
  }

  async queryGroup(
    collectionGroup: string,
    field: string,
    op: QueryOp,
    value: unknown,
  ): Promise<DocHit[]> {
    const hits: DocHit[] = [];
    for (const [path, data] of this.docs) {
      const parts = path.split("/");
      if (parts.length < 2 || parts[parts.length - 2] !== collectionGroup) continue;
      if (compare(op, data[field], value)) {
        hits.push({ id: parts[parts.length - 1]!, path, data: { ...data } });
      }
    }
    return hits;
  }

  tsFromMillis(ms: number): unknown {
    return fakeTs(ms);
  }

  tsToMillis(value: unknown): number | null {
    return toMs(value);
  }
}

export class FakeAuth implements AuthPort {
  readonly claims = new Map<string, Record<string, unknown>>();
  readonly users = new Map<string, { uid: string; email?: string }>();
  readonly deleted: string[] = [];
  readonly mintedTokens: { uid: string; claims: Record<string, unknown> }[] = [];

  async setCustomUserClaims(uid: string, claims: Record<string, unknown>): Promise<void> {
    this.claims.set(uid, claims);
  }

  async getUser(uid: string) {
    const user = this.users.get(uid);
    if (!user) return null;
    return { ...user, customClaims: this.claims.get(uid) ?? {} };
  }

  async createCustomToken(uid: string, claims: Record<string, unknown>): Promise<string> {
    this.mintedTokens.push({ uid, claims });
    return `custom-token-${uid}`;
  }

  async deleteUser(uid: string): Promise<void> {
    if (!this.users.has(uid) && !this.claims.has(uid)) throw new Error("no such user");
    this.users.delete(uid);
    this.claims.delete(uid);
    this.deleted.push(uid);
  }
}

export class FakeMessaging implements MessagingPort {
  readonly sent: { token: string; title: string; body: string }[] = [];
  /** tokens that should throw on send (dead/APNs-typed at the FCM API) */
  rejectTokens = new Set<string>();

  async send(message: { token: string; title: string; body: string }): Promise<void> {
    if (this.rejectTokens.has(message.token)) throw new Error("invalid registration token");
    this.sent.push(message);
  }
}

export class FakeEmail implements EmailPort {
  readonly sent: { to: string; subject: string }[] = [];
  failNext = false;

  async send(to: string, subject: string): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("smtp down");
    }
    this.sent.push({ to, subject });
  }
}

export class FakeStorage implements StoragePort {
  readonly deletedPrefixes: string[] = [];
  objectCount = 0;

  async deletePrefix(prefix: string): Promise<number> {
    this.deletedPrefixes.push(prefix);
    return this.objectCount;
  }
}

export function fixedClock(nowMs: number): Clock {
  return { nowMs: () => nowMs };
}

export function seqIds(prefix = "id"): { newId(): string; newPairingCode(): string } {
  let n = 0;
  return {
    newId: () => `${prefix}-${++n}`,
    newPairingCode: () => `${100000 + ++n}`,
  };
}
