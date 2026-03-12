"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SignupRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/equipes");
  }, [router]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
      <p className="text-sm text-slate-500">Redirecionando para o Admin Panel...</p>
    </div>
  );
}
