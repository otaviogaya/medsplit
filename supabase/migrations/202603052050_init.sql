create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('admin', 'medico', 'faturamento');
  end if;
  if not exists (select 1 from pg_type where typname = 'procedimento_status') then
    create type procedimento_status as enum ('realizado', 'faturado', 'glosa', 'recebido', 'cancelado');
  end if;
  if not exists (select 1 from pg_type where typname = 'repasse_tipo') then
    create type repasse_tipo as enum ('principal', 'auxiliar');
  end if;
  if not exists (select 1 from pg_type where typname = 'repasse_status') then
    create type repasse_status as enum ('pendente', 'pago');
  end if;
  if not exists (select 1 from pg_type where typname = 'glosa_contestacao_status') then
    create type glosa_contestacao_status as enum ('em_aberto', 'recuperada', 'perdida');
  end if;
end $$;

create table if not exists public.users_profile (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  role user_role not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.anestesistas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  nome text not null,
  percentual_padrao_principal numeric(5,4) not null default 0.70 check (percentual_padrao_principal >= 0 and percentual_padrao_principal <= 1),
  percentual_padrao_auxiliar numeric(5,4) not null default 0.30 check (percentual_padrao_auxiliar >= 0 and percentual_padrao_auxiliar <= 1),
  pix text,
  banco text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hospitais (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  cidade text not null,
  contato_faturamento text,
  prazo_pagamento_dias int not null default 30 check (prazo_pagamento_dias >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.convenios (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tabela_honorarios (
  id uuid primary key default gen_random_uuid(),
  convenio_id uuid not null references public.convenios (id) on delete cascade,
  porte int not null check (porte between 1 and 6),
  valor numeric(12,2) not null check (valor >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (convenio_id, porte)
);

create table if not exists public.procedimentos (
  id uuid primary key default gen_random_uuid(),
  data_procedimento date not null,
  hospital_id uuid not null references public.hospitais (id),
  paciente_nome text not null,
  cirurgiao_nome text not null,
  descricao_procedimento text not null,
  convenio_id uuid not null references public.convenios (id),
  porte int not null check (porte between 1 and 6),
  valor_calculado numeric(12,2) not null default 0,
  anestesista_principal_id uuid not null references public.anestesistas (id),
  anestesista_auxiliar_id uuid references public.anestesistas (id),
  status procedimento_status not null default 'realizado',
  data_faturamento date,
  data_recebimento date,
  valor_recebido numeric(12,2),
  valor_glosa numeric(12,2) generated always as (
    case
      when valor_recebido is null then 0
      else greatest(valor_calculado - valor_recebido, 0)
    end
  ) stored,
  observacoes text,
  glosa_contestacao glosa_contestacao_status,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create table if not exists public.repasses (
  id uuid primary key default gen_random_uuid(),
  procedimento_id uuid not null references public.procedimentos (id) on delete cascade,
  medico_id uuid not null references public.anestesistas (id),
  tipo repasse_tipo not null,
  percentual numeric(5,4) not null check (percentual >= 0 and percentual <= 1),
  valor_repassar numeric(12,2) not null check (valor_repassar >= 0),
  status_repasse repasse_status not null default 'pendente',
  data_pagamento date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (procedimento_id, medico_id, tipo)
);

create or replace function public.fn_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.fn_current_role()
returns user_role
language sql
stable
as $$
  select role from public.users_profile where id = auth.uid()
$$;

create or replace function public.fn_is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(public.fn_current_role() = 'admin', false)
$$;

create or replace function public.fn_can_manage_finance()
returns boolean
language sql
stable
as $$
  select coalesce(public.fn_current_role() in ('admin', 'faturamento'), false)
$$;

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

  if v_valor is null then
    raise exception 'Tabela de honorarios nao encontrada para convenio/porte';
  end if;

  new.valor_calculado = v_valor;
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

create or replace function public.fn_sync_repasses()
returns trigger
language plpgsql
as $$
declare
  v_base numeric(12,2);
  v_principal numeric(5,4);
  v_auxiliar numeric(5,4);
begin
  if tg_op = 'DELETE' then
    delete from public.repasses where procedimento_id = old.id;
    return old;
  end if;

  if new.status = 'cancelado' then
    delete from public.repasses where procedimento_id = new.id;
    return new;
  end if;

  select percentual_padrao_principal, percentual_padrao_auxiliar
    into v_principal, v_auxiliar
  from public.anestesistas
  where id = new.anestesista_principal_id;

  if v_principal is null then
    raise exception 'Anestesista principal sem percentual padrao';
  end if;

  v_base := coalesce(new.valor_recebido, new.valor_calculado);

  insert into public.repasses (procedimento_id, medico_id, tipo, percentual, valor_repassar, status_repasse)
  values (new.id, new.anestesista_principal_id, 'principal', v_principal, round(v_base * v_principal, 2), 'pendente')
  on conflict (procedimento_id, medico_id, tipo)
  do update set
    percentual = excluded.percentual,
    valor_repassar = excluded.valor_repassar,
    status_repasse = case
      when public.repasses.status_repasse = 'pago' then 'pago'
      else 'pendente'
    end,
    updated_at = now();

  if new.anestesista_auxiliar_id is not null then
    insert into public.repasses (procedimento_id, medico_id, tipo, percentual, valor_repassar, status_repasse)
    values (new.id, new.anestesista_auxiliar_id, 'auxiliar', v_auxiliar, round(v_base * v_auxiliar, 2), 'pendente')
    on conflict (procedimento_id, medico_id, tipo)
    do update set
      percentual = excluded.percentual,
      valor_repassar = excluded.valor_repassar,
      status_repasse = case
        when public.repasses.status_repasse = 'pago' then 'pago'
        else 'pendente'
      end,
      updated_at = now();
  else
    delete from public.repasses
    where procedimento_id = new.id
      and tipo = 'auxiliar';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_users_profile_touch on public.users_profile;
create trigger trg_users_profile_touch
before update on public.users_profile
for each row execute function public.fn_touch_updated_at();

drop trigger if exists trg_anestesistas_touch on public.anestesistas;
create trigger trg_anestesistas_touch
before update on public.anestesistas
for each row execute function public.fn_touch_updated_at();

drop trigger if exists trg_hospitais_touch on public.hospitais;
create trigger trg_hospitais_touch
before update on public.hospitais
for each row execute function public.fn_touch_updated_at();

drop trigger if exists trg_convenios_touch on public.convenios;
create trigger trg_convenios_touch
before update on public.convenios
for each row execute function public.fn_touch_updated_at();

drop trigger if exists trg_honorarios_touch on public.tabela_honorarios;
create trigger trg_honorarios_touch
before update on public.tabela_honorarios
for each row execute function public.fn_touch_updated_at();

drop trigger if exists trg_repasses_touch on public.repasses;
create trigger trg_repasses_touch
before update on public.repasses
for each row execute function public.fn_touch_updated_at();

drop trigger if exists trg_procedimentos_before on public.procedimentos;
create trigger trg_procedimentos_before
before insert or update on public.procedimentos
for each row execute function public.fn_valida_calculos_procedimento();

drop trigger if exists trg_procedimentos_repasses on public.procedimentos;
create trigger trg_procedimentos_repasses
after insert or update or delete on public.procedimentos
for each row execute function public.fn_sync_repasses();

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
    observacoes
  )
  values (
    (payload->>'data_procedimento')::date,
    (payload->>'hospital_id')::uuid,
    payload->>'paciente_nome',
    payload->>'cirurgiao_nome',
    payload->>'descricao_procedimento',
    (payload->>'convenio_id')::uuid,
    (payload->>'porte')::int,
    (payload->>'anestesista_principal_id')::uuid,
    nullif(payload->>'anestesista_auxiliar_id', '')::uuid,
    payload->>'observacoes'
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.update_status_procedimento(
  p_id uuid,
  p_status procedimento_status,
  p_data_faturamento date default null,
  p_data_recebimento date default null,
  p_valor_recebido numeric default null,
  p_observacoes text default null
)
returns void
language plpgsql
as $$
begin
  update public.procedimentos
  set
    status = p_status,
    data_faturamento = coalesce(p_data_faturamento, data_faturamento),
    data_recebimento = case when p_status = 'recebido' then p_data_recebimento else data_recebimento end,
    valor_recebido = case when p_status = 'recebido' then p_valor_recebido else valor_recebido end,
    observacoes = coalesce(p_observacoes, observacoes)
  where id = p_id;
end;
$$;

create or replace function public.list_procedimentos(
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
  glosa_contestacao glosa_contestacao_status
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
    p.glosa_contestacao
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

create or replace function public.list_repasses(
  p_mes text default null,
  p_status repasse_status default null,
  p_medico_id uuid default null
)
returns table (
  id uuid,
  procedimento_id uuid,
  medico_id uuid,
  medico_nome text,
  tipo repasse_tipo,
  percentual numeric,
  valor_repassar numeric,
  status_repasse repasse_status,
  data_pagamento date,
  data_procedimento date
)
language sql
stable
as $$
  select
    r.id,
    r.procedimento_id,
    r.medico_id,
    a.nome as medico_nome,
    r.tipo,
    r.percentual,
    r.valor_repassar,
    r.status_repasse,
    r.data_pagamento,
    p.data_procedimento
  from public.repasses r
  join public.anestesistas a on a.id = r.medico_id
  join public.procedimentos p on p.id = r.procedimento_id
  where (p_mes is null or to_char(p.data_procedimento, 'YYYY-MM') = p_mes)
    and (p_status is null or r.status_repasse = p_status)
    and (p_medico_id is null or r.medico_id = p_medico_id)
  order by p.data_procedimento desc;
$$;

grant execute on function public.create_procedimento(jsonb) to authenticated;
grant execute on function public.update_status_procedimento(uuid, procedimento_status, date, date, numeric, text) to authenticated;
grant execute on function public.list_procedimentos(text, uuid, uuid, procedimento_status, uuid) to authenticated;
grant execute on function public.list_repasses(text, repasse_status, uuid) to authenticated;

alter table public.users_profile enable row level security;
alter table public.anestesistas enable row level security;
alter table public.hospitais enable row level security;
alter table public.convenios enable row level security;
alter table public.tabela_honorarios enable row level security;
alter table public.procedimentos enable row level security;
alter table public.repasses enable row level security;

drop policy if exists users_profile_select on public.users_profile;
create policy users_profile_select on public.users_profile
for select to authenticated
using (id = auth.uid() or public.fn_can_manage_finance() or public.fn_is_admin());

drop policy if exists users_profile_admin_update on public.users_profile;
create policy users_profile_admin_update on public.users_profile
for all to authenticated
using (public.fn_is_admin())
with check (public.fn_is_admin());

drop policy if exists cadastros_select_anestesistas on public.anestesistas;
create policy cadastros_select_anestesistas on public.anestesistas
for select to authenticated using (true);

drop policy if exists cadastros_admin_anestesistas on public.anestesistas;
create policy cadastros_admin_anestesistas on public.anestesistas
for all to authenticated
using (public.fn_is_admin())
with check (public.fn_is_admin());

drop policy if exists cadastros_select_hospitais on public.hospitais;
create policy cadastros_select_hospitais on public.hospitais
for select to authenticated using (true);

drop policy if exists cadastros_admin_hospitais on public.hospitais;
create policy cadastros_admin_hospitais on public.hospitais
for all to authenticated
using (public.fn_is_admin())
with check (public.fn_is_admin());

drop policy if exists cadastros_select_convenios on public.convenios;
create policy cadastros_select_convenios on public.convenios
for select to authenticated using (true);

drop policy if exists cadastros_admin_convenios on public.convenios;
create policy cadastros_admin_convenios on public.convenios
for all to authenticated
using (public.fn_is_admin())
with check (public.fn_is_admin());

drop policy if exists cadastros_select_honorarios on public.tabela_honorarios;
create policy cadastros_select_honorarios on public.tabela_honorarios
for select to authenticated using (true);

drop policy if exists cadastros_admin_honorarios on public.tabela_honorarios;
create policy cadastros_admin_honorarios on public.tabela_honorarios
for all to authenticated
using (public.fn_is_admin())
with check (public.fn_is_admin());

drop policy if exists procedimentos_select on public.procedimentos;
create policy procedimentos_select on public.procedimentos
for select to authenticated
using (
  public.fn_can_manage_finance()
  or public.fn_is_admin()
  or exists (
    select 1
    from public.anestesistas a
    where a.user_id = auth.uid()
      and (a.id = procedimentos.anestesista_principal_id or a.id = procedimentos.anestesista_auxiliar_id)
  )
);

drop policy if exists procedimentos_insert on public.procedimentos;
create policy procedimentos_insert on public.procedimentos
for insert to authenticated
with check (
  public.fn_is_admin()
  or public.fn_can_manage_finance()
  or exists (
    select 1
    from public.anestesistas a
    where a.user_id = auth.uid()
      and (a.id = anestesista_principal_id or a.id = anestesista_auxiliar_id)
  )
);

drop policy if exists procedimentos_update on public.procedimentos;
create policy procedimentos_update on public.procedimentos
for update to authenticated
using (
  public.fn_is_admin()
  or public.fn_can_manage_finance()
  or exists (
    select 1
    from public.anestesistas a
    where a.user_id = auth.uid()
      and (a.id = procedimentos.anestesista_principal_id or a.id = procedimentos.anestesista_auxiliar_id)
  )
)
with check (
  public.fn_is_admin()
  or public.fn_can_manage_finance()
  or exists (
    select 1
    from public.anestesistas a
    where a.user_id = auth.uid()
      and (a.id = anestesista_principal_id or a.id = anestesista_auxiliar_id)
  )
);

drop policy if exists repasses_select on public.repasses;
create policy repasses_select on public.repasses
for select to authenticated
using (
  public.fn_is_admin()
  or public.fn_can_manage_finance()
  or exists (
    select 1 from public.anestesistas a where a.id = repasses.medico_id and a.user_id = auth.uid()
  )
);

drop policy if exists repasses_update on public.repasses;
create policy repasses_update on public.repasses
for update to authenticated
using (public.fn_is_admin())
with check (public.fn_is_admin());
