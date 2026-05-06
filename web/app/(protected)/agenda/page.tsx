"use client";

import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAnestesistas, listHospitais } from "@/src/features/cadastros/api";
import { listAgenda, type AgendaEvento } from "@/src/features/agenda/api";
import {
  downloadIcs,
  googleCalendarUrl,
} from "@/src/features/agenda/calendar-export";
import { SearchableSelect } from "@/src/components/searchable-select";
import { EmptyState } from "@/src/components/empty-state";
import { QueryError } from "@/src/components/query-error";
import { SkeletonList } from "@/src/components/skeleton";
import { AdicionaisBadges } from "@/src/components/adicionais-badges";

dayjs.locale("pt-br");

type ViewMode = "mes" | "semana" | "lista";

type DiaCelula = { date: dayjs.Dayjs; isCurrentMonth: boolean; isToday: boolean };

const HORARIOS_DIA = Array.from({ length: 13 }, (_, i) => i + 7); // 7h–19h

const STATUS_COLORS: Record<AgendaEvento["status"], string> = {
  realizado: "bg-blue-500",
  faturado: "bg-amber-500",
  recebido: "bg-green-600",
  glosa: "bg-red-500",
  cancelado: "bg-slate-400 line-through",
};

function formatHora(iso: string) {
  return dayjs(iso).format("HH:mm");
}

function buildMonthGrid(refDate: dayjs.Dayjs): DiaCelula[] {
  const inicioMes = refDate.startOf("month");
  const fimMes = refDate.endOf("month");
  const inicioGrid = inicioMes.startOf("week");
  const fimGrid = fimMes.endOf("week");
  const dias: DiaCelula[] = [];
  let cursor = inicioGrid;
  const hoje = dayjs().startOf("day");
  while (cursor.isBefore(fimGrid) || cursor.isSame(fimGrid, "day")) {
    dias.push({
      date: cursor,
      isCurrentMonth: cursor.month() === refDate.month(),
      isToday: cursor.isSame(hoje, "day"),
    });
    cursor = cursor.add(1, "day");
  }
  return dias;
}

function eventsByDay(events: AgendaEvento[]) {
  const map = new Map<string, AgendaEvento[]>();
  for (const evt of events) {
    const key = dayjs(evt.agendado_inicio).format("YYYY-MM-DD");
    const arr = map.get(key) ?? [];
    arr.push(evt);
    map.set(key, arr);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => (a.agendado_inicio < b.agendado_inicio ? -1 : 1));
  }
  return map;
}

