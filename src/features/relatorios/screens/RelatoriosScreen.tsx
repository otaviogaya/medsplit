import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import dayjs from "dayjs";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { Button, Card, Text, TextInput } from "react-native-paper";
import { procedimentoStatusLabel } from "../../../lib/status";
import { listProcedimentos } from "../../procedimentos/api";
import { listRepasses } from "../../repasses/api";

function toCsv(rows: Record<string, any>[]) {
  if (!rows.length) return "sem dados";
  const headers = Object.keys(rows[0]);
  const lines = rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? "")).join(","));
  return [headers.join(","), ...lines].join("\n");
}

export function RelatoriosScreen() {
  const [mes, setMes] = useState(dayjs().format("YYYY-MM"));

  const { data: procedimentos = [] } = useQuery({
    queryKey: ["relatorio-procedimentos", mes],
    queryFn: () => listProcedimentos({ mes }),
  });
  const { data: repasses = [] } = useQuery({
    queryKey: ["relatorio-repasses", mes],
    queryFn: () => listRepasses({ mes }),
  });

  const exportCsv = async () => {
    try {
      const content = toCsv(
        procedimentos.map((item: any) => ({
          data: item.data_procedimento,
          hospital: item.hospital_nome,
          convenio: item.convenio_nome,
          paciente: item.paciente_nome,
          status: procedimentoStatusLabel(item.status),
          valor_calculado: item.valor_calculado,
          valor_recebido: item.valor_recebido,
          valor_glosa: item.valor_glosa,
        })),
      );
      const fileUri = `${FileSystem.cacheDirectory}relatorio-${mes}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri);
    } catch (error: any) {
      Alert.alert("Erro ao exportar", error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput mode="outlined" label="Mes (AAAA-MM)" value={mes} onChangeText={setMes} />
      <Card>
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium">Relatorio por medico</Text>
          <Text>Procedimentos no mes: {procedimentos.length}</Text>
          <Text>Repasses no mes: {repasses.length}</Text>
        </Card.Content>
      </Card>
      <Card>
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium">Relatorio por hospital</Text>
          <Text>
            Hospitais atendidos: {new Set(procedimentos.map((item: any) => item.hospital_nome)).size}
          </Text>
          <Text>
            Ticket medio:{" "}
            {(
              procedimentos.reduce((acc: number, item: any) => acc + Number(item.valor_calculado ?? 0), 0) /
              Math.max(procedimentos.length, 1)
            ).toFixed(2)}
          </Text>
        </Card.Content>
      </Card>
      <Button mode="contained" onPress={exportCsv}>
        Exportar CSV e compartilhar
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, width: "100%", maxWidth: 980, alignSelf: "center" },
  cardContent: { gap: 6 },
});
