"use client";

import { PropsWithChildren } from "react";
import { QueryProvider } from "./query-provider";
import { AuthProvider } from "@/src/features/auth/auth-context";

export function Providers({ children }: PropsWithChildren) {
  return (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  );
}
