"use client";

import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect } from "react";
import { useAuth } from "@/src/features/auth/auth-context";

export function AuthGuard({ children }: PropsWithChildren) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!session && pathname !== "/login") router.replace("/login");
    if (session && pathname === "/login") router.replace("/dashboard");
  }, [loading, pathname, router, session]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">Carregando...</p>
      </div>
    );
  }

  if (!session && pathname !== "/login") return null;
  if (session && pathname === "/login") return null;
  return <>{children}</>;
}
