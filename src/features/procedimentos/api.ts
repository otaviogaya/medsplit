import { supabase } from "../../lib/supabase";
import { ProcedimentoCreatePayload, ProcedimentoFilter, ProcedimentoStatus } from "../../types/app";

const DOCUMENTOS_BUCKET = "procedimentos-documentos";

export async function listProcedimentos(filters: ProcedimentoFilter) {
  const { data, error } = await supabase.rpc("list_procedimentos", {
    p_mes: filters.mes ?? null,
    p_hospital_id: filters.hospitalId ?? null,
    p_convenio_id: filters.convenioId ?? null,
    p_status: filters.status ?? null,
    p_medico_id: filters.medicoId ?? null,
  });
  if (error) throw error;
  return data ?? [];
}

export async function createProcedimento(payload: ProcedimentoCreatePayload) {
  const { data, error } = await supabase.rpc("create_procedimento", {
    payload,
  });
  if (error) throw error;
  return data;
}

export async function uploadProcedimentoDocumento(localUri: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user?.id) throw userError ?? new Error("Usuario nao autenticado.");

  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  const extension = localUri.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(extension) ? extension : "jpg";
  const path = `${userData.user.id}/${Date.now()}.${safeExt}`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTOS_BUCKET)
    .upload(path, arrayBuffer, {
      contentType: `image/${safeExt === "jpg" ? "jpeg" : safeExt}`,
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage.from(DOCUMENTOS_BUCKET).getPublicUrl(path);
  return publicData.publicUrl;
}

type UpdateStatusInput = {
  id: string;
  status: ProcedimentoStatus;
  data_faturamento?: string | null;
  data_recebimento?: string | null;
  valor_recebido?: number | null;
  observacoes?: string | null;
  forma_pagamento?: "dinheiro" | "pix" | "cartao" | null;
};

export async function updateStatusProcedimento(input: UpdateStatusInput) {
  const { data, error } = await supabase.rpc("update_status_procedimento", {
    p_id: input.id,
    p_status: input.status,
    p_data_faturamento: input.data_faturamento ?? null,
    p_data_recebimento: input.data_recebimento ?? null,
    p_valor_recebido: input.valor_recebido ?? null,
    p_observacoes: input.observacoes ?? null,
    p_forma_pagamento: input.forma_pagamento ?? null,
  });
  if (error) throw error;
  return data;
}

export async function updatePagamentoProcedimento(
  id: string,
  pagamentoStatus: "nao_pago" | "pago",
) {
  const { error } = await supabase.rpc("update_pagamento_procedimento", {
    p_id: id,
    p_pagamento_status: pagamentoStatus,
  });
  if (error) throw error;
}

export async function updateValorCalculado(id: string, valor: number) {
  const { error } = await supabase.rpc("update_valor_calculado_procedimento", {
    p_id: id,
    p_valor: valor,
  });
  if (error) throw error;
}

export async function updateGlosaInfo(
  id: string,
  observacoes: string,
  glosaContestacao: "em_aberto" | "recuperada" | "perdida",
) {
  const { error } = await supabase
    .from("procedimentos")
    .update({ observacoes, glosa_contestacao: glosaContestacao })
    .eq("id", id);
  if (error) throw error;
}
