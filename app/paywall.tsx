import { Stack } from "expo-router";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import PaymentRouter from "../src/components/payments/PaymentRouter";
import { Text } from "../src/components/ui/Text";

export default function PaywallScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unlock Virtuoso</Text>
      <Text style={styles.subtitle}>
        14-day free trial, then auto-renews weekly. Cancel anytime.
      </Text>
      <PaymentRouter onSuccess={() => router.replace("/")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0d1a",
    padding: 24,
    gap: 12,
    justifyContent: "center"
  },
  title: { color: "#fff", fontSize: 28, fontWeight: "800" },
  subtitle: { color: "#cbd5e1", fontSize: 14 }
});
