-- Permite valor_calculado ser editado manualmente
-- O trigger so altera valor_calculado no INSERT; no UPDATE mantem o valor informado

create or replace function public.fn_valida_calculos_procedimento()
returns trigger
language plpgsql
as $$
declare
  v_valor numeric(12,2);
begin
  new.updated_by = auth.uid();

  -- So calcula valor_calculado no INSERT; no UPDATE nao sobrescreve
  if tg_op = 'INSERT' then
    select th.valor
      into v_valor
    from public.tabela_honorarios th
    where th.convenio_id = new.convenio_id
      and th.porte = new.porte;

    if v_valor is not null then
      new.valor_calculado = v_valor;
    else
      new.valor_calculado = coalesce(new.valor_calculado, 0);
    end if;
  end if;

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
  where id = p_id;
end;
$$;

grant execute on function public.update_valor_calculado_procedimento(uuid, numeric) to authenticated;
