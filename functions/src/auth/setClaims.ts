/**
 * functions/src/auth/setClaims.ts — custom-claim helper (w1 M1.2; donor
 * pattern: firebase-cloud-functions-typescript-example `MyClaims`, MIT).
 *
 * ONE place the claim shapes are spelled so parent/kid tokens never drift:
 *   parent → { role:"parent", consentVerified }
 *   kid    → { role:"kid", parentUid, childId }   (childId === uid, §8 #28)
 */
import type { AuthPort } from "../ports";

export interface ParentClaims {
  role: "parent";
  consentVerified: boolean;
}

export interface KidClaims {
  role: "kid";
  parentUid: string;
  childId: string;
}

export function parentClaims(consentVerified: boolean): ParentClaims {
  return { role: "parent", consentVerified };
}

/** Kid claims — `childId` MUST equal the uid the token is minted for (§8 #28). */
export function kidClaims(parentUid: string, childId: string): KidClaims {
  return { role: "kid", parentUid, childId };
}

export async function setParentClaims(
  auth: AuthPort,
  uid: string,
  consentVerified: boolean,
): Promise<void> {
  await auth.setCustomUserClaims(uid, { ...parentClaims(consentVerified) });
}
