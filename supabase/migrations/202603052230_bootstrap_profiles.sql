create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
  v_nome text;
begin
  v_nome := coalesce(
    new.raw_user_meta_data ->> 'nome',
    split_part(coalesce(new.email, ''), '@', 1),
    'Usuario'
  );

  if exists (select 1 from public.users_profile where role = 'admin') then
    v_role := 'medico';
  else
    v_role := 'admin';
  end if;

  insert into public.users_profile (id, nome, role, ativo)
  values (new.id, v_nome, v_role, true)
  on conflict (id) do update
    set nome = excluded.nome,
        ativo = true,
        updated_at = now();

  insert into public.anestesistas (user_id, nome)
  values (new.id, v_nome)
  on conflict (user_id) do update
    set nome = excluded.nome,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Backfill para usuarios ja existentes.
with missing as (
  select
    u.id,
    coalesce(
      u.raw_user_meta_data ->> 'nome',
      split_part(coalesce(u.email, ''), '@', 1),
      'Usuario'
    ) as nome,
    row_number() over (order by u.created_at asc) as rn
  from auth.users u
  left join public.users_profile up on up.id = u.id
  where up.id is null
)
insert into public.users_profile (id, nome, role, ativo)
select
  m.id,
  m.nome,
  case
    when not exists (select 1 from public.users_profile p where p.role = 'admin') and m.rn = 1
      then 'admin'::user_role
    else 'medico'::user_role
  end,
  true
from missing m
on conflict (id) do nothing;

insert into public.anestesistas (user_id, nome)
select
  u.id,
  coalesce(
    u.raw_user_meta_data ->> 'nome',
    split_part(coalesce(u.email, ''), '@', 1),
    'Usuario'
  )
from auth.users u
left join public.anestesistas a on a.user_id = u.id
where a.user_id is null
on conflict (user_id) do nothing;
