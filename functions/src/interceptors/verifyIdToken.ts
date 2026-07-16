/**
 * functions/src/interceptors/verifyIdToken.ts — the server-authoritative kid
 * context loader (w1 M1.2 — §8 #28; donor: firebase-cloud-functions-
 * typescript-example verify-idtoken-interceptor.ts, MIT — re-shaped onto the
 * callable auth context).
 *
 * THE rule (§8 #28): `childId` is DERIVED from the authed kid uid
 * (`childId === uid`); `topicScope`/`ageMode`/`neuroProfile`/`bloopEnabled`/
 * `limits`/`crisisLocale` are loaded from Firestore SERVER-SIDE. Any client-
 * supplied context is an untrusted hint — a client passing a wider scope, an
 * older ageMode, or a foreign childId is simply overridden by what this
 * interceptor returns. The w2 proxy MUST build its gate from this context and
 * nothing else (it returns `disabled` with NO model call when
 * `bloopEnabled === false`).
 */
import { settingsDoc, type ChildControls } from "@tiny-bubbles/shared";

import { HandlerError, type CallerAuth, type DbPort } from "../ports";

export interface KidContext {
  /** === the authed uid — never client input (§8 #28) */
  childId: string;
  parentUid: string;
  ageMode: string;
  neuroProfile: string;
  /** the parent-authoritative controls map, loaded server-side */
  controls: ChildControls | null;
  /** the load-bearing gate: server-side bloopEnabled (default FALSE) */
  bloopEnabled: boolean;
}

export async function verifyKidContext(
  deps: { db: DbPort },
  auth: CallerAuth | null,
): Promise<KidContext> {
  if (!auth) throw new HandlerError("unauthenticated", "sign in required");
  if (auth.token.role !== "kid") {
    throw new HandlerError("permission-denied", "kid role required");
  }
  // childId === uid, and the minted claim must agree (§8 #28).
  if (auth.token.childId !== auth.uid) {
    throw new HandlerError("permission-denied", "token childId does not match uid");
  }
  const childId = auth.uid;

  const child = await deps.db.getDoc(`children/${childId}`);
  if (!child) {
    throw new HandlerError("failed-precondition", "kid uid has no provisioned child");
  }
  const parentUid = typeof child.parentUid === "string" ? child.parentUid : "";
  if (!parentUid || auth.token.parentUid !== parentUid) {
    throw new HandlerError("permission-denied", "guardian link mismatch");
  }

  const settings = await deps.db.getDoc(settingsDoc(childId));
  const controls = (settings?.controls as ChildControls | undefined) ?? null;

  return {
    childId,
    parentUid,
    ageMode: typeof child.ageMode === "string" ? child.ageMode : "young",
    neuroProfile: typeof child.neuroProfile === "string" ? child.neuroProfile : "both",
    controls,
    // FAIL CLOSED: absent settings/controls ⇒ the LLM is OFF.
    bloopEnabled: controls?.bloopEnabled === true,
  };
}
