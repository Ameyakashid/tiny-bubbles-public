import { Redirect } from "expo-router";

// `/(parent)` resolves here (the gate routes to it); redirect to the dashboard.
export default function ParentIndex() {
  return <Redirect href="/(parent)/dashboard" />;
}
