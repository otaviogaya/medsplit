import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlatList, StyleSheet, View } from "react-native";
import { Button, Card, Text, TextInput } from "react-native-paper";
import { KeyboardAwareScreen } from "../../../components/KeyboardAwareScreen";
import { MoneyText } from "../../../components/MoneyText";
import { toDate } from "../../../lib/format";
import { useAuth } from "../../auth/context/AuthContext";
import { listRepasses, marcarRepasseComoPago } from "../api";

export function RepassesScreen() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [mes, setMes] = useState(dayjs().format("YYYY-MM"));
  const [status, setStatus] = useState<"pendente" | "pago" | "">("");

  const filters = useMemo(
    () => ({ mes, status: status || undefined }),
    [mes, status],
  );
  const { data = [], refetch } = useQuery({
    queryKey: ["repasses", filters],
    queryFn: () => listRepasses(filters),
  });

  const mutation = useMutation({
    mutationFn: (id: string) => marcarRepasseComoPago(id, new Date().toISOString().slice(0, 10)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["repasses"] });
    },
  });

  return (
    <KeyboardAwareScreen>
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        label="Mes (AAAA-MM)"
        value={mes}
        onChangeText={setMes}
        style={styles.input}
      />
      <TextInput
        mode="outlined"
        label="Status (pendente|pago)"
        value={status}
        onChangeText={(text) => setStatus(text as any)}
        style={styles.input}
      />
      <Button mode="outlined" onPress={() => refetch()}>
        Filtrar
      </Button>

      <FlatList
        data={data}
        keyExtractor={(item: any) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content style={{ gap: 4 }}>
              <Text variant="titleMedium">{item.medico_nome}</Text>
              <Text>Tipo: {item.tipo}</Text>
              <Text>Status: {item.status_repasse}</Text>
              <Text>Data procedimento: {toDate(item.data_procedimento)}</Text>
              <MoneyText value={item.valor_repassar} />
              {role === "admin" && item.status_repasse === "pendente" && (
                <Button mode="contained" onPress={() => mutation.mutate(item.id)}>
                  Marcar como pago
                </Button>
              )}
            </Card.Content>
          </Card>
        )}
      />
    </View>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8, width: "100%", maxWidth: 1100, alignSelf: "center" },
  input: { backgroundColor: "white" },
  card: { marginTop: 8 },
});
