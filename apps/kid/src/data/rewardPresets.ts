/**
 * src/data/rewardPresets.ts — the 8 starter reward-menu entries (doc 62 §14).
 *
 * Caregiver-set, real-world rewards. All `requiresParentApproval: true` by
 * default and `active: true`. Screen-time entries carry `screenTimeMinutes`.
 * These are presets copied into a per-child `Reward[]` on first-child seeding
 * (see seed.ts); the parent can then edit/disable/add via the M9 CRUD screen.
 */
import type { Reward } from "../domain/types";

/** A reward preset is a `Reward` without the per-child / timestamp fields. */
export type RewardPreset = Omit<Reward, "childId" | "createdAt" | "updatedAt">;

export const REWARD_PRESETS: RewardPreset[] = [
  {
    id: "screen_10",
    label: { spokenLabel: "10 minutes of screen time", text: "10 min screen", emoji: "📱", color: "#5BC8F5" },
    category: "screen_time",
    costTokens: 10,
    screenTimeMinutes: 10,
    active: true,
    requiresParentApproval: true,
  },
  {
    id: "screen_20",
    label: { spokenLabel: "20 minutes of screen time", text: "20 min screen", emoji: "📺", color: "#56CFE1" },
    category: "screen_time",
    costTokens: 18,
    screenTimeMinutes: 20,
    active: true,
    requiresParentApproval: true,
  },
  {
    id: "pick_dinner",
    label: { spokenLabel: "Choose what's for dinner", text: "Pick dinner", emoji: "🍽️", color: "#FFB703" },
    category: "choice",
    costTokens: 25,
    active: true,
    requiresParentApproval: true,
  },
  {
    id: "extra_story",
    label: { spokenLabel: "One extra bedtime story", text: "Extra story", emoji: "📖", color: "#F6BD60" },
    category: "activity",
    costTokens: 8,
    active: true,
    requiresParentApproval: true,
  },
  {
    id: "park_trip",
    label: { spokenLabel: "A trip to the park", text: "Park trip", emoji: "🛝", color: "#7BD389" },
    category: "outing",
    costTokens: 40,
    active: true,
    requiresParentApproval: true,
  },
  {
    id: "small_treat",
    label: { spokenLabel: "A small treat", text: "Small treat", emoji: "🍓", color: "#FF8FB1" },
    category: "treat",
    costTokens: 15,
    active: true,
    requiresParentApproval: true,
  },
  {
    id: "stay_up_15",
    label: { spokenLabel: "Stay up 15 extra minutes", text: "Stay up 15", emoji: "⏰", color: "#9D8DF1" },
    category: "privilege",
    costTokens: 30,
    active: true,
    requiresParentApproval: true,
  },
  {
    id: "friend_playdate",
    label: { spokenLabel: "A playdate with a friend", text: "Playdate", emoji: "🧒", color: "#F4978E" },
    category: "outing",
    costTokens: 50,
    active: true,
    requiresParentApproval: true,
  },
];

export const REWARD_PRESETS_BY_ID: Record<string, RewardPreset> = Object.fromEntries(
  REWARD_PRESETS.map((r) => [r.id, r]),
);
