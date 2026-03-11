"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/src/features/auth/auth-context";
import { getErrorMessage } from "@/src/lib/error";
import { supabase } from "@/src/lib/supabase";

const schema = z.object({
  email: z.string().email("E-mail invalido"),
  password: z.string().min(6, "Minimo de 6 caracteres"),
});

type FormData = z.infer<typeof schema>;

export default function SignupPage() {
  const { role } = useAuth();
  const form = useForm<FormData>({ resolver: zodResolver(schema) });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setLoading(true);
      setError("");
      setFeedback("");
      const { error: signUpError } = await supabase.auth.signUp(values);
      if (signUpError) throw signUpError;
      setFeedback("Convite enviado. O usuario deve confirmar no e-mail.");
      form.reset();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  });

  if (role !== "admin") {
    return <p className="rounded-xl border border-slate-200 bg-white p-4">Apenas admin pode criar usuarios.</p>;
  }

  return (
    <form className="max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold text-slate-900">Criar usuario</h1>
      <p className="mt-1 text-sm text-slate-600">Convite com senha provisoria por e-mail.</p>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-1 text-sm">
          <span>E-mail</span>
          <input
            className="rounded border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
            type="email"
            {...form.register("email")}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Senha provisoria</span>
          <input
            className="rounded border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
            type="password"
            {...form.register("password")}
          />
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {feedback ? <p className="mt-3 text-sm text-green-700">{feedback}</p> : null}

      <button
        className="mt-5 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        disabled={loading}
        type="submit"
      >
        {loading ? "Criando..." : "Criar usuario"}
      </button>
    </form>
  );
}
