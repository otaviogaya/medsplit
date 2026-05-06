-- list_procedimentos: passa a expor agendado_inicio e a usá-lo como referência
-- temporal principal (data exibida e ordenação na lista).
-- Mantém data_procedimento como fallback quando o agendamento ainda não foi gravado.

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
  created_at timestamptz,
  agendado_inicio timestamptz,
  agendado_fim timestamptz,
  feriado boolean,
  adicional_fim_semana boolean,
  adicional_noturno boolean
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
    p.created_at,
    p.agendado_inicio,
    p.agendado_fim,
    p.feriado,
    p.adicional_fim_semana,
    p.adicional_noturno
  FROM public.procedimentos p
  JOIN public.hospitais h ON h.id = p.hospital_id
  JOIN public.convenios c ON c.id = p.convenio_id
  JOIN public.anestesistas apr ON apr.id = p.anestesista_principal_id
  LEFT JOIN public.anestesistas aau ON aau.id = p.anestesista_auxiliar_id
  WHERE (
      p_mes IS NULL
      OR to_char(
        coalesce(
          (p.agendado_inicio AT TIME ZONE 'America/Sao_Paulo')::date,
          p.data_procedimento
        ),
        'YYYY-MM'
      ) = p_mes
    )
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
  ORDER BY coalesce(p.agendado_inicio, p.data_procedimento::timestamptz) DESC,
           p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.list_procedimentos(text, uuid, uuid, procedimento_status, uuid) TO authenticated;
