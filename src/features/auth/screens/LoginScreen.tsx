import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { supabase } from "../../../lib/supabase";
import { KeyboardAwareScreen } from "../../../components/KeyboardAwareScreen";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo de 6 caracteres"),
});

type FormData = z.infer<typeof schema>;

export function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormData) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error) throw error;
    } catch (error: any) {
      Alert.alert("Erro ao entrar", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScreen>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineMedium">MedSplit</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Gestao de producao e faturamento
        </Text>
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <TextInput
              mode="outlined"
              label="E-mail"
              autoCapitalize="none"
              value={field.value}
              onChangeText={field.onChange}
              error={!!fieldState.error}
              style={styles.input}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <TextInput
              mode="outlined"
              label="Senha"
              secureTextEntry
              value={field.value}
              onChangeText={field.onChange}
              error={!!fieldState.error}
              style={styles.input}
            />
          )}
        />
        <Button mode="contained" loading={loading} onPress={handleSubmit(onSubmit)}>
          Entrar
        </Button>
      </ScrollView>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
    gap: 12,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  input: {
    backgroundColor: "white",
  },
  subtitle: {
    marginBottom: 12,
  },
});
