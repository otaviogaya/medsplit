-- ============================================================
-- Multi-tenant: isolamento por equipes
-- ============================================================

-- 1. Enum superadmin
alter type user_role add value if not exists 'superadmin';

-- 2. Tabela equipes
create table if not exists public.equipes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_equipes_touch on public.equipes;
create trigger trg_equipes_touch
before update on public.equipes
for each row execute function public.fn_touch_updated_at();

alter table public.equipes enable row level security;

-- 3. Equipe default para dados existentes
insert into public.equipes (id, nome)
values ('00000000-0000-0000-0000-000000000001', 'Equipe Padrao')
on conflict (id) do nothing;

-- 4. Adicionar equipe_id a todas as tabelas
alter table public.users_profile
  add column if not exists equipe_id uuid references public.equipes(id);

alter table public.anestesistas
  add column if not exists equipe_id uuid references public.equipes(id);

alter table public.hospitais
  add column if not exists equipe_id uuid references public.equipes(id);

alter table public.convenios
  add column if not exists equipe_id uuid references public.equipes(id);

alter table public.cirurgioes
  add column if not exists equipe_id uuid references public.equipes(id);

alter table public.procedimentos
  add column if not exists equipe_id uuid references public.equipes(id);

alter table public.repasses
  add column if not exists equipe_id uuid references public.equipes(id);

-- 5. Migrar dados existentes para equipe padrao
update public.users_profile set equipe_id = '00000000-0000-0000-0000-000000000001' where equipe_id is null;
update public.anestesistas set equipe_id = '00000000-0000-0000-0000-000000000001' where equipe_id is null;
update public.hospitais set equipe_id = '00000000-0000-0000-0000-000000000001' where equipe_id is null;
update public.convenios set equipe_id = '00000000-0000-0000-0000-000000000001' where equipe_id is null;
update public.cirurgioes set equipe_id = '00000000-0000-0000-0000-000000000001' where equipe_id is null;
update public.procedimentos set equipe_id = '00000000-0000-0000-0000-000000000001' where equipe_id is null;
update public.repasses set equipe_id = '00000000-0000-0000-0000-000000000001' where equipe_id is null;

-- 6. NOT NULL (exceto users_profile que permite NULL para superadmin)
alter table public.anestesistas alter column equipe_id set not null;
alter table public.hospitais alter column equipe_id set not null;
alter table public.convenios alter column equipe_id set not null;
alter table public.cirurgioes alter column equipe_id set not null;
alter table public.procedimentos alter column equipe_id set not null;
alter table public.repasses alter column equipe_id set not null;

-- 7. Ajustar UNIQUE constraints para serem por equipe
alter table public.hospitais drop constraint if exists hospitais_nome_key;
alter table public.hospitais add constraint hospitais_nome_equipe_key unique (nome, equipe_id);

alter table public.convenios drop constraint if exists convenios_nome_key;
alter table public.convenios add constraint convenios_nome_equipe_key unique (nome, equipe_id);

alter table public.cirurgioes drop constraint if exists cirurgioes_nome_key;
alter table public.cirurgioes add constraint cirurgioes_nome_equipe_key unique (nome, equipe_id);

-- ============================================================
-- Helper functions
-- ============================================================

create or replace function public.fn_current_equipe_id()
returns uuid
language sql
stable
security definer
as $$
  select equipe_id from public.users_profile where id = auth.uid()
$$;

create or replace function public.fn_is_superadmin()
returns boolean
language sql
stable
security definer
as $$
  select coalesce(
    (select role from public.users_profile where id = auth.uid()) = 'superadmin',
    false
  )
$$;

create or replace function public.fn_current_role()
returns user_role
language sql
stable
security definer
as $$
  select role from public.users_profile where id = auth.uid()
$$;

create or replace function public.fn_is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(public.fn_current_role() in ('admin', 'superadmin'), false)
$$;

create or replace function public.fn_can_manage_finance()
returns boolean
language sql
stable
as $$
  select coalesce(public.fn_current_role() in ('admin', 'faturamento', 'superadmin'), false)
$$;

