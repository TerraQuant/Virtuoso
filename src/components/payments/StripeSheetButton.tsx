import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../ui/Text";

type Props = { amount: number; onSuccess: () => void };

/**
 * Placeholder for Stripe PaymentSheet. Replace with @stripe/stripe-react-native integration.
 */
export const StripeSheetButton: React.FC<Props> = ({ amount, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      // TODO: integrate PaymentSheet client secret flow.
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
        <Text style={styles.label}>Pay with card</Text>
        <Text style={styles.amount}>${amount}/week</Text>
      </View>
      {loading && <ActivityIndicator color="#fff" size="small" />}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#6366f1",
    padding: 14,
    borderRadius: 14,
    gap: 6
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: "#fff", fontWeight: "800", fontSize: 16 },
  amount: { color: "#e0e7ff", fontWeight: "700" }
});
