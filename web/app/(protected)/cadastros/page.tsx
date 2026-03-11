"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/src/features/auth/auth-context";
import {
  createAnestesista,
  createConvenio,
  createHonorario,
  createHospital,
  listConvenios,
} from "@/src/features/cadastros/api";
import { getErrorMessage } from "@/src/lib/error";

export default function CadastrosPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [hospital, setHospital] = useState({ nome: "", cidade: "", contato_faturamento: "" });
  const [convenio, setConvenio] = useState("");
  const [anestesista, setAnestesista] = useState("");
  const [honorario, setHonorario] = useState({ convenio_id: "", porte: "1", valor: "0" });
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const { data: convenios = [] } = useQuery({
    queryKey: ["convenios"],
    queryFn: listConvenios,
  });

  const genericMutation = useMutation({
    mutationFn: async (action: () => Promise<void>) => action(),
    onSuccess: async () => {
      setFeedback("Cadastro salvo.");
      setError("");
      await queryClient.invalidateQueries();
    },
    onError: (err: unknown) => {
      setError(getErrorMessage(err));
      setFeedback("");
    },
  });

  if (role !== "admin") {
    return <p className="rounded-xl border border-slate-200 bg-white p-4">Apenas admin pode acessar cadastros.</p>;
  }

  return (
    <div className="grid max-w-3xl gap-4">
      <Link className="w-fit rounded border border-slate-300 bg-white px-3 py-2 text-sm" href="/signup">
        Criar usuario (convite)
      </Link>

      <section className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">Hospital</h2>
        <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Nome" value={hospital.nome} onChange={(e) => setHospital({ ...hospital, nome: e.target.value })} />
        <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Cidade" value={hospital.cidade} onChange={(e) => setHospital({ ...hospital, cidade: e.target.value })} />
        <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Contato faturamento" value={hospital.contato_faturamento} onChange={(e) => setHospital({ ...hospital, contato_faturamento: e.target.value })} />
        <button className="w-fit rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white" onClick={() => genericMutation.mutate(() => createHospital({ ...hospital, prazo_pagamento_dias: 30 }))} type="button">
          Salvar hospital
        </button>
      </section>

      <section className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">Convenio</h2>
        <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Nome" value={convenio} onChange={(e) => setConvenio(e.target.value)} />
        <button className="w-fit rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white" onClick={() => genericMutation.mutate(() => createConvenio({ nome: convenio }))} type="button">
          Salvar convenio
        </button>
      </section>

      <section className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">Anestesista</h2>
        <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Nome" value={anestesista} onChange={(e) => setAnestesista(e.target.value)} />
        <button
          className="w-fit rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white"
          onClick={() =>
            genericMutation.mutate(() =>
              createAnestesista({
                nome: anestesista,
                percentual_padrao_principal: 0.7,
                percentual_padrao_auxiliar: 0.3,
              }),
            )
          }
          type="button"
        >
          Salvar anestesista
        </button>
      </section>

      <section className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">Tabela de honorarios</h2>
        <select className="rounded border border-slate-300 px-3 py-2 text-sm" value={honorario.convenio_id} onChange={(e) => setHonorario({ ...honorario, convenio_id: e.target.value })}>
          <option value="">Selecione um convenio</option>
          {convenios.map((item) => (
            <option key={item.id} value={item.id}>{item.nome}</option>
          ))}
        </select>
        <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Porte" value={honorario.porte} onChange={(e) => setHonorario({ ...honorario, porte: e.target.value })} />
        <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Valor" value={honorario.valor} onChange={(e) => setHonorario({ ...honorario, valor: e.target.value })} />
        <button
          className="w-fit rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white"
          onClick={() =>
            genericMutation.mutate(() =>
              createHonorario({
                convenio_id: honorario.convenio_id,
                porte: Number(honorario.porte),
                valor: Number(honorario.valor),
              }),
            )
          }
          type="button"
        >
          Salvar honorario
        </button>
      </section>

      {feedback ? <p className="text-sm text-green-700">{feedback}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
