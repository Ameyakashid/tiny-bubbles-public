/**
 * app/(kid)/bloop.tsx — the MINIMAL Bloop chat placeholder route (M2.0, w2
 * §6.3 + arch §4.1/§4.2). The FULL chat surface (gifted-chat QuickReplies /
 * TypingIndicator / gated free-text Composer + the Rive character) lands at
 * M5.2 (w7) — this host exists so the mock-first seam is exercised end-to-end
 * and the OFF-BY-DEFAULT gate is enforceable/route-testable today.
 *
 * HARD GATE (chat is OFF by default): the route renders ONLY when
 * `getBloopChatAvailability(settings) === "available"` — i.e. the parent set
 * `bloopEnabled=true` (absent ⇒ false, §8 #15) AND the provider path is
 * usable (mock = always; proxy = env-configured). Anything else redirects
 * back to Today: a disabled/offline child NEVER sees a broken chat — the
 * deterministic character (w7) is simply present without chat. The gate is
 * re-checked inside `sendBloopTurn` too (a stale surface can never chat).
 *
 * PII-free by construction: CHIPS-ONLY input (the curated catalog — no
 * free-text Composer here; `caps.neuroInputModeDefault` decides chips vs AAC
 * labeling only). The message list is IN-MEMORY component state (COPPA
 * data-min, arch §4.1 — no `tb/*` slice, nothing persisted; the authoritative
 * transcript is server-side, PII-redacted + TTL'd). Renders ONLY
 * `ModeratedReply.text` — never raw provider/model output.
 */
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";

import {
  quickRepliesForScope,
  type ModeratedReply,
  type QuickReply,
} from "@tiny-bubbles/shared";
import {
  bloopTopicScopeOf,
  getBloopChatAvailability,
  sendBloopTurn,
} from "../../src/services/bloopProvider";
import { newId } from "../../src/state/ids";
import { useChildStore } from "../../src/state/childStore";
import { useSettingsStore } from "../../src/state/settingsStore";
import { useCapabilities, useThemeInputs } from "../../src/theme/ThemeProvider";
import { useThemeTokens } from "../../src/theme/useThemeTokens";

/** One rendered line (in-memory only — never persisted). */
interface ChatLine {
  id: string;
  from: "kid" | "bloop";
  text: string;
}

export default function BloopChatPlaceholder() {
  const t = useThemeTokens();
  const c = t.colors;
  const router = useRouter();
  const caps = useCapabilities();
  const { ageMode, neuroProfile } = useThemeInputs();

  const activeChildId = useSettingsStore((s) => s.meta.activeChildId);
  const profile = useChildStore((s) => (activeChildId ? s.profiles[activeChildId] : undefined));
  const settings = profile?.settings;

  const sessionIdRef = useRef<string>(`bloop-${newId()}`);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [busy, setBusy] = useState(false);

  const scope = useMemo(() => bloopTopicScopeOf(settings), [settings]);
  const chips = useMemo(() => quickRepliesForScope(scope), [scope]);

  const onChip = useCallback(
    async (chip: QuickReply) => {
      if (busy || !profile) return;
      setBusy(true);
      setLines((prev) => [...prev, { id: newId(), from: "kid", text: chip.title }]);
      // ctx is an UNTRUSTED HINT on the real path (§8 #28) — the server
      // re-derives everything from the authed uid; the mock consumes it as-is.
      const reply: ModeratedReply = await sendBloopTurn(
        { text: chip.title, inputMode: caps.neuroInputModeDefault, quickReplyId: chip.id },
        {
          childId: settings?.firestoreChildId ?? profile.id,
          sessionId: sessionIdRef.current,
          neuroProfile: neuroProfile ?? "both",
          ageMode,
          locale: settings?.crisisLocale ?? "en-US",
          topicScope: scope,
        },
      );
      // Render ONLY the pre-approved reply text (arch §4.2) when there is any.
      if (reply.text.length > 0)
        setLines((prev) => [...prev, { id: newId(), from: "bloop", text: reply.text }]);
      setBusy(false);
    },
    [busy, profile, settings, caps.neuroInputModeDefault, neuroProfile, ageMode, scope],
  );

  // HARD GATE — off/unavailable ⇒ the route simply does not exist (Redirect,
  // focus.tsx pattern). Never an error screen, never a locked-door tease.
  if (getBloopChatAvailability(settings) !== "available") {
    return <Redirect href="/(kid)" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} testID="bloop-chat-placeholder">
      <View style={{ flex: 1, padding: t.spacing(4), gap: t.spacing(3) }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text
            accessibilityRole="header"
            style={{ fontSize: t.type.h2.size, fontFamily: t.type.h2.family, color: c.text }}
          >
            Bloop 🫧
          </Text>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Close chat"
            hitSlop={10}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 999,
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.border,
            }}
          >
            <Text style={{ fontSize: 16, color: c.text }}>Done</Text>
          </Pressable>
        </View>

        {/* The persistent AI disclosure (kid-llm-safety) — always visible. */}
        <Text style={{ fontSize: 13, color: c.textDim }}>
          Bloop is a pretend bubble friend, not a person.
        </Text>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: t.spacing(2) }}>
          {lines.length === 0 ? (
            <Text style={{ fontSize: 16, color: c.textDim }}>
              Tap a bubble below to say hi to Bloop!
            </Text>
          ) : (
            lines.map((line) => (
              <View
                key={line.id}
                style={{
                  alignSelf: line.from === "kid" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  backgroundColor: line.from === "kid" ? c.surfaceAlt : c.surface,
                  borderWidth: 1,
                  borderColor: c.border,
                }}
              >
                <Text style={{ fontSize: 16, color: c.text }}>{line.text}</Text>
              </View>
            ))
          )}
        </ScrollView>

        {/* Curated chips only (PII-free by construction). Empty scope ⇒ a warm
            nudge — never a dead-end error. */}
        {chips.length === 0 ? (
          <Text style={{ fontSize: 14, color: c.textDim }}>
            Ask a grown-up to pick chat topics together.
          </Text>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing(2) }}>
            {chips.slice(0, 6).map((chip) => (
              <Pressable
                key={chip.id}
                onPress={() => onChip(chip)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={chip.title}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.border,
                  opacity: busy ? 0.5 : 1,
                }}
              >
                <Text style={{ fontSize: 15, color: c.text }}>{chip.title}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
