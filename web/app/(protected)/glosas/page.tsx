"use client";

import dayjs from "dayjs";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/src/features/auth/auth-context";
import { listProcedimentos, updateGlosaInfo } from "@/src/features/procedimentos/api";
import { toMoney } from "@/src/lib/format";
import { ProcedimentoRow } from "@/src/types/rows";

export default function GlosasPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [mes, setMes] = useState(dayjs().format("YYYY-MM"));
  const [motivo, setMotivo] = useState("");
  const [contestacao, setContestacao] = useState("em_aberto");

  const { data = [] } = useQuery<ProcedimentoRow[]>({
    queryKey: ["glosas", mes],
    queryFn: async () => (await listProcedimentos({ mes })) as ProcedimentoRow[],
  });
  const glosas = data.filter((item) => Number(item.valor_glosa ?? 0) > 0);

  const mutation = useMutation({
    mutationFn: (id: string) =>
      updateGlosaInfo(id, motivo, contestacao as "em_aberto" | "recuperada" | "perdida"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["glosas"] });
      setMotivo("");
    },
  });

  if (role !== "admin" && role !== "faturamento") {
    return <p className="rounded-xl border border-slate-200 bg-white p-4">Acesso restrito ao faturamento.</p>;
  }

  return (
    <div className="grid gap-4">
      <label className="grid max-w-sm gap-1 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <span>Mes (AAAA-MM)</span>
        <input className="rounded border border-slate-300 px-3 py-2" type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
      </label>

      <div className="grid gap-3">
        {glosas.map((item) => (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" key={item.id}>
            <p className="text-lg font-semibold text-slate-900">{item.paciente_nome}</p>
            <p className="mt-1 text-sm text-slate-700">Valor glosa: {toMoney(item.valor_glosa)}</p>
            <label className="mt-3 grid gap-1 text-sm">
              <span>Motivo da glosa</span>
              <input className="rounded border border-slate-300 px-3 py-2" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </label>
            <label className="mt-3 grid gap-1 text-sm">
              <span>Contestacao</span>
              <select className="rounded border border-slate-300 px-3 py-2" value={contestacao} onChange={(e) => setContestacao(e.target.value)}>
                <option value="em_aberto">Em aberto</option>
                <option value="recuperada">Recuperada</option>
                <option value="perdida">Perdida</option>
              </select>
            </label>
            <button
              className="mt-3 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white"
              onClick={() => mutation.mutate(item.id)}
              type="button"
            >
              Salvar glosa
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
