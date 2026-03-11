import { ProcedimentoStatus } from "../types/app";

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

export function formaPagamentoLabel(forma?: "dinheiro" | "pix" | "cartao" | null) {
  if (!forma) return "-";
  if (forma === "pix") return "Pix";
  if (forma === "cartao") return "Cartao";
  return "Dinheiro";
}
