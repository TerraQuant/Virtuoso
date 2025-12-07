import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import ActiveStaff from "../../src/components/music/ActiveStaff";
import DayPlanCard from "../../src/components/curriculum/DayPlanCard";
import { Text } from "../../src/components/ui/Text";
import { useSessionStore } from "../../src/state/sessionStore";

const TARGET = { name: "C4", freq: 261.63 };

export default function SessionScreen() {
  const { day } = useLocalSearchParams<{ day: string }>();
  const router = useRouter();
  const dayIndex = Number(day ?? "1");
  const { maestroLevel, levelSummary, getDayPlan } = useSessionStore();
  const plan = getDayPlan(dayIndex);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Day {dayIndex}</Text>
      {maestroLevel ? (
        <Text style={styles.summary}>{levelSummary}</Text>
      ) : (
        <Pressable onPress={() => router.replace("/onboarding/maestro")} style={styles.notice}>
          <Text style={styles.noticeText}>Run Maestro onboarding to personalize your plan.</Text>
        </Pressable>
      )}

      {plan ? (
        <>
          <DayPlanCard plan={plan} />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Listening</Text>
            <ActiveStaff targetNote={TARGET} />
          </View>
        </>
      ) : (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>No plan generated yet.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0d1a", padding: 20 },
  title: { color: "#fff", fontSize: 28, fontWeight: "800", marginBottom: 6 },
  summary: { color: "#cbd5e1", marginBottom: 12 },
  notice: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 12
  },
  noticeText: { color: "#e5e7eb" },
  section: { marginTop: 16, gap: 8 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "700" }
});
