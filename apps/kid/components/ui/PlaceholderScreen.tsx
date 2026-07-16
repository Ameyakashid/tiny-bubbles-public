import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type PlaceholderScreenProps = {
  title: string;
  subtitle?: string;
};

/**
 * Thin placeholder screen used by the M0 route-group scaffold so navigation
 * resolves. Real screens replace these in M5/M6/M7/M9/M11. Intentionally has
 * NO raw ageMode/sensoryMode branching — that arrives via tokens/flags in M2.
 */
export default function PlaceholderScreen({
  title,
  subtitle,
}: PlaceholderScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-2xl font-bold text-text">
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-3 text-center text-base text-primary">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
