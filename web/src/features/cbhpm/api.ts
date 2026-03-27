import { supabase } from "@/src/lib/supabase";

export type CbhpmProcedimento = {
  id: string;
  codigo: string;
  descricao: string;
  porte: string | null;
  porte_anestesico: string | null;
  grupo_nome: string | null;
  subgrupo_nome: string | null;
};

export async function searchCbhpmProcedimentos(
  query: string,
): Promise<CbhpmProcedimento[]> {
  if (!query || query.length < 2) return [];

  const isNumeric = /^\d+$/.test(query);

  let q = supabase
    .from("cbhpm_procedimentos")
    .select("id, codigo, descricao, porte, porte_anestesico, grupo_nome, subgrupo_nome");

  if (isNumeric) {
    q = q.ilike("codigo", `${query}%`);
  } else {
    q = q.ilike("descricao", `%${query}%`);
  }

  const { data, error } = await q.order("descricao").limit(30);

  if (error) throw error;
  return (data ?? []) as CbhpmProcedimento[];
}
