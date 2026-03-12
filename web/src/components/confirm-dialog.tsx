"use client";

import { useCallback, useRef, useState } from "react";

type ConfirmOptions = { title: string; message: string; confirmLabel?: string };

export function useConfirm() {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => setState({ ...opts, resolve }));
  }, []);

  function handleClose(result: boolean) {
    state?.resolve(result);
    setState(null);
  }

  const dialog = state ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">{state.title}</h3>
        <p className="mt-2 text-sm text-slate-700">{state.message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded border border-slate-300 px-3 py-1.5 text-sm"
            onClick={() => handleClose(false)}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white"
            onClick={() => handleClose(true)}
            type="button"
          >
            {state.confirmLabel ?? "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}
