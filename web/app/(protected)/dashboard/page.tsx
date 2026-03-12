"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";
import { getDashboardChartData, getKpisMesAtual } from "@/src/features/dashboard/api";
import { toMoney } from "@/src/lib/format";
import { QueryError } from "@/src/components/query-error";

const COLORS_HOSPITAL = ["#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#64748b"];
const COLORS_PAGAMENTO = ["#16a34a", "#dc2626"];
const COLORS_CONVENIO = ["#6366f1", "#3b82f6", "#0ea5e9", "#14b8a6", "#f59e0b", "#ef4444", "#64748b"];

function KpiSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-5">
      <div className="h-3 w-1/2 rounded bg-slate-200" />
      <div className="mt-4 h-7 w-2/3 rounded bg-slate-200" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-5">
      <div className="h-4 w-1/3 rounded bg-slate-200" />
      <div className="mt-4 h-48 rounded bg-slate-100" />
    </div>
  );
}

function KpiCard({ title, value, accent }: { title: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${accent ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function formatCurrency(value: number) {
  return `R$ ${(value / 1000).toFixed(1)}k`;
}

export default function DashboardPage() {
  const { data: kpis, isLoading: loadingKpis, isError: kpisError, error: kpisErr, refetch: refetchKpis } = useQuery({
    queryKey: ["kpis-mes-atual"],
    queryFn: getKpisMesAtual,
  });

  const { data: charts, isLoading: loadingCharts, isError: chartsError, error: chartsErr, refetch: refetchCharts } = useQuery({
    queryKey: ["dashboard-charts"],
    queryFn: getDashboardChartData,
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>

      {kpisError ? <QueryError error={kpisErr} onRetry={() => refetchKpis()} /> : null}

      {loadingKpis && !kpisError ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
      ) : kpis ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard title="Cirurgias do mês" value={kpis.cirurgiasMes} />
          <KpiCard title="Faturado" value={toMoney(kpis.faturado)} accent="text-blue-700" />
          <KpiCard title="Recebido" value={toMoney(kpis.recebido)} accent="text-green-700" />
          <KpiCard title="Glosado" value={toMoney(kpis.glosado)} accent="text-red-600" />
          <KpiCard title="A receber" value={toMoney(kpis.aReceber)} accent="text-amber-600" />
        </div>
      ) : null}

      {chartsError ? <QueryError error={chartsErr} onRetry={() => refetchCharts()} /> : null}

      {loadingCharts && !chartsError ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <ChartSkeleton key={i} />
          ))}
        </div>
      ) : charts ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Faturado vs Recebido (Bar) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Faturado vs Recebido (últimos 6 meses)
            </h2>
            <ResponsiveContainer height={260} width="100%">
              <BarChart data={charts.evolucaoMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={formatCurrency} />
                <Tooltip
                  formatter={(value) => toMoney(Number(value))}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Bar dataKey="faturado" fill="#3b82f6" name="Faturado" radius={[4, 4, 0, 0]} />
                <Bar dataKey="recebido" fill="#16a34a" name="Recebido" radius={[4, 4, 0, 0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Evolução de procedimentos (Line) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Procedimentos por mês
            </h2>
            <ResponsiveContainer height={260} width="100%">
              <LineChart data={charts.evolucaoMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip labelStyle={{ fontWeight: 600 }} />
                <Line
                  dataKey="procedimentos"
                  name="Procedimentos"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Por Hospital (Pie) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Procedimentos por hospital (mês atual)
            </h2>
            {charts.porHospital.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">Sem dados no mês atual</p>
            ) : (
              <ResponsiveContainer height={260} width="100%">
                <PieChart>
                  <Pie
                    cx="50%"
                    cy="50%"
                    data={charts.porHospital}
                    dataKey="quantidade"
                    innerRadius={50}
                    nameKey="nome"
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {charts.porHospital.map((_, i) => (
                      <Cell fill={COLORS_HOSPITAL[i % COLORS_HOSPITAL.length]} key={i} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    formatter={(value: string) => <span className="text-xs text-slate-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Status de Pagamento (Pie) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Status de pagamento (mês atual)
            </h2>
            {charts.statusPagamento.every((s) => s.quantidade === 0) ? (
              <p className="py-10 text-center text-sm text-slate-400">Sem dados no mês atual</p>
            ) : (
              <ResponsiveContainer height={260} width="100%">
                <PieChart>
                  <Pie
                    cx="50%"
                    cy="50%"
                    data={charts.statusPagamento}
                    dataKey="quantidade"
                    innerRadius={50}
                    nameKey="status"
                    outerRadius={90}
                    paddingAngle={4}
                  >
                    {charts.statusPagamento.map((_, i) => (
                      <Cell fill={COLORS_PAGAMENTO[i % COLORS_PAGAMENTO.length]} key={i} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    formatter={(value: string) => <span className="text-xs text-slate-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Por Convênio (Bar horizontal simulado como Bar vertical) */}
          {charts.porConvenio.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Procedimentos por convênio (mês atual)
              </h2>
              <ResponsiveContainer height={Math.max(200, charts.porConvenio.length * 50)} width="100%">
                <BarChart data={charts.porConvenio} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis dataKey="nome" type="category" tick={{ fontSize: 12 }} width={140} />
                  <Tooltip />
                  <Bar dataKey="quantidade" name="Procedimentos" radius={[0, 4, 4, 0]}>
                    {charts.porConvenio.map((_, i) => (
                      <Cell fill={COLORS_CONVENIO[i % COLORS_CONVENIO.length]} key={i} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
