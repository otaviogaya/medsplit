"use client";

import { useQuery } from "@tanstack/react-query";
import { getKpisMesAtual } from "@/src/features/dashboard/api";
import { toMoney } from "@/src/lib/format";

function KpiCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-600">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["kpis-mes-atual"],
    queryFn: getKpisMesAtual,
  });

  if (isLoading || !data) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Carregando...</div>;
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard do mes</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard title="Cirurgias do mes" value={data.cirurgiasMes} />
        <KpiCard title="Faturado" value={toMoney(data.faturado)} />
        <KpiCard title="Recebido" value={toMoney(data.recebido)} />
        <KpiCard title="Glosado" value={toMoney(data.glosado)} />
        <KpiCard title="A receber" value={toMoney(data.aReceber)} />
      </div>
    </div>
  );
}
