import { useMemo, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import Animated, { ZoomIn, ZoomOut } from "react-native-reanimated";
import ActiveStaff from "../src/components/music/ActiveStaff";
import { Text } from "../src/components/ui/Text";

const TARGETS = [
  { name: "C4", freq: 261.63 },
  { name: "E4", freq: 329.63 },
  { name: "G4", freq: 392.0 },
  { name: "C5", freq: 523.25 }
];

export default function HomeScreen() {
  const [index, setIndex] = useState(0);
  const target = useMemo(() => TARGETS[index % TARGETS.length], [index]);

  return (
    <View style={styles.container}>
      <Animated.View entering={ZoomIn} exiting={ZoomOut} style={styles.header}>
        <Text style={styles.title}>Virtuoso</Text>
        <Text style={styles.subtitle}>
          Play the highlighted note and watch for green lights.
        </Text>
      </Animated.View>

      <ActiveStaff targetNote={target} />

      <Pressable onPress={() => setIndex((i) => i + 1)} style={styles.button}>
        <Text style={styles.buttonLabel}>Next Target</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0d1a", paddingHorizontal: 24, paddingTop: 80 },
  header: { marginBottom: 24 },
  title: { fontSize: 32, fontWeight: "800", color: "#fff" },
  subtitle: { fontSize: 16, color: "#cbd5e1", marginTop: 6 },
  button: {
    marginTop: 32,
    alignSelf: "center",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  buttonLabel: { color: "#fff", fontWeight: "600" }
});
