import React from "react";
import { View, StyleSheet } from "react-native";
import { DayPlan } from "../../curriculum/generator";
import { Text } from "../ui/Text";

type Props = {
  plan: DayPlan;
};

export const DayPlanCard: React.FC<Props> = ({ plan }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        Week {plan.week}, Day {plan.day}
      </Text>
      <View style={styles.blocks}>
        {plan.blocks.map((b, idx) => (
          <View key={idx} style={styles.block}>
            <Text style={styles.blockLabel}>{b.type.toUpperCase()}</Text>
            <Text style={styles.blockDetail}>
              {b.skill || b.title || "—"} • {b.tempo} bpm
            </Text>
            {b.difficulty && <Text style={styles.meta}>Difficulty: {b.difficulty}</Text>}
            {b.arrangement && <Text style={styles.meta}>Arrangement: {b.arrangement}</Text>}
            {b.targetScore && <Text style={styles.meta}>Target Score: {Math.round(b.targetScore * 100)}%</Text>}
          </View>
        ))}
      </View>
      <View style={styles.adapt}>
        <Text style={styles.adaptLabel}>Adaptivity</Text>
        {plan.adaptRules.map((rule, idx) => (
          <Text key={idx} style={styles.meta}>
            {rule.ifScoreBelow ? `If score < ${rule.ifScoreBelow * 100}%` : ""}{" "}
            {rule.ifTimingOff ? "If timing off" : ""} → {rule.action}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 12
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "800" },
  blocks: { gap: 8 },
  block: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)"
  },
  blockLabel: { color: "#a5b4fc", fontWeight: "700", fontSize: 12 },
  blockDetail: { color: "#fff", fontWeight: "700", marginTop: 2 },
  meta: { color: "#cbd5e1", fontSize: 12 },
  adapt: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)", paddingTop: 8 },
  adaptLabel: { color: "#fcd34d", fontWeight: "700", marginBottom: 4 }
});

export default DayPlanCard;
