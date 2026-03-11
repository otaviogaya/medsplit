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
  values (
    new.id,
    new.anestesista_principal_id,
    'principal'::repasse_tipo,
    v_principal,
    round(v_base * v_principal, 2),
    'pendente'::repasse_status
  )
  on conflict (procedimento_id, medico_id, tipo)
  do update set
    percentual = excluded.percentual,
    valor_repassar = excluded.valor_repassar,
    status_repasse = case
      when public.repasses.status_repasse = 'pago'::repasse_status then 'pago'::repasse_status
      else 'pendente'::repasse_status
    end,
    updated_at = now();

  if new.anestesista_auxiliar_id is not null then
    insert into public.repasses (procedimento_id, medico_id, tipo, percentual, valor_repassar, status_repasse)
    values (
      new.id,
      new.anestesista_auxiliar_id,
      'auxiliar'::repasse_tipo,
      v_auxiliar,
      round(v_base * v_auxiliar, 2),
      'pendente'::repasse_status
    )
    on conflict (procedimento_id, medico_id, tipo)
    do update set
      percentual = excluded.percentual,
      valor_repassar = excluded.valor_repassar,
      status_repasse = case
        when public.repasses.status_repasse = 'pago'::repasse_status then 'pago'::repasse_status
        else 'pendente'::repasse_status
      end,
      updated_at = now();
  else
    delete from public.repasses
    where procedimento_id = new.id
      and tipo = 'auxiliar'::repasse_tipo;
  end if;

  return new;
end;
$$;
