/**
 * app/_sandbox.tsx — NATIVE SANDBOX (dev diagnostic). **KEPT for on-device
 * verification (M15 override).** NOT linked from any kid/parent UI — reachable
 * only by the direct route "/_sandbox". See RUN.md "Dev diagnostic screens".
 *
 * Purpose (doc 66 M1 / doc 67 M1): a dev screen the USER opens in Expo Go to
 * validate the genuinely-risky native/animated surfaces on a real device
 * (SDK 56 / RN 0.85 / Reanimated 4 / New Architecture). Nothing here is product
 * code; it intentionally does NOT use the theme tokens / age engine.
 *
 * Exercised in priority order (the things M6/M7 actually depend on):
 *   (a) animated react-native-svg Path `d` + RadialGradient driven by a
 *       Reanimated shared value (the BubbleBuddy breathe/gradient — M6 gate).
 *   (b) a Modal with Reanimated FadeIn / ZoomIn / SlideInDown entering
 *       animations (the M7 celebration — M7 gate).
 *   (c) Speech.speak() + Speech.getAvailableVoicesAsync() (TTS + offline probe).
 *   (d) a tap -> haptic + short expo-audio cue latency probe (M7 gate).
 * Plus the proven-but-still-checked surfaces: emoji picker, color picker,
 * datetime picker, bottom sheet, circular progress, an AsyncStorage read/write,
 * and an expo-notifications local schedule.
 *
 * Reachable ONLY by typing the route "/_sandbox" (no in-app link).
 * Underscore-prefixed files are routable in expo-router (only `_layout`/`+*`
 * files are special-cased).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import * as Speech from "expo-speech";
import { useAudioPlayer } from "expo-audio";
import { Redirect, Stack } from "expo-router";

import { DEV_SCREENS_ENABLED } from "../src/config/flags";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeIn,
  SlideInDown,
  ZoomIn,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import ColorPicker, {
  HueSlider,
  Panel1,
  Preview,
} from "reanimated-color-picker";
import EmojiPicker, { type EmojiType } from "rn-emoji-keyboard";
import Svg, {
  Circle,
  Defs,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

// Show notifications while the app is foregrounded so the user can SEE the
// scheduled local notification fire during the test.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedStop = Animated.createAnimatedComponent(Stop);

const BUDDY_BOX = 180;
const CX = BUDDY_BOX / 2;
const CY = BUDDY_BOX / 2;
const BEZIER_K = 0.5523; // circle-approximation constant for cubic beziers

// ---------------------------------------------------------------------------
// (a) Animated SVG: a "breathing" squircle whose path `d` AND a RadialGradient
//     highlight stop are both driven by ONE Reanimated shared value.
// ---------------------------------------------------------------------------
function BreathingBuddy() {
  const breath = useSharedValue(0);

  useEffect(() => {
    breath.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [breath]);

  const bodyProps = useAnimatedProps(() => {
    "worklet";
    const t = breath.value;
    // jelly squash/stretch: widen as it flattens, narrow as it rises
    const rx = 64 + 7 * t;
    const ry = 64 - 7 * t;
    const kx = BEZIER_K * rx;
    const ky = BEZIER_K * ry;
    const d =
      `M ${CX} ${CY - ry} ` +
      `C ${CX + kx} ${CY - ry} ${CX + rx} ${CY - ky} ${CX + rx} ${CY} ` +
      `C ${CX + rx} ${CY + ky} ${CX + kx} ${CY + ry} ${CX} ${CY + ry} ` +
      `C ${CX - kx} ${CY + ry} ${CX - rx} ${CY + ky} ${CX - rx} ${CY} ` +
      `C ${CX - rx} ${CY - ky} ${CX - kx} ${CY - ry} ${CX} ${CY - ry} Z`;
    return { d };
  });

  // Drive the RadialGradient: pulse the specular-highlight stop's opacity.
  const highlightProps = useAnimatedProps(() => {
    "worklet";
    return { stopOpacity: 0.35 + 0.45 * breath.value };
  });

  return (
    <Svg width={BUDDY_BOX} height={BUDDY_BOX}>
      <Defs>
        <RadialGradient id="buddyBody" cx="38%" cy="32%" r="72%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.95} />
          <AnimatedStop
            offset="34%"
            stopColor="#9FE6FF"
            animatedProps={highlightProps}
          />
          <Stop offset="100%" stopColor="#36C5F0" stopOpacity={1} />
        </RadialGradient>
      </Defs>
      <AnimatedPath animatedProps={bodyProps} fill="url(#buddyBody)" />
      {/* static friendly face so the morph is easy to read on-device */}
      <Circle cx={CX - 22} cy={CY - 8} r={7} fill="#0B3B5C" />
      <Circle cx={CX + 22} cy={CY - 8} r={7} fill="#0B3B5C" />
      <Path
        d={`M ${CX - 18} ${CY + 22} Q ${CX} ${CY + 40} ${CX + 18} ${CY + 22}`}
        stroke="#0B3B5C"
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

