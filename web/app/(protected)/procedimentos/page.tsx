"use client";

import dayjs from "dayjs";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  listAnestesistas,
  listCirurgioes,
  listConvenios,
  listHospitais,
} from "@/src/features/cadastros/api";
import { listProcedimentos } from "@/src/features/procedimentos/api";
import { SearchableSelect } from "@/src/components/searchable-select";
import { formatProcedimentoNumero, toDate } from "@/src/lib/format";
import { pagamentoStatusLabel } from "@/src/lib/status";
import { ProcedimentoRow } from "@/src/types/rows";
import { EmptyState } from "@/src/components/empty-state";
import { QueryError } from "@/src/components/query-error";
import { SkeletonList } from "@/src/components/skeleton";

const monthInputClass = "rounded-lg border border-slate-300 px-3 py-2.5 text-sm w-full";

export default function ProcedimentosPage() {
  const [pesquisaAberta, setPesquisaAberta] = useState(false);
  const [mes, setMes] = useState(dayjs().format("YYYY-MM"));
  const [hospitalId, setHospitalId] = useState("");
  const [convenioId, setConvenioId] = useState("");
  const [medicoId, setMedicoId] = useState("");
  const [cirurgiaoValor, setCirurgiaoValor] = useState("");
  const [procedimentoValor, setProcedimentoValor] = useState("");

  const rpcFilters = useMemo(
    () => ({
      mes: mes || undefined,
      hospitalId: hospitalId || undefined,
      convenioId: convenioId || undefined,
      medicoId: medicoId || undefined,
    }),
    [mes, hospitalId, convenioId, medicoId],
  );

  const { data: rawData = [], refetch, isLoading, isError, error } = useQuery<ProcedimentoRow[]>({
    queryKey: ["procedimentos", rpcFilters],
    queryFn: async () => (await listProcedimentos(rpcFilters)) as ProcedimentoRow[],
  });

  const { data: hospitais = [] } = useQuery({ queryKey: ["hospitais"], queryFn: listHospitais });
  const { data: convenios = [] } = useQuery({ queryKey: ["convenios"], queryFn: listConvenios });
  const { data: anestesistas = [] } = useQuery({ queryKey: ["anestesistas"], queryFn: listAnestesistas });
  const { data: cirurgioes = [] } = useQuery({ queryKey: ["cirurgioes"], queryFn: listCirurgioes });

  const hospitalOptions = useMemo(
    () => hospitais.map((h) => ({ value: h.id, label: h.nome })),
    [hospitais],
  );
  const convenioOptions = useMemo(
    () => convenios.map((c) => ({ value: c.id, label: c.nome })),
    [convenios],
  );
  const anestesistaOptions = useMemo(
    () => anestesistas.map((a) => ({ value: a.id, label: a.nome })),
    [anestesistas],
  );

  const cirurgiaoOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of cirurgioes) {
      const n = c.nome.trim();
      if (n) map.set(n, n);
    }
    for (const p of rawData) {
      const n = p.cirurgiao_nome?.trim();
      if (n) map.set(n, n);
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
      .map(([v, l]) => ({ value: v, label: l }));
  }, [cirurgioes, rawData]);

  const procedimentoOptions = useMemo(() => {
    const out: { value: string; label: string }[] = [];
    const seen = new Set<string>();
    for (const p of rawData) {
      const desc = p.descricao_procedimento?.trim();
      if (desc && !seen.has(`d:${desc}`)) {
        seen.add(`d:${desc}`);
        out.push({ value: desc, label: desc });
      }
      const codigos = p.codigo_cbhpm?.split(", ") ?? [];
      for (const cod of codigos) {
        const c = cod.trim();
        if (!c || seen.has(`c:${c}`)) continue;
        seen.add(`c:${c}`);
        out.push({ value: c, label: `CBHPM ${c}` });
      }
    }
    return out.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [rawData]);

  const filteredData = useMemo(() => {
    return rawData.filter((item) => {
      if (cirurgiaoValor) {
        const q = cirurgiaoValor.toLowerCase();
        if (!item.cirurgiao_nome?.toLowerCase().includes(q)) return false;
      }
      if (procedimentoValor) {
        const q = procedimentoValor.toLowerCase();
        const desc = item.descricao_procedimento?.toLowerCase() ?? "";
        const cod = item.codigo_cbhpm?.toLowerCase() ?? "";
        if (!desc.includes(q) && !cod.includes(q)) return false;
      }
      return true;
    });
  }, [rawData, cirurgiaoValor, procedimentoValor]);

  const temPesquisaAtiva =
    !!hospitalId ||
    !!convenioId ||
    !!medicoId ||
    !!cirurgiaoValor ||
    !!procedimentoValor;

  function limparPesquisa() {
    setHospitalId("");
    setConvenioId("");
    setMedicoId("");
    setCirurgiaoValor("");
    setProcedimentoValor("");
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">Procedimentos</h1>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition-colors hover:bg-slate-50"
            onClick={() => setPesquisaAberta((p) => !p)}
            type="button"
          >
            Pesquisar{temPesquisaAtiva ? " •" : ""}
          </button>
          <Link
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            href="/procedimentos/novo"
          >
            + Novo
          </Link>
        </div>
      </div>

      {pesquisaAberta ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-900">Pesquisar</p>
            <button
              className="text-sm text-slate-500 hover:text-slate-700"
              onClick={() => setPesquisaAberta(false)}
              type="button"
            >
              Fechar
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Mês (referência)</span>
              <input
                className={monthInputClass}
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
              />
              <span className="text-xs text-slate-400">Define o período carregado do servidor.</span>
            </label>
            <SearchableSelect
              label="Hospital"
              value={hospitalId}
              onChange={setHospitalId}
              options={hospitalOptions}
              placeholder="Nome do hospital…"
            />
            <SearchableSelect
              label="Convênio"
              value={convenioId}
              onChange={setConvenioId}
              options={convenioOptions}
              placeholder="Nome do convênio…"
            />
            <SearchableSelect
              label="Anestesista"
              value={medicoId}
              onChange={setMedicoId}
              options={anestesistaOptions}
              placeholder="Nome do anestesista…"
            />
            <SearchableSelect
              label="Cirurgião"
              value={cirurgiaoValor}
              onChange={setCirurgiaoValor}
              options={cirurgiaoOptions}
              placeholder="Nome do cirurgião…"
            />
            <SearchableSelect
              label="Procedimento"
              value={procedimentoValor}
              onChange={setProcedimentoValor}
              options={procedimentoOptions}
              placeholder="Descrição ou código CBHPM…"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {temPesquisaAtiva ? (
              <button
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
                onClick={limparPesquisa}
                type="button"
              >
                Limpar pesquisa
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {isLoading ? <SkeletonList count={4} /> : null}

      {isError ? <QueryError error={error} onRetry={() => refetch()} /> : null}

      {!isLoading && !isError && filteredData.length === 0 ? (
        <EmptyState
          message={
            temPesquisaAtiva
              ? "Nenhum procedimento encontrado com os critérios atuais."
              : "Nenhum procedimento neste mês."
          }
        />
      ) : null}

      <div className="grid gap-3">
        {filteredData.map((item) => (
          <Link
            key={item.id}
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            href={`/procedimentos/${item.id}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="grid gap-1">
                <p className="text-xs text-slate-400">
                  {formatProcedimentoNumero(item.numero_lancamento ?? 0, item.data_procedimento)}
                </p>
                <p className="text-lg font-semibold text-slate-900 group-hover:text-blue-700">{item.paciente_nome}</p>
                {item.codigo_cbhpm ? (
                  <p className="text-xs text-slate-600">
                    <span className="font-mono text-blue-600">{item.codigo_cbhpm.split(", ")[0]}</span>
                    <span className="mx-1 text-slate-300">|</span>
                    <span>{item.descricao_procedimento.split(" + ")[0]}</span>
                    {item.porte_anestesico && (
                      <>
                        <span className="mx-1 text-slate-300">|</span>
                        <span className="text-slate-500">Porte Anest. {item.porte_anestesico.split(", ")[0]}</span>
                      </>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">{item.descricao_procedimento}</p>
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
        ))}
      </div>
    </div>
  );
}
