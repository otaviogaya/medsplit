create table if not exists public.cirurgioes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cirurgioes enable row level security;

drop policy if exists cirurgioes_select on public.cirurgioes;
create policy cirurgioes_select on public.cirurgioes
for select to authenticated
using (true);

drop policy if exists cirurgioes_insert on public.cirurgioes;
create policy cirurgioes_insert on public.cirurgioes
for insert to authenticated
with check (true);

drop policy if exists cirurgioes_update on public.cirurgioes;
create policy cirurgioes_update on public.cirurgioes
for update to authenticated
using (public.fn_is_admin())
with check (public.fn_is_admin());

drop trigger if exists trg_cirurgioes_touch on public.cirurgioes;
create trigger trg_cirurgioes_touch
before update on public.cirurgioes
for each row execute function public.fn_touch_updated_at();

alter table public.procedimentos
  add column if not exists documento_foto_url text;

create or replace function public.fn_valida_calculos_procedimento()
returns trigger
language plpgsql
as $$
declare
  v_valor numeric(12,2);
begin
  select th.valor
    into v_valor
  from public.tabela_honorarios th
  where th.convenio_id = new.convenio_id
    and th.porte = new.porte;

  -- Se nao houver honorario cadastrado, permite seguir com valor zerado.
  new.valor_calculado = coalesce(v_valor, 0);
  new.updated_by = auth.uid();

  if new.status = 'recebido' then
    if new.data_recebimento is null or new.valor_recebido is null then
      raise exception 'Status recebido exige data_recebimento e valor_recebido';
    end if;
  end if;

  if new.status = 'faturado' and new.data_faturamento is null then
    new.data_faturamento = current_date;
  end if;

  return new;
end;
$$;

create or replace function public.create_procedimento(payload jsonb)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into public.procedimentos (
    data_procedimento,
    hospital_id,
    paciente_nome,
    cirurgiao_nome,
    descricao_procedimento,
    convenio_id,
    porte,
    anestesista_principal_id,
    anestesista_auxiliar_id,
    observacoes,
    documento_foto_url
  )
  values (
    (payload->>'data_procedimento')::date,
    (payload->>'hospital_id')::uuid,
    payload->>'paciente_nome',
    payload->>'cirurgiao_nome',
    payload->>'descricao_procedimento',
    (payload->>'convenio_id')::uuid,
    coalesce((payload->>'porte')::int, 1),
    (payload->>'anestesista_principal_id')::uuid,
    null,
    payload->>'observacoes',
    payload->>'documento_foto_url'
  )
  returning id into v_id;

  return v_id;
end;
$$;

drop function if exists public.list_procedimentos(text, uuid, uuid, procedimento_status, uuid);

create function public.list_procedimentos(
  p_mes text default null,
  p_hospital_id uuid default null,
  p_convenio_id uuid default null,
  p_status procedimento_status default null,
  p_medico_id uuid default null
)
returns table (
  id uuid,
  data_procedimento date,
  hospital_id uuid,
  hospital_nome text,
  paciente_nome text,
  cirurgiao_nome text,
  descricao_procedimento text,
  convenio_id uuid,
  convenio_nome text,
  porte int,
  valor_calculado numeric,
  valor_recebido numeric,
  valor_glosa numeric,
  status procedimento_status,
  data_faturamento date,
  data_recebimento date,
  anestesista_principal_id uuid,
  anestesista_principal_nome text,
  anestesista_auxiliar_id uuid,
  anestesista_auxiliar_nome text,
  observacoes text,
  glosa_contestacao glosa_contestacao_status,
  documento_foto_url text
)
language sql
stable
as $$
  select
    p.id,
    p.data_procedimento,
    p.hospital_id,
    h.nome as hospital_nome,
    p.paciente_nome,
    p.cirurgiao_nome,
    p.descricao_procedimento,
    p.convenio_id,
    c.nome as convenio_nome,
    p.porte,
    p.valor_calculado,
    p.valor_recebido,
    p.valor_glosa,
    p.status,
    p.data_faturamento,
    p.data_recebimento,
    p.anestesista_principal_id,
    apr.nome as anestesista_principal_nome,
    p.anestesista_auxiliar_id,
    aau.nome as anestesista_auxiliar_nome,
    p.observacoes,
    p.glosa_contestacao,
    p.documento_foto_url
  from public.procedimentos p
  join public.hospitais h on h.id = p.hospital_id
  join public.convenios c on c.id = p.convenio_id
  join public.anestesistas apr on apr.id = p.anestesista_principal_id
  left join public.anestesistas aau on aau.id = p.anestesista_auxiliar_id
  where (p_mes is null or to_char(p.data_procedimento, 'YYYY-MM') = p_mes)
    and (p_hospital_id is null or p.hospital_id = p_hospital_id)
    and (p_convenio_id is null or p.convenio_id = p_convenio_id)
    and (p_status is null or p.status = p_status)
    and (
      p_medico_id is null
      or p.anestesista_principal_id = p_medico_id
      or p.anestesista_auxiliar_id = p_medico_id
    )
  order by p.data_procedimento desc;
$$;

grant execute on function public.list_procedimentos(text, uuid, uuid, procedimento_status, uuid) to authenticated;
