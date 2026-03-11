import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Button, Divider, Text, TextInput } from "react-native-paper";
import { useState } from "react";
import {
  createAnestesista,
  createConvenio,
  createHonorario,
  createHospital,
  listConvenios,
} from "../api";
import { FormSelect } from "../../../components/FormSelect";
import { useAuth } from "../../auth/context/AuthContext";
import { KeyboardAwareScreen } from "../../../components/KeyboardAwareScreen";

export function CadastrosScreen({ navigation }: any) {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [hospital, setHospital] = useState({ nome: "", cidade: "", contato_faturamento: "" });
  const [convenio, setConvenio] = useState("");
  const [anestesista, setAnestesista] = useState("");
  const [honorario, setHonorario] = useState({
    convenio_id: "",
    porte: "1",
    valor: "0",
  });

  const { data: convenios = [] } = useQuery({
    queryKey: ["convenios"],
    queryFn: listConvenios,
  });

  const genericMutation = useMutation({
    mutationFn: async (action: () => Promise<void>) => action(),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      Alert.alert("Sucesso", "Cadastro salvo.");
    },
    onError: (error: any) => Alert.alert("Erro", error.message),
  });

  if (role !== "admin") {
    return (
      <View style={styles.blocked}>
        <Text>Apenas admin pode acessar cadastros.</Text>
      </View>
    );
  }

  return (
    <KeyboardAwareScreen>
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Button mode="outlined" onPress={() => navigation.navigate("Signup")}>
        Criar usuario (convite)
      </Button>

      <Text variant="titleMedium">Hospital</Text>
      <TextInput mode="outlined" label="Nome" value={hospital.nome} onChangeText={(nome) => setHospital({ ...hospital, nome })} />
      <TextInput mode="outlined" label="Cidade" value={hospital.cidade} onChangeText={(cidade) => setHospital({ ...hospital, cidade })} />
      <TextInput
        mode="outlined"
        label="Contato faturamento"
        value={hospital.contato_faturamento}
        onChangeText={(contato_faturamento) => setHospital({ ...hospital, contato_faturamento })}
      />
      <Button
        mode="contained"
        onPress={() =>
          genericMutation.mutate(() =>
            createHospital({ ...hospital, prazo_pagamento_dias: 30 }),
          )
        }
      >
        Salvar hospital
      </Button>

      <Divider />
      <Text variant="titleMedium">Convenio</Text>
      <TextInput mode="outlined" label="Nome" value={convenio} onChangeText={setConvenio} />
      <Button mode="contained" onPress={() => genericMutation.mutate(() => createConvenio({ nome: convenio }))}>
        Salvar convenio
      </Button>

      <Divider />
      <Text variant="titleMedium">Anestesista</Text>
      <TextInput mode="outlined" label="Nome" value={anestesista} onChangeText={setAnestesista} />
      <Button
        mode="contained"
        onPress={() =>
          genericMutation.mutate(() =>
            createAnestesista({
              nome: anestesista,
              percentual_padrao_principal: 0.7,
              percentual_padrao_auxiliar: 0.3,
            }),
          )
        }
      >
        Salvar anestesista
      </Button>

      <Divider />
      <Text variant="titleMedium">Tabela de honorarios</Text>
      <FormSelect
        label="Convenio"
        value={honorario.convenio_id}
        onChange={(convenio_id) => setHonorario({ ...honorario, convenio_id })}
        options={convenios.map((item) => ({ label: item.nome, value: item.id }))}
      />
      <TextInput mode="outlined" label="Porte" value={honorario.porte} onChangeText={(porte) => setHonorario({ ...honorario, porte })} />
      <TextInput mode="outlined" label="Valor" value={honorario.valor} onChangeText={(valor) => setHonorario({ ...honorario, valor })} />
      <Button
        mode="contained"
        onPress={() =>
          genericMutation.mutate(() =>
            createHonorario({
              convenio_id: honorario.convenio_id,
              porte: Number(honorario.porte),
              valor: Number(honorario.valor),
            }),
          )
        }
      >
        Salvar honorario
      </Button>
    </ScrollView>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  blocked: { flex: 1, alignItems: "center", justifyContent: "center" },
});
