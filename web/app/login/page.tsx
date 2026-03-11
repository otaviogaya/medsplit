"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthGuard } from "@/src/components/auth-guard";
import { getErrorMessage } from "@/src/lib/error";
import { supabase } from "@/src/lib/supabase";

const schema = z.object({
  email: z.string().email("E-mail invalido"),
  password: z.string().min(6, "Minimo de 6 caracteres"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const form = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setLoading(true);
      setError("");
      const { error: signInError } = await supabase.auth.signInWithPassword(values);
      if (signInError) throw signInError;
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  });

  return (
    <AuthGuard>
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <form
          className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          onSubmit={onSubmit}
        >
          <h1 className="text-2xl font-semibold text-slate-900">MedSplit</h1>
          <p className="mt-1 text-sm text-slate-600">Gestao de producao e faturamento</p>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-1 text-sm">
              <span className="text-slate-700">E-mail</span>
              <input
                className="rounded border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                type="email"
                {...form.register("email")}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-slate-700">Senha</span>
              <input
                className="rounded border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                type="password"
                {...form.register("password")}
              />
            </label>
          </div>

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          <button
            className="mt-5 w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </AuthGuard>
  );
}
