import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, StyleSheet, View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { supabase } from "../../../lib/supabase";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export function SignupScreen() {
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormData) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;
      Alert.alert("Convite enviado", "Verifique o e-mail do usuario.");
    } catch (error: any) {
      Alert.alert("Erro ao criar usuario", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextInput
            mode="outlined"
            label="E-mail"
            autoCapitalize="none"
            value={field.value}
            onChangeText={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextInput
            mode="outlined"
            label="Senha provisoria"
            value={field.value}
            onChangeText={field.onChange}
            secureTextEntry
          />
        )}
      />
      <Button mode="contained" loading={loading} onPress={handleSubmit(onSubmit)}>
        Criar usuario
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
});