-- ============================================================
-- RLS: equipes
-- ============================================================
drop policy if exists equipes_select on public.equipes;
create policy equipes_select on public.equipes
for select to authenticated
using (
  public.fn_is_superadmin()
  or id = public.fn_current_equipe_id()
);

drop policy if exists equipes_admin on public.equipes;
create policy equipes_admin on public.equipes
for all to authenticated
using (public.fn_is_superadmin())
with check (public.fn_is_superadmin());

-- ============================================================
-- RLS: users_profile
-- ============================================================
drop policy if exists users_profile_select on public.users_profile;
create policy users_profile_select on public.users_profile
for select to authenticated
using (
  public.fn_is_superadmin()
  or id = auth.uid()
  or (equipe_id = public.fn_current_equipe_id() and (public.fn_can_manage_finance() or public.fn_is_admin()))
);

drop policy if exists users_profile_admin_update on public.users_profile;
create policy users_profile_admin_update on public.users_profile
for all to authenticated
using (
  public.fn_is_superadmin()
  or (equipe_id = public.fn_current_equipe_id() and public.fn_is_admin())
)
with check (
  public.fn_is_superadmin()
  or (equipe_id = public.fn_current_equipe_id() and public.fn_is_admin())
);

-- ============================================================
-- RLS: anestesistas
-- ============================================================
drop policy if exists cadastros_select_anestesistas on public.anestesistas;
create policy cadastros_select_anestesistas on public.anestesistas
for select to authenticated
using (
  public.fn_is_superadmin()
  or equipe_id = public.fn_current_equipe_id()
);

drop policy if exists cadastros_admin_anestesistas on public.anestesistas;
create policy cadastros_admin_anestesistas on public.anestesistas
for all to authenticated
using (
  public.fn_is_superadmin()
  or (equipe_id = public.fn_current_equipe_id() and public.fn_is_admin())
)
with check (
  public.fn_is_superadmin()
  or (equipe_id = public.fn_current_equipe_id() and public.fn_is_admin())
);

-- ============================================================
-- RLS: hospitais
-- ============================================================
drop policy if exists cadastros_select_hospitais on public.hospitais;
create policy cadastros_select_hospitais on public.hospitais
for select to authenticated
using (
  public.fn_is_superadmin()
  or equipe_id = public.fn_current_equipe_id()
);

drop policy if exists cadastros_admin_hospitais on public.hospitais;
create policy cadastros_admin_hospitais on public.hospitais
for all to authenticated
using (
  public.fn_is_superadmin()
  or (equipe_id = public.fn_current_equipe_id() and public.fn_is_admin())
)
with check (
  public.fn_is_superadmin()
  or (equipe_id = public.fn_current_equipe_id() and public.fn_is_admin())
);

-- ============================================================
-- RLS: convenios
-- ============================================================
drop policy if exists cadastros_select_convenios on public.convenios;
create policy cadastros_select_convenios on public.convenios
for select to authenticated
using (
  public.fn_is_superadmin()
  or equipe_id = public.fn_current_equipe_id()
);

drop policy if exists cadastros_admin_convenios on public.convenios;
create policy cadastros_admin_convenios on public.convenios
for all to authenticated
using (
  public.fn_is_superadmin()
  or (equipe_id = public.fn_current_equipe_id() and public.fn_is_admin())
)
with check (
  public.fn_is_superadmin()
  or (equipe_id = public.fn_current_equipe_id() and public.fn_is_admin())
);

-- ============================================================
-- RLS: tabela_honorarios (herda equipe via convenio)
-- ============================================================
drop policy if exists cadastros_select_honorarios on public.tabela_honorarios;
create policy cadastros_select_honorarios on public.tabela_honorarios
for select to authenticated
using (
  public.fn_is_superadmin()
  or exists (
    select 1 from public.convenios c
    where c.id = tabela_honorarios.convenio_id
      and c.equipe_id = public.fn_current_equipe_id()
  )
);

drop policy if exists cadastros_admin_honorarios on public.tabela_honorarios;
create policy cadastros_admin_honorarios on public.tabela_honorarios
for all to authenticated
using (
  public.fn_is_superadmin()
  or (public.fn_is_admin() and exists (
    select 1 from public.convenios c
    where c.id = tabela_honorarios.convenio_id
      and c.equipe_id = public.fn_current_equipe_id()
  ))
)
with check (
  public.fn_is_superadmin()
  or (public.fn_is_admin() and exists (
    select 1 from public.convenios c
    where c.id = tabela_honorarios.convenio_id
      and c.equipe_id = public.fn_current_equipe_id()
  ))
);

