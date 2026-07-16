/**
 * functions/src/auth/onParentCreated.ts — Auth→Firestore mirror (w1 M1.2;
 * donor concept: firebase-functions-samples firestore-sync-auth, Apache-2.0).
 *
 * Seeds `users/{uid}` (the canonical `ParentUserDoc`, §2.3) when a PARENT
 * Auth user is created. Kid uids (a `children/{uid}` doc exists) are skipped
 * — they never get a parent doc. Defaults are the COPPA-min posture:
 * `retentionDays: 30` (§8 #10b), empty consent trail, no push targets yet.
 */
import type { Clock, DbPort } from "../ports";

export interface ParentCreatedInput {
  uid: string;
  email?: string;
  displayName?: string;
}

export async function handleParentCreated(
  deps: { db: DbPort; clock: Clock },
  user: ParentCreatedInput,
): Promise<boolean> {
  const child = await deps.db.getDoc(`children/${user.uid}`);
  if (child) return false; // kid identity — no parent doc

  const nowTs = deps.db.tsFromMillis(deps.clock.nowMs());
  await deps.db.setDoc(
    `users/${user.uid}`,
    {
      uid: user.uid,
      role: "parent",
      email: user.email ?? "",
      ...(user.displayName ? { displayName: user.displayName } : {}),
      consent: [],
      fcmTokens: [],
      retentionDays: 30,
      crisisLocale: "en-US",
      createdAt: nowTs,
      updatedAt: nowTs,
    },
    { merge: true }, // idempotent re-run safe
  );
  return true;
}
