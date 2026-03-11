const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR");

export function toMoney(value?: number | null) {
  return moneyFormatter.format(value ?? 0);
}

export function toDate(value?: string | null) {
  if (!value) return "-";
  return dateFormatter.format(new Date(value));
}

export function toIsoDateLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayIsoDate() {
  return toIsoDateLocal(new Date());
}
