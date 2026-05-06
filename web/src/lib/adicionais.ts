/**
 * Cálculo dos adicionais a partir do início agendado.
 * Mantido em sintonia com a função do banco fn_calcula_adicionais_agendamento.
 *
 *   adicional_fim_semana = sábado | domingo | feriado
 *   adicional_noturno    = dia útil & (hora >= 19 OU hora < 6)
 */
export type AdicionaisAgendamento = {
  fimDeSemana: boolean;
  noturno: boolean;
};

export function computeAdicionais(
  inicio: Date | null,
  feriado: boolean,
): AdicionaisAgendamento {
  if (!inicio || Number.isNaN(inicio.getTime())) {
    return { fimDeSemana: feriado, noturno: false };
  }
  const dow = inicio.getDay();
  const hour = inicio.getHours();
  const fimDeSemana = feriado || dow === 0 || dow === 6;
  const noturno = !fimDeSemana && (hour >= 19 || hour < 6);
  return { fimDeSemana, noturno };
}
