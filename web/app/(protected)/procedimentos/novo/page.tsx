"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  findAnestesistaByUserId,
  getOrCreateCirurgiaoByNome,
  getOrCreateConvenioByNome,
  listAnestesistas,
  listCirurgioes,
  listConvenios,
  listHospitais,
} from "@/src/features/cadastros/api";
import { useAuth } from "@/src/features/auth/auth-context";
import {
  createProcedimento,
  uploadProcedimentoDocumento,
} from "@/src/features/procedimentos/api";
import {
  listCbhpmProcedimentosBrowse,
  searchCbhpmProcedimentos,
  type CbhpmProcedimento,
} from "@/src/features/cbhpm/api";
import { todayIsoDate } from "@/src/lib/format";
import { getErrorMessage } from "@/src/lib/error";
import { BackLink } from "@/src/components/back-link";
import { useToast } from "@/src/components/toast";

const schema = z.object({
  data_procedimento: z.string().min(10, "Informe a data"),
  hospital_id: z.string().uuid("Selecione um hospital"),
  paciente_nome: z.string().min(2, "Nome do paciente obrigatório"),
  valor: z.string().optional(),
  anestesista_principal_id: z.string().uuid("Selecione um anestesista"),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const inputClass = "rounded-lg border border-slate-300 px-3 py-2.5 text-sm transition";
const inputErrorClass = "rounded-lg border border-red-400 bg-red-50 px-3 py-2.5 text-sm transition";

const LIST_COMBO_MAX = 120;

function buildCbhpmPayload(items: CbhpmProcedimento[]) {
  return {
    descricao: items.map((i) => i.descricao).join(" + "),
    codigos: items.map((i) => i.codigo).join(", "),
    porteAnestesico: items.map((i) => i.porte_anestesico || "0").join(", "),
  };
}

export default function NovoProcedimentoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const toast = useToast();
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [cbhpmQuery, setCbhpmQuery] = useState("");
  const [cbhpmResults, setCbhpmResults] = useState<CbhpmProcedimento[]>([]);
  const [cbhpmOpen, setCbhpmOpen] = useState(false);
  const [cbhpmList, setCbhpmList] = useState<CbhpmProcedimento[]>([]);
  const [cbhpmError, setCbhpmError] = useState("");
  const [cbhpmSearching, setCbhpmSearching] = useState(false);
  const cbhpmRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const [cirurgiaoQuery, setCirurgiaoQuery] = useState("");
  const [cirurgiaoOpen, setCirurgiaoOpen] = useState(false);
  const [cirurgiaoSelected, setCirurgiaoSelected] = useState<{ id: string; nome: string } | null>(null);
  const cirurgiaoRef = useRef<HTMLDivElement>(null);

  const [convenioQuery, setConvenioQuery] = useState("");
  const [convenioOpen, setConvenioOpen] = useState(false);
  const [convenioSelected, setConvenioSelected] = useState<{ id: string; nome: string } | null>(null);
  const convenioRef = useRef<HTMLDivElement>(null);

  const addCbhpmItem = useCallback((item: CbhpmProcedimento) => {
    setCbhpmList((prev) => {
      if (prev.some((p) => p.codigo === item.codigo)) return prev;
      return [...prev, item];
    });
    setCbhpmQuery("");
    setCbhpmResults([]);
    setCbhpmOpen(false);
    setCbhpmError("");
  }, []);

  const removeCbhpmItem = useCallback((codigo: string) => {
    setCbhpmList((prev) => prev.filter((p) => p.codigo !== codigo));
  }, []);

  const refreshCbhpmOptions = useCallback(async (q: string) => {
    setCbhpmSearching(true);
    try {
      const trimmed = q.trim();
      const results =
        trimmed.length < 1
          ? await listCbhpmProcedimentosBrowse(50)
          : await searchCbhpmProcedimentos(q);
      setCbhpmResults(results);
      setCbhpmOpen(true);
    } finally {
      setCbhpmSearching(false);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (cbhpmRef.current && !cbhpmRef.current.contains(t)) setCbhpmOpen(false);
      if (cirurgiaoRef.current && !cirurgiaoRef.current.contains(t)) setCirurgiaoOpen(false);
      if (convenioRef.current && !convenioRef.current.contains(t)) setConvenioOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      data_procedimento: todayIsoDate(),
      paciente_nome: "",
      valor: "",
      observacoes: "",
    },
  });

  const { data: hospitais = [] } = useQuery({ queryKey: ["hospitais"], queryFn: listHospitais });
  const { data: convenios = [] } = useQuery({ queryKey: ["convenios"], queryFn: listConvenios });
  const { data: cirurgioes = [] } = useQuery({ queryKey: ["cirurgioes"], queryFn: listCirurgioes });

  const cirurgiaoOptions = useMemo(() => {
    const q = cirurgiaoQuery.trim().toLowerCase();
    const base = q === "" ? cirurgioes : cirurgioes.filter((c) => c.nome.toLowerCase().includes(q));
    return base.slice(0, LIST_COMBO_MAX);
  }, [cirurgioes, cirurgiaoQuery]);

  const convenioOptions = useMemo(() => {
    const q = convenioQuery.trim().toLowerCase();
    const base = q === "" ? convenios : convenios.filter((c) => c.nome.toLowerCase().includes(q));
    return base.slice(0, LIST_COMBO_MAX);
  }, [convenios, convenioQuery]);

  const cirurgiaoNoMatch = cirurgiaoOptions.length === 0 && cirurgiaoQuery.trim().length > 0;
  const convenioNoMatch = convenioOptions.length === 0 && convenioQuery.trim().length > 0;
  const cirurgiaoListTruncated =
    cirurgiaoQuery.trim() === "" && cirurgioes.length > LIST_COMBO_MAX;
  const convenioListTruncated =
    convenioQuery.trim() === "" && convenios.length > LIST_COMBO_MAX;
  const { data: anestesistas = [] } = useQuery({ queryKey: ["anestesistas"], queryFn: listAnestesistas });
  const { data: anestesistaAtual } = useQuery({
    queryKey: ["anestesista-atual", session?.user.id],
    enabled: !!session?.user.id,
    queryFn: () => findAnestesistaByUserId(session!.user.id),
  });

  useEffect(() => {
    if (anestesistaAtual?.id) {
      setValue("anestesista_principal_id", anestesistaAtual.id);
    }
  }, [anestesistaAtual?.id, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      setLoading(true);
      setError("");

      if (cbhpmList.length === 0) {
        setCbhpmError("Selecione ao menos um procedimento.");
        setLoading(false);
        return;
      }

      let convenioIdFinal = "";
      if (convenioSelected) {
        convenioIdFinal = convenioSelected.id;
      } else if (convenioQuery.trim()) {
        const conv = await getOrCreateConvenioByNome(convenioQuery);
        convenioIdFinal = conv.id;
        await queryClient.invalidateQueries({ queryKey: ["convenios"] });
      }
      if (!convenioIdFinal) throw new Error("Selecione ou digite um convênio.");

      let cirurgiaoNomeFinal = "";
      if (cirurgiaoSelected) {
        cirurgiaoNomeFinal = cirurgiaoSelected.nome;
      } else if (cirurgiaoQuery.trim()) {
        const cir = await getOrCreateCirurgiaoByNome(cirurgiaoQuery);
        cirurgiaoNomeFinal = cir.nome;
        await queryClient.invalidateQueries({ queryKey: ["cirurgioes"] });
      }
      if (!cirurgiaoNomeFinal) throw new Error("Selecione ou digite um cirurgião.");

      let documentoUrlFinal: string | null = null;
      if (uploadFile) {
        documentoUrlFinal = await uploadProcedimentoDocumento(uploadFile);
      }

      const cbhpm = buildCbhpmPayload(cbhpmList);
      const valorNum = Number((values.valor ?? "0").replace(",", ".")) || 0;

      await createProcedimento({
        data_procedimento: values.data_procedimento,
        hospital_id: values.hospital_id,
        paciente_nome: values.paciente_nome,
        cirurgiao_nome: cirurgiaoNomeFinal,
        descricao_procedimento: cbhpm.descricao,
        convenio_id: convenioIdFinal,
        porte: 1,
        valor_calculado: valorNum,
        anestesista_principal_id: values.anestesista_principal_id,
        observacoes: values.observacoes || null,
        documento_foto_url: documentoUrlFinal,
        codigo_cbhpm: cbhpm.codigos,
        porte_anestesico: cbhpm.porteAnestesico,
      });
      await queryClient.invalidateQueries({ queryKey: ["procedimentos"] });
      toast("Procedimento criado com sucesso!");
      router.push("/procedimentos");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="grid gap-4">
      <BackLink href="/procedimentos" label="Voltar para lista" />

      <form className="grid max-w-3xl gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={onSubmit}>
        <h1 className="text-xl font-semibold text-slate-900">Novo procedimento</h1>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Data do procedimento</span>
            <input className={errors.data_procedimento ? inputErrorClass : inputClass} type="date" {...register("data_procedimento")} />
            {errors.data_procedimento && <span className="text-xs text-red-600">{errors.data_procedimento.message}</span>}
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Hospital</span>
            <select className={errors.hospital_id ? inputErrorClass : inputClass} {...register("hospital_id")}>
              <option value="">Selecione...</option>
              {hospitais.map((item) => (
                <option key={item.id} value={item.id}>{item.nome}</option>
              ))}
            </select>
            {errors.hospital_id && <span className="text-xs text-red-600">{errors.hospital_id.message}</span>}
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Paciente</span>
            <input className={errors.paciente_nome ? inputErrorClass : inputClass} placeholder="Nome completo do paciente" {...register("paciente_nome")} />
            {errors.paciente_nome && <span className="text-xs text-red-600">{errors.paciente_nome.message}</span>}
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Valor (R$)</span>
            <input
              className={inputClass}
              placeholder="0,00"
              type="text"
              inputMode="decimal"
              {...register("valor")}
            />
          </label>
        </div>

        <div className="grid gap-1 text-sm" ref={cirurgiaoRef}>
          <span className="font-medium text-slate-700">Cirurgião</span>
          <div className="relative">
            <input
              className={inputClass + " w-full"}
              placeholder="Buscar ou digitar novo cirurgião..."
              value={cirurgiaoQuery}
              onChange={(e) => {
                setCirurgiaoQuery(e.target.value);
                setCirurgiaoSelected(null);
                setCirurgiaoOpen(true);
              }}
              onFocus={() => setCirurgiaoOpen(true)}
              onClick={() => setCirurgiaoOpen(true)}
            />
            {cirurgiaoOpen && (
              <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {cirurgiaoOptions.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setCirurgiaoSelected(item);
                        setCirurgiaoQuery(item.nome);
                        setCirurgiaoOpen(false);
                      }}
                    >
                      {item.nome}
                    </button>
                  </li>
                ))}
                {cirurgiaoOptions.length === 0 && cirurgiaoQuery.trim() === "" && cirurgioes.length === 0 && (
                  <li className="px-3 py-2 text-xs text-slate-400">
                    Nenhum cirurgião cadastrado. Digite o nome para criar ao salvar.
                  </li>
                )}
                {cirurgiaoNoMatch && (
                  <li className="px-3 py-2 text-xs text-slate-400">
                    Nenhum encontrado &mdash; &quot;{cirurgiaoQuery.trim()}&quot; será criado ao salvar
                  </li>
                )}
                {!cirurgiaoNoMatch && cirurgiaoListTruncated && (
                  <li className="border-t border-slate-100 px-3 py-2 text-xs text-slate-400">
                    Mostrando os primeiros {LIST_COMBO_MAX}. Digite para filtrar.
                  </li>
                )}
              </ul>
            )}
          </div>
          {cirurgiaoSelected && (
            <p className="text-xs text-green-600">Selecionado: {cirurgiaoSelected.nome}</p>
          )}
        </div>

        <div className="grid gap-2 text-sm" ref={cbhpmRef}>
          <span className="font-medium text-slate-700">Procedimentos (CBHPM)</span>

          <div className="relative">
            <input
              className={cbhpmError ? inputErrorClass + " w-full" : inputClass + " w-full"}
              placeholder="Digite o nome ou código para adicionar..."
              value={cbhpmQuery}
              onChange={(e) => {
                const v = e.target.value;
                setCbhpmQuery(v);
                setCbhpmError("");
                if (debounceRef.current) clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(() => {
                  void refreshCbhpmOptions(v);
                }, 300);
              }}
              onFocus={() => {
                setCbhpmOpen(true);
                void refreshCbhpmOptions(cbhpmQuery);
              }}
              onClick={() => {
                setCbhpmOpen(true);
                void refreshCbhpmOptions(cbhpmQuery);
              }}
            />
            {cbhpmSearching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Buscando...</span>
            )}
            {cbhpmOpen && cbhpmResults.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {cbhpmResults.map((item) => {
                  const alreadyAdded = cbhpmList.some((p) => p.codigo === item.codigo);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                          alreadyAdded ? "bg-slate-50 text-slate-400 cursor-default" : "hover:bg-blue-50"
                        }`}
                        disabled={alreadyAdded}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => addCbhpmItem(item)}
                      >
                        <span className="font-mono text-xs text-blue-600">{item.codigo}</span>
                        <span className="mx-1.5 text-slate-300">|</span>
                        <span className={alreadyAdded ? "text-slate-400" : "text-slate-800"}>{item.descricao}</span>
                        {item.porte_anestesico && (
                          <span className="ml-2 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                            Porte Anest. {item.porte_anestesico}
                          </span>
                        )}
                        {alreadyAdded && <span className="ml-2 text-xs text-slate-400">(adicionado)</span>}
                      </button>
                    </li>
                  );
                })}
                {cbhpmQuery.trim() === "" && (
                  <li className="pointer-events-none border-t border-slate-100 px-3 py-2 text-xs text-slate-400">
                    Primeiros 50 por código CBHPM. Digite para buscar mais.
                  </li>
                )}
              </ul>
            )}
            {cbhpmOpen && !cbhpmSearching && cbhpmResults.length === 0 && cbhpmQuery.trim().length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-center text-sm text-slate-400 shadow-lg">
                Nenhum procedimento encontrado.
              </div>
            )}
          </div>
          {cbhpmError && <span className="text-xs text-red-600">{cbhpmError}</span>}

          {cbhpmList.length > 0 && (
            <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {cbhpmList.length} procedimento{cbhpmList.length > 1 ? "s" : ""} selecionado{cbhpmList.length > 1 ? "s" : ""}
              </p>
              {cbhpmList.map((item, idx) => (
                <div
                  key={item.codigo}
                  className="flex items-start justify-between gap-3 rounded-lg border border-blue-200 bg-white px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      <span className="mr-1.5 text-slate-400">{idx + 1}.</span>
                      {item.descricao}
                    </p>
                    <p className="mt-0.5 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>
                        Código: <span className="font-mono font-semibold text-blue-700">{item.codigo}</span>
                      </span>
                      {item.porte_anestesico && (
                        <span>
                          Porte Anestésico: <span className="font-semibold text-slate-800">{item.porte_anestesico}</span>
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                    onClick={() => removeCbhpmItem(item.codigo)}
                  >
                    Excluir
                  </button>
                </div>
              ))}
              <p className="text-xs text-slate-400">
                {cbhpmList.length} procedimento{cbhpmList.length > 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-1 text-sm" ref={convenioRef}>
          <span className="font-medium text-slate-700">Convênio</span>
          <div className="relative">
            <input
              className={inputClass + " w-full"}
              placeholder="Buscar ou digitar novo convênio..."
              value={convenioQuery}
              onChange={(e) => {
                setConvenioQuery(e.target.value);
                setConvenioSelected(null);
                setConvenioOpen(true);
              }}
              onFocus={() => setConvenioOpen(true)}
              onClick={() => setConvenioOpen(true)}
            />
            {convenioOpen && (
              <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {convenioOptions.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setConvenioSelected(item);
                        setConvenioQuery(item.nome);
                        setConvenioOpen(false);
                      }}
                    >
                      {item.nome}
                    </button>
                  </li>
                ))}
                {convenioOptions.length === 0 && convenioQuery.trim() === "" && convenios.length === 0 && (
                  <li className="px-3 py-2 text-xs text-slate-400">
                    Nenhum convênio cadastrado. Digite o nome para criar ao salvar.
                  </li>
                )}
                {convenioNoMatch && (
                  <li className="px-3 py-2 text-xs text-slate-400">
                    Nenhum encontrado &mdash; &quot;{convenioQuery.trim()}&quot; será criado ao salvar
                  </li>
                )}
                {!convenioNoMatch && convenioListTruncated && (
                  <li className="border-t border-slate-100 px-3 py-2 text-xs text-slate-400">
                    Mostrando os primeiros {LIST_COMBO_MAX}. Digite para filtrar.
                  </li>
                )}
              </ul>
            )}
          </div>
          {convenioSelected && (
            <p className="text-xs text-green-600">Selecionado: {convenioSelected.nome}</p>
          )}
        </div>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Anestesista</span>
          <select className={errors.anestesista_principal_id ? inputErrorClass : inputClass} {...register("anestesista_principal_id")}>
            <option value="">Selecione...</option>
            {anestesistas.map((item) => (
              <option key={item.id} value={item.id}>{item.nome}</option>
            ))}
          </select>
          {errors.anestesista_principal_id && <span className="text-xs text-red-600">{errors.anestesista_principal_id.message}</span>}
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Observações</span>
          <textarea className={inputClass} placeholder="Observações opcionais..." rows={3} {...register("observacoes")} />
        </label>

        <div className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Documento (imagem)</span>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-4 text-center transition hover:border-blue-400 hover:bg-blue-50">
              <span className="text-2xl">📁</span>
              <span className="text-sm text-slate-600">Escolher arquivo</span>
              <input
                accept="image/*"
                className="hidden"
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-4 text-center transition hover:border-blue-400 hover:bg-blue-50">
              <span className="text-2xl">📷</span>
              <span className="text-sm text-slate-600">Tirar foto</span>
              <input
                accept="image/*"
                capture="environment"
                className="hidden"
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          {uploadFile ? (
            <p className="text-xs text-green-700">Arquivo selecionado: {uploadFile.name}</p>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        <button
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Salvando..." : "Salvar procedimento"}
        </button>
      </form>
    </div>
  );
}
