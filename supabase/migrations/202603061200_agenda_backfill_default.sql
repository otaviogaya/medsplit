-- Agenda: faz com que TODOS os procedimentos apareçam na agenda.
-- 1) Backfill: para os procedimentos já cadastrados, define agendado_inicio
--    a partir de data_procedimento (08:00 do dia agendado).
-- 2) create_procedimento: passa a preencher agendado_inicio (e opcionalmente
--    agendado_fim, agendado_local, agendado_observacoes) automaticamente
--    quando não forem informados no payload.

-- ============================================================
-- 1) Backfill dos procedimentos existentes
-- ============================================================
UPDATE public.procedimentos
SET agendado_inicio = (data_procedimento::timestamp + time '08:00') AT TIME ZONE 'America/Sao_Paulo'
WHERE agendado_inicio IS NULL
  AND data_procedimento IS NOT NULL;

-- ============================================================
-- 2) Atualiza create_procedimento para definir agendado_inicio por padrão
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_procedimento(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
  v_equipe_id uuid;
  v_num integer;
  v_ano_mes text;
  v_data_proc date;
  v_agendado_inicio timestamptz;
  v_agendado_fim timestamptz;
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

  v_data_proc := (payload->>'data_procedimento')::date;
  v_ano_mes := to_char(date_trunc('month', v_data_proc)::date, 'YYYY-MM');

  INSERT INTO public.equipe_procedimento_contador_mes (equipe_id, ano_mes, ultimo_numero)
  VALUES (v_equipe_id, v_ano_mes, 1)
  ON CONFLICT (equipe_id, ano_mes)
  DO UPDATE SET ultimo_numero = public.equipe_procedimento_contador_mes.ultimo_numero + 1
  RETURNING ultimo_numero INTO v_num;

  -- Resolve agendado_inicio: usa o valor do payload OU 08:00 do dia do procedimento.
  v_agendado_inicio := nullif(payload->>'agendado_inicio', '')::timestamptz;
  IF v_agendado_inicio IS NULL THEN
    v_agendado_inicio := (v_data_proc::timestamp + time '08:00') AT TIME ZONE 'America/Sao_Paulo';
  END IF;
  v_agendado_fim := nullif(payload->>'agendado_fim', '')::timestamptz;

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
    porte_anestesico,
    numero_lancamento,
    agendado_inicio,
    agendado_fim,
    agendado_local,
    agendado_observacoes
  )
  VALUES (
    v_data_proc,
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
    nullif(payload->>'porte_anestesico', ''),
    v_num,
    v_agendado_inicio,
    v_agendado_fim,
    nullif(payload->>'agendado_local', ''),
    nullif(payload->>'agendado_observacoes', '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_procedimento(jsonb) TO authenticated;
