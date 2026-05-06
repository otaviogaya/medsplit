import { supabase } from "@/src/lib/supabase";
import type { ProcedimentoStatus } from "@/src/types/app";

export type AgendaEvento = {
  id: string;
  paciente_nome: string;
  cirurgiao_nome: string;
  hospital_id: string;
  hospital_nome: string;
  convenio_nome: string;
  anestesista_principal_id: string;
  anestesista_principal_nome: string;
  agendado_inicio: string;
  agendado_fim: string | null;
  agendado_local: string | null;
  agendado_observacoes: string | null;
  descricao_procedimento: string;
  codigo_cbhpm: string | null;
  porte_anestesico: string | null;
  status: ProcedimentoStatus;
  pagamento_status: "pago" | "nao_pago";
  numero_lancamento: number;
  data_procedimento: string;
  feriado: boolean;
  adicional_fim_semana: boolean;
  adicional_noturno: boolean;
};

export type AgendaFilters = {
  inicio: Date;
  fim: Date;
  hospitalId?: string;
  anestesistaId?: string;
};

export async function listAgenda(filters: AgendaFilters): Promise<AgendaEvento[]> {
  const { data, error } = await supabase.rpc("list_agenda", {
    p_inicio: filters.inicio.toISOString(),
    p_fim: filters.fim.toISOString(),
    p_hospital_id: filters.hospitalId ?? null,
    p_anestesista_id: filters.anestesistaId ?? null,
  });
  if (error) throw error;
  return (data ?? []) as AgendaEvento[];
}

export async function updateAgendamento(
  id: string,
  inicio: Date | null,
  fim: Date | null,
  local: string | null,
  observacoes: string | null,
  feriado: boolean | null = null,
) {
  const { error } = await supabase.rpc("update_agendamento_procedimento", {
    p_id: id,
    p_inicio: inicio ? inicio.toISOString() : null,
    p_fim: fim ? fim.toISOString() : null,
    p_local: local,
    p_observacoes: observacoes,
    p_feriado: feriado,
  });
  if (error) throw error;
}

export async function clearAgendamento(id: string) {
  await updateAgendamento(id, null, null, null, null, false);
}
