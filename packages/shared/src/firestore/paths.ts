/**
 * packages/shared/src/firestore/paths.ts — collection/doc path helpers
 * (w1 — 02-architecture §2.1/§2.2). ONE place the tree shape is spelled so
 * kid sync, parent readers, functions, and the security rules stay aligned:
 *
 *   users/{parentUid}
 *   children/{childId}/settings/current
 *   children/{childId}/{boards|schedules|narratives|activity|transcripts|alerts|reports}/{id}
 *   safetyReports/{reportId}        (admin-only mandated-reporter queue, §8 #27)
 *   config/global
 *
 * Pure string builders; RN-free; no SDK import.
 */
import type { ReportRangeKey } from "../domain/report";

export const USERS_COL = "users";
export const CHILDREN_COL = "children";
export const SAFETY_REPORTS_COL = "safetyReports";
export const CONFIG_COL = "config";

/** The single settings doc id (§8 #1). */
export const SETTINGS_DOC_ID = "current";
/** The single global-config doc id (§8 #21b). */
export const GLOBAL_CONFIG_DOC_ID = "global";

export function userDoc(parentUid: string): string {
  return `${USERS_COL}/${parentUid}`;
}

export function childDoc(childId: string): string {
  return `${CHILDREN_COL}/${childId}`;
}

export function settingsDoc(childId: string): string {
  return `${childDoc(childId)}/settings/${SETTINGS_DOC_ID}`;
}

export function boardsCol(childId: string): string {
  return `${childDoc(childId)}/boards`;
}
export function boardDoc(childId: string, boardId: string): string {
  return `${boardsCol(childId)}/${boardId}`;
}

export function schedulesCol(childId: string): string {
  return `${childDoc(childId)}/schedules`;
}
export function scheduleDoc(childId: string, scheduleId: string): string {
  return `${schedulesCol(childId)}/${scheduleId}`;
}

export function narrativesCol(childId: string): string {
  return `${childDoc(childId)}/narratives`;
}
export function narrativeDoc(childId: string, narrativeId: string): string {
  return `${narrativesCol(childId)}/${narrativeId}`;
}

export function activityCol(childId: string): string {
  return `${childDoc(childId)}/activity`;
}
export function activityDoc(childId: string, eventId: string): string {
  return `${activityCol(childId)}/${eventId}`;
}

export function transcriptsCol(childId: string): string {
  return `${childDoc(childId)}/transcripts`;
}
export function transcriptDoc(childId: string, turnId: string): string {
  return `${transcriptsCol(childId)}/${turnId}`;
}

export function alertsCol(childId: string): string {
  return `${childDoc(childId)}/alerts`;
}
export function alertDoc(childId: string, alertId: string): string {
  return `${alertsCol(childId)}/${alertId}`;
}

export function reportsCol(childId: string): string {
  return `${childDoc(childId)}/reports`;
}
/** reports are keyed by range — one live snapshot per window (§8 #21). */
export function reportDoc(childId: string, rangeKey: ReportRangeKey): string {
  return `${reportsCol(childId)}/${rangeKey}`;
}

export function safetyReportDoc(reportId: string): string {
  return `${SAFETY_REPORTS_COL}/${reportId}`;
}

export function globalConfigDoc(): string {
  return `${CONFIG_COL}/${GLOBAL_CONFIG_DOC_ID}`;
}

/** Firebase Storage path for a parent-recorded model clip (A8). */
export function childVideoStoragePath(childId: string, videoId: string): string {
  return `children/${childId}/videos/${videoId}.mp4`;
}
