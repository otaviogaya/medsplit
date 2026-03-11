do $$
begin
  if not exists (select 1 from pg_type where typname = 'pagamento_status') then
    create type pagamento_status as enum ('nao_pago', 'pago');
  end if;
end $$;

alter table public.procedimentos
  add column if not exists pagamento_status pagamento_status not null default 'nao_pago';

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
  pagamento_status pagamento_status,
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
    p.pagamento_status,
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

create or replace function public.update_pagamento_procedimento(
  p_id uuid,
  p_pagamento_status pagamento_status
)
returns void
language plpgsql
as $$
begin
  if not public.fn_can_manage_finance() and not public.fn_is_admin() then
    raise exception 'Sem permissao para atualizar pagamento';
  end if;

  update public.procedimentos
  set pagamento_status = p_pagamento_status
  where id = p_id;
end;
$$;

grant execute on function public.update_pagamento_procedimento(uuid, pagamento_status) to authenticated;
