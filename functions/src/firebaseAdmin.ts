/**
 * functions/src/firebaseAdmin.ts — the REAL firebase-admin adapters over the
 * narrow ports (w1 M1.2; donor: firebase-cloud-functions-typescript-example,
 * MIT — the shared db/auth/messaging handle pattern).
 *
 * Lazy `initializeApp()` (safe under emulator + deploy cold start). This is
 * the ONLY functions module that imports firebase-admin at runtime; every
 * handler stays unit-testable against fakes (see `ports.ts`). Exercised for
 * real by the needs-Java emulator suite (`__emulator__/`) before deploy.
 */
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldPath, Timestamp, getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getStorage } from "firebase-admin/storage";

import type {
  AuthPort,
  Clock,
  DbPort,
  Deps,
  DocHit,
  EmailPort,
  MessagingPort,
  QueryOp,
  StoragePort,
} from "./ports";

function ensureApp(): void {
  if (getApps().length === 0) initializeApp();
}

function toHit(doc: FirebaseFirestore.QueryDocumentSnapshot): DocHit {
  return { id: doc.id, path: doc.ref.path, data: doc.data() };
}

export function makeDbPort(): DbPort {
  ensureApp();
  const db = getFirestore();
  return {
    async getDoc(path) {
      const snap = await db.doc(path).get();
      return snap.exists ? (snap.data() as Record<string, unknown>) : null;
    },
    async setDoc(path, data, opts) {
      await db.doc(path).set(data, { merge: opts?.merge ?? false });
    },
    async updateDoc(path, data) {
      await db.doc(path).update(data);
    },
    async deleteDoc(path) {
      await db.doc(path).delete();
    },
    async listDocs(collectionPath) {
      const snap = await db.collection(collectionPath).get();
      return snap.docs.map(toHit);
    },
    async query(collectionPath, field, op: QueryOp, value) {
      const snap = await db.collection(collectionPath).where(field, op, value).get();
      return snap.docs.map(toHit);
    },
    async queryGroup(collectionGroup, field, op: QueryOp, value) {
      const snap = await db.collectionGroup(collectionGroup).where(field, op, value).get();
      return snap.docs.map(toHit);
    },
    tsFromMillis(ms) {
      return Timestamp.fromMillis(ms);
    },
    tsToMillis(value) {
      if (value instanceof Timestamp) return value.toMillis();
      if (typeof value === "number" && Number.isFinite(value)) return value;
      return null;
    },
  };
}

export function makeAuthPort(): AuthPort {
  ensureApp();
  const auth = getAuth();
  return {
    async setCustomUserClaims(uid, claims) {
      await auth.setCustomUserClaims(uid, claims);
    },
    async getUser(uid) {
      try {
        const user = await auth.getUser(uid);
        return {
          uid: user.uid,
          ...(user.email ? { email: user.email } : {}),
          ...(user.customClaims ? { customClaims: user.customClaims } : {}),
        };
      } catch {
        return null;
      }
    },
    async createCustomToken(uid, claims) {
      return auth.createCustomToken(uid, claims);
    },
    async deleteUser(uid) {
      await auth.deleteUser(uid);
    },
  };
}

export function makeMessagingPort(): MessagingPort {
  ensureApp();
  const messaging = getMessaging();
  return {
    async send(message) {
      await messaging.send({
        token: message.token,
        notification: { title: message.title, body: message.body },
        ...(message.data ? { data: message.data } : {}),
      });
    },
  };
}

/**
 * Email fallback transport (§8 #26): writes to a `mail/` queue collection —
 * the documented contract of the Firebase "Trigger Email" extension. If the
 * extension is not installed the queue is inert (delivery falls back to FCM
 * only and `deliveredEmail` stays false at the alert layer).
 */
export function makeEmailPort(): EmailPort {
  ensureApp();
  const db = getFirestore();
  return {
    async send(to, subject, body) {
      await db.collection("mail").add({
        to,
        message: { subject, text: body },
        createdAt: Timestamp.now(),
      });
    },
  };
}

export function makeStoragePort(): StoragePort {
  ensureApp();
  return {
    async deletePrefix(prefix) {
      const bucket = getStorage().bucket();
      const [files] = await bucket.getFiles({ prefix });
      await Promise.all(files.map((f) => f.delete({ ignoreNotFound: true })));
      return files.length;
    },
  };
}

export function makeClock(): Clock {
  return { nowMs: () => Date.now() };
}

let cached: Deps | null = null;

/** The production dependency bundle (lazy singletons). */
export function makeDeps(): Deps {
  if (!cached) {
    cached = {
      db: makeDbPort(),
      auth: makeAuthPort(),
      messaging: makeMessagingPort(),
      email: makeEmailPort(),
      storage: makeStoragePort(),
      clock: makeClock(),
    };
  }
  return cached;
}

export { FieldPath };
