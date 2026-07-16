/**
 * apps/kid/metro.config.js — monorepo Metro config (02-architecture §1.2–§1.3).
 * The ONE file that had to change in the M1.0 lift-and-shift: Metro defaults to
 * a single project root, so the monorepo root is added as a watch folder and
 * module resolution is pinned to the app + root node_modules.
 *
 * The client-bundle guarantee is IMPORT-GRAPH-BASED, not a watchFolders
 * exclusion — Metro only bundles modules reachable from the app entry, and
 * nothing in apps/* imports functions/* (enforced by the no-egress grep gate).
 * The blockList below only prevents duplicate-module/Haste collisions from
 * watching the whole root (functions' own node_modules + the other app's).
 */
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo so packages/shared edits hot-reload.
config.watchFolders = [monorepoRoot];

// Resolve modules from the app first, then the hoisted root node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

// Rive artboards resolve as assets (w7 Bloop character, arch §4.1).
config.resolver.assetExts.push("riv");

// Metro follows the same @tiny-bubbles/shared path map as tsc (arch §1.2).
config.resolver.extraNodeModules = {
  "@tiny-bubbles/shared": path.resolve(monorepoRoot, "packages/shared/src"),
};

// Never crawl the server toolchain's node_modules or the other app's.
const escapeForRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
config.resolver.blockList = [
  new RegExp(
    `${escapeForRegExp(path.join(monorepoRoot, "functions", "node_modules"))}/.*`,
  ),
  new RegExp(
    `${escapeForRegExp(path.join(monorepoRoot, "apps", "parent", "node_modules"))}/.*`,
  ),
];

module.exports = withNativeWind(config, { input: "./global.css" });
