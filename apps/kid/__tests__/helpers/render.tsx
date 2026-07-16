/**
 * __tests__/helpers/render.tsx — the thin render harness the mandated component
 * render-tests use (production-readiness §2.8). NO new dependency: it wraps the
 * already-installed `react-test-renderer` (@19.2.3) with a default `ThemeProvider`
 * so a rendered component resolves its capability flags / tokens as it would in
 * the app. The Reanimated jest mock (jest.setup.js) makes animated components
 * render synchronously without a thrown worklet.
 *
 * NativeWind `className` interop renders fine under `react-test-renderer` (styles
 * collapse to props); tests assert on component props / text, not computed styles.
 *
 * This file is a helper (no `.test.` in its name) so it is not collected as a
 * suite; the visual-timers / breathing render-tests import `renderWithTheme` +
 * `queryAllText` from here.
 */
import { type ReactElement } from "react";
import TestRenderer, { type ReactTestRenderer } from "react-test-renderer";

import { ThemeProvider, type ThemeInputs } from "../../src/theme/ThemeProvider";

export interface RenderWithThemeOptions {
  /** Theme inputs (ageMode / sensoryMode / grants…). Defaults to a young child. */
  theme?: Partial<ThemeInputs>;
}

/** Default theme inputs for a rendered subtree (a young standard-sensory child). */
export const DEFAULT_TEST_THEME: Partial<ThemeInputs> = {
  ageMode: "young",
  sensoryMode: "standard",
  colorScheme: "light",
};

/**
 * Render `ui` inside a `ThemeProvider` and return the `react-test-renderer`
 * instance. Use `renderer.root.findAll(...)` / `findByProps(...)` for assertions.
 * Wrapped in `act` so effects + state settle before assertions.
 */
export function renderWithTheme(
  ui: ReactElement,
  opts: RenderWithThemeOptions = {},
): ReactTestRenderer {
  const theme = { ...DEFAULT_TEST_THEME, ...opts.theme };
  let renderer!: ReactTestRenderer;
  TestRenderer.act(() => {
    renderer = TestRenderer.create(<ThemeProvider value={theme}>{ui}</ThemeProvider>);
  });
  return renderer;
}

/** Collect every rendered string (the text content of all <Text> nodes). */
export function queryAllText(renderer: ReactTestRenderer): string[] {
  const out: string[] = [];
  // `toJSON()` nodes are `{ type, props, children }` — `children` is a top-level
  // sibling of `props` (a string, a node, or an array of them), not `props.children`.
  const visit = (node: unknown): void => {
    if (node == null) return;
    if (typeof node === "string") {
      out.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const children = (node as { children?: unknown }).children;
    if (children != null) visit(children);
  };
  visit(renderer.toJSON());
  return out;
}
