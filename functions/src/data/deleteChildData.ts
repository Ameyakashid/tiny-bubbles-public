/**
 * functions/src/data/deleteChildData.ts — parent review+delete (w1 M1.2 —
 * §2.3, §2.5; the COPPA right-to-erasure, cloud half of v1's PIN-gated
 * `wipeAllChildData`).
 *
 * Purges the child subtree (settings/boards/schedules/narratives/activity/
 * transcripts/alerts/reports), the kid Auth identity, and the Storage videos
 * — EXCEPT docs under `legalHold:true` (abuse/CSAM preservation, §8 #27):
 * those are SKIPPED (and the child doc is kept as a minimal tombstone while
 * any hold remains) until the mandated-reporter workflow clears them. A
 * parent delete can never destroy preserved evidence.
 */
import { HandlerError, requireParent, type CallerAuth, type Deps } from "../ports";

export interface DeleteChildDataInput {
  childId: string;
}

export interface DeleteChildDataResult {
  deletedDocs: number;
  skippedLegalHold: number;
  deletedStorageObjects: number;
  authUserDeleted: boolean;
  childDocDeleted: boolean;
}

const CHILD_SUBCOLLECTIONS = [
  "settings",
  "boards",
  "schedules",
  "narratives",
  "activity",
  "transcripts",
  "alerts",
  "reports",
] as const;

export async function handleDeleteChildData(
  deps: Pick<Deps, "db" | "auth" | "storage">,
  auth: CallerAuth | null,
  data: DeleteChildDataInput,
): Promise<DeleteChildDataResult> {
  const caller = requireParent(auth);
  const childId = typeof data.childId === "string" ? data.childId : "";
  if (!childId) throw new HandlerError("invalid-argument", "childId required");

  const child = await deps.db.getDoc(`children/${childId}`);
  if (!child) throw new HandlerError("not-found", "no such child");
  if (child.parentUid !== caller.uid) {
    throw new HandlerError("permission-denied", "not the guardian of this child");
  }

  let deletedDocs = 0;
  let skippedLegalHold = 0;
  for (const sub of CHILD_SUBCOLLECTIONS) {
    const docs = await deps.db.listDocs(`children/${childId}/${sub}`);
    for (const doc of docs) {
      if (doc.data.legalHold === true) {
        skippedLegalHold += 1; // §8 #27 — preservation duty beats erasure
        continue;
      }
      await deps.db.deleteDoc(doc.path);
      deletedDocs += 1;
    }
  }

  const deletedStorageObjects = await deps.storage.deletePrefix(`children/${childId}/videos/`);

  // The kid Auth identity always goes (no future sign-ins).
  let authUserDeleted = false;
  try {
    await deps.auth.deleteUser(childId);
    authUserDeleted = true;
  } catch {
    authUserDeleted = false; // never provisioned/already gone — fine
  }

  // Keep a minimal tombstone while any legal hold remains (the held docs need
  // their parent path); otherwise remove the child doc entirely.
  let childDocDeleted = false;
  if (skippedLegalHold === 0) {
    await deps.db.deleteDoc(`children/${childId}`);
    childDocDeleted = true;
  } else {
    await deps.db.setDoc(
      `children/${childId}`,
      { childId, parentUid: caller.uid, displayName: "", deletedByParent: true },
      { merge: false },
    );
  }

  return { deletedDocs, skippedLegalHold, deletedStorageObjects, authUserDeleted, childDocDeleted };
}
