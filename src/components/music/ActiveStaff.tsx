import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { Text } from "../ui/Text";
import { Note, usePitchDetection } from "../../hooks/usePitchDetection";

type Props = { targetNote: { name: string; freq: number } };

const ActiveStaff: React.FC<Props> = ({ targetNote }) => {
  const target: Note = useMemo(
    () => ({ ...targetNote, midi: 69 + Math.round(12 * Math.log2(targetNote.freq / 440)) }),
    [targetNote]
  );
  const pitch = usePitchDetection(target);

  const barStyle = useAnimatedStyle(() => ({
    backgroundColor: pitch.isMatch ? "#22c55e" : "#ef4444",
    shadowOpacity: withTiming(pitch.isMatch ? 0.5 : 0.1, { duration: 250 }),
    transform: [{ scale: withTiming(pitch.isMatch ? 1.05 : 1, { duration: 180 }) }]
  }));

  const accuracyStyle = useAnimatedStyle(() => ({
    width: `${Math.min(100, Math.max(0, 50 + (pitch.centsOff ?? 0)))}%`
  }));

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>Active Listening</Text>
      <View style={styles.staff}>
        <View style={styles.staffLines}>
          {[...Array(5)].map((_, i) => (
            <View key={i} style={styles.staffLine} />
          ))}
        </View>
        <Animated.View style={[styles.noteMarker, barStyle]} />
      </View>
      <View style={styles.row}>
        <View>
          <Text style={styles.caption}>Target</Text>
          <Text style={styles.target}>{target.name}</Text>
        </View>
        <View>
          <Text style={styles.caption}>Detected</Text>
          <Text style={styles.target}>{pitch.detectedNote?.name ?? "—"}</Text>
        </View>
        <View>
          <Text style={styles.caption}>Cents</Text>
          <Text style={styles.target}>
            {pitch.centsOff !== null ? pitch.centsOff.toFixed(1) : "—"}
          </Text>
        </View>
      </View>
      <View style={styles.accuracyBar}>
        <Animated.View style={[styles.accuracyFill, accuracyStyle]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  },
  sectionLabel: { color: "#a5b4fc", fontSize: 14, fontWeight: "600", marginBottom: 12 },
  staff: {
    height: 140,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    overflow: "hidden",
    justifyContent: "center",
    marginBottom: 16
  },
  staffLines: { position: "absolute", width: "100%", height: "100%", justifyContent: "space-evenly" },
  staffLine: { height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  noteMarker: {
    alignSelf: "center",
    width: 18,
    height: 48,
    borderRadius: 12,
    shadowColor: "#22c55e"
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  caption: { color: "#cbd5e1", fontSize: 12 },
  target: { color: "#fff", fontWeight: "700", fontSize: 16 },
  accuracyBar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    overflow: "hidden"
  },
  accuracyFill: { height: "100%", backgroundColor: "#22c55e" }
});

export default ActiveStaff;
