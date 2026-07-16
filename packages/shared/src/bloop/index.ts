/**
 * packages/shared/src/bloop/index.ts — bloop barrel (w2-owned; SEEDED M1.2,
 * COMPLETED M2.0).
 *
 * M1.2 seeded only what the w1 Firestore schema imports (`InputMode`,
 * `ModeratedReplyStatus`, the moderation verdict taxonomy, `TopicCategory`).
 * M2.0 (w2) added the provider port + the turn wire contract (`TurnRequest`/
 * `TurnOutcome` aligned with the handcraft pipeline), chat availability, the
 * curated quick-reply catalog, the transcript view aliases, and
 * `MockBloopProvider`. One home per symbol (§8 #20): `CrisisCard`/
 * `CrisisResource`/`CrisisType` stay in `compliance/crisisResources.ts` and
 * are NOT re-exported here; the canonical doc interfaces stay in
 * `firestore/types.ts` (transcript.ts only re-NAMES them).
 */
export * from "./provider";
export * from "./moderation";
export * from "./topics";
export * from "./turn";
export * from "./quickReplies";
export * from "./transcript";
export * from "./mock";
