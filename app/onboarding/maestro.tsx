import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { generateProfileAndTests } from "../../src/lib/ai/geminiClient";
import { useSessionStore } from "../../src/state/sessionStore";
import { Text } from "../../src/components/ui/Text";

type LevelOption = { label: string; base: number; hint: string };

const LEVEL_OPTIONS: LevelOption[] = [
  { label: "New Explorer", base: 20, hint: "I just met the piano!" },
  { label: "Sound Scout", base: 30, hint: "I know a few notes." },
  { label: "Melody Maker", base: 40, hint: "I can play simple tunes." },
  { label: "Groove Cadet", base: 55, hint: "I keep a beat most times." },
  { label: "Rhythm Ranger", base: 65, hint: "I read and play short pieces." },
  { label: "Chord Captain", base: 75, hint: "I handle chords comfortably." },
  { label: "Stage Star", base: 85, hint: "I polish pieces with feeling." },
  { label: "Virtuoso Pro", base: 95, hint: "I’m performance-ready." }
];

export default function MaestroOnboarding() {
  const router = useRouter();
  const { setSelfReport, setAiProfile, maestroLevel, levelSummary, aiProfile } =
    useSessionStore();
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<LevelOption>(LEVEL_OPTIONS[2]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCraftPlan = async () => {
    setLoading(true);
    setError(null);
    setSelfReport(selected.label, description);
    try {
      const profile = await generateProfileAndTests({
        levelLabel: selected.label,
        description
      });
      setAiProfile(profile);
    } catch (err: any) {
      setError("We had trouble crafting your plan. Using a friendly fallback.");
    } finally {
      setLoading(false);
    }
  };

  const focusList = useMemo(() => aiProfile?.focusAreas || [], [aiProfile]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Meet the Maestro</Text>
      <Text style={styles.subtitle}>
        Tell us about your playing style. We’ll craft a plan with a tiny dash of AI, then check your
        level with quick calibration.
      </Text>

      <Text style={styles.label}>Pick your vibe</Text>
      <View style={styles.chips}>
        {LEVEL_OPTIONS.map((opt) => (
          <Pressable
            key={opt.label}
            onPress={() => setSelected(opt)}
            style={[styles.chip, selected.label === opt.label && styles.chipActive]}
          >
            <Text style={styles.chipText}>{opt.label}</Text>
            <Text style={styles.chipHint}>{opt.hint}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Say it in your own words</Text>
      <TextInput
        style={styles.input}
        placeholder="I can play Twinkle Twinkle, but my left hand feels clumsy…"
        placeholderTextColor="rgba(255,255,255,0.5)"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Pressable style={styles.primary} onPress={handleCraftPlan} disabled={loading}>
        {loading ? <ActivityIndicator color="#0b0d1a" /> : <Text style={styles.primaryText}>Craft My Plan</Text>}
      </Pressable>

      {error && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{error}</Text>
        </View>
      )}

      {aiProfile && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your AI Profile</Text>
          <Text style={styles.cardBlurb}>{aiProfile.profileBlurb}</Text>
          <Text style={styles.subheading}>Focus areas</Text>
          <View style={styles.tagRow}>
            {focusList.map((f) => (
              <View key={f} style={styles.tag}>
                <Text style={styles.tagText}>{f}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.subheading}>Mini-tests</Text>
          {aiProfile.miniTests.map((t) => (
            <View key={t.title} style={styles.miniTest}>
              <Text style={styles.miniTitle}>{t.title}</Text>
              <Text style={styles.miniMeta}>
                {t.durationSec}s • {t.skillTag}
              </Text>
              <Text style={styles.miniInstruction}>{t.instruction}</Text>
            </View>
          ))}
          <Pressable style={styles.secondary} onPress={() => router.push("/onboarding/calibration")}>
            <Text style={styles.secondaryText}>Run Calibration</Text>
          </Pressable>
        </View>
      )}

      {maestroLevel && (
        <View style={styles.result}>
          <Text style={styles.resultLabel}>Result</Text>
          <Text style={styles.resultText}>{levelSummary}</Text>
          <Pressable onPress={() => router.replace("/session/1")} style={styles.primaryGhost}>
            <Text style={styles.primaryGhostText}>Start Day 1</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0d1a", padding: 20, gap: 12 },
  title: { color: "#fff", fontSize: 28, fontWeight: "800", marginBottom: 6 },
  subtitle: { color: "#cbd5e1", marginBottom: 12 },
  label: { color: "#a5b4fc", fontWeight: "700", marginTop: 8, marginBottom: 6 },
  chips: { gap: 10 },
  chip: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  },
  chipActive: { borderColor: "#a5b4fc", backgroundColor: "rgba(165,180,252,0.12)" },
  chipText: { color: "#fff", fontWeight: "800" },
  chipHint: { color: "#cbd5e1", fontSize: 12 },
  input: {
    minHeight: 90,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    color: "#fff"
  },
  primary: {
    backgroundColor: "#22c55e",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10
  },
  primaryText: { color: "#0b0d1a", fontWeight: "800", fontSize: 16 },
  notice: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(248,113,113,0.15)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.4)"
  },
  noticeText: { color: "#fecdd3" },
  card: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 8,
    marginTop: 12
  },
  cardTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  cardBlurb: { color: "#e5e7eb" },
  subheading: { color: "#fcd34d", fontWeight: "700", marginTop: 8 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(165,180,252,0.2)"
  },
  tagText: { color: "#e0e7ff", fontWeight: "700" },
  miniTest: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)"
  },
  miniTitle: { color: "#fff", fontWeight: "800" },
  miniMeta: { color: "#cbd5e1", fontSize: 12 },
  miniInstruction: { color: "#e5e7eb" },
  secondary: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6
  },
  secondaryText: { color: "#fff", fontWeight: "700" },
  result: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 8,
    marginTop: 16
  },
  resultLabel: { color: "#fcd34d", fontWeight: "700" },
  resultText: { color: "#fff", fontWeight: "700" },
  primaryGhost: {
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)"
  },
  primaryGhostText: { color: "#fff", fontWeight: "700" }
});
