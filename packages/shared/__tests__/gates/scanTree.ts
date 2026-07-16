/**
 * gates/scanTree.ts — the shared file-walking helper the w8 gate tests use
 * (mirrors the v1 `no-network.test.ts` walk/grep/exclusion shape).
 *
 * SHIPPED-COPY scanning rule: pure comment lines (`//`, `*`, `/*`) are
 * stripped before matching — the gates target shipped strings/code, not the
 * guard comments that DOCUMENT the rules (same posture as the BUILD-GUIDE
 * §3.1 no-egress gate's comment exclusion). Test files are excluded (they
 * assemble banned samples on purpose).
 */
import * as fs from "node:fs";
import * as path from "node:path";

/** The monorepo root (packages/shared/__tests__/gates → ../../../..). */
export const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "lib",
  ".expo",
  ".git",
  "deploy-web",
  "__tests__",
  "__mocks__",
  "coverage",
]);

const TEXT_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".md", ".json"]);

/** Recursively collect scannable text files under an ABSOLUTE dir (existing only). */
export function collectFiles(absDir: string): string[] {
  if (!fs.existsSync(absDir)) return [];
  const stat = fs.statSync(absDir);
  if (stat.isFile()) return TEXT_EXTS.has(path.extname(absDir)) ? [absDir] : [];
  const out: string[] = [];
  for (const name of fs.readdirSync(absDir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(absDir, name);
    const s = fs.statSync(full);
    if (s.isDirectory()) out.push(...collectFiles(full));
    else if (TEXT_EXTS.has(path.extname(name))) out.push(full);
  }
  return out;
}

/** True for a line that is (the body of) a comment — stripped before matching. */
export function isCommentLine(line: string): boolean {
  const t = line.trim();
  return (
    t.startsWith("//") ||
    t.startsWith("*") ||
    t.startsWith("/*") ||
    t.startsWith("#") // md headers / shell comments in fenced blocks
  );
}

export interface ScanHit {
  file: string;
  line: number;
  text: string;
}

/**
 * Scan the given repo-relative roots (files or dirs; missing ones skipped —
 * gates pass VACUOUSLY until a surface lands, then tighten) for lines
 * matching `re`, skipping comment lines + any file whose path matches an
 * `exclude` pattern.
 */
export function scanTree(
  relRoots: readonly string[],
  re: RegExp,
  exclude: readonly RegExp[] = [],
): ScanHit[] {
  const hits: ScanHit[] = [];
  for (const rel of relRoots) {
    for (const file of collectFiles(path.join(REPO_ROOT, rel))) {
      const relFile = path.relative(REPO_ROOT, file).split(path.sep).join("/");
      if (exclude.some((ex) => ex.test(relFile))) continue;
      const lines = fs.readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (isCommentLine(line)) return;
        const fresh = new RegExp(re.source, re.flags.replace("g", ""));
        if (fresh.test(line)) {
          hits.push({ file: relFile, line: i + 1, text: line.trim().slice(0, 160) });
        }
      });
    }
  }
  return hits;
}

/** Pretty-print hits for a failing gate assertion. */
export function formatHits(hits: ScanHit[]): string {
  return hits.map((h) => `${h.file}:${h.line}: ${h.text}`).join("\n");
}