export default function AgendaPage() {
  const [view, setView] = useState<ViewMode>("mes");
  const [refDate, setRefDate] = useState(dayjs());
  const [hospitalId, setHospitalId] = useState("");
  const [anestesistaId, setAnestesistaId] = useState("");
  const [drawerEvento, setDrawerEvento] = useState<AgendaEvento | null>(null);

  const range = useMemo(() => {
    if (view === "mes") {
      return {
        inicio: refDate.startOf("month").startOf("week").toDate(),
        fim: refDate.endOf("month").endOf("week").toDate(),
      };
    }
    if (view === "semana") {
      return {
        inicio: refDate.startOf("week").toDate(),
        fim: refDate.endOf("week").toDate(),
      };
    }
    return {
      inicio: refDate.startOf("day").toDate(),
      fim: refDate.add(60, "day").endOf("day").toDate(),
    };
  }, [view, refDate]);

  const { data: hospitais = [] } = useQuery({ queryKey: ["hospitais"], queryFn: listHospitais });
  const { data: anestesistas = [] } = useQuery({
    queryKey: ["anestesistas"],
    queryFn: listAnestesistas,
  });
  const { data: events = [], isLoading, isError, error, refetch } = useQuery<AgendaEvento[]>({
    queryKey: ["agenda", range, hospitalId, anestesistaId],
    queryFn: () =>
      listAgenda({
        inicio: range.inicio,
        fim: range.fim,
        hospitalId: hospitalId || undefined,
        anestesistaId: anestesistaId || undefined,
      }),
  });

  const eventosPorDia = useMemo(() => eventsByDay(events), [events]);
  const dias = useMemo(() => buildMonthGrid(refDate), [refDate]);

  const titulo = useMemo(() => {
    if (view === "mes") return refDate.format("MMMM [de] YYYY");
    if (view === "semana") {
      const inicio = refDate.startOf("week");
      const fim = refDate.endOf("week");
      return `${inicio.format("DD/MM")} a ${fim.format("DD/MM/YYYY")}`;
    }
    return "Próximos 60 dias";
  }, [view, refDate]);

  function navigate(direction: -1 | 0 | 1) {
    if (direction === 0) {
      setRefDate(dayjs());
      return;
    }
    if (view === "mes") setRefDate((d) => d.add(direction, "month"));
    else if (view === "semana") setRefDate((d) => d.add(direction, "week"));
    else setRefDate(dayjs());
  }

  const filenameIcs = `agenda-${refDate.format("YYYY-MM")}.ics`;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Agenda</h1>
          <p className="text-sm text-slate-500">
            Procedimentos agendados — visualize, edite e exporte para o seu calendário.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
            disabled={events.length === 0}
            onClick={() => downloadIcs(events, filenameIcs)}
            type="button"
            title="Baixar arquivo .ics — abre em Google Agenda, Outlook, Apple Calendar"
          >
            ⬇️ Baixar .ics
          </button>
          <Link
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            href="/procedimentos/novo"
          >
            + Novo procedimento
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
              onClick={() => navigate(-1)}
              type="button"
              aria-label="Anterior"
            >
              ‹
            </button>
            <button
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
              onClick={() => navigate(0)}
              type="button"
            >
              Hoje
            </button>
            <button
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
              onClick={() => navigate(1)}
              type="button"
              aria-label="Próximo"
            >
              ›
            </button>
            <p className="ml-2 text-base font-semibold capitalize text-slate-900">{titulo}</p>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            {(["mes", "semana", "lista"] as ViewMode[]).map((v) => (
              <button
                key={v}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setView(v)}
                type="button"
              >
                {v === "mes" ? "Mês" : v === "semana" ? "Semana" : "Lista"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <SearchableSelect
            label="Hospital"
            value={hospitalId}
            onChange={setHospitalId}
            options={hospitais.map((h) => ({ value: h.id, label: h.nome }))}
            placeholder="Filtrar por hospital…"
            emptyOptionLabel="Todos os hospitais"
          />
          <SearchableSelect
            label="Anestesista"
            value={anestesistaId}
            onChange={setAnestesistaId}
            options={anestesistas.map((a) => ({ value: a.id, label: a.nome }))}
            placeholder="Filtrar por anestesista…"
            emptyOptionLabel="Todos os anestesistas"
          />
        </div>
      </div>

      {isError ? <QueryError error={error} onRetry={() => refetch()} /> : null}
      {isLoading ? <SkeletonList count={3} /> : null}

      {!isLoading && !isError && view === "mes" ? (
        <MonthView
          dias={dias}
          eventosPorDia={eventosPorDia}
          onSelect={setDrawerEvento}
          refDate={refDate}
        />
      ) : null}

      {!isLoading && !isError && view === "semana" ? (
        <WeekView events={events} refDate={refDate} onSelect={setDrawerEvento} />
      ) : null}

      {!isLoading && !isError && view === "lista" ? (
        events.length === 0 ? (
          <EmptyState message="Nenhum procedimento agendado neste intervalo." />
        ) : (
          <ListView events={events} onSelect={setDrawerEvento} />
        )
      ) : null}

      {drawerEvento ? (
        <EventDrawer evento={drawerEvento} onClose={() => setDrawerEvento(null)} />
      ) : null}
    </div>
  );
}

function MonthView({
  dias,
  eventosPorDia,
  onSelect,
  refDate,
}: {
  dias: DiaCelula[];
  eventosPorDia: Map<string, AgendaEvento[]>;
  onSelect: (e: AgendaEvento) => void;
  refDate: dayjs.Dayjs;
}) {
  const semanas = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const MAX_EVENTOS_VISIVEIS = 3;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        {semanas.map((s, i) => (
          <div
            key={s}
            className={`px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${
              i === 0 || i === 6 ? "text-slate-400" : ""
            }`}
          >
            {s}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x divide-slate-100">
        {dias.map((dia, idx) => {
          const key = dia.date.format("YYYY-MM-DD");
          const eventosDoDia = eventosPorDia.get(key) ?? [];
          const isFimDeSemana = dia.date.day() === 0 || dia.date.day() === 6;
          const isFirstRow = idx < 7;
          return (
            <div
              key={idx}
              className={`group relative flex min-h-[120px] flex-col gap-1 p-1.5 sm:min-h-[140px] ${
                isFirstRow ? "" : "border-t border-slate-100"
              } ${dia.isCurrentMonth ? "bg-white" : "bg-slate-50/60"} ${
                isFimDeSemana && dia.isCurrentMonth ? "bg-slate-50/30" : ""
              } ${dia.isToday ? "ring-2 ring-inset ring-blue-200" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    dia.isToday
                      ? "bg-blue-600 text-white shadow-sm"
                      : dia.isCurrentMonth
                      ? "text-slate-700 group-hover:bg-slate-100"
                      : "text-slate-400"
                  }`}
                >
                  {dia.date.date()}
                </span>
                {eventosDoDia.length > 0 ? (
                  <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                    {eventosDoDia.length}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                {eventosDoDia.slice(0, MAX_EVENTOS_VISIVEIS).map((evt) => (
                  <button
                    key={evt.id}
                    type="button"
                    onClick={() => onSelect(evt)}
                    className={`flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-white transition-all hover:translate-x-0.5 hover:shadow-md ${
                      STATUS_COLORS[evt.status]
                    }`}
                    title={`${formatHora(evt.agendado_inicio)} — ${evt.paciente_nome} • ${evt.hospital_nome}${
                      evt.adicional_fim_semana ? " • Adicional fim de semana" : ""
                    }${evt.adicional_noturno ? " • Adicional noturno" : ""}`}
                  >
                    <span className="rounded bg-black/15 px-1 py-px text-[10px] tabular-nums">
                      {formatHora(evt.agendado_inicio)}
                    </span>
                    <span className="truncate">{evt.paciente_nome}</span>
                    {evt.adicional_fim_semana ? <span className="ml-auto">🎉</span> : null}
                    {evt.adicional_noturno ? <span className="ml-auto">🌙</span> : null}
                  </button>
                ))}
                {eventosDoDia.length > MAX_EVENTOS_VISIVEIS ? (
                  <button
                    className="rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-slate-500 hover:bg-slate-100"
                    onClick={() => onSelect(eventosDoDia[MAX_EVENTOS_VISIVEIS])}
                    type="button"
                  >
                    + {eventosDoDia.length - MAX_EVENTOS_VISIVEIS} mais
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-3 py-2 text-[11px]">
        <span className="capitalize text-slate-500">{refDate.format("MMMM [de] YYYY")}</span>
        <div className="flex flex-wrap items-center gap-2 text-slate-500">
          <LegendaCor cor="bg-blue-500" label="Realizado" />
          <LegendaCor cor="bg-amber-500" label="Faturado" />
          <LegendaCor cor="bg-green-600" label="Recebido" />
          <LegendaCor cor="bg-red-500" label="Glosa" />
          <LegendaCor cor="bg-slate-400" label="Cancelado" />
        </div>
      </div>
    </div>
  );
}

function LegendaCor({ cor, label }: { cor: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-2.5 w-2.5 rounded-full ${cor}`} />
      <span>{label}</span>
    </span>
  );
}

function WeekView({
  events,
  refDate,
  onSelect,
}: {
  events: AgendaEvento[];
  refDate: dayjs.Dayjs;
  onSelect: (e: AgendaEvento) => void;
}) {
  const inicioSemana = refDate.startOf("week");
  const dias = Array.from({ length: 7 }, (_, i) => inicioSemana.add(i, "day"));
  const hoje = dayjs().startOf("day");

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid min-w-[920px] grid-cols-[60px_repeat(7,1fr)]">
        <div />
        {dias.map((d) => (
          <div
            key={d.format("YYYY-MM-DD")}
            className={`border-b border-l border-slate-100 px-2 py-2 text-center ${
              d.isSame(hoje, "day") ? "bg-blue-50" : "bg-slate-50"
            }`}
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
              {d.format("ddd")}
            </p>
            <p
              className={`text-sm font-semibold ${
                d.isSame(hoje, "day") ? "text-blue-700" : "text-slate-800"
              }`}
            >
              {d.format("DD/MM")}
            </p>
          </div>
        ))}

        {HORARIOS_DIA.map((hora) => (
          <FragmentRow
            key={hora}
            hora={hora}
            dias={dias}
            events={events}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function FragmentRow({
  hora,
  dias,
  events,
  onSelect,
}: {
  hora: number;
  dias: dayjs.Dayjs[];
  events: AgendaEvento[];
  onSelect: (e: AgendaEvento) => void;
}) {
  return (
    <>
      <div className="border-b border-slate-100 px-2 py-1.5 text-right text-[10px] text-slate-400">
        {String(hora).padStart(2, "0")}:00
      </div>
      {dias.map((d) => {
        const inicio = d.hour(hora).minute(0);
        const fim = d.hour(hora + 1).minute(0);
        const eventosNoSlot = events.filter((evt) => {
          const t = dayjs(evt.agendado_inicio);
          return t.isAfter(inicio.subtract(1, "minute")) && t.isBefore(fim);
        });
        return (
          <div
            key={`${d.format("YYYY-MM-DD")}-${hora}`}
            className="min-h-[44px] border-b border-l border-slate-100 px-1 py-0.5"
          >
            {eventosNoSlot.map((evt) => (
              <button
                key={evt.id}
                type="button"
                onClick={() => onSelect(evt)}
                className={`mb-0.5 block w-full truncate rounded px-1.5 py-1 text-left text-[11px] font-medium text-white transition hover:opacity-90 ${
                  STATUS_COLORS[evt.status]
                }`}
              >
                <span className="opacity-90">{formatHora(evt.agendado_inicio)}</span>{" "}
                {evt.paciente_nome}
              </button>
            ))}
          </div>
        );
      })}
    </>
  );
}

function ListView({
  events,
  onSelect,
}: {
  events: AgendaEvento[];
  onSelect: (e: AgendaEvento) => void;
}) {
  const grupos = useMemo(() => {
    const map = new Map<string, AgendaEvento[]>();
    for (const evt of events) {
      const key = dayjs(evt.agendado_inicio).format("YYYY-MM-DD");
      const arr = map.get(key) ?? [];
      arr.push(evt);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [events]);

  return (
    <div className="grid gap-3">
      {grupos.map(([dia, evts]) => (
        <section key={dia} className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-baseline justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
            <p className="text-sm font-semibold capitalize text-slate-800">
              {dayjs(dia).format("dddd, DD [de] MMMM")}
            </p>
            <p className="text-xs text-slate-500">{evts.length} procedimento{evts.length !== 1 ? "s" : ""}</p>
          </header>
          <div className="divide-y divide-slate-100">
            {evts.map((evt) => (
              <button
                key={evt.id}
                type="button"
                onClick={() => onSelect(evt)}
                className="flex w-full items-start gap-4 px-4 py-3 text-left transition-colors hover:bg-slate-50"
              >
                <div className="grid w-20 shrink-0 gap-0.5 text-center">
                  <p className="text-sm font-semibold text-slate-900">{formatHora(evt.agendado_inicio)}</p>
                  {evt.agendado_fim ? (
                    <p className="text-[11px] text-slate-400">até {formatHora(evt.agendado_fim)}</p>
                  ) : null}
                </div>
                <div className="grid flex-1 gap-0.5">
                  <p className="text-sm font-semibold text-slate-900">{evt.paciente_nome}</p>
                  <p className="text-xs text-slate-600">
                    {evt.codigo_cbhpm ? (
                      <span className="font-mono text-blue-700">{evt.codigo_cbhpm.split(", ")[0]}</span>
                    ) : null}
                    {evt.codigo_cbhpm ? <span className="mx-1.5 text-slate-300">|</span> : null}
                    <span>{evt.descricao_procedimento.split(" + ")[0]}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    🏥 {evt.hospital_nome}
                    {evt.agendado_local ? ` • ${evt.agendado_local}` : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    🩺 {evt.cirurgiao_nome} • 💉 {evt.anestesista_principal_nome}
                  </p>
                  {evt.adicional_fim_semana || evt.adicional_noturno ? (
                    <AdicionaisBadges
                      fimDeSemana={evt.adicional_fim_semana}
                      noturno={evt.adicional_noturno}
                      size="sm"
                      className="mt-1"
                    />
                  ) : null}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white ${
                    STATUS_COLORS[evt.status]
                  }`}
                >
                  {evt.status}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function EventDrawer({ evento, onClose }: { evento: AgendaEvento; onClose: () => void }) {
  const inicio = dayjs(evento.agendado_inicio);
  const fim = evento.agendado_fim ? dayjs(evento.agendado_fim) : null;

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center sm:justify-center" role="dialog">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 m-0 max-h-[90vh] w-full max-w-lg overflow-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {inicio.format("dddd, DD/MM/YYYY")}
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-slate-900">{evento.paciente_nome}</h2>
          </div>
          <button
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            type="button"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-base">⏰</span>
            <span className="font-medium">
              {inicio.format("HH:mm")}
              {fim ? ` – ${fim.format("HH:mm")}` : ""}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-base">🏥</span>
            <span>
              {evento.hospital_nome}
              {evento.agendado_local ? ` — ${evento.agendado_local}` : ""}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-base">🩺</span>
            <span>{evento.cirurgiao_nome}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-base">💉</span>
            <span>{evento.anestesista_principal_nome}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-base">📋</span>
            <span>
              {evento.codigo_cbhpm ? (
                <span className="font-mono text-blue-700">{evento.codigo_cbhpm.split(", ")[0]} </span>
              ) : null}
              {evento.descricao_procedimento.split(" + ")[0]}
            </span>
          </div>
          {evento.agendado_observacoes ? (
            <div className="flex items-start gap-2">
              <span className="text-base">📝</span>
              <span className="whitespace-pre-wrap text-slate-700">{evento.agendado_observacoes}</span>
            </div>
          ) : null}
          {evento.adicional_fim_semana || evento.adicional_noturno ? (
            <div className="flex items-start gap-2">
              <span className="text-base">⭐</span>
              <AdicionaisBadges
                fimDeSemana={evento.adicional_fim_semana}
                noturno={evento.adicional_noturno}
                size="sm"
              />
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Link
            className="rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-700"
            href={`/procedimentos/${evento.id}`}
          >
            Abrir
          </Link>
          <a
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-sm transition-colors hover:bg-slate-50"
            href={googleCalendarUrl(evento)}
            rel="noreferrer"
            target="_blank"
          >
            Google Agenda
          </a>
          <button
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition-colors hover:bg-slate-50"
            onClick={() => downloadIcs([evento], `${evento.paciente_nome}-${inicio.format("YYYYMMDD-HHmm")}.ics`)}
            type="button"
          >
            Baixar .ics
          </button>
        </div>
      </div>
    </div>
  );
}
