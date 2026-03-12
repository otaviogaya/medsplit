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
import { useToast } from "@/src/components/toast";

const inputClass = "rounded-lg border border-slate-300 px-3 py-2.5 text-sm transition";

export default function CadastrosPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [hospital, setHospital] = useState({ nome: "", cidade: "", contato_faturamento: "" });
  const [convenio, setConvenio] = useState("");
  const [anestesista, setAnestesista] = useState("");
  const [honorario, setHonorario] = useState({ convenio_id: "", porte: "1", valor: "0" });
  const [error, setError] = useState("");

  const { data: convenios = [] } = useQuery({
    queryKey: ["convenios"],
    queryFn: listConvenios,
  });

  const genericMutation = useMutation({
    mutationFn: async (action: () => Promise<void>) => action(),
    onSuccess: async () => {
      toast("Cadastro salvo com sucesso!");
      setError("");
      await queryClient.invalidateQueries();
    },
    onError: (err: unknown) => {
      setError(getErrorMessage(err));
    },
  });

  if (role !== "admin" && role !== "superadmin") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-500">Apenas administradores podem acessar cadastros.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">Cadastros</h1>
        <Link
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm transition-colors hover:bg-slate-50"
          href="/equipes"
        >
          Criar usuário
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Hospital</h2>
          <input className={inputClass} placeholder="Nome" value={hospital.nome} onChange={(e) => setHospital({ ...hospital, nome: e.target.value })} />
          <input className={inputClass} placeholder="Cidade" value={hospital.cidade} onChange={(e) => setHospital({ ...hospital, cidade: e.target.value })} />
          <input className={inputClass} placeholder="Contato faturamento" value={hospital.contato_faturamento} onChange={(e) => setHospital({ ...hospital, contato_faturamento: e.target.value })} />
          <button
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            disabled={genericMutation.isPending}
            onClick={() => genericMutation.mutate(() => createHospital({ ...hospital, prazo_pagamento_dias: 30 }))}
            type="button"
          >
            Salvar hospital
          </button>
        </section>

        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Convênio</h2>
          <input className={inputClass} placeholder="Nome do convênio" value={convenio} onChange={(e) => setConvenio(e.target.value)} />
          <button
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            disabled={genericMutation.isPending}
            onClick={() => genericMutation.mutate(() => createConvenio({ nome: convenio }))}
            type="button"
          >
            Salvar convênio
          </button>
        </section>

        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Anestesista</h2>
          <input className={inputClass} placeholder="Nome do anestesista" value={anestesista} onChange={(e) => setAnestesista(e.target.value)} />
          <button
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            disabled={genericMutation.isPending}
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

        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Tabela de honorários</h2>
          <select className={inputClass} value={honorario.convenio_id} onChange={(e) => setHonorario({ ...honorario, convenio_id: e.target.value })}>
            <option value="">Selecione um convênio</option>
            {convenios.map((item) => (
              <option key={item.id} value={item.id}>{item.nome}</option>
            ))}
          </select>
          <input className={inputClass} placeholder="Porte" value={honorario.porte} onChange={(e) => setHonorario({ ...honorario, porte: e.target.value })} />
          <input className={inputClass} placeholder="Valor" value={honorario.valor} onChange={(e) => setHonorario({ ...honorario, valor: e.target.value })} />
          <button
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            disabled={genericMutation.isPending}
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
            Salvar honorário
          </button>
        </section>
      </div>
    </div>
  );
}
