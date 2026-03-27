"use client";

import dayjs from "dayjs";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listProcedimentos } from "@/src/features/procedimentos/api";
import { toDate } from "@/src/lib/format";
import { pagamentoStatusLabel } from "@/src/lib/status";
import { ProcedimentoRow } from "@/src/types/rows";
import { EmptyState } from "@/src/components/empty-state";
import { QueryError } from "@/src/components/query-error";
import { SkeletonList } from "@/src/components/skeleton";

export default function ProcedimentosPage() {
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [mes, setMes] = useState(dayjs().format("YYYY-MM"));
  const [paciente, setPaciente] = useState("");
  const [anestesista, setAnestesista] = useState("");
  const [dataFiltro, setDataFiltro] = useState("");

  const filters = useMemo(() => ({ mes }), [mes]);
  const { data = [], refetch, isLoading, isError, error } = useQuery<ProcedimentoRow[]>({
    queryKey: ["procedimentos", filters],
    queryFn: async () => (await listProcedimentos(filters)) as ProcedimentoRow[],
  });

  const numberMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < data.length; i++) {
      map.set(data[i].id, data.length - i);
    }
    return map;
  }, [data]);

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

  function limparFiltros() {
    setPaciente("");
    setAnestesista("");
    setDataFiltro("");
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">Procedimentos</h1>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition-colors hover:bg-slate-50"
            onClick={() => setFiltrosAbertos((p) => !p)}
            type="button"
          >
            Filtros{temFiltros ? " •" : ""}
          </button>
          <Link
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            href="/procedimentos/novo"
          >
            + Novo
          </Link>
        </div>
      </div>

      {filtrosAbertos ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-900">Filtros</p>
            <button className="text-sm text-slate-500 hover:text-slate-700" onClick={() => setFiltrosAbertos(false)} type="button">
              Fechar
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Mês</span>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Paciente</span>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Nome do paciente"
                value={paciente}
                onChange={(e) => setPaciente(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Anestesista</span>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Nome do anestesista"
                value={anestesista}
                onChange={(e) => setAnestesista(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Data</span>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                type="date"
                value={dataFiltro}
                onChange={(e) => setDataFiltro(e.target.value)}
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              onClick={() => {
                refetch();
                setFiltrosAbertos(false);
              }}
              type="button"
            >
              Aplicar
            </button>
            {temFiltros ? (
              <button
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
                onClick={limparFiltros}
                type="button"
              >
                Limpar
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {isLoading ? <SkeletonList count={4} /> : null}

      {isError ? <QueryError error={error} onRetry={() => refetch()} /> : null}

      {!isLoading && !isError && filteredData.length === 0 ? (
        <EmptyState message={temFiltros ? "Nenhum procedimento encontrado com esses filtros." : "Nenhum procedimento neste mês."} />
      ) : null}

      <div className="grid gap-3">
        {filteredData.map((item) => {
          const seq = numberMap.get(item.id) ?? 0;
          return (
          <Link
            key={item.id}
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            href={`/procedimentos/${item.id}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="grid gap-1">
                <p className="text-xs text-slate-400">
                  {`${String(seq).padStart(4, "0")}/${dayjs(item.data_procedimento).format("MM")}`}
                </p>
                <p className="text-lg font-semibold text-slate-900 group-hover:text-blue-700">{item.paciente_nome}</p>
                {item.codigo_cbhpm && (
                  <p className="text-xs text-blue-600">
                    <span className="font-mono">{item.codigo_cbhpm}</span>
                    <span className="mx-1 text-slate-300">|</span>
                    <span className="text-slate-500">{item.descricao_procedimento}</span>
                  </p>
                )}
                <p className="text-sm text-slate-600">Anestesista: {item.anestesista_principal_nome}</p>
                <p className="text-sm text-slate-500">{toDate(item.data_procedimento)}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-white ${
                  item.pagamento_status === "pago" ? "bg-green-600" : "bg-red-600"
                }`}
              >
                {pagamentoStatusLabel(item.pagamento_status)}
              </span>
            </div>
          </Link>
          );
        })}
      </div>
    </div>
  );
}
