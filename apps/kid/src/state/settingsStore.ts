/**
 * src/state/settingsStore.ts — app-global + parent-global settings (persisted).
 *
 * Holds the three non-per-child slices (doc 62 §1/§2): `meta` (schema version,
 * install id, active child, onboarding), `parentSettings`, and `entitlement`.
 * Persisted via the `tb/`-namespaced port adapter (src/storage/persist.ts).
 *
 * Anti-shame defaults baked in via the domain factories: analytics + mood
 * logging OFF (opt-IN), AI OFF, premium gating affects acquisition only.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  defaultEntitlement,
  defaultParentSettings,
  ONE_DAY_MS,
  PREMIUM_TRIAL_MS,
} from "../domain/constants";
import type {
  AppMeta,
  Entitlement,
  OnboardingStep,
  ParentGateConfig,
  ParentSettings,
} from "../domain/types";
import { SCHEMA_VERSION } from "../storage/schemaVersion";
import { createTbPersistOptions, registerPersistedStore } from "../storage/persist";

import { newId, now } from "./ids";

function freshMeta(ts: number): AppMeta {
  return {
    schemaVersion: SCHEMA_VERSION,
    installId: newId(),
    createdAt: ts,
    lastOpenedAt: ts,
    activeChildId: null,
    onboarding: {
      completed: false,
      currentStep: "welcome",
      privacyConsentAckAt: null,
      parentGateConfigured: false,
      firstChildCreated: false,
      calmModeOffered: false,
    },
  };
}

export interface SettingsState {
  meta: AppMeta;
  parentSettings: ParentSettings;
  entitlement: Entitlement;

  // meta / onboarding
  touchOpened: () => void;
  /** Stamp `meta.lastRecoveredAt` from the RootErrorBoundary (local diagnostics). */
  noteRecovered: () => void;
  setActiveChild: (id: string | null) => void;
  setOnboardingStep: (step: OnboardingStep) => void;
  ackPrivacyConsent: () => void;
  setParentGateConfigured: (v: boolean) => void;
  markFirstChildCreated: () => void;
  markCalmModeOffered: () => void;
  completeOnboarding: () => void;

  // parent settings
  updateParentSettings: (patch: Partial<ParentSettings>) => void;
  configureParentGate: (gate: ParentGateConfig) => void;

  // entitlement (mock paywall — no real processor)
  mockPurchase: (
    plan: "monthly" | "annual" | "hardship",
    sku: string,
    priceShown: string,
  ) => void;
  mockCancel: () => void;
}

/** Is the child currently premium (paid or inside a live trial)? doc 62 §13. */
export function isPremium(entitlement: Entitlement, ts: number = now()): boolean {
  if (entitlement.tier === "premium") return true;
  return (entitlement.trialEndsAt ?? 0) > ts;
}

const INIT_TS = now();

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      meta: freshMeta(INIT_TS),
      parentSettings: defaultParentSettings(INIT_TS),
      entitlement: defaultEntitlement(INIT_TS),

      touchOpened: () =>
        set((s) => ({ meta: { ...s.meta, lastOpenedAt: now() } })),

      // Local breadcrumb for the RootErrorBoundary (production-readiness §2.3/§3.2).
      // On-device-only; never uploaded; never affects gating or the child UI.
      noteRecovered: () =>
        set((s) => ({ meta: { ...s.meta, lastRecoveredAt: now() } })),

      setActiveChild: (id) =>
        set((s) => ({ meta: { ...s.meta, activeChildId: id } })),

      setOnboardingStep: (step) =>
        set((s) => ({ meta: { ...s.meta, onboarding: { ...s.meta.onboarding, currentStep: step } } })),

      ackPrivacyConsent: () =>
        set((s) => ({
          meta: { ...s.meta, onboarding: { ...s.meta.onboarding, privacyConsentAckAt: now() } },
        })),

      setParentGateConfigured: (v) =>
        set((s) => ({
          meta: { ...s.meta, onboarding: { ...s.meta.onboarding, parentGateConfigured: v } },
        })),

      markFirstChildCreated: () =>
        set((s) => ({
          meta: { ...s.meta, onboarding: { ...s.meta.onboarding, firstChildCreated: true } },
        })),

      markCalmModeOffered: () =>
        set((s) => ({
          meta: { ...s.meta, onboarding: { ...s.meta.onboarding, calmModeOffered: true } },
        })),

      completeOnboarding: () =>
        set((s) => ({
          meta: {
            ...s.meta,
            onboarding: { ...s.meta.onboarding, completed: true, currentStep: "done" },
          },
        })),

      updateParentSettings: (patch) =>
        set((s) => ({ parentSettings: { ...s.parentSettings, ...patch, updatedAt: now() } })),

      configureParentGate: (gate) =>
        set((s) => ({
          parentSettings: { ...s.parentSettings, parentGate: gate, updatedAt: now() },
        })),

      // A mock subscribe opens an HONEST 7-day trial (doc 66 §M12): tier flips to
      // premium for the trial window + an explicit `trialEndsAt`. NO network /
      // processor — purely local state (the RevenueCat seam lives in
      // src/services/purchases.ts). `mockCancel` reverts everything.
      mockPurchase: (plan, sku, priceShown) =>
        set((s) => {
          const ts = now();
          const trialEndsAt = ts + PREMIUM_TRIAL_MS;
          return {
            entitlement: {
              ...s.entitlement,
              tier: "premium",
              source: "trial",
              trialStartedAt: ts,
              trialEndsAt,
              premiumSince: ts,
              mockPurchases: [
                ...s.entitlement.mockPurchases,
                { id: newId(), sku, mockedAt: ts, plan, priceShown },
              ],
              // Marker of what the honest trial-end reminder was scheduled FOR
              // (idempotency/debug only — the app-open effect owns the real
              // schedule; never affects gating or isPremium(), billing §3.1).
              trialEndReminderAt: trialEndsAt - ONE_DAY_MS,
              updatedAt: ts,
            },
          };
        }),

      mockCancel: () =>
        set((s) => ({
          entitlement: {
            ...s.entitlement,
            tier: "free",
            source: "none",
            trialStartedAt: undefined,
            trialEndsAt: undefined,
            premiumSince: undefined,
            trialEndReminderAt: undefined,
            updatedAt: now(),
          },
        })),
    }),
    createTbPersistOptions<SettingsState>({
      name: "settings",
      partialize: (s) => ({
        meta: s.meta,
        parentSettings: s.parentSettings,
        entitlement: s.entitlement,
      }) as SettingsState,
    }),
  ),
);

registerPersistedStore(useSettingsStore.persist);
