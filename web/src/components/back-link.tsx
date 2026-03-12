import Link from "next/link";

export function BackLink({ href, label = "Voltar" }: { href: string; label?: string }) {
  return (
    <Link className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900" href={href}>
      <span aria-hidden="true">&larr;</span> {label}
    </Link>
  );
}
