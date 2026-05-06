-- numeração mensal por equipe: reinicia em 0001 a cada mês da data do procedimento (YYYY-MM).
-- Formato na UI: 0001/05-2026 (numero_lancamento + mês/ano de data_procedimento).

CREATE TABLE IF NOT EXISTS public.equipe_procedimento_contador_mes (
  equipe_id uuid NOT NULL REFERENCES public.equipes (id) ON DELETE CASCADE,
  ano_mes text NOT NULL CHECK (ano_mes ~ '^[0-9]{4}-[0-9]{2}$'),
  ultimo_numero integer NOT NULL DEFAULT 0 CHECK (ultimo_numero >= 0),
  PRIMARY KEY (equipe_id, ano_mes)
);

ALTER TABLE public.equipe_procedimento_contador_mes ENABLE ROW LEVEL SECURITY;

-- Recalcular sequência por (equipe, mês da data do procedimento)
ALTER TABLE public.procedimentos
  DROP CONSTRAINT IF EXISTS procedimentos_equipe_numero_lancamento_unique;

UPDATE public.procedimentos p
SET numero_lancamento = sub.n
FROM (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY equipe_id, date_trunc('month', data_procedimento::timestamp)
      ORDER BY created_at ASC, id ASC
    ) AS n
  FROM public.procedimentos
) sub
WHERE p.id = sub.id;

DELETE FROM public.equipe_procedimento_contador_mes;

INSERT INTO public.equipe_procedimento_contador_mes (equipe_id, ano_mes, ultimo_numero)
SELECT
  p.equipe_id,
  to_char(date_trunc('month', p.data_procedimento)::date, 'YYYY-MM'),
  max(p.numero_lancamento)
FROM public.procedimentos p
GROUP BY p.equipe_id, date_trunc('month', p.data_procedimento);

CREATE UNIQUE INDEX IF NOT EXISTS procedimentos_equipe_mes_numero_idx
ON public.procedimentos (equipe_id, (date_trunc('month', data_procedimento::timestamp)), numero_lancamento);

ALTER TABLE public.equipes DROP COLUMN IF EXISTS contador_procedimento;

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
    v_num
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_procedimento(jsonb) TO authenticated;
