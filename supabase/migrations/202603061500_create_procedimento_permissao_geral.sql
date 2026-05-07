-- Permite que qualquer usuario autenticado vinculado a uma equipe (ou superadmin)
-- crie procedimentos. Antes, medicos sem registro em `anestesistas` ligado ao
-- proprio user_id eram bloqueados com "Sem permissao para criar procedimento.".
--
-- Mantem todas as demais regras (numero_lancamento por equipe/mes, default de
-- agendado_inicio, feriado/adicionais via trigger, etc).

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
  v_equipe_id := coalesce(
    (payload->>'equipe_id')::uuid,
    public.fn_current_equipe_id()
  );

  IF v_equipe_id IS NULL AND NOT public.fn_is_superadmin() THEN
    RAISE EXCEPTION 'Equipe nao definida para o usuario.';
  END IF;

  v_data_proc := (payload->>'data_procedimento')::date;
  v_ano_mes := to_char(date_trunc('month', v_data_proc)::date, 'YYYY-MM');

  INSERT INTO public.equipe_procedimento_contador_mes (equipe_id, ano_mes, ultimo_numero)
  VALUES (v_equipe_id, v_ano_mes, 1)
  ON CONFLICT (equipe_id, ano_mes)
  DO UPDATE SET ultimo_numero = public.equipe_procedimento_contador_mes.ultimo_numero + 1
  RETURNING ultimo_numero INTO v_num;

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
    agendado_observacoes,
    feriado
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
    nullif(payload->>'agendado_observacoes', ''),
    coalesce((payload->>'feriado')::boolean, false)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_procedimento(jsonb) TO authenticated;

-- ============================================================
-- RLS: procedimentos — qualquer usuario da equipe pode ver/inserir/editar.
-- A funcao create_procedimento roda como SECURITY DEFINER, mas mantemos as
-- policies coerentes para acessos diretos via PostgREST/SQL.
-- list_procedimentos / list_agenda / queries diretas a `procedimentos` ja
-- filtram por equipe_id, entao isolamento multi-tenant continua garantido.
-- ============================================================
DROP POLICY IF EXISTS procedimentos_select ON public.procedimentos;
CREATE POLICY procedimentos_select ON public.procedimentos
FOR SELECT TO authenticated
USING (
  public.fn_is_superadmin()
  OR equipe_id = public.fn_current_equipe_id()
);

DROP POLICY IF EXISTS procedimentos_insert ON public.procedimentos;
CREATE POLICY procedimentos_insert ON public.procedimentos
FOR INSERT TO authenticated
WITH CHECK (
  public.fn_is_superadmin()
  OR equipe_id = public.fn_current_equipe_id()
);

DROP POLICY IF EXISTS procedimentos_update ON public.procedimentos;
CREATE POLICY procedimentos_update ON public.procedimentos
FOR UPDATE TO authenticated
USING (
  public.fn_is_superadmin()
  OR equipe_id = public.fn_current_equipe_id()
)
WITH CHECK (
  public.fn_is_superadmin()
  OR equipe_id = public.fn_current_equipe_id()
);
