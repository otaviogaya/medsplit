-- Permite que o trigger de procedimentos sincronize repasses sem violar RLS
-- quando o usuario autenticado tiver permissao sobre o procedimento.

drop policy if exists repasses_insert on public.repasses;
create policy repasses_insert on public.repasses
for insert to authenticated
with check (
  public.fn_is_admin()
  or public.fn_can_manage_finance()
  or exists (
    select 1
    from public.procedimentos p
    join public.anestesistas a on a.user_id = auth.uid()
    where p.id = repasses.procedimento_id
      and (p.anestesista_principal_id = a.id or p.anestesista_auxiliar_id = a.id)
  )
);

drop policy if exists repasses_delete on public.repasses;
create policy repasses_delete on public.repasses
for delete to authenticated
using (
  public.fn_is_admin()
  or public.fn_can_manage_finance()
  or exists (
    select 1
    from public.procedimentos p
    join public.anestesistas a on a.user_id = auth.uid()
    where p.id = repasses.procedimento_id
      and (p.anestesista_principal_id = a.id or p.anestesista_auxiliar_id = a.id)
  )
);
