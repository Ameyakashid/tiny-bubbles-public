/**
 * __tests__/render/harness.test.tsx — proves the M-A4 render-test harness
 * (production-readiness §2.8): the wired Reanimated jest mock + the
 * `react-test-renderer` helper let a component (incl. an animated one) render
 * under jest WITHOUT a thrown worklet. This is the shell M-B1/M-C2's mandated
 * `.test.tsx` render-tests build on.
 */
import { describe, expect, it } from "@jest/globals";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import ErrorScreen from "../../components/ui/ErrorScreen";
import { queryAllText, renderWithTheme } from "../helpers/render";

/** A minimal animated component — throws a worklet error if the mock isn't wired. */
function AnimatedProbe() {
  const v = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ opacity: v.value }));
  v.value = withTiming(1, { duration: 200 });
  return (
    <Animated.View style={style}>
      <Text>animated-ok</Text>
    </Animated.View>
  );
}

describe("render harness (§2.8)", () => {
  it("renders a plain component through the ThemeProvider wrapper", () => {
    const r = renderWithTheme(
      <View>
        <Text>hello harness</Text>
      </View>,
    );
    expect(queryAllText(r)).toContain("hello harness");
  });

  it("renders an animated component under the Reanimated mock without a thrown worklet", () => {
    const r = renderWithTheme(<AnimatedProbe />);
    expect(queryAllText(r)).toContain("animated-ok");
  });

  it("renders the calm ErrorScreen recovery line (offline, no telemetry)", () => {
    const r = renderWithTheme(<ErrorScreen error={new Error("boom")} />);
    // The blameless recovery line resolves from the catalog (young default).
    expect(queryAllText(r).join(" ")).toContain("Let's try that again");
    // Never a scary/blaming word.
    expect(queryAllText(r).join(" ").toLowerCase()).not.toMatch(/crash|error|broke/);
  });
});