-- ============================================================
-- RLS: cirurgioes
-- ============================================================
drop policy if exists cirurgioes_select on public.cirurgioes;
create policy cirurgioes_select on public.cirurgioes
for select to authenticated
using (
  public.fn_is_superadmin()
  or equipe_id = public.fn_current_equipe_id()
);

drop policy if exists cirurgioes_insert on public.cirurgioes;
create policy cirurgioes_insert on public.cirurgioes
for insert to authenticated
with check (
  public.fn_is_superadmin()
  or equipe_id = public.fn_current_equipe_id()
);

drop policy if exists cirurgioes_update on public.cirurgioes;
create policy cirurgioes_update on public.cirurgioes
for update to authenticated
using (
  public.fn_is_superadmin()
  or (equipe_id = public.fn_current_equipe_id() and public.fn_is_admin())
)
with check (
  public.fn_is_superadmin()
  or (equipe_id = public.fn_current_equipe_id() and public.fn_is_admin())
);

-- ============================================================
-- RLS: procedimentos
-- ============================================================
drop policy if exists procedimentos_select on public.procedimentos;
create policy procedimentos_select on public.procedimentos
for select to authenticated
using (
  public.fn_is_superadmin()
  or (
    equipe_id = public.fn_current_equipe_id()
    and (
      public.fn_can_manage_finance()
      or public.fn_is_admin()
      or exists (
        select 1 from public.anestesistas a
        where a.user_id = auth.uid()
          and (a.id = procedimentos.anestesista_principal_id or a.id = procedimentos.anestesista_auxiliar_id)
      )
    )
  )
);

drop policy if exists procedimentos_insert on public.procedimentos;
create policy procedimentos_insert on public.procedimentos
for insert to authenticated
with check (
  public.fn_is_superadmin()
  or (
    equipe_id = public.fn_current_equipe_id()
    and (
      public.fn_is_admin()
      or public.fn_can_manage_finance()
      or exists (
        select 1 from public.anestesistas a
        where a.user_id = auth.uid()
          and (a.id = anestesista_principal_id or a.id = anestesista_auxiliar_id)
      )
    )
  )
);

drop policy if exists procedimentos_update on public.procedimentos;
create policy procedimentos_update on public.procedimentos
for update to authenticated
using (
  public.fn_is_superadmin()
  or (
    equipe_id = public.fn_current_equipe_id()
    and (
      public.fn_is_admin()
      or public.fn_can_manage_finance()
      or exists (
        select 1 from public.anestesistas a
        where a.user_id = auth.uid()
          and (a.id = procedimentos.anestesista_principal_id or a.id = procedimentos.anestesista_auxiliar_id)
      )
    )
  )
)
with check (
  public.fn_is_superadmin()
  or (
    equipe_id = public.fn_current_equipe_id()
    and (
      public.fn_is_admin()
      or public.fn_can_manage_finance()
      or exists (
        select 1 from public.anestesistas a
        where a.user_id = auth.uid()
          and (a.id = anestesista_principal_id or a.id = anestesista_auxiliar_id)
      )
    )
  )
);

-- ============================================================
-- RLS: repasses
-- ============================================================
drop policy if exists repasses_select on public.repasses;
create policy repasses_select on public.repasses
for select to authenticated
using (
  public.fn_is_superadmin()
  or (
    equipe_id = public.fn_current_equipe_id()
    and (
      public.fn_is_admin()
      or public.fn_can_manage_finance()
      or exists (
        select 1 from public.anestesistas a where a.id = repasses.medico_id and a.user_id = auth.uid()
      )
    )
  )
);

drop policy if exists repasses_insert on public.repasses;
create policy repasses_insert on public.repasses
for insert to authenticated
with check (
  public.fn_is_superadmin()
  or equipe_id = public.fn_current_equipe_id()
);

