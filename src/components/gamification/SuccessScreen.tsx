import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from "react-native-reanimated";
import { Text } from "../ui/Text";

type Props = {
  xpGained: number;
  xpBefore: number;
  xpForLevel: number;
  onDone?: () => void;
};

const palette = ["#f472b6", "#fcd34d", "#34d399", "#60a5fa", "#c084fc"];

export const SuccessScreen: React.FC<Props> = ({ xpGained, xpBefore, xpForLevel, onDone }) => {
  const progress = useSharedValue(0);
  const confetti = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        color: palette[i % palette.length],
        delay: i * 40,
        x: (i % 7) * 40 + (i % 2 === 0 ? 10 : 0)
      })),
    []
  );

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      200,
      withTiming(Math.min(1, (xpBefore + xpGained) / xpForLevel), {
        duration: 1400,
        easing: Easing.out(Easing.cubic)
      })
    );
  }, [progress, xpBefore, xpGained, xpForLevel]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`
  }));

  return (
    <View style={styles.container}>
      <View style={styles.confettiLayer} pointerEvents="none">
        {confetti.map((piece) => (
          <ConfettiPiece key={piece.id} color={piece.color} delay={piece.delay} x={piece.x} />
        ))}
      </View>
      <Animated.View entering={FadeInDown.duration(500)} style={styles.card}>
        <Text style={styles.title}>Victory!</Text>
        <Text style={styles.subtitle}>+{xpGained} XP</Text>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, barStyle]} />
        </View>
        <Animated.View entering={FadeInUp.delay(400)} style={styles.badge}>
          <Text style={styles.badgeText}>Streak +1 • Keep the momentum</Text>
        </Animated.View>
        {onDone && (
          <Animated.View entering={FadeInUp.delay(600)} style={styles.hint}>
            <Text style={styles.hintText} onPress={onDone}>
              Continue
            </Text>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
};

const ConfettiPiece: React.FC<{ color: string; delay: number; x: number }> = ({
  color,
  delay,
  x
}) => {
  const y = useSharedValue(-40);
  const rotate = useSharedValue(0);

  useEffect(() => {
    y.value = withDelay(
      delay,
      withTiming(260, { duration: 1200, easing: Easing.out(Easing.quad) })
    );
    rotate.value = withDelay(
      delay,
      withTiming(Math.random() * 360, { duration: 1200, easing: Easing.linear })
    );
  }, [delay, rotate, y]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x },
      { translateY: y.value },
      { rotate: `${rotate.value}deg` },
      { scale: withTiming(1.05, { duration: 300 }) }
    ]
  }));

  return <Animated.View style={[styles.confetti, style, { backgroundColor: color }]} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0d1a",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  confettiLayer: { ...StyleSheet.absoluteFillObject },
  confetti: {
    position: "absolute",
    width: 10,
    height: 16,
    borderRadius: 3,
    top: 0,
    left: 0
  },
  card: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    gap: 12
  },
  title: { color: "#fff", fontSize: 28, fontWeight: "800" },
  subtitle: { color: "#cbd5e1", fontSize: 18, fontWeight: "600" },
  barTrack: {
    width: "100%",
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden"
  },
  barFill: {
    height: "100%",
    backgroundColor: "#22c55e"
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(96,165,250,0.15)"
  },
  badgeText: { color: "#e0f2fe", fontWeight: "700" },
  hint: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)"
  },
  hintText: { color: "#fff", fontWeight: "700" }
});

export default SuccessScreen;
