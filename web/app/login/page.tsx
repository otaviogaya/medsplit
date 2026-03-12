"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthGuard } from "@/src/components/auth-guard";
import { getErrorMessage } from "@/src/lib/error";
import { supabase, supabaseConfigError } from "@/src/lib/supabase";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo de 6 caracteres"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (supabaseConfigError) {
        setError(supabaseConfigError);
        return;
      }
      setLoading(true);
      setError("");
      const { error: signInError } = await supabase.auth.signInWithPassword(values);
      if (signInError) throw signInError;
      router.replace("/procedimentos");
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
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-md"
          onSubmit={onSubmit}
        >
          <div className="flex justify-center">
            <Image
              alt="MedSplit"
              className="h-auto w-52"
              height={234}
              priority
              src="/medsplit-logo.png"
              width={320}
            />
          </div>
          <p className="mt-1 text-center text-sm text-slate-500">Gestão de produção e faturamento</p>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">E-mail</span>
              <input
                autoComplete="email"
                className={`rounded-lg border px-3 py-2.5 text-sm transition ${
                  errors.email ? "border-red-400 bg-red-50" : "border-slate-300"
                }`}
                placeholder="seu@email.com"
                type="email"
                {...register("email")}
              />
              {errors.email && <span className="text-xs text-red-600">{errors.email.message}</span>}
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Senha</span>
              <input
                autoComplete="current-password"
                className={`rounded-lg border px-3 py-2.5 text-sm transition ${
                  errors.password ? "border-red-400 bg-red-50" : "border-slate-300"
                }`}
                placeholder="••••••"
                type="password"
                {...register("password")}
              />
              {errors.password && <span className="text-xs text-red-600">{errors.password.message}</span>}
            </label>
          </div>

          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          <button
            className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            disabled={loading || !!supabaseConfigError}
            type="submit"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </AuthGuard>
  );
}
