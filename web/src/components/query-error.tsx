import { getErrorMessage } from "@/src/lib/error";

export function QueryError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
      <p className="text-sm font-medium text-red-700">Erro ao carregar dados</p>
      <p className="mt-1 text-xs text-red-600">{getErrorMessage(error)}</p>
      {onRetry && (
        <button
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          onClick={onRetry}
          type="button"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
