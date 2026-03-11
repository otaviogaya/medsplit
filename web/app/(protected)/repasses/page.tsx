"use client";

import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/src/features/auth/auth-context";
import { listRepasses, marcarRepasseComoPago } from "@/src/features/repasses/api";
import { toDate, toMoney, todayIsoDate } from "@/src/lib/format";
import { RepasseRow } from "@/src/types/rows";

export default function RepassesPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [mes, setMes] = useState(dayjs().format("YYYY-MM"));
  const [status, setStatus] = useState<"pendente" | "pago" | "">("");

  const filters = useMemo(() => ({ mes, status: status || undefined }), [mes, status]);
  const { data = [], refetch } = useQuery<RepasseRow[]>({
    queryKey: ["repasses", filters],
    queryFn: async () => (await listRepasses(filters)) as RepasseRow[],
  });

  const mutation = useMutation({
    mutationFn: (id: string) => marcarRepasseComoPago(id, todayIsoDate()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["repasses"] });
    },
  });

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <label className="grid gap-1 text-sm">
          <span>Mes (AAAA-MM)</span>
          <input className="rounded border border-slate-300 px-3 py-2" type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Status</span>
          <select className="rounded border border-slate-300 px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as "pendente" | "pago" | "")}>
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
          </select>
        </label>
        <button className="self-end rounded border border-slate-300 px-3 py-2 text-sm" onClick={() => refetch()} type="button">
          Filtrar
        </button>
      </div>

      <div className="grid gap-3">
        {data.map((item) => (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" key={item.id}>
            <p className="text-lg font-semibold text-slate-900">{item.medico_nome}</p>
            <div className="mt-2 grid gap-1 text-sm text-slate-700">
              <p>Tipo: {item.tipo}</p>
              <p>Status: {item.status_repasse}</p>
              <p>Data procedimento: {toDate(item.data_procedimento)}</p>
              <p>Valor: {toMoney(item.valor_repassar)}</p>
            </div>
            {role === "admin" && item.status_repasse === "pendente" ? (
              <button
                className="mt-3 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white"
                onClick={() => mutation.mutate(item.id)}
                type="button"
              >
                Marcar como pago
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
