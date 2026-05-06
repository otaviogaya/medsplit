-- Remove tabela_honorarios dependency from trigger
-- valor_calculado is now always manual (set via payload or update RPC)

CREATE OR REPLACE FUNCTION public.fn_valida_calculos_procedimento()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_by = auth.uid();

  IF tg_op = 'INSERT' THEN
    new.valor_calculado = coalesce(new.valor_calculado, 0);
  END IF;

  IF new.status = 'recebido' THEN
    IF new.data_recebimento IS NULL OR new.valor_recebido IS NULL THEN
      RAISE EXCEPTION 'Status recebido exige data_recebimento e valor_recebido';
    END IF;
  END IF;

  IF new.status = 'faturado' AND new.data_faturamento IS NULL THEN
    new.data_faturamento = current_date;
  END IF;

  RETURN new;
END;
$$;

-- Update create_procedimento to accept valor_calculado
CREATE OR REPLACE FUNCTION public.create_procedimento(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
  v_equipe_id uuid;
BEGIN
  IF NOT public.fn_is_admin()
     AND NOT public.fn_can_manage_finance()
     AND NOT EXISTS (
       SELECT 1 FROM public.anestesistas
       WHERE user_id = auth.uid()
     )
  THEN
    RAISE EXCEPTION 'Sem permissao para criar procedimento.';
  END IF;

  v_equipe_id := coalesce(
    (payload->>'equipe_id')::uuid,
    public.fn_current_equipe_id()
  );

  IF v_equipe_id IS NULL THEN
    RAISE EXCEPTION 'Equipe nao definida para o usuario.';
  END IF;

  INSERT INTO public.procedimentos (
    data_procedimento,
    hospital_id,
    paciente_nome,
    cirurgiao_nome,
    descricao_procedimento,
    convenio_id,
    porte,
    valor_calculado,
    anestesista_principal_id,
    anestesista_auxiliar_id,
    observacoes,
    documento_foto_url,
    equipe_id,
    codigo_cbhpm,
    porte_anestesico
  )
  VALUES (
    (payload->>'data_procedimento')::date,
    (payload->>'hospital_id')::uuid,
    payload->>'paciente_nome',
    payload->>'cirurgiao_nome',
    payload->>'descricao_procedimento',
    (payload->>'convenio_id')::uuid,
    coalesce((payload->>'porte')::int, 1),
    coalesce((payload->>'valor_calculado')::numeric, 0),
    (payload->>'anestesista_principal_id')::uuid,
    nullif(payload->>'anestesista_auxiliar_id', '')::uuid,
    payload->>'observacoes',
    payload->>'documento_foto_url',
    v_equipe_id,
    nullif(payload->>'codigo_cbhpm', ''),
    nullif(payload->>'porte_anestesico', '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_procedimento(jsonb) TO authenticated;

-- Drop tabela_honorarios
DROP TABLE IF EXISTS public.tabela_honorarios CASCADE;
