import { supabase } from "@/src/lib/supabase";

export type EquipeRow = {
  id: string;
  nome: string;
  created_at: string;
  membros_count: number;
};

export type EquipeMembro = {
  id: string;
  nome: string;
  role: string;
  ativo: boolean;
  email?: string;
};

export async function listEquipes(): Promise<EquipeRow[]> {
  const { data, error } = await supabase.rpc("list_equipes");
  if (error) throw error;
  return (data ?? []) as EquipeRow[];
}

export async function createEquipe(nome: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_equipe", { p_nome: nome });
  if (error) throw error;
  return data as string;
}

export async function listEquipeMembros(equipeId: string): Promise<EquipeMembro[]> {
  const { data, error } = await supabase
    .from("users_profile")
    .select("id, nome, role, ativo")
    .eq("equipe_id", equipeId)
    .order("nome");
  if (error) throw error;
  return (data ?? []) as EquipeMembro[];
}
