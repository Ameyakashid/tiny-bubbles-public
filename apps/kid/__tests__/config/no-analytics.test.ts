/**
 * __tests__/config/no-analytics.test.ts — the NO AD/ANALYTICS SDK gate
 * (w1 M1.2 — COPPA; BUILD-GUIDE §3.1 "NO AD/ANALYTICS SDKS"; w1 §6.2).
 *
 * The store claim "no behavioural tracking of children" must be TRUE, so it
 * is enforced mechanically: this gate scans BOTH client app trees (kid +
 * parent, like the no-network gate) AND their package.json dependency lists,
 * and FAILS on any analytics/ads SDK import or dependency:
 *   firebase/analytics · @react-native-firebase/analytics · expo-analytics* ·
 *   ad SDKs (google-mobile-ads/AdMob/Facebook/AppLovin/ironSource/Unity Ads) ·
 *   product analytics (segment/amplitude/mixpanel/posthog/heap/branch/
 *   appsflyer/adjust/sentry).
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join, resolve } from "path";

import { describe, expect, it } from "@jest/globals";

/** Analytics / ads SDK signatures (import specifiers + package names). */
const BANNED = [
  /firebase\/analytics/i,
  /@react-native-firebase\/analytics/i,
  /expo-firebase-analytics/i,
  /expo-analytics/i,
  /react-native-google-mobile-ads/i,
  /admob/i,
  /react-native-fbsdk/i,
  /applovin|ironsource|unityads/i,
  /@segment\/|analytics-react-native/i,
  /\bamplitude\b/i,
  /\bmixpanel\b/i,
  /\bposthog\b/i,
  /\bheap\.io|heap-analytics/i,
  /react-native-branch|appsflyer|adjust-sdk|react-native-adjust/i,
  /@sentry\/|sentry-expo/i,
];

const ROOT = resolve(__dirname, "..", "..", "..", "..");
const SCAN_DIRS = [
  "apps/kid/app",
  "apps/kid/src",
  "apps/kid/components",
  "apps/parent/app",
  "apps/parent/src",
  "apps/parent/components",
];
const CODE_EXT = /\.(ts|tsx|js|jsx)$/;

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name === "__tests__" || name === "node_modules") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (CODE_EXT.test(name)) out.push(full);
  }
}

describe("no ad/analytics SDKs in the client apps (COPPA)", () => {
  it("no banned import appears anywhere in the kid or parent trees", () => {
    const files: string[] = [];
    for (const dir of SCAN_DIRS) walk(join(ROOT, dir), files);
    expect(files.length).toBeGreaterThan(0); // never a silent no-op

    const violations: string[] = [];
    for (const file of files) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        // Only import/require lines can pull an SDK in; comments naming a
        // banned SDK (e.g. THIS gate's own docs) are not violations.
        if (!/\bimport\b|\brequire\s*\(/.test(line)) return;
        if (/^\s*(\/\/|\*)/.test(line)) return;
        for (const banned of BANNED) {
          if (banned.test(line)) {
            violations.push(`${file.slice(ROOT.length + 1)}:${i + 1}: ${line.trim()}`);
          }
        }
      });
    }
    expect(violations).toEqual([]);
  });

  it("no banned package is a dependency of either app", () => {
    for (const app of ["apps/kid", "apps/parent"]) {
      const pkg = JSON.parse(readFileSync(join(ROOT, app, "package.json"), "utf8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
      const hits = deps.filter((d) => BANNED.some((b) => b.test(d)));
      expect({ app, hits }).toEqual({ app, hits: [] });
    }
  });

  it("the gate itself detects a banned line (self-test, never a dead gate)", () => {
    const sample = 'import analytics from "@react-native-firebase/analytics";';
    expect(BANNED.some((b) => b.test(sample))).toBe(true);
    const clean = 'import { getFirestore } from "firebase/firestore";';
    expect(BANNED.some((b) => b.test(clean))).toBe(false);
  });
});
