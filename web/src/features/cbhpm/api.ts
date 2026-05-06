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

const CBHPM_SELECT =
  "id, codigo, descricao, porte, porte_anestesico, grupo_nome, subgrupo_nome";

/** Primeiros itens (por código) para abrir a lista ao clicar no campo. */
export async function listCbhpmProcedimentosBrowse(limit = 50): Promise<CbhpmProcedimento[]> {
  const { data, error } = await supabase
    .from("cbhpm_procedimentos")
    .select(CBHPM_SELECT)
    .order("codigo")
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as CbhpmProcedimento[];
}

export async function searchCbhpmProcedimentos(
  query: string,
): Promise<CbhpmProcedimento[]> {
  const t = query.trim();
  if (t.length < 1) return [];

  const isNumeric = /^\d+$/.test(t);

  let q = supabase.from("cbhpm_procedimentos").select(CBHPM_SELECT);

  if (isNumeric) {
    q = q.ilike("codigo", `${t}%`);
  } else if (t.length === 1) {
    q = q.ilike("descricao", `${t}%`);
  } else {
    q = q.ilike("descricao", `%${t}%`);
  }

  const { data, error } = await q.order("descricao").limit(30);

  if (error) throw error;
  return (data ?? []) as CbhpmProcedimento[];
}
