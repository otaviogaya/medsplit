"use client";

import { PropsWithChildren } from "react";
import { AuthGuard } from "@/src/components/auth-guard";
import { AppShell } from "@/src/components/app-shell";

export default function ProtectedLayout({ children }: PropsWithChildren) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
