import { FormaPagamentoTipo, ProcedimentoStatus } from "@/src/types/app";

const formaPagamentoLabels: Record<FormaPagamentoTipo, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao: "Cartão",
  cheque: "Cheque",
};

export function procedimentoStatusLabel(status?: ProcedimentoStatus | null) {
  if (!status) return "-";
  const map: Record<ProcedimentoStatus, string> = {
    realizado: "Aguarda recebimento",
    faturado: "Aguarda recebimento",
    recebido: "Recebido",
    glosa: "Glosa",
    cancelado: "Cancelado",
  };
  return map[status];
}

export function pagamentoStatusLabel(status?: "pago" | "nao_pago" | null) {
  if (!status || status === "nao_pago") return "Aguarda pagamento";
  return "Pago";
}

export function formaPagamentoLabel(forma?: FormaPagamentoTipo | null) {
  if (!forma) return "-";
  return formaPagamentoLabels[forma];
}
