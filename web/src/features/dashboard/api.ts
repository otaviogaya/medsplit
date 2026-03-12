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

export async function getDashboardChartData() {
  const meses: string[] = [];
  for (let i = 5; i >= 0; i--) {
    meses.push(dayjs().subtract(i, "month").format("YYYY-MM"));
  }

  const todosProcedimentos: ProcedimentoRow[] = [];
  for (const mes of meses) {
    const procs = (await listProcedimentos({ mes })) as ProcedimentoRow[];
    todosProcedimentos.push(...procs);
  }

  const evolucaoMensal = meses.map((mes) => {
    const procsDoMes = todosProcedimentos.filter(
      (p) => dayjs(p.data_procedimento).format("YYYY-MM") === mes,
    );
    const faturado = procsDoMes.reduce((acc, p) => acc + Number(p.valor_calculado ?? 0), 0);
    const recebido = procsDoMes.reduce((acc, p) => acc + Number(p.valor_recebido ?? 0), 0);
    return {
      mes: dayjs(mes + "-01").format("MMM/YY"),
      procedimentos: procsDoMes.length,
      faturado,
      recebido,
    };
  });

  const mesAtual = dayjs().format("YYYY-MM");
  const procsMesAtual = todosProcedimentos.filter(
    (p) => dayjs(p.data_procedimento).format("YYYY-MM") === mesAtual,
  );

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

  return { evolucaoMensal, porHospital, statusPagamento, porConvenio };
}
