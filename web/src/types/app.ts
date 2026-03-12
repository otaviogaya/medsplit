export type UserRole = "admin" | "medico" | "faturamento" | "superadmin";

export type ProcedimentoStatus =
  | "realizado"
  | "faturado"
  | "glosa"
  | "recebido"
  | "cancelado";

export type RepasseStatus = "pendente" | "pago";

export type CadastroItem = {
  id: string;
  nome: string;
};

export type ProcedimentoFilter = {
  mes?: string;
  hospitalId?: string;
  convenioId?: string;
  status?: ProcedimentoStatus;
  medicoId?: string;
};

export type ProcedimentoCreatePayload = {
  data_procedimento: string;
  hospital_id: string;
  paciente_nome: string;
  cirurgiao_nome: string;
  descricao_procedimento: string;
  convenio_id: string;
  porte: number;
  anestesista_principal_id: string;
  observacoes?: string | null;
  documento_foto_url?: string | null;
};
