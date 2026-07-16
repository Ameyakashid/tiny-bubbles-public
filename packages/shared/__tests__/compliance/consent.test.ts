/**
 * consent.test.ts — the versioned agreement registry: CURRENT is newest by
 * effectiveFrom; version round-trips; the body passes the evidence-honesty
 * gate and names the no-ads + non-training-processor bindings (w8 §7-D).
 */
import { describe, expect, it } from "@jest/globals";

import {
  agreementByVersion,
  CONSENT_AGREEMENTS,
  CURRENT_AGREEMENT,
} from "../../src/compliance/consent";
import { isEvidenceHonest } from "../../src/compliance/evidenceHonesty";

describe("CONSENT_AGREEMENTS — the registry", () => {
  it("has at least the v1 seed agreement", () => {
    expect(CONSENT_AGREEMENTS.length).toBeGreaterThanOrEqual(1);
  });

  it("CURRENT_AGREEMENT is the newest by effectiveFrom", () => {
    const newest = [...CONSENT_AGREEMENTS].sort((a, b) =>
      a.effectiveFrom < b.effectiveFrom ? 1 : -1,
    )[0];
    expect(CURRENT_AGREEMENT.version).toBe(newest.version);
  });

  it("agreementByVersion round-trips every registered version", () => {
    for (const agreement of CONSENT_AGREEMENTS) {
      expect(agreementByVersion(agreement.version)).toBe(agreement);
    }
    expect(agreementByVersion("no-such-version")).toBeUndefined();
  });

  it("every agreement body + statement passes the evidence-honesty gate", () => {
    for (const a of CONSENT_AGREEMENTS) {
      expect(isEvidenceHonest(a.bodyMarkdown)).toBe(true);
      expect(isEvidenceHonest(a.retentionSummary)).toBe(true);
      expect(isEvidenceHonest(a.processorBinding)).toBe(true);
      expect(isEvidenceHonest(a.noAdsStatement)).toBe(true);
      for (const line of a.collects) expect(isEvidenceHonest(line)).toBe(true);
    }
  });

  it("names the locked bindings: no ads/analytics + non-training processor + no secrecy + retention", () => {
    expect(CURRENT_AGREEMENT.noAdsStatement).toMatch(/no advertising|no ads/i);
    expect(CURRENT_AGREEMENT.processorBinding).toMatch(/non-training/i);
    expect(CURRENT_AGREEMENT.bodyMarkdown).toMatch(/no ads|no advertising/i);
    expect(CURRENT_AGREEMENT.bodyMarkdown).toMatch(/not train|non-training|may not train/i);
    expect(CURRENT_AGREEMENT.bodyMarkdown).toMatch(/see every chat|can see chats/i);
    expect(CURRENT_AGREEMENT.retentionSummary).toMatch(/30/);
    expect(CURRENT_AGREEMENT.retentionSummary).toMatch(/90/);
  });
});
