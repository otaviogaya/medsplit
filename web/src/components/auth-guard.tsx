"use client";

import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect } from "react";
import { useAuth } from "@/src/features/auth/auth-context";

export function AuthGuard({ children }: PropsWithChildren) {
  const { session, loading, configError } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!session && pathname !== "/login") router.replace("/login");
    if (session && pathname === "/login") router.replace("/procedimentos");
  }, [loading, pathname, router, session]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">Carregando...</p>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-xl rounded-xl border border-red-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-red-700">Configuracao do Supabase ausente</h2>
          <p className="mt-2 text-sm text-slate-700">{configError}</p>
          <p className="mt-2 text-sm text-slate-700">
            Copie `web/.env.example` para `web/.env.local`, preencha os valores e reinicie `npm run dev`.
          </p>
        </div>
      </div>
    );
  }

  if (!session && pathname !== "/login") return null;
  if (session && pathname === "/login") return null;
  return <>{children}</>;
}
