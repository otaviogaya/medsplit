import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Image, ScrollView, StyleSheet, View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { z } from "zod";
import { DateInput } from "../../../components/DateInput";
import { FormSelect } from "../../../components/FormSelect";
import { KeyboardAwareScreen } from "../../../components/KeyboardAwareScreen";
import { todayIsoDate } from "../../../lib/format";
import {
  findAnestesistaByUserId,
  getOrCreateCirurgiaoByNome,
  getOrCreateConvenioByNome,
  listAnestesistas,
  listCirurgioes,
  listConvenios,
  listHospitais,
} from "../../cadastros/api";
import { useAuth } from "../../auth/context/AuthContext";
import { createProcedimento, uploadProcedimentoDocumento } from "../api";

const schema = z.object({
  data_procedimento: z.string().min(10),
  hospital_id: z.string().uuid(),
  paciente_nome: z.string().min(2),
  cirurgiao_id: z.string().uuid().optional().nullable(),
  cirurgiao_nome_manual: z.string().optional().nullable(),
  descricao_procedimento: z.string().min(2),
  convenio_id: z.string().uuid().optional().nullable(),
  convenio_nome_manual: z.string().optional().nullable(),
  anestesista_principal_id: z.string().uuid(),
  observacoes: z.string().optional().nullable(),
  documento_foto_url: z.string().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

export function NovoProcedimentoScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      data_procedimento: todayIsoDate(),
      paciente_nome: "",
      cirurgiao_nome_manual: "",
      descricao_procedimento: "",
      convenio_nome_manual: "",
      documento_foto_url: "",
    },
  });

  const { data: hospitais = [] } = useQuery({
    queryKey: ["hospitais"],
    queryFn: listHospitais,
  });
  const { data: convenios = [] } = useQuery({
    queryKey: ["convenios"],
    queryFn: listConvenios,
  });
  const { data: cirurgioes = [] } = useQuery({
    queryKey: ["cirurgioes"],
    queryFn: listCirurgioes,
  });
  const { data: anestesistas = [] } = useQuery({
    queryKey: ["anestesistas"],
    queryFn: listAnestesistas,
  });
  const { data: anestesistaAtual } = useQuery({
    queryKey: ["anestesista-atual", session?.user.id],
    enabled: !!session?.user.id,
    queryFn: () => findAnestesistaByUserId(session!.user.id),
  });

  const documentoFotoUrl = form.watch("documento_foto_url");

  useEffect(() => {
    if (!form.getValues("cirurgiao_id")) {
      form.setValue("cirurgiao_id", null);
    }
    if (!form.getValues("convenio_id")) {
      form.setValue("convenio_id", null);
    }
  }, [form]);

  useEffect(() => {
    if (anestesistaAtual?.id) {
      form.setValue("anestesista_principal_id", anestesistaAtual.id);
    }
  }, [anestesistaAtual?.id, form]);

  const createMutation = useMutation({
    mutationFn: createProcedimento,
    retry: 0,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["procedimentos"] });
    },
    onError: (error: any) => Alert.alert("Erro", error.message),
  });

  const medicoOptions = useMemo(
    () => anestesistas.map((item) => ({ label: item.nome, value: item.id })),
    [anestesistas],
  );
  const convenioOptions = useMemo(
    () => convenios.map((item) => ({ label: item.nome, value: item.id })),
    [convenios],
  );
  const cirurgiaoOptions = useMemo(
    () => cirurgioes.map((item) => ({ label: item.nome, value: item.id })),
    [cirurgioes],
  );

  async function abrirCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permissao necessaria", "Permita acesso a camera para anexar o documento.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.6,
      allowsEditing: true,
    });

    if (!result.canceled) {
      form.setValue("documento_foto_url", result.assets[0].uri);
    }
  }

  async function submit(values: FormData) {
    if (isSaving || createMutation.isPending) return;
    setIsSaving(true);
    try {
    let convenioIdFinal = values.convenio_id ?? "";
    let cirurgiaoNomeFinal = "";

    if (!convenioIdFinal && values.convenio_nome_manual?.trim()) {
      const convenio = await getOrCreateConvenioByNome(values.convenio_nome_manual);
      convenioIdFinal = convenio.id;
    }

    if (!convenioIdFinal) {
      Alert.alert("Convenio obrigatorio", "Selecione um convenio ou digite um novo.");
      return;
    }

    if (values.cirurgiao_id) {
      const cirurgiaoDaLista = cirurgioes.find((item) => item.id === values.cirurgiao_id);
      cirurgiaoNomeFinal = cirurgiaoDaLista?.nome ?? "";
    } else if (values.cirurgiao_nome_manual?.trim()) {
      const cirurgiao = await getOrCreateCirurgiaoByNome(values.cirurgiao_nome_manual);
      cirurgiaoNomeFinal = cirurgiao.nome;
    }

    if (!cirurgiaoNomeFinal) {
      Alert.alert("Cirurgiao obrigatorio", "Selecione um cirurgiao ou digite um novo.");
      return;
    }

    let documentoUrlFinal = values.documento_foto_url ?? null;
    if (documentoUrlFinal && !documentoUrlFinal.startsWith("http")) {
      documentoUrlFinal = await uploadProcedimentoDocumento(documentoUrlFinal);
    }

    await createMutation.mutateAsync({
      data_procedimento: values.data_procedimento,
      hospital_id: values.hospital_id,
      paciente_nome: values.paciente_nome,
      cirurgiao_nome: cirurgiaoNomeFinal,
      descricao_procedimento: values.descricao_procedimento,
      convenio_id: convenioIdFinal,
      porte: 1,
      anestesista_principal_id: values.anestesista_principal_id,
      observacoes: values.observacoes,
      documento_foto_url: documentoUrlFinal,
    });
    Alert.alert("Sucesso", "Procedimento criado.");
    if (typeof navigation.canGoBack === "function" && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("MainTabs");
    }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAwareScreen>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Controller
          control={form.control}
          name="data_procedimento"
          render={({ field }) => (
            <DateInput
              label="Data do procedimento (dd/mm/aaaa)"
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />
        <Controller
          control={form.control}
          name="hospital_id"
          render={({ field }) => (
            <FormSelect
              label="Hospital"
              value={field.value}
              onChange={field.onChange}
              options={hospitais.map((item) => ({ label: item.nome, value: item.id }))}
            />
          )}
        />
        <Controller
          control={form.control}
          name="paciente_nome"
          render={({ field }) => (
            <TextInput mode="outlined" label="Paciente" value={field.value} onChangeText={field.onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="cirurgiao_id"
          render={({ field }) => (
            <FormSelect
              label="Cirurgiao (lista)"
              value={field.value}
              onChange={field.onChange}
              options={cirurgiaoOptions}
            />
          )}
        />
        <Controller
          control={form.control}
          name="cirurgiao_nome_manual"
          render={({ field }) => (
            <TextInput
              mode="outlined"
              label="Ou digite cirurgiao novo"
              value={field.value ?? ""}
              onChangeText={field.onChange}
            />
          )}
        />
        <Controller
          control={form.control}
          name="descricao_procedimento"
          render={({ field }) => (
            <TextInput mode="outlined" label="Procedimento" value={field.value} onChangeText={field.onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="convenio_id"
          render={({ field }) => (
            <FormSelect
              label="Convenio"
              value={field.value}
              onChange={field.onChange}
              options={convenioOptions}
            />
          )}
        />
        <Controller
          control={form.control}
          name="convenio_nome_manual"
          render={({ field }) => (
            <TextInput
              mode="outlined"
              label="Ou digite convenio novo"
              value={field.value ?? ""}
              onChangeText={field.onChange}
            />
          )}
        />
        <Controller
          control={form.control}
          name="anestesista_principal_id"
          render={({ field }) => (
            <FormSelect
              label="Anestesista"
              value={field.value}
              onChange={field.onChange}
              options={medicoOptions}
            />
          )}
        />
        <Controller
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <TextInput
              mode="outlined"
              label="Observacoes"
              multiline
              value={field.value ?? ""}
              onChangeText={field.onChange}
            />
          )}
        />
        <Button mode="outlined" onPress={abrirCamera}>
          Tirar foto do documento
        </Button>
        {documentoFotoUrl ? <Image source={{ uri: documentoFotoUrl }} style={styles.previewImage} /> : null}
        <Button
          mode="contained"
          onPress={form.handleSubmit(submit)}
          loading={createMutation.isPending || isSaving}
          disabled={createMutation.isPending || isSaving}
        >
          Salvar procedimento
        </Button>
      </ScrollView>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, width: "100%", maxWidth: 980, alignSelf: "center" },
  previewImage: { width: "100%", height: 180, borderRadius: 8 },
});
