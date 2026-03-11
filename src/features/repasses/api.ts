import { supabase } from "../../lib/supabase";

type RepassesFilter = {
  mes?: string;
  status?: "pendente" | "pago";
  medicoId?: string;
};

export async function listRepasses(filters: RepassesFilter) {
  const { data, error } = await supabase.rpc("list_repasses", {
    p_mes: filters.mes ?? null,
    p_status: filters.status ?? null,
    p_medico_id: filters.medicoId ?? null,
  });
  if (error) throw error;
  return data ?? [];
}

export async function marcarRepasseComoPago(id: string, dataPagamento: string) {
  const { error } = await supabase
    .from("repasses")
    .update({ status_repasse: "pago", data_pagamento: dataPagamento })
    .eq("id", id);
  if (error) throw error;
}
