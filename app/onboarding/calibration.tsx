import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import ActiveStaff from "../../src/components/music/ActiveStaff";
import { Text } from "../../src/components/ui/Text";
import { useSessionStore } from "../../src/state/sessionStore";
import { usePitchDetection } from "../../src/hooks/usePitchDetection";
import { isPcmSupported } from "../../src/lib/audio/nativeAudio";
import { useOnsetMeter } from "../../src/hooks/useOnsetMeter";

const NOTE_FREQ: Record<string, number> = {
  C4: 261.63,
  E4: 329.63,
  G4: 392.0,
  C5: 523.25
};

const REQUIRED_PITCH_MATCHES = 3;
const REQUIRED_TAPS = 8;

export default function CalibrationScreen() {
  const router = useRouter();
  const aiProfile = useSessionStore((s) => s.aiProfile);
  const setMaestroLevelFromStats = useSessionStore((s) => s.setMaestroLevelFromStats);

  const miniTests =
    aiProfile?.miniTests?.length
      ? aiProfile.miniTests
      : [
          { title: "Steady 4 Count", durationSec: 20, instruction: "Clap or tap 4 beats evenly.", skillTag: "timing" },
          { title: "C-E-G Spark", durationSec: 20, instruction: "Play C-E-G together or one by one twice.", skillTag: "pitch" }
        ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState<boolean[]>(Array(miniTests.length).fill(false));
  const [pitchScore, setPitchScore] = useState(0);
  const [timingScore, setTimingScore] = useState(0.5);
  const [tapCount, setTapCount] = useState(0);

  const currentTest = miniTests[currentIndex];
  const targetName = useMemo(() => {
    if (currentTest.skillTag === "pitch") {
      const keys = Object.keys(NOTE_FREQ);
      return keys[currentIndex % keys.length];
    }
    return "C4";
  }, [currentIndex, currentTest.skillTag]);

  const targetNote = useMemo(() => ({ name: targetName, freq: NOTE_FREQ[targetName] }), [targetName]);

  const matchesRef = useRef(0);
  const lastHitRef = useRef<number>(0);
  const pitch = usePitchDetection(currentTest.skillTag === "pitch" ? targetNote : undefined);
  const onsetState = useOnsetMeter(currentTest.skillTag === "timing");

  useEffect(() => {
    if (currentTest.skillTag !== "pitch") return;
    if (pitch.isMatch) {
      const now = Date.now();
      if (now - lastHitRef.current > 600) {
        matchesRef.current += 1;
        lastHitRef.current = now;
        if (matchesRef.current >= REQUIRED_PITCH_MATCHES) {
          const pct = Math.min(1, matchesRef.current / REQUIRED_PITCH_MATCHES);
          setPitchScore((prev) => Math.max(prev, pct));
          markComplete();
        }
      }
    }
  }, [currentTest.skillTag, pitch.isMatch]);

  useEffect(() => {
    if (currentTest.skillTag !== "timing") return;
    if (onsetState.onsets.length !== tapCount) {
      setTapCount(onsetState.onsets.length);
    }
    if (onsetState.onsets.length >= REQUIRED_TAPS) {
      const avg = onsetState.avgInterval ?? 0;
      const jitter = onsetState.jitterMs ?? 120;
      const stability = Math.max(0, Math.min(1, 1 - jitter / (avg || 300)));
      const score = Math.max(0.4, Math.min(0.95, stability));
      setTimingScore(score);
      markComplete();
    }
  }, [currentTest.skillTag, onsetState.onsets.length, onsetState.avgInterval, onsetState.jitterMs, tapCount]);

  const markComplete = () => {
    const updated = [...completed];
    updated[currentIndex] = true;
    setCompleted(updated);
    matchesRef.current = 0;
    if (currentIndex < miniTests.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const finish = () => {
    const pitchAccuracy = pitchScore || 0.5;
    const rhythmAccuracy = timingScore;
    const tempoStability = 0.6;
    const rangeCoverage = 0.5;
    const leftRightBalance = 0.55;
    const retryPenalty = 0.2;
    setMaestroLevelFromStats({
      pitchAccuracy,
      rhythmAccuracy,
      tempoStability,
      rangeCoverage,
      leftRightBalance,
      retryPenalty
    });
    router.replace("/session/1");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calibration</Text>
      <Text style={styles.subtitle}>
        Complete the mini-tests. We’ll listen and set your level. PCM support: {isPcmSupported() ? "on" : "fallback"}.
      </Text>

      <View style={styles.card}>
        <Text style={styles.testTitle}>{currentTest.title}</Text>
        <Text style={styles.testMeta}>
          {currentTest.durationSec}s • {currentTest.skillTag}
        </Text>
        <Text style={styles.testInstruction}>{currentTest.instruction}</Text>
        {currentTest.skillTag === "pitch" && <ActiveStaff targetNote={targetNote} />}
        {currentTest.skillTag === "timing" && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>Tap or clap 8 even beats. Detected: {tapCount}</Text>
            <Text style={styles.noticeTextSmall}>
              Avg gap: {onsetState.avgInterval ? Math.round(onsetState.avgInterval) : "—"} ms • Jitter:{" "}
              {onsetState.jitterMs ? Math.round(onsetState.jitterMs) : "—"} ms
            </Text>
          </View>
        )}
        {currentTest.skillTag !== "pitch" && currentTest.skillTag !== "timing" && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>Follow the instruction, then tap complete.</Text>
          </View>
        )}
        <Pressable style={styles.secondary} onPress={markComplete}>
          <Text style={styles.secondaryText}>Mark Complete</Text>
        </Pressable>
      </View>

      <View style={styles.progressRow}>
        {miniTests.map((t, idx) => (
          <View key={t.title + idx} style={[styles.progressDot, completed[idx] && styles.progressDone]} />
        ))}
      </View>

      {completed.every(Boolean) && (
        <Pressable style={styles.primary} onPress={finish}>
          <Text style={styles.primaryText}>Finish Calibration</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0d1a", padding: 20, gap: 12 },
  title: { color: "#fff", fontSize: 28, fontWeight: "800" },
  subtitle: { color: "#cbd5e1" },
  card: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 8
  },
  testTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  testMeta: { color: "#cbd5e1", fontSize: 12 },
  testInstruction: { color: "#e5e7eb" },
  notice: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  noticeText: { color: "#e5e7eb" },
  noticeTextSmall: { color: "#cbd5e1", fontSize: 12 },
  secondary: {
    backgroundColor: "rgba(255,255,255,0.12)",
    padding: 12,
    borderRadius: 12,
    alignItems: "center"
  },
  secondaryText: { color: "#fff", fontWeight: "700" },
  progressRow: { flexDirection: "row", gap: 8 },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)"
  },
  progressDone: { backgroundColor: "#22c55e" },
  primary: {
    backgroundColor: "#22c55e",
    padding: 14,
    borderRadius: 16,
    alignItems: "center"
  },
  primaryText: { color: "#0b0d1a", fontWeight: "800", fontSize: 16 }
});
