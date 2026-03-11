"use client";

import dayjs from "dayjs";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listProcedimentos } from "@/src/features/procedimentos/api";
import { toDate } from "@/src/lib/format";
import { pagamentoStatusLabel } from "@/src/lib/status";
import { ProcedimentoRow } from "@/src/types/rows";

export default function ProcedimentosPage() {
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [mes, setMes] = useState(dayjs().format("YYYY-MM"));
  const [paciente, setPaciente] = useState("");
  const [anestesista, setAnestesista] = useState("");
  const [dataFiltro, setDataFiltro] = useState("");

  const filters = useMemo(() => ({ mes }), [mes]);
  const { data = [], refetch, isLoading } = useQuery<ProcedimentoRow[]>({
    queryKey: ["procedimentos", filters],
    queryFn: async () => (await listProcedimentos(filters)) as ProcedimentoRow[],
  });

  const filteredData = useMemo(
    () =>
      data.filter((item) => {
        const pacienteMatch = paciente
          ? item.paciente_nome?.toLowerCase().includes(paciente.toLowerCase())
          : true;
        const anestesistaMatch = anestesista
          ? item.anestesista_principal_nome?.toLowerCase().includes(anestesista.toLowerCase())
          : true;
        const dataMatch = dataFiltro ? item.data_procedimento === dataFiltro : true;
        return pacienteMatch && anestesistaMatch && dataMatch;
      }),
    [anestesista, data, dataFiltro, paciente],
  );

  const temFiltros = paciente || anestesista || dataFiltro;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          onClick={() => setFiltrosAbertos(true)}
          type="button"
        >
          Filtros{temFiltros ? " •" : ""}
        </button>
        <Link className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white" href="/procedimentos/novo">
          Novo
        </Link>
      </div>

      {filtrosAbertos ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-medium text-slate-900">Filtros</p>
            <button className="text-sm text-slate-600" onClick={() => setFiltrosAbertos(false)} type="button">
              Fechar
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span>Mes (AAAA-MM)</span>
              <input
                className="rounded border border-slate-300 px-3 py-2"
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Paciente</span>
              <input
                className="rounded border border-slate-300 px-3 py-2"
                value={paciente}
                onChange={(e) => setPaciente(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Anestesista</span>
              <input
                className="rounded border border-slate-300 px-3 py-2"
                value={anestesista}
                onChange={(e) => setAnestesista(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span>Data</span>
              <input
                className="rounded border border-slate-300 px-3 py-2"
                type="date"
                value={dataFiltro}
                onChange={(e) => setDataFiltro(e.target.value)}
              />
            </label>
          </div>
          <button
            className="mt-3 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            onClick={() => {
              refetch();
              setFiltrosAbertos(false);
            }}
            type="button"
          >
            Aplicar
          </button>
        </div>
      ) : null}

      <div className="grid gap-3">
        {isLoading ? <p className="text-sm text-slate-600">Carregando...</p> : null}
        {filteredData.map((item, index: number) => (
          <Link
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300"
            href={`/procedimentos/${item.id}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="grid gap-1">
                <p className="text-xs text-slate-500">
                  {`${String(index + 1).padStart(4, "0")}/${dayjs(item.data_procedimento).format("MM")}`}
                </p>
                <p className="text-lg font-semibold text-slate-900">{item.paciente_nome}</p>
                <p className="text-sm text-slate-600">Anestesista: {item.anestesista_principal_nome}</p>
                <p className="text-sm text-slate-600">{toDate(item.data_procedimento)}</p>
              </div>
              <span
                className={`rounded px-2 py-1 text-xs font-semibold text-white ${
                  item.pagamento_status === "pago" ? "bg-green-700" : "bg-red-700"
                }`}
              >
                {pagamentoStatusLabel(item.pagamento_status)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
