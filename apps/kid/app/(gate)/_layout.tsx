import { Stack } from "expo-router";

// M9 builds the real parental gate (arithmetic / long-press for low-stakes;
// a parent-set PIN is REQUIRED before the paywall/purchase route, doc 66 §1b.13).
export default function GateLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
