export type ProcedimentoRow = {
  id: string;
  data_procedimento: string;
  hospital_nome: string;
  paciente_nome: string;
  cirurgiao_nome: string;
  descricao_procedimento: string;
  convenio_nome: string;
  valor_calculado: number | null;
  valor_recebido: number | null;
  valor_glosa: number | null;
  status: "realizado" | "faturado" | "glosa" | "recebido" | "cancelado";
  pagamento_status: "nao_pago" | "pago";
  data_recebimento: string | null;
  forma_pagamento: "dinheiro" | "pix" | "cartao" | null;
  anestesista_principal_nome: string;
  documento_foto_url: string | null;
};

export type RepasseRow = {
  id: string;
  medico_nome: string;
  tipo: "principal" | "auxiliar";
  percentual: number;
  valor_repassar: number;
  status_repasse: "pendente" | "pago";
  data_pagamento: string | null;
  data_procedimento: string;
};
