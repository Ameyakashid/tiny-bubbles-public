/**
 * components/RootErrorBoundary.tsx — the global React error boundary
 * (production-readiness §2.3).
 *
 * Wraps the whole app tree in `app/_layout.tsx` so any unexpected render/runtime
 * error shows the calm `ErrorScreen` instead of a red box / white crash, and the
 * app can recover with a single "Reload".
 *
 * Privacy-first: it NEVER sends crash telemetry off-device (a network reporter
 * would violate the no-egress guarantee, §2.5/§6). The error is kept on-device;
 * on recovery it stamps the optional local `AppMeta.lastRecoveredAt` breadcrumb.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";

import { useSettingsStore } from "../src/state/settingsStore";

import ErrorScreen from "./ui/ErrorScreen";

interface RootErrorBoundaryProps {
  children: ReactNode;
}

interface RootErrorBoundaryState {
  error: unknown;
}

export default class RootErrorBoundary extends Component<
  RootErrorBoundaryProps,
  RootErrorBoundaryState
> {
  state: RootErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): RootErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // ON-DEVICE ONLY — never a network crash reporter (§2.5/§6). In dev the
    // console surfaces it for the developer; in production it stays silent.
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      // eslint-disable-next-line no-console
      console.error("RootErrorBoundary caught:", error, info?.componentStack);
    }
  }

  private reset = (): void => {
    // Stamp the local recovery breadcrumb (best-effort; never blocks recovery).
    try {
      useSettingsStore.getState().noteRecovered();
    } catch {
      // ignore — recovery must not depend on the store being writable
    }
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error != null) {
      return <ErrorScreen error={this.state.error} onReload={this.reset} />;
    }
    return this.props.children;
  }
}
