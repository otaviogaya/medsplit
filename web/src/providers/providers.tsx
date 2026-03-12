"use client";

import { PropsWithChildren } from "react";
import { QueryProvider } from "./query-provider";
import { AuthProvider } from "@/src/features/auth/auth-context";
import { ToastProvider } from "@/src/components/toast";

export function Providers({ children }: PropsWithChildren) {
  return (
    <QueryProvider>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
