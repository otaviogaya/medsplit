"use client";

import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/src/features/auth/auth-context";
import { listRepasses, marcarRepasseComoPago } from "@/src/features/repasses/api";
import { toDate, toMoney, todayIsoDate } from "@/src/lib/format";
import { RepasseRow } from "@/src/types/rows";
import { EmptyState } from "@/src/components/empty-state";
import { QueryError } from "@/src/components/query-error";
import { SkeletonList } from "@/src/components/skeleton";
import { useToast } from "@/src/components/toast";

export default function RepassesPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [mes, setMes] = useState(dayjs().format("YYYY-MM"));
  const [status, setStatus] = useState<"pendente" | "pago" | "">("");

  const filters = useMemo(() => ({ mes, status: status || undefined }), [mes, status]);
  const { data = [], refetch, isLoading, isError, error } = useQuery<RepasseRow[]>({
    queryKey: ["repasses", filters],
    queryFn: async () => (await listRepasses(filters)) as RepasseRow[],
  });

  const mutation = useMutation({
    mutationFn: (id: string) => marcarRepasseComoPago(id, todayIsoDate()),
    onSuccess: async () => {
      toast("Repasse marcado como pago!");
      await queryClient.invalidateQueries({ queryKey: ["repasses"] });
    },
  });

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Repasses</h1>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Mês</span>
          <input
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Status</span>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as "pendente" | "pago" | "")}
          >
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm transition-colors hover:bg-slate-50"
            onClick={() => refetch()}
            type="button"
          >
            Filtrar
          </button>
        </div>
      </div>

      {isLoading ? <SkeletonList count={3} /> : null}

      {isError ? <QueryError error={error} onRetry={() => refetch()} /> : null}

      {!isLoading && !isError && data.length === 0 ? (
        <EmptyState message="Nenhum repasse encontrado neste período." />
      ) : null}

      <div className="grid gap-3">
        {data.map((item) => (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" key={item.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-lg font-semibold text-slate-900">{item.medico_nome}</p>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-white ${
                  item.status_repasse === "pago" ? "bg-green-600" : "bg-amber-500"
                }`}
              >
                {item.status_repasse === "pago" ? "Pago" : "Pendente"}
              </span>
            </div>
            <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              <p className="text-slate-600">Tipo: <span className="text-slate-800">{item.tipo}</span></p>
              <p className="text-slate-600">Data: <span className="text-slate-800">{toDate(item.data_procedimento)}</span></p>
              <p className="text-slate-600">Valor: <span className="font-semibold text-slate-900">{toMoney(item.valor_repassar)}</span></p>
            </div>
            {(role === "admin" || role === "superadmin") && item.status_repasse === "pendente" ? (
              <button
                className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(item.id)}
                type="button"
              >
                {mutation.isPending ? "Salvando..." : "Marcar como pago"}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
