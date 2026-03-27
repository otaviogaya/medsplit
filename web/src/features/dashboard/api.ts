import dayjs from "dayjs";
import { listProcedimentos } from "@/src/features/procedimentos/api";
import { ProcedimentoRow } from "@/src/types/rows";

export async function getDashboardData() {
  const meses: string[] = [];
  for (let i = 5; i >= 0; i--) {
    meses.push(dayjs().subtract(i, "month").format("YYYY-MM"));
  }

  const results = await Promise.all(
    meses.map((mes) => listProcedimentos({ mes }) as Promise<ProcedimentoRow[]>),
  );

  const todosProcedimentos = results.flat();
  const mesAtual = meses[meses.length - 1];
  const procsMesAtual = results[results.length - 1];

  const faturado = procsMesAtual.reduce((acc, p) => acc + Number(p.valor_calculado ?? 0), 0);
  const recebido = procsMesAtual.reduce((acc, p) => acc + Number(p.valor_recebido ?? 0), 0);

  const kpis = {
    cirurgiasMes: procsMesAtual.length,
    faturado,
    recebido,
    glosado: procsMesAtual.reduce((acc, p) => {
      return acc + Math.max(Number(p.valor_calculado ?? 0) - Number(p.valor_recebido ?? 0), 0);
    }, 0),
    aReceber: faturado - recebido,
  };

  const evolucaoMensal = meses.map((mes, i) => {
    const procsDoMes = results[i];
    const fat = procsDoMes.reduce((acc, p) => acc + Number(p.valor_calculado ?? 0), 0);
    const rec = procsDoMes.reduce((acc, p) => acc + Number(p.valor_recebido ?? 0), 0);
    return {
      mes: dayjs(mes + "-01").format("MMM/YY"),
      procedimentos: procsDoMes.length,
      faturado: fat,
      recebido: rec,
    };
  });

  const porHospitalMap = new Map<string, number>();
  procsMesAtual.forEach((p) => {
    const nome = p.hospital_nome || "Sem hospital";
    porHospitalMap.set(nome, (porHospitalMap.get(nome) ?? 0) + 1);
  });
  const porHospital = Array.from(porHospitalMap.entries())
    .map(([nome, quantidade]) => ({ nome, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const pagos = procsMesAtual.filter((p) => p.pagamento_status === "pago").length;
  const naoPagos = procsMesAtual.filter((p) => p.pagamento_status !== "pago").length;
  const statusPagamento = [
    { status: "Pago", quantidade: pagos },
    { status: "Aguardando", quantidade: naoPagos },
  ];

  const porConvenioMap = new Map<string, number>();
  procsMesAtual.forEach((p) => {
    const nome = p.convenio_nome || "Sem convênio";
    porConvenioMap.set(nome, (porConvenioMap.get(nome) ?? 0) + 1);
  });
  const porConvenio = Array.from(porConvenioMap.entries())
    .map(([nome, quantidade]) => ({ nome, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);

  return { kpis, charts: { evolucaoMensal, porHospital, statusPagamento, porConvenio } };
}
