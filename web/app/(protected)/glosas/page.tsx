"use client";

import dayjs from "dayjs";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/src/features/auth/auth-context";
import { listProcedimentos, updateGlosaInfo } from "@/src/features/procedimentos/api";
import { toMoney } from "@/src/lib/format";
import { ProcedimentoRow } from "@/src/types/rows";
import { EmptyState } from "@/src/components/empty-state";
import { QueryError } from "@/src/components/query-error";
import { SkeletonList } from "@/src/components/skeleton";
import { useToast } from "@/src/components/toast";

type CardState = { motivo: string; contestacao: "em_aberto" | "recuperada" | "perdida" };

export default function GlosasPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [mes, setMes] = useState(dayjs().format("YYYY-MM"));
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});

  const { data = [], isLoading, isError, error, refetch } = useQuery<ProcedimentoRow[]>({
    queryKey: ["glosas", mes],
    queryFn: async () => (await listProcedimentos({ mes })) as ProcedimentoRow[],
  });
  const glosas = data.filter((item) => Number(item.valor_glosa ?? 0) > 0);

  function getCardState(id: string): CardState {
    return cardStates[id] ?? { motivo: "", contestacao: "em_aberto" };
  }

  function updateCard(id: string, partial: Partial<CardState>) {
    setCardStates((prev) => ({
      ...prev,
      [id]: { ...getCardState(id), ...partial },
    }));
  }

  const mutation = useMutation({
    mutationFn: ({ id, motivo, contestacao }: { id: string; motivo: string; contestacao: "em_aberto" | "recuperada" | "perdida" }) =>
      updateGlosaInfo(id, motivo, contestacao),
    onSuccess: async () => {
      toast("Glosa atualizada!");
      await queryClient.invalidateQueries({ queryKey: ["glosas"] });
    },
  });

  if (role !== "admin" && role !== "faturamento" && role !== "superadmin") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-500">Acesso restrito ao faturamento.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Glosas</h1>

      <label className="grid max-w-sm gap-1 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <span className="font-medium text-slate-700">Mês</span>
        <input
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
        />
      </label>

      {isLoading ? <SkeletonList count={3} /> : null}

      {isError ? <QueryError error={error} onRetry={() => refetch()} /> : null}

      {!isLoading && !isError && glosas.length === 0 ? (
        <EmptyState message="Nenhuma glosa encontrada neste mês." />
      ) : null}

      <div className="grid gap-3">
        {glosas.map((item) => {
          const state = getCardState(item.id);
          return (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-lg font-semibold text-slate-900">{item.paciente_nome}</p>
                <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  {toMoney(item.valor_glosa)}
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-700">Motivo da glosa</span>
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                    placeholder="Descreva o motivo"
                    value={state.motivo}
                    onChange={(e) => updateCard(item.id, { motivo: e.target.value })}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-700">Contestação</span>
                  <select
                    className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                    value={state.contestacao}
                    onChange={(e) => updateCard(item.id, { contestacao: e.target.value as CardState["contestacao"] })}
                  >
                    <option value="em_aberto">Em aberto</option>
                    <option value="recuperada">Recuperada</option>
                    <option value="perdida">Perdida</option>
                  </select>
                </label>
              </div>
              <button
                className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ id: item.id, motivo: state.motivo, contestacao: state.contestacao })}
                type="button"
              >
                {mutation.isPending ? "Salvando..." : "Salvar glosa"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
