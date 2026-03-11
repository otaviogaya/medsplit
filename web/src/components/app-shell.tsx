"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren, useState } from "react";
import { useAuth } from "@/src/features/auth/auth-context";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/procedimentos", label: "Procedimentos" },
  { href: "/repasses", label: "Repasses" },
  { href: "/relatorios", label: "Relatorios" },
  { href: "/glosas", label: "Glosas" },
  { href: "/cadastros", label: "Cadastros" },
];

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { signOut, role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              className="rounded border border-slate-300 px-2 py-1 text-sm md:hidden"
              onClick={() => setIsOpen((prev) => !prev)}
              type="button"
            >
              Menu
            </button>
            <p className="text-lg font-semibold text-slate-900">MedSplit</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 sm:block">
              {role ?? "-"}
            </span>
            <button
              className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
              onClick={() => signOut()}
              type="button"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[220px_1fr]">
        <aside
          className={`rounded-xl border border-slate-200 bg-white p-2 ${isOpen ? "block" : "hidden"} md:block`}
        >
          <nav className="grid gap-1">
            {links.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    active ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
