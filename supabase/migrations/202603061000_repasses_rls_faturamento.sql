-- Faturamento pode atualizar repasses na mesma equipe (ex.: trigger após alterar valor/status do procedimento).
-- Antes: repasses_update só com fn_is_admin(); ON CONFLICT DO UPDATE falhava para role faturamento.

DROP POLICY IF EXISTS repasses_update ON public.repasses;

CREATE POLICY repasses_update ON public.repasses
FOR UPDATE TO authenticated
USING (
  public.fn_is_superadmin()
  OR (
    equipe_id = public.fn_current_equipe_id()
    AND (public.fn_is_admin() OR public.fn_can_manage_finance())
  )
)
WITH CHECK (
  public.fn_is_superadmin()
  OR (
    equipe_id = public.fn_current_equipe_id()
    AND (public.fn_is_admin() OR public.fn_can_manage_finance())
  )
);
