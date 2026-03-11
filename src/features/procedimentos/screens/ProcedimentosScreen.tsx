import { useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import { Button, Card, IconButton, Text, TextInput } from "react-native-paper";
import { DateInput } from "../../../components/DateInput";
import { MonthInput } from "../../../components/MonthInput";
import { toDate } from "../../../lib/format";
import { pagamentoStatusLabel } from "../../../lib/status";
import { listProcedimentos } from "../api";

export function ProcedimentosScreen() {
  const navigation = useNavigation<any>();
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [mes, setMes] = useState(dayjs().format("YYYY-MM"));
  const [paciente, setPaciente] = useState("");
  const [anestesista, setAnestesista] = useState("");
  const [dataFiltro, setDataFiltro] = useState("");

  const filters = useMemo(() => ({ mes }), [mes]);

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["procedimentos", filters],
    queryFn: () => listProcedimentos(filters),
  });

  const filteredData = useMemo(() => {
    return data.filter((item: any) => {
      const pacienteMatch = paciente
        ? item.paciente_nome?.toLowerCase().includes(paciente.toLowerCase())
        : true;
      const anestesistaMatch = anestesista
        ? item.anestesista_principal_nome?.toLowerCase().includes(anestesista.toLowerCase())
        : true;
      const dataMatch = dataFiltro ? item.data_procedimento === dataFiltro : true;
      return pacienteMatch && anestesistaMatch && dataMatch;
    });
  }, [anestesista, data, dataFiltro, paciente]);

  const temFiltros = paciente || anestesista || dataFiltro;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          mode="outlined"
          icon="filter-variant"
          onPress={() => setFiltrosAbertos(true)}
          style={styles.filtroBtn}
        >
          Filtros{temFiltros ? " •" : ""}
        </Button>
        <Button mode="contained" onPress={() => navigation.navigate("NovoProcedimento")}>
          Novo
        </Button>
      </View>
      <Modal visible={filtrosAbertos} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setFiltrosAbertos(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium">Filtros</Text>
              <IconButton icon="close" onPress={() => setFiltrosAbertos(false)} />
            </View>
            <View style={styles.filters}>
              <MonthInput label="Mes (MM/AAAA)" value={mes} onChange={setMes} />
              <TextInput
                mode="outlined"
                label="Filtrar por paciente"
                value={paciente}
                onChangeText={setPaciente}
                style={styles.input}
              />
              <TextInput
                mode="outlined"
                label="Filtrar por anestesista"
                value={anestesista}
                onChangeText={setAnestesista}
                style={styles.input}
              />
              <DateInput
                label="Filtrar por data (dd/mm/aaaa)"
                value={dataFiltro}
                onChangeText={setDataFiltro}
              />
              <Button
                mode="contained"
                onPress={() => {
                  refetch();
                  setFiltrosAbertos(false);
                }}
              >
                Aplicar
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <FlatList
        data={filteredData}
        refreshing={isLoading}
        onRefresh={refetch}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item, index }) => (
          <Card
            style={styles.card}
            onPress={() => navigation.navigate("DetalheProcedimento", { id: item.id })}
          >
            <Card.Content style={styles.row}>
              <View style={styles.info}>
                <Text variant="titleSmall">
                  {`${String(index + 1).padStart(4, "0")}/${dayjs(item.data_procedimento).format("MM")}`}
                </Text>
                <Text variant="titleMedium">{item.paciente_nome}</Text>
                <Text>Anestesista: {item.anestesista_principal_nome}</Text>
                <Text>{toDate(item.data_procedimento)}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  item.pagamento_status === "pago" ? styles.statusPago : styles.statusAguarda,
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {pagamentoStatusLabel(item.pagamento_status)}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, width: "100%", maxWidth: 1100, alignSelf: "center" },
  header: { flexDirection: "row", gap: 8, marginBottom: 12, alignItems: "center" },
  filtroBtn: { flex: 1 },
  filters: { gap: 8 },
  input: { backgroundColor: "white" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  card: { marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  info: { flex: 1, gap: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  statusPago: { backgroundColor: "#2E7D32" },
  statusAguarda: { backgroundColor: "#C62828" },
  statusBadgeText: { color: "#fff", fontWeight: "600", fontSize: 12 },
});
