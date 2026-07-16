/**
 * apps/parent/metro.config.js — monorepo Metro config, identical in shape to
 * apps/kid/metro.config.js (02-architecture §1.2–§1.3): watch the monorepo
 * root, resolve from app + root node_modules, follow the @tiny-bubbles/shared
 * alias, and block the server toolchain's + the other app's node_modules.
 */
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

config.resolver.assetExts.push("riv");

config.resolver.extraNodeModules = {
  "@tiny-bubbles/shared": path.resolve(monorepoRoot, "packages/shared/src"),
};

const escapeForRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
config.resolver.blockList = [
  new RegExp(
    `${escapeForRegExp(path.join(monorepoRoot, "functions", "node_modules"))}/.*`,
  ),
  new RegExp(
    `${escapeForRegExp(path.join(monorepoRoot, "apps", "kid", "node_modules"))}/.*`,
  ),
];

module.exports = withNativeWind(config, { input: "./global.css" });
