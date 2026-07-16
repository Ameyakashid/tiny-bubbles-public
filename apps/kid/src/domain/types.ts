/**
 * src/domain/types.ts — re-export seam (M1.1 first extraction, §2B discipline).
 *
 * The canonical domain types now live in `@tiny-bubbles/shared` (the ONE home
 * both apps + `functions/` import — 02-architecture §2.1). This file is a thin
 * re-export so every existing kid import (`../domain/types`) keeps working
 * unchanged (01-current-and-target §2.2 extraction discipline: move the module,
 * re-export from the old path, keep the kid suite green).
 *
 * The shared file is PURE TYPES (zero runtime values), so this re-export adds
 * nothing to the bundle. The alias resolves via tsconfig `paths` (tsc), Metro
 * `extraNodeModules` (bundler), and the jest `moduleNameMapper` (tests) —
 * 02-architecture §1.3.
 */
export * from "@tiny-bubbles/shared/domain/types";
