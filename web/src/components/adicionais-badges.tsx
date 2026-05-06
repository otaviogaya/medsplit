type Props = {
  fimDeSemana: boolean;
  noturno: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function AdicionaisBadges({
  fimDeSemana,
  noturno,
  size = "md",
  className,
}: Props) {
  if (!fimDeSemana && !noturno) return null;

  const padding =
    size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs";

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`}>
      {fimDeSemana ? (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-amber-100 font-medium text-amber-800 ${padding}`}
          title="Aplicação automática do adicional para sábados, domingos e feriados."
        >
          🎉 Adicional fim de semana
        </span>
      ) : null}
      {noturno ? (
        <span
          className={`inline-flex items-center gap-1 rounded-full bg-indigo-100 font-medium text-indigo-800 ${padding}`}
          title="Aplicação automática do adicional noturno (dia útil das 19h às 6h)."
        >
          🌙 Adicional noturno
        </span>
      ) : null}
    </div>
  );
}
