/**
 * packages/shared/src/compliance/index.ts — compliance barrel (w8 M1.1).
 *
 * One home per symbol (02-architecture §8 #20): pii/evidenceHonesty/
 * crisisResources/crisisReview/retention/consent/symbolLicense are each the
 * CANONICAL home of what they export — w1/w2/w3/w4 import, never re-declare.
 *
 * `symbolLicenseNode` (the fs-walking gate wrapper) is deliberately NOT
 * re-exported: it is Node-only (gates/CI/ship-gate) and must never enter a
 * client bundle.
 */
export * from "./pii";
export * from "./evidenceHonesty";
export * from "./crisisResources";
export * from "./crisisReview";
export * from "./retention";
export * from "./consent";
export * from "./symbolLicense";
