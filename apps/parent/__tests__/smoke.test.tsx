/**
 * apps/parent/__tests__/smoke.test.tsx — the M1.0 parent-app smoke floor.
 * Proves the scaffold renders under jest-expo (the same react-test-renderer
 * approach as apps/kid — no new dependency).
 */
import { describe, expect, it } from "@jest/globals";
import { Text } from "react-native";
import TestRenderer, {
  act,
  type ReactTestRenderer,
} from "react-test-renderer";

import PlaceholderHome from "../app/index";

describe("parent app scaffold (M1.0)", () => {
  it("renders the placeholder route", async () => {
    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = TestRenderer.create(<PlaceholderHome />);
    });
    const root = renderer!.root;
    expect(root.findByProps({ testID: "parent-placeholder" })).toBeTruthy();

    const texts = root
      .findAllByType(Text)
      .map((t) => t.props.children)
      .flat()
      .join(" ");
    expect(texts).toContain("Tiny Bubbles");

    await act(async () => {
      renderer!.unmount();
    });
  });
});
