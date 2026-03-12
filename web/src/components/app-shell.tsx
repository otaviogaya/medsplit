"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/features/auth/auth-context";

type NavLink = { href: string; label: string; icon: string };

const baseLinks: NavLink[] = [
  { href: "/procedimentos", label: "Procedimentos", icon: "📋" },
  { href: "/repasses", label: "Repasses", icon: "💰" },
  { href: "/relatorios", label: "Relatórios", icon: "📈" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/glosas", label: "Glosas", icon: "⚠️" },
  { href: "/cadastros", label: "Cadastros", icon: "⚙️" },
];

const roleLabel: Record<string, string> = {
  admin: "Admin",
  medico: "Médico",
  faturamento: "Faturamento",
  superadmin: "Super Admin",
};

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, role, equipeNome } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const links = useMemo(() => {
    const items = [...baseLinks];
    if (role === "superadmin") {
      items.push({ href: "/equipes", label: "Admin Panel", icon: "🛡️" });
    }
    return items;
  }, [role]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
              className="flex items-center justify-center rounded-lg border border-slate-300 p-2 transition-colors hover:bg-slate-100 md:hidden"
              onClick={() => setIsOpen((prev) => !prev)}
              type="button"
            >
              {isOpen ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
              )}
            </button>
            <Link href="/procedimentos">
              <Image
                alt="MedSplit"
                className="h-auto w-28"
                height={234}
                priority
                src="/medsplit-logo.png"
                width={320}
              />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {equipeNome ? (
              <span className="hidden rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 sm:block">
                {equipeNome}
              </span>
            ) : null}
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:block">
              {roleLabel[role ?? ""] ?? role ?? "-"}
            </span>
            <button
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
              disabled={signingOut}
              onClick={() => handleSignOut()}
              type="button"
            >
              {signingOut ? "Saindo..." : "Sair"}
            </button>
          </div>
        </div>
      </header>

      {isOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[220px_1fr]">
        <aside
          className={`${
            isOpen ? "fixed inset-y-0 left-0 z-20 mt-[57px] w-64 bg-white p-3 shadow-lg" : "hidden"
          } md:relative md:mt-0 md:block md:w-auto md:rounded-xl md:border md:border-slate-200 md:bg-white md:p-2 md:shadow-none`}
        >
          <nav className="grid gap-1" role="navigation" aria-label="Menu principal">
            {links.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
