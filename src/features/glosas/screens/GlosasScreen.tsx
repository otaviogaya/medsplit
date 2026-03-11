import dayjs from "dayjs";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlatList, StyleSheet, View } from "react-native";
import { Button, Card, Text, TextInput } from "react-native-paper";
import { KeyboardAwareScreen } from "../../../components/KeyboardAwareScreen";
import { MoneyText } from "../../../components/MoneyText";
import { useAuth } from "../../auth/context/AuthContext";
import { listProcedimentos, updateGlosaInfo } from "../../procedimentos/api";

export function GlosasScreen() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [mes, setMes] = useState(dayjs().format("YYYY-MM"));
  const [motivo, setMotivo] = useState("");
  const [contestacao, setContestacao] = useState("em_aberto");

  const { data = [] } = useQuery({
    queryKey: ["glosas", mes],
    queryFn: () => listProcedimentos({ mes }),
  });

  const glosas = data.filter((item: any) => Number(item.valor_glosa ?? 0) > 0);

  const mutation = useMutation({
    mutationFn: (id: string) =>
      updateGlosaInfo(id, motivo, contestacao as "em_aberto" | "recuperada" | "perdida"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["glosas"] });
      setMotivo("");
    },
  });

  if (role !== "admin" && role !== "faturamento") {
    return (
      <View style={styles.blocked}>
        <Text>Acesso restrito ao faturamento.</Text>
      </View>
    );
  }

  return (
    <KeyboardAwareScreen>
    <View style={styles.container}>
      <TextInput mode="outlined" label="Mes (AAAA-MM)" value={mes} onChangeText={setMes} />
      <FlatList
        data={glosas}
        keyExtractor={(item: any) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content style={{ gap: 8 }}>
              <Text variant="titleMedium">{item.paciente_nome}</Text>
              <MoneyText value={item.valor_glosa} />
              <TextInput
                mode="outlined"
                label="Motivo da glosa"
                value={motivo}
                onChangeText={setMotivo}
              />
              <TextInput
                mode="outlined"
                label="Contestacao (em_aberto|recuperada|perdida)"
                value={contestacao}
                onChangeText={setContestacao}
              />
              <Button mode="contained" onPress={() => mutation.mutate(item.id)}>
                Salvar glosa
              </Button>
            </Card.Content>
          </Card>
        )}
      />
    </View>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  card: { marginTop: 8 },
  blocked: { flex: 1, justifyContent: "center", alignItems: "center" },
});
