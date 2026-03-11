import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text, TextInput } from "react-native-paper";
import { useState } from "react";
import { DateInput } from "../../../components/DateInput";
import { FormSelect } from "../../../components/FormSelect";
import { KeyboardAwareScreen } from "../../../components/KeyboardAwareScreen";
import { MoneyText } from "../../../components/MoneyText";
import { toDate, todayIsoDate } from "../../../lib/format";
import {
  formaPagamentoLabel,
  pagamentoStatusLabel,
} from "../../../lib/status";
import {
  listProcedimentos,
  updatePagamentoProcedimento,
  updateStatusProcedimento,
  updateValorCalculado,
} from "../api";
import { useAuth } from "../../auth/context/AuthContext";
import { ProcedimentoStatus } from "../../../types/app";
import { useEffect } from "react";

export function ProcedimentoDetailScreen({ route }: any) {
  const { id } = route.params;
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [valorCalculado, setValorCalculado] = useState("");
  const [dataRecebimento, setDataRecebimento] = useState(todayIsoDate());
  const [formaPagamento, setFormaPagamento] = useState<"dinheiro" | "pix" | "cartao" | "">("");
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [isFinanceSaving, setIsFinanceSaving] = useState(false);

  const { data = [] } = useQuery({
    queryKey: ["procedimento-detail", id],
    queryFn: () => listProcedimentos({}),
  });

  const procedimento = data.find((item: any) => item.id === id);

  const mutation = useMutation({
    mutationFn: (status: ProcedimentoStatus) =>
      updateStatusProcedimento({
        id,
        status,
        data_faturamento: status === "faturado" ? new Date().toISOString().slice(0, 10) : null,
        data_recebimento: status === "recebido" ? dataRecebimento : null,
        valor_recebido: status === "recebido" ? Number(valorCalculado?.replace(",", ".")) || 0 : null,
        forma_pagamento: status === "recebido" ? (formaPagamento as any) : null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["procedimentos"] });
      await queryClient.invalidateQueries({ queryKey: ["repasses"] });
    },
    onError: (error: any) => Alert.alert("Erro", error.message),
  });

  useEffect(() => {
    if (!procedimento) return;
    const v = procedimento.valor_calculado ?? procedimento.valor_recebido ?? 0;
    setValorCalculado(v ? String(v) : "");
    setDataRecebimento(procedimento.data_recebimento ?? todayIsoDate());
    setFormaPagamento((procedimento.forma_pagamento as any) ?? "");
  }, [procedimento]);

  async function onMarcarPago() {
    if (!formaPagamento) {
      Alert.alert("Forma de pagamento", "Selecione dinheiro, pix ou cartao.");
      return;
    }
    const valor = Number(valorCalculado?.replace(",", ".")) || 0;
    if (valor <= 0) {
      Alert.alert("Valor calculado", "Informe o valor calculado antes de marcar como pago.");
      return;
    }

    try {
      setIsFinanceSaving(true);
      await updateValorCalculado(id, valor);
      await updateStatusProcedimento({
        id,
        status: "recebido",
        data_recebimento: dataRecebimento,
        valor_recebido: valor,
        forma_pagamento: formaPagamento,
      });
      await updatePagamentoProcedimento(id, "pago");
      await queryClient.invalidateQueries({ queryKey: ["procedimentos"] });
      await queryClient.invalidateQueries({ queryKey: ["procedimento-detail", id] });
      await queryClient.invalidateQueries({ queryKey: ["repasses"] });
    } catch (error: any) {
      Alert.alert("Erro", error.message);
    } finally {
      setIsFinanceSaving(false);
    }
  }

  async function onMarcarAguardaPagamento() {
    try {
      setIsFinanceSaving(true);
      await updateStatusProcedimento({
        id,
        status: "realizado",
      });
      await updatePagamentoProcedimento(id, "nao_pago");
      await queryClient.invalidateQueries({ queryKey: ["procedimentos"] });
      await queryClient.invalidateQueries({ queryKey: ["procedimento-detail", id] });
    } catch (error: any) {
      Alert.alert("Erro", error.message);
    } finally {
      setIsFinanceSaving(false);
    }
  }

  if (!procedimento) {
    return (
      <View style={styles.center}>
        <Text>Procedimento nao encontrado.</Text>
      </View>
    );
  }

  return (
    <KeyboardAwareScreen>
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Card>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleLarge">{procedimento.paciente_nome}</Text>
          <Text>Hospital: {procedimento.hospital_nome}</Text>
          <Text>Convenio: {procedimento.convenio_nome}</Text>
          <Text>Data: {toDate(procedimento.data_procedimento)}</Text>
          <Text>Cirurgiao: {procedimento.cirurgiao_nome}</Text>
          <Text>Procedimento: {procedimento.descricao_procedimento}</Text>
          <Text>Anestesista: {procedimento.anestesista_principal_nome}</Text>
          {procedimento.documento_foto_url ? (
            <Pressable onPress={() => setIsImageOpen(true)}>
              <Image source={{ uri: procedimento.documento_foto_url }} style={styles.previewImage} />
              <Text style={styles.openHint}>Toque para abrir imagem</Text>
            </Pressable>
          ) : null}
          <View style={styles.row}>
            <Text>Valor calculado:</Text>
            <Text>
              {procedimento.valor_calculado != null
                ? `R$ ${Number(procedimento.valor_calculado).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                : "-"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text>Valor pago:</Text>
            <Text>
              {procedimento.pagamento_status === "pago"
                ? procedimento.valor_recebido != null
                  ? `R$ ${Number(procedimento.valor_recebido).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                  : "-"
                : "-"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text>Valor glosa:</Text>
            <MoneyText value={procedimento.valor_glosa} />
          </View>
          <View style={styles.row}>
            <Text>Status pagamento:</Text>
            <View
              style={[
                styles.statusBadge,
                procedimento.pagamento_status === "pago" ? styles.statusPago : styles.statusAguarda,
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {pagamentoStatusLabel(procedimento.pagamento_status)}
              </Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text>Forma de pagamento:</Text>
            <Text>{formaPagamentoLabel(procedimento.forma_pagamento)}</Text>
          </View>
        </Card.Content>
      </Card>

      {(role === "admin" || role === "faturamento") && (
        <View style={{ gap: 8 }}>
          <TextInput
            mode="outlined"
            label="Valor calculado"
            keyboardType="decimal-pad"
            value={valorCalculado}
            onChangeText={setValorCalculado}
            placeholder="0,00"
          />
          <Button
            mode="outlined"
            onPress={async () => {
              const v = Number(valorCalculado?.replace(",", ".")) || 0;
              if (v > 0) {
                try {
                  await updateValorCalculado(id, v);
                  await queryClient.invalidateQueries({ queryKey: ["procedimentos"] });
                  await queryClient.invalidateQueries({ queryKey: ["procedimento-detail", id] });
                  Alert.alert("Sucesso", "Valor calculado atualizado.");
                } catch (e: any) {
                  Alert.alert("Erro", e.message);
                }
              }
            }}
          >
            Salvar valor calculado
          </Button>
          <DateInput
            label="Data pagamento (dd/mm/aaaa)"
            value={dataRecebimento}
            onChangeText={setDataRecebimento}
          />
          <FormSelect
            label="Forma de pagamento"
            value={formaPagamento}
            onChange={(value) => setFormaPagamento(value as "dinheiro" | "pix" | "cartao")}
            options={[
              { label: "Dinheiro", value: "dinheiro" },
              { label: "Pix", value: "pix" },
              { label: "Cartao", value: "cartao" },
            ]}
          />
          <Text variant="bodySmall">Valor pago = valor calculado ao marcar como pago.</Text>
          <Button mode="contained" onPress={onMarcarPago} loading={isFinanceSaving}>
            Marcar como pago
          </Button>
          <Button mode="outlined" onPress={onMarcarAguardaPagamento} disabled={isFinanceSaving}>
            Marcar como aguarda pagamento
          </Button>
          <Button mode="outlined" onPress={() => mutation.mutate("glosa")}>
            Registrar glosa
          </Button>
          <Button mode="text" textColor="#D32F2F" onPress={() => mutation.mutate("cancelado")}>
            Cancelar procedimento
          </Button>
        </View>
      )}
      <Modal visible={isImageOpen} transparent animationType="fade" onRequestClose={() => setIsImageOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsImageOpen(false)}>
          <View style={styles.modalCard}>
            {procedimento.documento_foto_url ? (
              <Image source={{ uri: procedimento.documento_foto_url }} style={styles.fullImage} resizeMode="contain" />
            ) : null}
            <Button mode="contained" onPress={() => setIsImageOpen(false)}>
              Fechar
            </Button>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, width: "100%", maxWidth: 980, alignSelf: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPago: { backgroundColor: "#2E7D32" },
  statusAguarda: { backgroundColor: "#C62828" },
  statusBadgeText: { color: "#fff", fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  previewImage: { width: "100%", height: 160, borderRadius: 8 },
  openHint: { marginTop: 4, fontSize: 12, opacity: 0.8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 900,
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  fullImage: {
    width: "100%",
    height: 520,
    borderRadius: 8,
  },
});
