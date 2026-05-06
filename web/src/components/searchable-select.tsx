"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type SearchableSelectOption = { value: string; label: string };

const inputClass = "rounded-lg border border-slate-300 px-3 py-2.5 text-sm w-full";

type SearchableSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  emptyOptionLabel?: string;
  maxList?: number;
};

export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Buscar…",
  emptyOptionLabel = "Todos",
  maxList = 120,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedLabel = useMemo(() => {
    if (!value) return "";
    return options.find((o) => o.value === value)?.label ?? value;
  }, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q === "" ? options : options.filter((o) => o.label.toLowerCase().includes(q));
    return base.slice(0, maxList);
  }, [options, query, maxList]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <div className="grid gap-1 text-sm" ref={rootRef}>
      <span className="font-medium text-slate-700">{label}</span>
      <div className="relative">
        <input
          className={inputClass}
          placeholder={value ? selectedLabel : placeholder}
          value={open ? query : value ? selectedLabel : ""}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery(value ? selectedLabel : "");
          }}
          onClick={() => setOpen(true)}
        />
        {open && (
          <ul className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            <li>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                {emptyOptionLabel}
              </button>
            </li>
            {filtered.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                    o.value === value ? "bg-blue-50/80 font-medium text-blue-900" : ""
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  {o.label}
                </button>
              </li>
            ))}
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-400">Nenhuma opção encontrada.</li>
            ) : null}
            {options.length > maxList && query.trim() === "" ? (
              <li className="border-t border-slate-100 px-3 py-2 text-xs text-slate-400">
                Mostrando até {maxList}. Digite para refinar.
              </li>
            ) : null}
          </ul>
        )}
      </div>
    </div>
  );
}
