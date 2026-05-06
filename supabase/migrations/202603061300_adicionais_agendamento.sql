-- Adicionais por horário/data do agendamento.
-- Regras:
--   adicional_fim_semana = sábado | domingo | feriado (manual)
--   adicional_noturno    = dia útil & (hora >= 19 OU hora < 6)

ALTER TABLE public.procedimentos
  ADD COLUMN IF NOT EXISTS feriado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS adicional_fim_semana boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS adicional_noturno boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.fn_calcula_adicionais_agendamento()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_local timestamp;
  v_dow int;
  v_hour int;
BEGIN
  IF new.agendado_inicio IS NULL THEN
    new.adicional_fim_semana := coalesce(new.feriado, false);
    new.adicional_noturno := false;
    RETURN new;
  END IF;

  v_local := (new.agendado_inicio AT TIME ZONE 'America/Sao_Paulo');
  v_dow := extract(dow from v_local)::int;   -- 0 = domingo, 6 = sábado
  v_hour := extract(hour from v_local)::int;

  new.adicional_fim_semana := coalesce(new.feriado, false) OR v_dow IN (0, 6);
  new.adicional_noturno := (NOT new.adicional_fim_semana) AND (v_hour >= 19 OR v_hour < 6);

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_calcula_adicionais_agendamento ON public.procedimentos;
CREATE TRIGGER trg_calcula_adicionais_agendamento
  BEFORE INSERT OR UPDATE ON public.procedimentos
  FOR EACH ROW EXECUTE FUNCTION public.fn_calcula_adicionais_agendamento();

-- ============================================================
-- Backfill: força a re-execução do trigger nos registros existentes
-- ============================================================
UPDATE public.procedimentos SET feriado = feriado;

-- ============================================================
-- update_agendamento_procedimento agora aceita p_feriado
-- ============================================================
DROP FUNCTION IF EXISTS public.update_agendamento_procedimento(uuid, timestamptz, timestamptz, text, text);

CREATE OR REPLACE FUNCTION public.update_agendamento_procedimento(
  p_id uuid,
  p_inicio timestamptz,
  p_fim timestamptz,
  p_local text,
  p_observacoes text,
  p_feriado boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_equipe_id uuid;
BEGIN
  SELECT equipe_id INTO v_equipe_id FROM public.procedimentos WHERE id = p_id;
  IF v_equipe_id IS NULL THEN
    RAISE EXCEPTION 'Procedimento nao encontrado';
  END IF;

  IF NOT public.fn_is_superadmin()
     AND v_equipe_id IS DISTINCT FROM public.fn_current_equipe_id() THEN
    RAISE EXCEPTION 'Sem permissao para agendar este procedimento';
  END IF;

  IF NOT public.fn_is_admin()
     AND NOT public.fn_can_manage_finance()
     AND NOT EXISTS (
       SELECT 1 FROM public.anestesistas a
       JOIN public.procedimentos p ON p.id = p_id
       WHERE a.user_id = auth.uid()
         AND (a.id = p.anestesista_principal_id OR a.id = p.anestesista_auxiliar_id)
     )
  THEN
    RAISE EXCEPTION 'Sem permissao para agendar procedimento';
  END IF;

  IF p_inicio IS NOT NULL AND p_fim IS NOT NULL AND p_fim < p_inicio THEN
    RAISE EXCEPTION 'O fim deve ser posterior ao inicio';
  END IF;

  UPDATE public.procedimentos
  SET agendado_inicio = p_inicio,
      agendado_fim = p_fim,
      agendado_local = nullif(trim(p_local), ''),
      agendado_observacoes = nullif(trim(p_observacoes), ''),
      feriado = coalesce(p_feriado, feriado)
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_agendamento_procedimento(uuid, timestamptz, timestamptz, text, text, boolean) TO authenticated;

-- ============================================================
-- list_agenda agora retorna feriado / adicional_fim_semana / adicional_noturno
-- ============================================================
DROP FUNCTION IF EXISTS public.list_agenda(timestamptz, timestamptz, uuid, uuid);

CREATE OR REPLACE FUNCTION public.list_agenda(
  p_inicio timestamptz DEFAULT NULL,
  p_fim timestamptz DEFAULT NULL,
  p_hospital_id uuid DEFAULT NULL,
  p_anestesista_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  paciente_nome text,
  cirurgiao_nome text,
  hospital_id uuid,
  hospital_nome text,
  convenio_nome text,
  anestesista_principal_id uuid,
  anestesista_principal_nome text,
  agendado_inicio timestamptz,
  agendado_fim timestamptz,
  agendado_local text,
  agendado_observacoes text,
  descricao_procedimento text,
  codigo_cbhpm text,
  porte_anestesico text,
  status procedimento_status,
  pagamento_status pagamento_status,
  numero_lancamento int,
  data_procedimento date,
  feriado boolean,
  adicional_fim_semana boolean,
  adicional_noturno boolean
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    p.paciente_nome,
    p.cirurgiao_nome,
    p.hospital_id,
    h.nome,
    c.nome,
    p.anestesista_principal_id,
    apr.nome,
    p.agendado_inicio,
    p.agendado_fim,
    p.agendado_local,
    p.agendado_observacoes,
    p.descricao_procedimento,
    p.codigo_cbhpm,
    p.porte_anestesico,
    p.status,
    p.pagamento_status,
    p.numero_lancamento,
    p.data_procedimento,
    p.feriado,
    p.adicional_fim_semana,
    p.adicional_noturno
  FROM public.procedimentos p
  JOIN public.hospitais h ON h.id = p.hospital_id
  JOIN public.convenios c ON c.id = p.convenio_id
  JOIN public.anestesistas apr ON apr.id = p.anestesista_principal_id
  WHERE p.agendado_inicio IS NOT NULL
    AND (p_inicio IS NULL OR p.agendado_inicio >= p_inicio)
    AND (p_fim IS NULL OR p.agendado_inicio < p_fim)
    AND (p_hospital_id IS NULL OR p.hospital_id = p_hospital_id)
    AND (
      p_anestesista_id IS NULL
      OR p.anestesista_principal_id = p_anestesista_id
      OR p.anestesista_auxiliar_id = p_anestesista_id
    )
    AND (
      public.fn_is_superadmin()
      OR p.equipe_id = public.fn_current_equipe_id()
    )
  ORDER BY p.agendado_inicio ASC;
$$;

GRANT EXECUTE ON FUNCTION public.list_agenda(timestamptz, timestamptz, uuid, uuid) TO authenticated;

-- ============================================================
-- create_procedimento aceita feriado opcional no payload
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
