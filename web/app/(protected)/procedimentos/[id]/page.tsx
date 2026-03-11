"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/src/features/auth/auth-context";
import {
  listProcedimentos,
  updatePagamentoProcedimento,
  updateStatusProcedimento,
  updateValorCalculado,
} from "@/src/features/procedimentos/api";
import { toDate, toMoney, todayIsoDate } from "@/src/lib/format";
import { getErrorMessage } from "@/src/lib/error";
import { formaPagamentoLabel, pagamentoStatusLabel } from "@/src/lib/status";
import { ProcedimentoStatus } from "@/src/types/app";
import { ProcedimentoRow } from "@/src/types/rows";

export default function ProcedimentoDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [valorCalculado, setValorCalculado] = useState("");
  const [dataRecebimento, setDataRecebimento] = useState(todayIsoDate());
  const [formaPagamento, setFormaPagamento] = useState<"dinheiro" | "pix" | "cartao" | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data = [] } = useQuery<ProcedimentoRow[]>({
    queryKey: ["procedimento-detail", id],
    queryFn: async () => (await listProcedimentos({})) as ProcedimentoRow[],
  });
  const procedimento = data.find((item) => item.id === id);

  const mutation = useMutation({
    mutationFn: (status: ProcedimentoStatus) =>
      updateStatusProcedimento({
        id,
        status,
        data_faturamento: status === "faturado" ? todayIsoDate() : null,
        data_recebimento: status === "recebido" ? dataRecebimento : null,
        valor_recebido: status === "recebido" ? Number(valorCalculado.replace(",", ".")) || 0 : null,
        forma_pagamento: status === "recebido" ? (formaPagamento || null) : null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["procedimentos"] });
      await queryClient.invalidateQueries({ queryKey: ["repasses"] });
    },
  });

  useEffect(() => {
    if (!procedimento) return;
    const v = procedimento.valor_calculado ?? procedimento.valor_recebido ?? 0;
    setValorCalculado(v ? String(v) : "");
    setDataRecebimento(procedimento.data_recebimento ?? todayIsoDate());
    setFormaPagamento(procedimento.forma_pagamento ?? "");
  }, [procedimento]);

  async function onMarcarPago() {
    try {
      setSaving(true);
      setError("");
      const valor = Number(valorCalculado.replace(",", ".")) || 0;
      if (!formaPagamento) throw new Error("Selecione a forma de pagamento.");
      if (valor <= 0) throw new Error("Informe o valor calculado.");

      await updateValorCalculado(id, valor);
      await updateStatusProcedimento({
        id,
        status: "recebido",
        data_recebimento: dataRecebimento,
        valor_recebido: valor,
        forma_pagamento: formaPagamento,
      });
      await updatePagamentoProcedimento(id, "pago");
      await queryClient.invalidateQueries({ queryKey: ["procedimentos"] });
      await queryClient.invalidateQueries({ queryKey: ["procedimento-detail", id] });
      await queryClient.invalidateQueries({ queryKey: ["repasses"] });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onMarcarAguardaPagamento() {
    try {
      setSaving(true);
      setError("");
      await updateStatusProcedimento({ id, status: "realizado" });
      await updatePagamentoProcedimento(id, "nao_pago");
      await queryClient.invalidateQueries({ queryKey: ["procedimentos"] });
      await queryClient.invalidateQueries({ queryKey: ["procedimento-detail", id] });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!procedimento) {
    return <p className="rounded-xl border border-slate-200 bg-white p-4">Procedimento nao encontrado.</p>;
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">{procedimento.paciente_nome}</h1>
        <div className="mt-3 grid gap-1 text-sm text-slate-700">
          <p>Hospital: {procedimento.hospital_nome}</p>
          <p>Convenio: {procedimento.convenio_nome}</p>
          <p>Data: {toDate(procedimento.data_procedimento)}</p>
          <p>Cirurgiao: {procedimento.cirurgiao_nome}</p>
          <p>Procedimento: {procedimento.descricao_procedimento}</p>
          <p>Anestesista: {procedimento.anestesista_principal_nome}</p>
        </div>
        {procedimento.documento_foto_url ? (
          <a className="mt-3 block text-sm text-blue-700 underline" href={procedimento.documento_foto_url} rel="noreferrer" target="_blank">
            Abrir imagem do documento
          </a>
        ) : null}
        <div className="mt-4 grid gap-1 text-sm">
          <p className="flex justify-between"><span>Valor calculado:</span> <span>{toMoney(procedimento.valor_calculado)}</span></p>
          <p className="flex justify-between"><span>Valor pago:</span> <span>{procedimento.pagamento_status === "pago" ? toMoney(procedimento.valor_recebido) : "-"}</span></p>
          <p className="flex justify-between"><span>Valor glosa:</span> <span>{toMoney(procedimento.valor_glosa)}</span></p>
          <p className="flex items-center justify-between">
            <span>Status pagamento:</span>
            <span className={`rounded px-2 py-1 text-xs font-semibold text-white ${procedimento.pagamento_status === "pago" ? "bg-green-700" : "bg-red-700"}`}>
              {pagamentoStatusLabel(procedimento.pagamento_status)}
            </span>
          </p>
          <p className="flex justify-between"><span>Forma de pagamento:</span> <span>{formaPagamentoLabel(procedimento.forma_pagamento)}</span></p>
        </div>
      </div>

      {(role === "admin" || role === "faturamento") && (
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="grid gap-1 text-sm">
            <span>Valor calculado</span>
            <input
              className="rounded border border-slate-300 px-3 py-2"
              value={valorCalculado}
              onChange={(e) => setValorCalculado(e.target.value)}
              placeholder="0,00"
            />
          </label>
          <button
            className="rounded border border-slate-300 px-3 py-2 text-sm"
            onClick={async () => {
              const v = Number(valorCalculado.replace(",", ".")) || 0;
              if (v <= 0) return;
              await updateValorCalculado(id, v);
              await queryClient.invalidateQueries({ queryKey: ["procedimentos"] });
              await queryClient.invalidateQueries({ queryKey: ["procedimento-detail", id] });
            }}
            type="button"
          >
            Salvar valor calculado
          </button>
          <label className="grid gap-1 text-sm">
            <span>Data pagamento</span>
            <input
              className="rounded border border-slate-300 px-3 py-2"
              type="date"
              value={dataRecebimento}
              onChange={(e) => setDataRecebimento(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span>Forma de pagamento</span>
            <select
              className="rounded border border-slate-300 px-3 py-2"
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value as "dinheiro" | "pix" | "cartao" | "")}
            >
              <option value="">Selecione</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">Pix</option>
              <option value="cartao">Cartao</option>
            </select>
          </label>
          <p className="text-xs text-slate-500">Valor pago = valor calculado ao marcar como pago.</p>
          <button
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={saving}
            onClick={onMarcarPago}
            type="button"
          >
            Marcar como pago
          </button>
          <button
            className="rounded border border-slate-300 px-4 py-2 text-sm"
            disabled={saving}
            onClick={onMarcarAguardaPagamento}
            type="button"
          >
            Marcar como aguarda pagamento
          </button>
          <button
            className="rounded border border-slate-300 px-4 py-2 text-sm"
            onClick={() => mutation.mutate("glosa")}
            type="button"
          >
            Registrar glosa
          </button>
          <button
            className="rounded px-4 py-2 text-sm text-red-700"
            onClick={() => mutation.mutate("cancelado")}
            type="button"
          >
            Cancelar procedimento
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      )}
    </div>
  );
}
