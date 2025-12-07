import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useGeoCountry } from "../../hooks/useGeoCountry";
import { Text } from "../ui/Text";
import { UpiButton } from "./UpiButton";
import { StripeSheetButton } from "./StripeSheetButton";

type Props = {
  amountINR?: number;
  amountUSD?: number;
  onSuccess: () => void;
};

export const PaymentRouter: React.FC<Props> = ({
  amountINR = 99,
  amountUSD = 5,
  onSuccess
}) => {
  const { country, loading, error } = useGeoCountry();
  const isIndia = country === "IN";

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color="#a5b4fc" />
        <Text style={styles.caption}>Preparing payment options…</Text>
      </View>
    );
  }

  if (error || !country) {
    return (
      <View style={styles.card}>
        <Text style={styles.error}>Unable to load payments. Check your connection.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Start your 14-day free trial</Text>
      {isIndia ? (
        <UpiButton amount={amountINR} onSuccess={onSuccess} />
      ) : (
        <StripeSheetButton amount={amountUSD} onSuccess={onSuccess} />
      )}
      <Text style={styles.caption}>
        After trial: {isIndia ? `₹${amountINR}/week via UPI` : `$${amountUSD}/week via Stripe`}
      </Text>
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
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  caption: { color: "#cbd5e1", fontSize: 12 },
  error: { color: "#f87171", fontWeight: "600" }
});

export default PaymentRouter;
