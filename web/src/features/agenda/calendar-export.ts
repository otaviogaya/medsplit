import type { AgendaEvento } from "@/src/features/agenda/api";

const CRLF = "\r\n";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Converte Date para o formato UTC do iCalendar: 20260505T230000Z */
function toIcsUtc(date: Date) {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** Converte Date para o formato compacto do Google Calendar: 20260505T230000Z */
function toGoogleDate(date: Date) {
  return toIcsUtc(date);
}

function escapeIcs(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function buildSummary(evt: AgendaEvento) {
  const codigo = evt.codigo_cbhpm ? evt.codigo_cbhpm.split(", ")[0] : "";
  const desc = evt.descricao_procedimento.split(" + ")[0];
  return `${evt.paciente_nome} — ${codigo ? `${codigo} ` : ""}${desc}`.trim();
}

function buildDescription(evt: AgendaEvento) {
  const parts = [
    `Paciente: ${evt.paciente_nome}`,
    `Cirurgião: ${evt.cirurgiao_nome}`,
    `Hospital: ${evt.hospital_nome}`,
    `Convênio: ${evt.convenio_nome}`,
    `Anestesista: ${evt.anestesista_principal_nome}`,
    `Procedimento: ${evt.descricao_procedimento}`,
  ];
  if (evt.codigo_cbhpm) parts.push(`CBHPM: ${evt.codigo_cbhpm}`);
  if (evt.porte_anestesico) parts.push(`Porte Anestésico: ${evt.porte_anestesico}`);
  if (evt.agendado_observacoes) parts.push(`Obs: ${evt.agendado_observacoes}`);
  return parts.join("\n");
}

function buildLocation(evt: AgendaEvento) {
  return [evt.agendado_local, evt.hospital_nome].filter(Boolean).join(" — ");
}

/** Gera arquivo .ics (RFC 5545) para um ou mais eventos. */
export function buildIcsFile(events: AgendaEvento[]) {
  const now = new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MedSplit//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const evt of events) {
    const start = new Date(evt.agendado_inicio);
    const end = evt.agendado_fim
      ? new Date(evt.agendado_fim)
      : new Date(start.getTime() + 60 * 60 * 1000);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${evt.id}@medsplit`,
      `DTSTAMP:${toIcsUtc(now)}`,
      `DTSTART:${toIcsUtc(start)}`,
      `DTEND:${toIcsUtc(end)}`,
      `SUMMARY:${escapeIcs(buildSummary(evt))}`,
      `DESCRIPTION:${escapeIcs(buildDescription(evt))}`,
      `LOCATION:${escapeIcs(buildLocation(evt))}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join(CRLF);
}

/** Faz o download de um .ics no browser. */
export function downloadIcs(events: AgendaEvento[], filename = "agenda.ics") {
  if (events.length === 0) return;
  const content = buildIcsFile(events);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Monta URL "Adicionar ao Google Agenda" pré-preenchida (não exige OAuth). */
export function googleCalendarUrl(evt: AgendaEvento) {
  const start = new Date(evt.agendado_inicio);
  const end = evt.agendado_fim
    ? new Date(evt.agendado_fim)
    : new Date(start.getTime() + 60 * 60 * 1000);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: buildSummary(evt),
    dates: `${toGoogleDate(start)}/${toGoogleDate(end)}`,
    details: buildDescription(evt),
    location: buildLocation(evt),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
