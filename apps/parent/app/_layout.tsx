/**
 * apps/parent/app/_layout.tsx — root layout (M1.0 scaffold).
 * The real shell (auth boot/route-dispatch, consent gate, dashboard) lands in
 * M3.0 (w3). No ad/analytics SDK, ever (COPPA — locked decision).
 */
import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </>
  );
}
