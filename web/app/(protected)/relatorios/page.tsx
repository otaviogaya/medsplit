"use client";

import dayjs from "dayjs";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listProcedimentos } from "@/src/features/procedimentos/api";
import { listRepasses } from "@/src/features/repasses/api";
import { procedimentoStatusLabel } from "@/src/lib/status";
import { ProcedimentoRow, RepasseRow } from "@/src/types/rows";

function toCsv(rows: Record<string, string | number | null>[]) {
  if (!rows.length) return "sem dados";
  const headers = Object.keys(rows[0]);
  const lines = rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? "")).join(","));
  return [headers.join(","), ...lines].join("\n");
}

export default function RelatoriosPage() {
  const [mes, setMes] = useState(dayjs().format("YYYY-MM"));
  const { data: procedimentos = [] } = useQuery<ProcedimentoRow[]>({
    queryKey: ["relatorio-procedimentos", mes],
    queryFn: async () => (await listProcedimentos({ mes })) as ProcedimentoRow[],
  });
  const { data: repasses = [] } = useQuery<RepasseRow[]>({
    queryKey: ["relatorio-repasses", mes],
    queryFn: async () => (await listRepasses({ mes })) as RepasseRow[],
  });

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
  };

  return (
    <div className="grid max-w-3xl gap-4">
      <label className="grid gap-1 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <span>Mes (AAAA-MM)</span>
        <input className="rounded border border-slate-300 px-3 py-2" type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
      </label>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Relatorio por medico</h2>
        <p className="mt-2 text-sm text-slate-700">Procedimentos no mes: {procedimentos.length}</p>
        <p className="text-sm text-slate-700">Repasses no mes: {repasses.length}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Relatorio por hospital</h2>
        <p className="mt-2 text-sm text-slate-700">
          Hospitais atendidos: {new Set(procedimentos.map((item) => item.hospital_nome)).size}
        </p>
      </div>
      <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white" onClick={exportCsv} type="button">
        Exportar CSV
      </button>
    </div>
  );
}
