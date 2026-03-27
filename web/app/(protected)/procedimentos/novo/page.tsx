"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
  cirurgiao_id: z.string().optional(),
  cirurgiao_nome_manual: z.string().optional(),
  convenio_id: z.string().optional(),
  convenio_nome_manual: z.string().optional(),
  anestesista_principal_id: z.string().uuid("Selecione um anestesista"),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const inputClass = "rounded-lg border border-slate-300 px-3 py-2.5 text-sm transition";
const inputErrorClass = "rounded-lg border border-red-400 bg-red-50 px-3 py-2.5 text-sm transition";

function buildCbhpmPayload(items: CbhpmProcedimento[]) {
  return {
    descricao: items.map((i) => i.descricao).join(" + "),
    codigos: items.map((i) => i.codigo).join(", "),
    porteAnestesico: items
      .map((i) => Number(i.porte_anestesico) || 0)
      .reduce((a, b) => Math.max(a, b), 0)
      .toString(),
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

  const doCbhpmSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setCbhpmResults([]);
      return;
    }
    setCbhpmSearching(true);
    try {
      const results = await searchCbhpmProcedimentos(q);
      setCbhpmResults(results);
      setCbhpmOpen(true);
    } finally {
      setCbhpmSearching(false);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cbhpmRef.current && !cbhpmRef.current.contains(e.target as Node)) {
        setCbhpmOpen(false);
      }
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
      cirurgiao_nome_manual: "",
      convenio_nome_manual: "",
      observacoes: "",
    },
  });

  const { data: hospitais = [] } = useQuery({ queryKey: ["hospitais"], queryFn: listHospitais });
  const { data: convenios = [] } = useQuery({ queryKey: ["convenios"], queryFn: listConvenios });
  const { data: cirurgioes = [] } = useQuery({ queryKey: ["cirurgioes"], queryFn: listCirurgioes });
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

      let convenioIdFinal = values.convenio_id ?? "";
      let cirurgiaoNomeFinal = "";
      if (!convenioIdFinal && values.convenio_nome_manual?.trim()) {
        const convenio = await getOrCreateConvenioByNome(values.convenio_nome_manual);
        convenioIdFinal = convenio.id;
      }
      if (!convenioIdFinal) throw new Error("Selecione um convênio ou digite um novo.");

      if (values.cirurgiao_id) {
        const cirurgiaoDaLista = cirurgioes.find((item) => item.id === values.cirurgiao_id);
        cirurgiaoNomeFinal = cirurgiaoDaLista?.nome ?? "";
      } else if (values.cirurgiao_nome_manual?.trim()) {
        const cirurgiao = await getOrCreateCirurgiaoByNome(values.cirurgiao_nome_manual);
        cirurgiaoNomeFinal = cirurgiao.nome;
      }
      if (!cirurgiaoNomeFinal) throw new Error("Selecione um cirurgião ou digite um novo.");

      let documentoUrlFinal: string | null = null;
      if (uploadFile) {
        documentoUrlFinal = await uploadProcedimentoDocumento(uploadFile);
      }

      const cbhpm = buildCbhpmPayload(cbhpmList);

      await createProcedimento({
        data_procedimento: values.data_procedimento,
        hospital_id: values.hospital_id,
        paciente_nome: values.paciente_nome,
        cirurgiao_nome: cirurgiaoNomeFinal,
        descricao_procedimento: cbhpm.descricao,
        convenio_id: convenioIdFinal,
        porte: 1,
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

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Paciente</span>
          <input className={errors.paciente_nome ? inputErrorClass : inputClass} placeholder="Nome completo do paciente" {...register("paciente_nome")} />
          {errors.paciente_nome && <span className="text-xs text-red-600">{errors.paciente_nome.message}</span>}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Cirurgião (lista)</span>
            <select className={inputClass} {...register("cirurgiao_id")}>
              <option value="">Selecione...</option>
              {cirurgioes.map((item) => (
                <option key={item.id} value={item.id}>{item.nome}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Ou digite cirurgião novo</span>
            <input className={inputClass} placeholder="Nome do cirurgião" {...register("cirurgiao_nome_manual")} />
          </label>
        </div>

        <div className="grid gap-2 text-sm" ref={cbhpmRef}>
          <span className="font-medium text-slate-700">Procedimentos (CBHPM)</span>

          {cbhpmList.length > 0 && (
            <div className="grid gap-2">
              {cbhpmList.map((item) => (
                <div
                  key={item.codigo}
                  className="flex items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800">{item.descricao}</p>
                    <p className="flex flex-wrap gap-3 text-xs text-slate-500">
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
                    className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-red-100 hover:text-red-600"
                    onClick={() => removeCbhpmItem(item.codigo)}
                    title="Remover"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}

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
                debounceRef.current = setTimeout(() => doCbhpmSearch(v), 300);
              }}
              onFocus={() => {
                if (cbhpmResults.length > 0) setCbhpmOpen(true);
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
              </ul>
            )}
            {cbhpmOpen && cbhpmResults.length === 0 && cbhpmQuery.length >= 2 && !cbhpmSearching && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-center text-sm text-slate-400 shadow-lg">
                Nenhum procedimento encontrado.
              </div>
            )}
          </div>
          {cbhpmError && <span className="text-xs text-red-600">{cbhpmError}</span>}

          {cbhpmList.length > 0 && (
            <p className="text-xs text-slate-400">
              {cbhpmList.length} procedimento{cbhpmList.length > 1 ? "s" : ""} selecionado{cbhpmList.length > 1 ? "s" : ""}
              {" — "}Porte Anestésico máximo: <span className="font-semibold">{buildCbhpmPayload(cbhpmList).porteAnestesico}</span>
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Convênio</span>
            <select className={inputClass} {...register("convenio_id")}>
              <option value="">Selecione...</option>
              {convenios.map((item) => (
                <option key={item.id} value={item.id}>{item.nome}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Ou digite convênio novo</span>
            <input className={inputClass} placeholder="Nome do convênio" {...register("convenio_nome_manual")} />
          </label>
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
