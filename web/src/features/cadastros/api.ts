import { supabase } from "@/src/lib/supabase";
import { CadastroItem } from "@/src/types/app";

async function getCurrentEquipeId(): Promise<string | null> {
  const { data, error } = await supabase.rpc("fn_current_equipe_id");
  if (error) return null;
  return data as string | null;
}

export async function listHospitais() {
  const { data, error } = await supabase.from("hospitais").select("id,nome").order("nome");
  if (error) throw error;
  return (data ?? []) as CadastroItem[];
}

export async function listConvenios() {
  const { data, error } = await supabase.from("convenios").select("id,nome").order("nome");
  if (error) throw error;
  return (data ?? []) as CadastroItem[];
}

export async function listAnestesistas() {
  const { data, error } = await supabase.from("anestesistas").select("id,nome").order("nome");
  if (error) throw error;
  return (data ?? []) as CadastroItem[];
}

export async function listCirurgioes() {
  const { data, error } = await supabase.from("cirurgioes").select("id,nome").order("nome");
  if (error) throw error;
  return (data ?? []) as CadastroItem[];
}

export async function getOrCreateConvenioByNome(nome: string) {
  const normalized = nome.trim();
  const { data: existing, error: selectError } = await supabase
    .from("convenios")
    .select("id,nome")
    .ilike("nome", normalized)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing;

  const equipeId = await getCurrentEquipeId();
  const { data: created, error: insertError } = await supabase
    .from("convenios")
    .insert({ nome: normalized, equipe_id: equipeId })
    .select("id,nome")
    .single();
  if (insertError) throw insertError;
  return created;
}

export async function getOrCreateCirurgiaoByNome(nome: string) {
  const normalized = nome.trim();
  const { data: existing, error: selectError } = await supabase
    .from("cirurgioes")
    .select("id,nome")
    .ilike("nome", normalized)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing;

  const equipeId = await getCurrentEquipeId();
  const { data: created, error: insertError } = await supabase
    .from("cirurgioes")
    .insert({ nome: normalized, equipe_id: equipeId })
    .select("id,nome")
    .single();
  if (insertError) throw insertError;
  return created;
}

export async function findAnestesistaByUserId(userId: string) {
  const { data, error } = await supabase
    .from("anestesistas")
    .select("id,nome")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as CadastroItem | null;
}

export async function createHospital(payload: {
  nome: string;
  cidade: string;
  contato_faturamento?: string;
  prazo_pagamento_dias?: number;
  equipe_id?: string | null;
}) {
  const equipeId = payload.equipe_id ?? (await getCurrentEquipeId());
  const { error } = await supabase.from("hospitais").insert({ ...payload, equipe_id: equipeId });
  if (error) throw error;
}

export async function createConvenio(payload: { nome: string; equipe_id?: string | null }) {
  const equipeId = payload.equipe_id ?? (await getCurrentEquipeId());
  const { error } = await supabase.from("convenios").insert({ ...payload, equipe_id: equipeId });
  if (error) throw error;
}

export async function createAnestesista(payload: {
  nome: string;
  percentual_padrao_principal?: number;
  percentual_padrao_auxiliar?: number;
  pix?: string | null;
  banco?: string | null;
  equipe_id?: string | null;
}) {
  const equipeId = payload.equipe_id ?? (await getCurrentEquipeId());
  const { error } = await supabase.from("anestesistas").insert({ ...payload, equipe_id: equipeId });
  if (error) throw error;
}

export async function createHonorario(payload: {
  convenio_id: string;
  porte: number;
  valor: number;
}) {
  const { error } = await supabase.from("tabela_honorarios").insert(payload);
  if (error) throw error;
}
