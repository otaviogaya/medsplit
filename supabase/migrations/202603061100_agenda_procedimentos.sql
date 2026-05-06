-- Agenda: agendamento de procedimentos (data/hora e local)
-- Campos opcionais; quando preenchidos, o procedimento aparece na agenda da equipe.

ALTER TABLE public.procedimentos
  ADD COLUMN IF NOT EXISTS agendado_inicio timestamptz,
  ADD COLUMN IF NOT EXISTS agendado_fim timestamptz,
  ADD COLUMN IF NOT EXISTS agendado_local text,
  ADD COLUMN IF NOT EXISTS agendado_observacoes text,
  ADD COLUMN IF NOT EXISTS google_event_id text;

CREATE INDEX IF NOT EXISTS procedimentos_agenda_idx
  ON public.procedimentos (equipe_id, agendado_inicio)
  WHERE agendado_inicio IS NOT NULL;

-- ============================================================
-- RPC: update_agendamento_procedimento
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_agendamento_procedimento(
  p_id uuid,
  p_inicio timestamptz,
  p_fim timestamptz,
  p_local text,
  p_observacoes text
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
      agendado_observacoes = nullif(trim(p_observacoes), '')
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_agendamento_procedimento(uuid, timestamptz, timestamptz, text, text) TO authenticated;

-- ============================================================
-- RPC: list_agenda — retorna procedimentos agendados num intervalo
-- ============================================================
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
  data_procedimento date
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
    p.data_procedimento
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
