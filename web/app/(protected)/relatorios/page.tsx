"use client";

import dayjs from "dayjs";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listProcedimentos } from "@/src/features/procedimentos/api";
import { listRepasses } from "@/src/features/repasses/api";
import { procedimentoStatusLabel } from "@/src/lib/status";
import { ProcedimentoRow, RepasseRow } from "@/src/types/rows";
import { QueryError } from "@/src/components/query-error";
import { SkeletonList } from "@/src/components/skeleton";
import { useToast } from "@/src/components/toast";

function toCsv(rows: Record<string, string | number | null>[]) {
  if (!rows.length) return "sem dados";
  const headers = Object.keys(rows[0]);
  const lines = rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? "")).join(","));
  return [headers.join(","), ...lines].join("\n");
}

export default function RelatoriosPage() {
  const toast = useToast();
  const [mes, setMes] = useState(dayjs().format("YYYY-MM"));
  const procQuery = useQuery<ProcedimentoRow[]>({
    queryKey: ["relatorio-procedimentos", mes],
    queryFn: async () => (await listProcedimentos({ mes })) as ProcedimentoRow[],
  });
  const repQuery = useQuery<RepasseRow[]>({
    queryKey: ["relatorio-repasses", mes],
    queryFn: async () => (await listRepasses({ mes })) as RepasseRow[],
  });

  const procedimentos = procQuery.data ?? [];
  const repasses = repQuery.data ?? [];
  const isLoading = procQuery.isLoading || repQuery.isLoading;
  const hasError = procQuery.isError || repQuery.isError;
  const firstError = procQuery.error ?? repQuery.error;

  const exportCsv = () => {
    const content = toCsv(
      procedimentos.map((item) => ({
        data: item.data_procedimento,
        hospital: item.hospital_nome,
        convenio: item.convenio_nome,
        paciente: item.paciente_nome,
        status: procedimentoStatusLabel(item.status),
        valor_calculado: item.valor_calculado,
        valor_recebido: item.valor_recebido,
        valor_glosa: item.valor_glosa,
      })),
    );
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-${mes}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast("Relatório exportado com sucesso!");
  };

  return (
    <div className="grid max-w-3xl gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Relatórios</h1>

      <label className="grid gap-1 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <span className="font-medium text-slate-700">Mês</span>
        <input
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
        />
      </label>

      {hasError ? (
        <QueryError error={firstError} onRetry={() => { procQuery.refetch(); repQuery.refetch(); }} />
      ) : null}

      {isLoading && !hasError ? <SkeletonList count={2} /> : null}

      {!isLoading && !hasError ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">Por médico</h2>
              <p className="mt-2 text-2xl font-bold text-slate-900">{procedimentos.length}</p>
              <p className="text-sm text-slate-500">procedimentos no mês</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{repasses.length}</p>
              <p className="text-sm text-slate-500">repasses no mês</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">Por hospital</h2>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {new Set(procedimentos.map((item) => item.hospital_nome)).size}
              </p>
              <p className="text-sm text-slate-500">hospitais atendidos</p>
            </div>
          </div>

          <button
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            disabled={procedimentos.length === 0}
            onClick={exportCsv}
            type="button"
          >
            Exportar CSV
          </button>
        </>
      ) : null}
    </div>
  );
}
