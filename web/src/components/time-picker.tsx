"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
  required?: boolean;
  /** Slots em minutos. Default: 15. */
  step?: number;
  startHour?: number;
  endHour?: number;
  /** Atalhos rápidos exibidos acima da lista. */
  presets?: string[];
  placeholder?: string;
};

const DEFAULT_PRESETS = ["07:00", "07:30", "08:00", "13:00", "14:00"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function buildSlots(start: number, end: number, step: number) {
  const out: string[] = [];
  const safeStart = Math.max(0, Math.min(23, start));
  const safeEnd = Math.max(safeStart, Math.min(23, end));
  for (let h = safeStart; h <= safeEnd; h++) {
    for (let m = 0; m < 60; m += step) {
      out.push(`${pad(h)}:${pad(m)}`);
    }
  }
  return out;
}

/**
 * Aceita "8", "830", "8:30", "08:30", "0830" e devolve "HH:MM" se válido.
 */
function tryNormalize(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const direct = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (direct) {
    const h = parseInt(direct[1], 10);
    const m = parseInt(direct[2], 10);
    if (h <= 23 && m <= 59) return `${pad(h)}:${pad(m)}`;
    return null;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 2) {
    const h = parseInt(digits, 10);
    if (h <= 23) return `${pad(h)}:00`;
    return null;
  }
  if (digits.length === 3) {
    const h = parseInt(digits.slice(0, 1), 10);
    const m = parseInt(digits.slice(1), 10);
    if (h <= 23 && m <= 59) return `${pad(h)}:${pad(m)}`;
    return null;
  }
  const h = parseInt(digits.slice(0, 2), 10);
  const m = parseInt(digits.slice(2, 4), 10);
  if (h <= 23 && m <= 59) return `${pad(h)}:${pad(m)}`;
  return null;
}

export function TimePicker({
  value,
  onChange,
  hasError,
  required,
  step = 15,
  startHour = 0,
  endHour = 23,
  presets = DEFAULT_PRESETS,
  placeholder = "HH:MM",
}: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const slots = useMemo(() => buildSlots(startHour, endHour, step), [startHour, endHour, step]);

  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        const norm = tryNormalize(text);
        if (norm !== null && norm !== value) onChange(norm);
        if (norm === null) setText(value);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [text, value, onChange]);

  useEffect(() => {
    if (!open) return;
    const target = listRef.current?.querySelector<HTMLElement>("[data-selected='true']");
    target?.scrollIntoView({ block: "center" });
  }, [open]);

  const filteredSlots = useMemo(() => {
    const q = text.replace(/\D/g, "");
    if (!q) return slots;
    return slots.filter((s) => s.replace(":", "").startsWith(q));
  }, [slots, text]);

  function commit(slot: string) {
    onChange(slot);
    setText(slot);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        aria-required={required}
        autoComplete="off"
        className={
          (hasError
            ? "rounded-lg border border-red-400 bg-red-50"
            : "rounded-lg border border-slate-300") +
          " px-3 py-2.5 text-sm tabular-nums w-full"
        }
        placeholder={placeholder}
        value={text}
        inputMode="numeric"
        onChange={(e) => {
          setText(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const norm = tryNormalize(text);
            if (norm) {
              commit(norm);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
            setText(value);
          }
        }}
      />

      {open ? (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex flex-wrap gap-1 border-b border-slate-100 bg-slate-50 px-2 py-1.5">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(p)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium tabular-nums transition-colors ${
                  value === p
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                {p}
              </button>
            ))}
            {value ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange("");
                  setText("");
                  setOpen(false);
                }}
                className="ml-auto rounded-md px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100"
              >
                Limpar
              </button>
            ) : null}
          </div>
          <ul ref={listRef} className="max-h-56 overflow-auto py-1">
            {filteredSlots.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-400">
                Nenhum slot. Digite no formato HH:MM.
              </li>
            ) : (
              filteredSlots.map((slot) => {
                const isSel = slot === value;
                return (
                  <li key={slot}>
                    <button
                      data-selected={isSel || undefined}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => commit(slot)}
                      className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm tabular-nums transition-colors ${
                        isSel
                          ? "bg-blue-50 font-semibold text-blue-900"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{slot}</span>
                      {isSel ? <span className="text-xs text-blue-500">✓</span> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
