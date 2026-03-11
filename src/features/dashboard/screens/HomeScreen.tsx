import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { KpiCard } from "../../../components/KpiCard";
import { getKpisMesAtual } from "../api";

export function HomeScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ["kpis-mes-atual"],
    queryFn: getKpisMesAtual,
  });

  if (isLoading || !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="titleLarge" style={styles.title}>
        Dashboard do mes
      </Text>
      <KpiCard title="Cirurgias do mes" value={data.cirurgiasMes} />
      <KpiCard title="Faturado" value={data.faturado} money />
      <KpiCard title="Recebido" value={data.recebido} money />
      <KpiCard title="Glosado" value={data.glosado} money />
      <KpiCard title="A receber" value={data.aReceber} money />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, width: "100%", maxWidth: 980, alignSelf: "center" },
  title: { marginBottom: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
