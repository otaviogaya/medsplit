import dayjs from "dayjs";
import { listProcedimentos } from "@/src/features/procedimentos/api";
import { ProcedimentoRow } from "@/src/types/rows";

export async function getKpisMesAtual() {
  const mes = dayjs().format("YYYY-MM");
  const procedimentos = (await listProcedimentos({ mes })) as ProcedimentoRow[];

  const faturado = procedimentos.reduce(
    (acc: number, item) => acc + Number(item.valor_calculado ?? 0),
    0,
  );
  const recebido = procedimentos.reduce(
    (acc: number, item) => acc + Number(item.valor_recebido ?? 0),
    0,
  );
  const glosado = procedimentos.reduce((acc: number, item) => {
    const valorCalculado = Number(item.valor_calculado ?? 0);
    const valorRecebido = Number(item.valor_recebido ?? 0);
    return acc + Math.max(valorCalculado - valorRecebido, 0);
  }, 0);

  return {
    cirurgiasMes: procedimentos.length,
    faturado,
    recebido,
    glosado,
    aReceber: faturado - recebido,
  };
}