drop policy if exists repasses_update on public.repasses;
create policy repasses_update on public.repasses
for update to authenticated
using (
  public.fn_is_superadmin()
  or (equipe_id = public.fn_current_equipe_id() and public.fn_is_admin())
)
with check (
  public.fn_is_superadmin()
  or (equipe_id = public.fn_current_equipe_id() and public.fn_is_admin())
);

drop policy if exists repasses_delete on public.repasses;
create policy repasses_delete on public.repasses
for delete to authenticated
using (
  public.fn_is_superadmin()
  or (equipe_id = public.fn_current_equipe_id() and (public.fn_is_admin() or public.fn_can_manage_finance()))
);

-- ============================================================
-- RPCs: reescrever com filtro de equipe
-- ============================================================

-- create_procedimento
create or replace function public.create_procedimento(payload jsonb)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_equipe_id uuid;
begin
  v_equipe_id := coalesce(
    (payload->>'equipe_id')::uuid,
    public.fn_current_equipe_id()
  );

  if v_equipe_id is null then
    raise exception 'Equipe nao definida para o usuario.';
  end if;

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
    documento_foto_url,
    equipe_id
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
    payload->>'observacoes',
    payload->>'documento_foto_url',
    v_equipe_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- list_procedimentos
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
  forma_pagamento forma_pagamento_tipo,
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
    p.forma_pagamento,
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
    and (
      public.fn_is_superadmin()
      or p.equipe_id = public.fn_current_equipe_id()
    )
  order by p.data_procedimento desc;
$$;

