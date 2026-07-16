/**
 * apps/parent/app/index.tsx — placeholder route (M1.0 scaffold).
 * Replaced by the auth boot/route-dispatch screen in M3.0 (w3).
 */
import { Text, View } from "react-native";

export default function PlaceholderHome() {
  return (
    <View
      testID="parent-placeholder"
      style={{
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: "600" }}>Tiny Bubbles — Grown-ups</Text>
      <Text style={{ marginTop: 8, opacity: 0.7, textAlign: "center" }}>
        The parent app arrives in a later update. Nothing to set up yet.
      </Text>
    </View>
  );
}
