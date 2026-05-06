-- Número de lançamento por equipe: estritamente crescente na ordem de criação (created_at).
-- Exibição sugerida: LPAD(numero,4) || '/' || MM da data do procedimento.

ALTER TABLE public.equipes
  ADD COLUMN IF NOT EXISTS contador_procedimento integer NOT NULL DEFAULT 0;

ALTER TABLE public.procedimentos
  ADD COLUMN IF NOT EXISTS numero_lancamento integer;

UPDATE public.procedimentos p
SET numero_lancamento = sub.n
FROM (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY equipe_id
      ORDER BY created_at ASC, id ASC
    ) AS n
  FROM public.procedimentos
) sub
WHERE p.id = sub.id;

UPDATE public.equipes e
SET contador_procedimento = coalesce((
  SELECT max(p.numero_lancamento)
  FROM public.procedimentos p
  WHERE p.equipe_id = e.id
), 0);

ALTER TABLE public.procedimentos
  ALTER COLUMN numero_lancamento SET NOT NULL;

ALTER TABLE public.procedimentos
  DROP CONSTRAINT IF EXISTS procedimentos_equipe_numero_lancamento_unique;

ALTER TABLE public.procedimentos
  ADD CONSTRAINT procedimentos_equipe_numero_lancamento_unique
  UNIQUE (equipe_id, numero_lancamento);

-- Próximo número: incremento atômico na linha da equipe (evita corrida entre inserções)
CREATE OR REPLACE FUNCTION public.create_procedimento(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
  v_equipe_id uuid;
  v_num integer;
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

  UPDATE public.equipes
  SET contador_procedimento = contador_procedimento + 1
  WHERE id = v_equipe_id
  RETURNING contador_procedimento INTO v_num;

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
    numero_lancamento
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
    nullif(payload->>'porte_anestesico', ''),
    v_num
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_procedimento(jsonb) TO authenticated;

DROP FUNCTION IF EXISTS public.list_procedimentos(text, uuid, uuid, procedimento_status, uuid);

CREATE FUNCTION public.list_procedimentos(
  p_mes text DEFAULT NULL,
  p_hospital_id uuid DEFAULT NULL,
  p_convenio_id uuid DEFAULT NULL,
  p_status procedimento_status DEFAULT NULL,
  p_medico_id uuid DEFAULT NULL
)
RETURNS TABLE (
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
  documento_foto_url text,
  codigo_cbhpm text,
  porte_anestesico text,
  numero_lancamento int,
  created_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    p.data_procedimento,
    p.hospital_id,
    h.nome AS hospital_nome,
    p.paciente_nome,
    p.cirurgiao_nome,
    p.descricao_procedimento,
    p.convenio_id,
    c.nome AS convenio_nome,
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
    apr.nome AS anestesista_principal_nome,
    p.anestesista_auxiliar_id,
    aau.nome AS anestesista_auxiliar_nome,
    p.observacoes,
    p.glosa_contestacao,
    p.documento_foto_url,
    p.codigo_cbhpm,
    p.porte_anestesico,
    p.numero_lancamento,
    p.created_at
  FROM public.procedimentos p
  JOIN public.hospitais h ON h.id = p.hospital_id
  JOIN public.convenios c ON c.id = p.convenio_id
  JOIN public.anestesistas apr ON apr.id = p.anestesista_principal_id
  LEFT JOIN public.anestesistas aau ON aau.id = p.anestesista_auxiliar_id
  WHERE (p_mes IS NULL OR to_char(p.data_procedimento, 'YYYY-MM') = p_mes)
    AND (p_hospital_id IS NULL OR p.hospital_id = p_hospital_id)
    AND (p_convenio_id IS NULL OR p.convenio_id = p_convenio_id)
    AND (p_status IS NULL OR p.status = p_status)
    AND (
      p_medico_id IS NULL
      OR p.anestesista_principal_id = p_medico_id
      OR p.anestesista_auxiliar_id = p_medico_id
    )
    AND (
      public.fn_is_superadmin()
      OR p.equipe_id = public.fn_current_equipe_id()
    )
  ORDER BY p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.list_procedimentos(text, uuid, uuid, procedimento_status, uuid) TO authenticated;
