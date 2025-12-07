import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../ui/Text";

type Props = { amount: number; onSuccess: () => void };

/**
 * Placeholder UPI checkout button. Replace with Razorpay/PhonePe SDK invocation.
 */
export const UpiButton: React.FC<Props> = ({ amount, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      // TODO: integrate Razorpay/PhonePe; simulate success.
      setTimeout(() => {
        onSuccess();
        setLoading(false);
      }, 800);
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <Pressable onPress={handlePay} style={styles.button} disabled={loading}>
      <View style={styles.row}>
        <Text style={styles.label}>Pay via UPI</Text>
        <Text style={styles.amount}>₹{amount}/week</Text>
      </View>
      {loading && <ActivityIndicator color="#fff" size="small" />}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#22c55e",
    padding: 14,
    borderRadius: 14,
    gap: 6
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: "#0b0d1a", fontWeight: "800", fontSize: 16 },
  amount: { color: "#0b0d1a", fontWeight: "700" }
});
