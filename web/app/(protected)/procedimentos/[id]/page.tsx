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
import { BackLink } from "@/src/components/back-link";
import { useConfirm } from "@/src/components/confirm-dialog";
import { useToast } from "@/src/components/toast";
import { SkeletonList } from "@/src/components/skeleton";

export default function ProcedimentoDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [valorCalculado, setValorCalculado] = useState("");
  const [dataRecebimento, setDataRecebimento] = useState(todayIsoDate());
  const [formaPagamento, setFormaPagamento] = useState<"dinheiro" | "pix" | "cartao" | "">("");
  const [saving, setSaving] = useState(false);
  const [savingValor, setSavingValor] = useState(false);
  const [error, setError] = useState("");

  const { data = [], isLoading } = useQuery<ProcedimentoRow[]>({
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
      toast("Status atualizado!");
      await queryClient.invalidateQueries({ queryKey: ["procedimentos"] });
      await queryClient.invalidateQueries({ queryKey: ["repasses"] });
      await queryClient.invalidateQueries({ queryKey: ["procedimento-detail", id] });
    },
    onError: (err) => setError(getErrorMessage(err)),
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
      toast("Marcado como pago!");
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
    const ok = await confirm({
      title: "Reverter pagamento",
      message: "Deseja reverter este procedimento para 'aguardando pagamento'?",
      confirmLabel: "Reverter",
    });
    if (!ok) return;
    try {
      setSaving(true);
      setError("");
      await updateStatusProcedimento({ id, status: "realizado" });
      await updatePagamentoProcedimento(id, "nao_pago");
      toast("Revertido para aguardando pagamento.");
      await queryClient.invalidateQueries({ queryKey: ["procedimentos"] });
      await queryClient.invalidateQueries({ queryKey: ["procedimento-detail", id] });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function onRegistrarGlosa() {
    const ok = await confirm({
      title: "Registrar glosa",
      message: "Tem certeza que deseja registrar uma glosa para este procedimento?",
      confirmLabel: "Registrar",
    });
    if (!ok) return;
    mutation.mutate("glosa");
  }

  async function onCancelar() {
    const ok = await confirm({
      title: "Cancelar procedimento",
      message: "Essa ação irá cancelar o procedimento. Deseja continuar?",
      confirmLabel: "Cancelar procedimento",
    });
    if (!ok) return;
    mutation.mutate("cancelado");
  }

  async function onSalvarValorCalculado() {
    const v = Number(valorCalculado.replace(",", ".")) || 0;
    if (v <= 0) return;
    setSavingValor(true);
    try {
      await updateValorCalculado(id, v);
      toast("Valor calculado salvo!");
      await queryClient.invalidateQueries({ queryKey: ["procedimentos"] });
      await queryClient.invalidateQueries({ queryKey: ["procedimento-detail", id] });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSavingValor(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <BackLink href="/procedimentos" label="Voltar para lista" />
        <SkeletonList count={2} />
      </div>
    );
  }

  if (!procedimento) {
    return (
      <div className="grid gap-4">
        <BackLink href="/procedimentos" label="Voltar para lista" />
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <p className="text-sm text-slate-500">Procedimento não encontrado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {confirmDialog}
      <BackLink href="/procedimentos" label="Voltar para lista" />

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">{procedimento.paciente_nome}</h1>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-white ${
              procedimento.pagamento_status === "pago" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {pagamentoStatusLabel(procedimento.pagamento_status)}
          </span>
        </div>

        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div className="grid gap-0.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Hospital</span>
            <span className="text-slate-800">{procedimento.hospital_nome}</span>
          </div>
          <div className="grid gap-0.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Convênio</span>
            <span className="text-slate-800">{procedimento.convenio_nome}</span>
          </div>
          <div className="grid gap-0.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Data</span>
            <span className="text-slate-800">{toDate(procedimento.data_procedimento)}</span>
          </div>
          <div className="grid gap-0.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Cirurgião</span>
            <span className="text-slate-800">{procedimento.cirurgiao_nome}</span>
          </div>
          <div className="grid gap-0.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Procedimento</span>
            <span className="text-slate-800">{procedimento.descricao_procedimento}</span>
          </div>
          <div className="grid gap-0.5">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Anestesista</span>
            <span className="text-slate-800">{procedimento.anestesista_principal_nome}</span>
          </div>
        </div>

        {procedimento.documento_foto_url ? (
          <a
            className="mt-4 inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 transition hover:bg-blue-100"
            href={procedimento.documento_foto_url}
            rel="noreferrer"
            target="_blank"
          >
            📎 Ver documento
          </a>
        ) : null}

        <div className="mt-5 grid gap-2 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2">
          <div className="flex justify-between sm:flex-col sm:gap-0.5">
            <span className="text-slate-500">Valor calculado</span>
            <span className="font-semibold text-slate-900">{toMoney(procedimento.valor_calculado)}</span>
          </div>
          <div className="flex justify-between sm:flex-col sm:gap-0.5">
            <span className="text-slate-500">Valor pago</span>
            <span className="font-semibold text-slate-900">
              {procedimento.pagamento_status === "pago" ? toMoney(procedimento.valor_recebido) : "-"}
            </span>
          </div>
          <div className="flex justify-between sm:flex-col sm:gap-0.5">
            <span className="text-slate-500">Valor glosa</span>
            <span className="font-semibold text-slate-900">{toMoney(procedimento.valor_glosa)}</span>
          </div>
          <div className="flex justify-between sm:flex-col sm:gap-0.5">
            <span className="text-slate-500">Forma de pagamento</span>
            <span className="font-semibold text-slate-900">{formaPagamentoLabel(procedimento.forma_pagamento)}</span>
          </div>
        </div>
      </div>

      {(role === "admin" || role === "faturamento" || role === "superadmin") && (
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Ações financeiras</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Valor calculado</span>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                value={valorCalculado}
                onChange={(e) => setValorCalculado(e.target.value)}
                placeholder="0,00"
              />
            </label>
            <div className="flex items-end">
              <button
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
                disabled={savingValor}
                onClick={onSalvarValorCalculado}
                type="button"
              >
                {savingValor ? "Salvando..." : "Salvar valor calculado"}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Data pagamento</span>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                type="date"
                value={dataRecebimento}
                onChange={(e) => setDataRecebimento(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-700">Forma de pagamento</span>
              <select
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value as "dinheiro" | "pix" | "cartao" | "")}
              >
                <option value="">Selecione...</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="pix">Pix</option>
                <option value="cartao">Cartão</option>
              </select>
            </label>
          </div>

          <p className="text-xs text-slate-400">Ao marcar como pago, o valor pago será igual ao valor calculado.</p>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}

          <div className="sticky bottom-4 grid gap-2 sm:flex sm:flex-wrap">
            <button
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              disabled={saving || mutation.isPending}
              onClick={onMarcarPago}
              type="button"
            >
              {saving ? "Salvando..." : "Marcar como pago"}
            </button>
            <button
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
              disabled={saving || mutation.isPending}
              onClick={onMarcarAguardaPagamento}
              type="button"
            >
              Aguarda pagamento
            </button>
            <button
              className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-60"
              disabled={saving || mutation.isPending}
              onClick={onRegistrarGlosa}
              type="button"
            >
              Registrar glosa
            </button>
            <button
              className="rounded-lg px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
              disabled={saving || mutation.isPending}
              onClick={onCancelar}
              type="button"
            >
              Cancelar procedimento
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
