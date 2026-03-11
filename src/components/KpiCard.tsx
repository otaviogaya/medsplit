import { StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";
import { MoneyText } from "./MoneyText";

type Props = {
  title: string;
  value: number;
  money?: boolean;
};

export function KpiCard({ title, value, money }: Props) {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="bodyMedium">{title}</Text>
        {money ? (
          <MoneyText value={value} variant="headlineSmall" style={styles.value} />
        ) : (
          <Text variant="headlineSmall" style={styles.value}>
            {value}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  value: { marginTop: 8, fontWeight: "700" },
});