export default function Sandbox() {
  // Dev-only screen: in a production store build (DEV_SCREENS_ENABLED false) a
  // deep-link to /_sandbox redirects to the boot route (production-readiness
  // §2.6). The flag is invariant per app session, so this early-return never
  // changes hook order across renders.
  if (!DEV_SCREENS_ENABLED) return <Redirect href="/" />;

  // (d) audio cue — one pre-created player, replayed imperatively (the M13
  // cue-registry pattern in miniature). Asset is self-synthesized => CC0.
  const cue = useAudioPlayer(require("../assets/sounds/sandbox-cue.wav"));

  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [voiceCount, setVoiceCount] = useState<number | null>(null);
  const [voiceSample, setVoiceSample] = useState<string>("");
  const [emoji, setEmoji] = useState<string>("🫧");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [color, setColor] = useState<string>("#36C5F0");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [time, setTime] = useState(new Date());
  const [fill, setFill] = useState(35);
  const [stored, setStored] = useState<string>("(not read yet)");
  const [modalVisible, setModalVisible] = useState(false);
  const [notifMsg, setNotifMsg] = useState<string>("(not scheduled)");

  const sheetRef = useRef<BottomSheet>(null);
  const sheetSnapPoints = useMemo(() => ["35%"], []);

  // (d) tap -> haptic + cue. We time the synchronous dispatch of the calls;
  // true perceptual <300ms latency is a device-verify item (see RUN notes).
  const fireCue = useCallback(() => {
    const t0 = Date.now();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    try {
      cue.seekTo(0);
      cue.play();
    } catch {
      // device-only; ignore on web
    }
    setLatencyMs(Date.now() - t0);
  }, [cue]);

  // (c) TTS probe
  const probeVoices = useCallback(async () => {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      setVoiceCount(voices.length);
      setVoiceSample(
        voices
          .slice(0, 3)
          .map((v) => `${v.name} (${v.language})`)
          .join("  •  ") || "(none reported)",
      );
    } catch (e) {
      setVoiceCount(-1);
      setVoiceSample(String(e));
    }
  }, []);

  const speakHello = useCallback(() => {
    Speech.speak("Hi! I am your bubble buddy. Great job!", {
      pitch: 1.2,
      rate: 1.0,
    });
  }, []);

  const onPickTime = useCallback(
    (_e: DateTimePickerEvent, picked?: Date) => {
      setShowTimePicker(Platform.OS === "ios");
      if (picked) setTime(picked);
    },
    [],
  );

  const writeAndRead = useCallback(async () => {
    const value = `saved @ ${new Date().toISOString()}`;
    await AsyncStorage.setItem("tb/_sandbox/probe", value);
    const read = await AsyncStorage.getItem("tb/_sandbox/probe");
    setStored(read ?? "(null)");
  }, []);

  const scheduleNotif = useCallback(async () => {
    try {
      const perm = await Notifications.requestPermissionsAsync();
      if (!perm.granted && perm.status !== "granted") {
        setNotifMsg("permission denied — enable notifications to test");
        return;
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Tiny Bubbles 🫧",
          body: "A gentle local notification fired (M1 sandbox test).",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 3,
        },
      });
      setNotifMsg("scheduled — should appear in ~3s");
    } catch (e) {
      setNotifMsg(`unavailable here: ${String(e)}`);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ headerShown: true, title: "M1 Native Sandbox" }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.note}>
          Temporary M1 de-risk screen — delete at M15. Run each probe on a
          physical device in Expo Go.
        </Text>

        {/* (a) animated SVG path + gradient */}
        <Section title="(a) Animated SVG path + RadialGradient (Reanimated)">
          <View style={styles.center}>
            <BreathingBuddy />
          </View>
          <Text style={styles.hint}>
            Buddy should breathe (squash/stretch) and the inner highlight should
            pulse. M6 is gated on this running with no worklet error.
          </Text>
        </Section>

        {/* (b) modal with entering animations */}
        <Section title="(b) Modal + FadeIn / ZoomIn / SlideInDown">
          <Btn label="Open celebration modal" onPress={() => setModalVisible(true)} />
          <Text style={styles.hint}>
            The M7 celebration pattern. M7 is gated on these entering animations.
          </Text>
        </Section>

        {/* (c) TTS */}
        <Section title="(c) Speech (TTS) + voice probe">
          <Btn label="Speak a line" onPress={speakHello} />
          <Btn label="Probe available voices" onPress={probeVoices} />
          <Text style={styles.value}>
            voices:{" "}
            {voiceCount === null
              ? "(not probed)"
              : voiceCount === -1
                ? "error"
                : voiceCount}
          </Text>
          {voiceSample ? <Text style={styles.hint}>{voiceSample}</Text> : null}
        </Section>

        {/* (d) haptic + audio latency */}
        <Section title="(d) Tap → haptic + audio cue (latency probe)">
          <Btn label="Fire cue (haptic + sound)" onPress={fireCue} />
          <Text style={styles.value}>
            dispatch:{" "}
            {latencyMs === null ? "(not fired)" : `${latencyMs} ms`}
          </Text>
          <Text style={styles.hint}>
            Measures JS dispatch time. True sub-300ms perceptual latency (haptic
            + sound together) is a device-verify item — confirm by feel/ear.
          </Text>
        </Section>

        {/* emoji picker */}
        <Section title="Emoji picker (rn-emoji-keyboard)">
          <View style={styles.row}>
            <Text style={styles.bigEmoji}>{emoji}</Text>
            <Btn label="Pick emoji" onPress={() => setEmojiOpen(true)} />
          </View>
        </Section>

        {/* color picker */}
        <Section title="Color picker (reanimated-color-picker)">
          <View style={[styles.swatch, { backgroundColor: color }]} />
          <Text style={styles.value}>{color}</Text>
          <ColorPicker
            style={styles.colorPicker}
            value={color}
            onCompleteJS={({ hex }) => setColor(hex)}
          >
            <Preview hideInitialColor />
            <Panel1 style={styles.colorPanel} />
            <HueSlider style={styles.hueSlider} />
          </ColorPicker>
        </Section>

        {/* datetime picker */}
        <Section title="Datetime picker (@react-native-community)">
          <Btn
            label={`Pick time (${time.getHours()}:${String(
              time.getMinutes(),
            ).padStart(2, "0")})`}
            onPress={() => setShowTimePicker(true)}
          />
          {showTimePicker ? (
            <DateTimePicker value={time} mode="time" onChange={onPickTime} />
          ) : null}
        </Section>

        {/* circular progress */}
        <Section title="Circular progress (react-native-circular-progress)">
          <View style={styles.center}>
            <AnimatedCircularProgress
              size={120}
              width={12}
              fill={fill}
              tintColor="#36C5F0"
              backgroundColor="#DFF3FB"
              rotation={0}
              duration={600}
            >
              {(f: number) => <Text style={styles.ring}>{Math.round(f)}%</Text>}
            </AnimatedCircularProgress>
          </View>
          <Btn
            label="Advance +25%"
            onPress={() => setFill((p) => (p >= 100 ? 0 : p + 25))}
          />
          <Text style={styles.hint}>
            If this lib misbehaves on New Arch, the M8 fallback is a hand-rolled
            Reanimated + SVG strokeDashoffset ring (noted in plan).
          </Text>
        </Section>

        {/* async storage */}
        <Section title="AsyncStorage read/write (storage-port default)">
          <Btn label="Write then read a value" onPress={writeAndRead} />
          <Text style={styles.value}>{stored}</Text>
        </Section>

        {/* notifications */}
        <Section title="Local notification (expo-notifications)">
          <Btn label="Schedule in 3s" onPress={scheduleNotif} />
          <Text style={styles.value}>{notifMsg}</Text>
        </Section>

        {/* bottom sheet */}
        <Section title="Bottom sheet (@gorhom/bottom-sheet)">
          <Btn label="Open bottom sheet" onPress={() => sheetRef.current?.expand()} />
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* (b) celebration modal with the three entering animations */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={ZoomIn.duration(400)} style={styles.modalCard}>
            <Animated.Text
              entering={FadeIn.delay(120).duration(400)}
              style={styles.modalTitle}
            >
              🎉 You did it! 🎉
            </Animated.Text>
            <Animated.View entering={SlideInDown.delay(240).duration(400)}>
              <Btn label="Close" onPress={() => setModalVisible(false)} />
            </Animated.View>
          </Animated.View>
        </View>
      </Modal>

      <EmojiPicker
        open={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        onEmojiSelected={(e: EmojiType) => setEmoji(e.emoji)}
      />

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={sheetSnapPoints}
        enablePanDownToClose
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text style={styles.modalTitle}>Bottom sheet open 👍</Text>
          <Text style={styles.hint}>
            Drag down to close. Confirms gesture-handler + Reanimated 4 interop.
          </Text>
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Btn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      onPress={onPress}
    >
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F0FBFF" },
  scroll: { padding: 16, gap: 12 },
  note: {
    fontSize: 13,
    color: "#0B3B5C",
    backgroundColor: "#FFE9A8",
    padding: 10,
    borderRadius: 10,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#0B3B5C" },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 16 },
  hint: { fontSize: 12, color: "#5B7385", lineHeight: 16 },
  value: { fontSize: 14, color: "#0B3B5C", fontWeight: "600" },
  btn: {
    backgroundColor: "#36C5F0",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  btnPressed: { opacity: 0.7 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  bigEmoji: { fontSize: 44 },
  swatch: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DFF3FB",
  },
  colorPicker: { gap: 12, marginTop: 8 },
  colorPanel: { borderRadius: 12 },
  hueSlider: { borderRadius: 20 },
  ring: { fontSize: 22, fontWeight: "800", color: "#0B3B5C" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(11,59,92,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 18,
    width: "100%",
    maxWidth: 360,
  },
  modalTitle: { fontSize: 22, fontWeight: "800", color: "#0B3B5C" },
  sheetContent: { padding: 20, gap: 8 },
});