-- list_repasses
drop function if exists public.list_repasses(text, repasse_status, uuid);
create function public.list_repasses(
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
    and (
      public.fn_is_superadmin()
      or r.equipe_id = public.fn_current_equipe_id()
    )
  order by p.data_procedimento desc;
$$;

-- update_status_procedimento
drop function if exists public.update_status_procedimento(uuid, procedimento_status, date, date, numeric, text, forma_pagamento_tipo);
create function public.update_status_procedimento(
  p_id uuid,
  p_status procedimento_status,
  p_data_faturamento date default null,
  p_data_recebimento date default null,
  p_valor_recebido numeric default null,
  p_observacoes text default null,
  p_forma_pagamento forma_pagamento_tipo default null
)
returns void
language plpgsql
as $$
begin
  if p_status = 'recebido' and p_forma_pagamento is null then
    raise exception 'Informe a forma de pagamento para marcar como recebido';
  end if;

  update public.procedimentos
  set
    status = p_status,
    data_faturamento = coalesce(p_data_faturamento, data_faturamento),
    data_recebimento = case when p_status = 'recebido' then p_data_recebimento else data_recebimento end,
    valor_recebido = case when p_status = 'recebido' then p_valor_recebido else valor_recebido end,
    forma_pagamento = case when p_status = 'recebido' then p_forma_pagamento else forma_pagamento end,
    observacoes = coalesce(p_observacoes, observacoes)
  where id = p_id
    and (public.fn_is_superadmin() or equipe_id = public.fn_current_equipe_id());
end;
$$;

-- update_pagamento_procedimento
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
  where id = p_id
    and (public.fn_is_superadmin() or equipe_id = public.fn_current_equipe_id());
end;
$$;

-- update_valor_calculado_procedimento
create or replace function public.update_valor_calculado_procedimento(
  p_id uuid,
  p_valor numeric
)
returns void
language plpgsql
as $$
begin
  if not public.fn_can_manage_finance() and not public.fn_is_admin() then
    raise exception 'Sem permissao para atualizar valor calculado';
  end if;

  update public.procedimentos
  set valor_calculado = greatest(p_valor, 0)
  where id = p_id
    and (public.fn_is_superadmin() or equipe_id = public.fn_current_equipe_id());
end;
$$;

-- ============================================================
-- Trigger: fn_sync_repasses (copiar equipe_id do procedimento)
-- ============================================================
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

  insert into public.repasses (procedimento_id, medico_id, tipo, percentual, valor_repassar, status_repasse, equipe_id)
  values (new.id, new.anestesista_principal_id, 'principal'::repasse_tipo, v_principal, round(v_base * v_principal, 2), 'pendente'::repasse_status, new.equipe_id)
  on conflict (procedimento_id, medico_id, tipo)
  do update set
    percentual = excluded.percentual,
    valor_repassar = excluded.valor_repassar,
    status_repasse = case
      when public.repasses.status_repasse = 'pago'::repasse_status then 'pago'::repasse_status
      else 'pendente'::repasse_status
    end,
    equipe_id = excluded.equipe_id,
    updated_at = now();

  if new.anestesista_auxiliar_id is not null then
    insert into public.repasses (procedimento_id, medico_id, tipo, percentual, valor_repassar, status_repasse, equipe_id)
    values (new.id, new.anestesista_auxiliar_id, 'auxiliar'::repasse_tipo, v_auxiliar, round(v_base * v_auxiliar, 2), 'pendente'::repasse_status, new.equipe_id)
    on conflict (procedimento_id, medico_id, tipo)
    do update set
      percentual = excluded.percentual,
      valor_repassar = excluded.valor_repassar,
      status_repasse = case
        when public.repasses.status_repasse = 'pago'::repasse_status then 'pago'::repasse_status
        else 'pendente'::repasse_status
      end,
      equipe_id = excluded.equipe_id,
      updated_at = now();
  else
    delete from public.repasses
    where procedimento_id = new.id
      and tipo = 'auxiliar'::repasse_tipo;
  end if;

  return new;
end;
$$;

-- ============================================================
-- Trigger: handle_new_auth_user (nao auto-atribui equipe)
-- ============================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
  v_nome text;
  v_equipe_id uuid;
begin
  v_nome := coalesce(
    new.raw_user_meta_data ->> 'nome',
    split_part(coalesce(new.email, ''), '@', 1),
    'Usuario'
  );

  v_role := coalesce(
    (new.raw_user_meta_data ->> 'role')::user_role,
    'medico'::user_role
  );

  v_equipe_id := (new.raw_user_meta_data ->> 'equipe_id')::uuid;

  insert into public.users_profile (id, nome, role, ativo, equipe_id)
  values (new.id, v_nome, v_role, true, v_equipe_id)
  on conflict (id) do update
    set nome = excluded.nome,
        role = excluded.role,
        equipe_id = excluded.equipe_id,
        ativo = true,
        updated_at = now();

  if v_equipe_id is not null then
    insert into public.anestesistas (user_id, nome, equipe_id)
    values (new.id, v_nome, v_equipe_id)
    on conflict (user_id) do update
      set nome = excluded.nome,
          equipe_id = excluded.equipe_id,
          updated_at = now();
  end if;

  return new;
end;
$$;

-- ============================================================
-- RPC: listar equipes (superadmin)
-- ============================================================
create or replace function public.list_equipes()
returns table (
  id uuid,
  nome text,
  created_at timestamptz,
  membros_count bigint
)
language sql
stable
as $$
  select
    e.id,
    e.nome,
    e.created_at,
    (select count(*) from public.users_profile up where up.equipe_id = e.id) as membros_count
  from public.equipes e
  order by e.nome;
$$;

create or replace function public.create_equipe(p_nome text)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  if not public.fn_is_superadmin() then
    raise exception 'Apenas superadmin pode criar equipes';
  end if;

  insert into public.equipes (nome)
  values (p_nome)
  returning id into v_id;

  return v_id;
end;
$$;

-- ============================================================
-- Grants
-- ============================================================
grant execute on function public.list_procedimentos(text, uuid, uuid, procedimento_status, uuid) to authenticated;
grant execute on function public.list_repasses(text, repasse_status, uuid) to authenticated;
grant execute on function public.update_status_procedimento(uuid, procedimento_status, date, date, numeric, text, forma_pagamento_tipo) to authenticated;
grant execute on function public.create_procedimento(jsonb) to authenticated;
grant execute on function public.update_pagamento_procedimento(uuid, pagamento_status) to authenticated;
grant execute on function public.update_valor_calculado_procedimento(uuid, numeric) to authenticated;
grant execute on function public.list_equipes() to authenticated;
grant execute on function public.create_equipe(text) to authenticated;
grant execute on function public.fn_current_equipe_id() to authenticated;
grant execute on function public.fn_is_superadmin() to authenticated;
