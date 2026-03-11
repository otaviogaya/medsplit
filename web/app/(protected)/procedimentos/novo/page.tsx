"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { todayIsoDate } from "@/src/lib/format";
import { getErrorMessage } from "@/src/lib/error";

const schema = z.object({
  data_procedimento: z.string().min(10),
  hospital_id: z.string().uuid(),
  paciente_nome: z.string().min(2),
  cirurgiao_id: z.string().optional(),
  cirurgiao_nome_manual: z.string().optional(),
  descricao_procedimento: z.string().min(2),
  convenio_id: z.string().optional(),
  convenio_nome_manual: z.string().optional(),
  anestesista_principal_id: z.string().uuid(),
  observacoes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NovoProcedimentoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      data_procedimento: todayIsoDate(),
      paciente_nome: "",
      cirurgiao_nome_manual: "",
      descricao_procedimento: "",
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
      form.setValue("anestesista_principal_id", anestesistaAtual.id);
    }
  }, [anestesistaAtual?.id, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setLoading(true);
      setError("");

      let convenioIdFinal = values.convenio_id ?? "";
      let cirurgiaoNomeFinal = "";
      if (!convenioIdFinal && values.convenio_nome_manual?.trim()) {
        const convenio = await getOrCreateConvenioByNome(values.convenio_nome_manual);
        convenioIdFinal = convenio.id;
      }
      if (!convenioIdFinal) throw new Error("Selecione um convenio ou digite um novo.");

      if (values.cirurgiao_id) {
        const cirurgiaoDaLista = cirurgioes.find((item) => item.id === values.cirurgiao_id);
        cirurgiaoNomeFinal = cirurgiaoDaLista?.nome ?? "";
      } else if (values.cirurgiao_nome_manual?.trim()) {
        const cirurgiao = await getOrCreateCirurgiaoByNome(values.cirurgiao_nome_manual);
        cirurgiaoNomeFinal = cirurgiao.nome;
      }
      if (!cirurgiaoNomeFinal) throw new Error("Selecione um cirurgiao ou digite um novo.");

      let documentoUrlFinal: string | null = null;
      if (uploadFile) {
        documentoUrlFinal = await uploadProcedimentoDocumento(uploadFile);
      }

      await createProcedimento({
        data_procedimento: values.data_procedimento,
        hospital_id: values.hospital_id,
        paciente_nome: values.paciente_nome,
        cirurgiao_nome: cirurgiaoNomeFinal,
        descricao_procedimento: values.descricao_procedimento,
        convenio_id: convenioIdFinal,
        porte: 1,
        anestesista_principal_id: values.anestesista_principal_id,
        observacoes: values.observacoes || null,
        documento_foto_url: documentoUrlFinal,
      });
      await queryClient.invalidateQueries({ queryKey: ["procedimentos"] });
      router.push("/procedimentos");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  });

  return (
    <form className="grid max-w-3xl gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold text-slate-900">Novo procedimento</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span>Data do procedimento</span>
          <input className="rounded border border-slate-300 px-3 py-2" type="date" {...form.register("data_procedimento")} />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Hospital</span>
          <select className="rounded border border-slate-300 px-3 py-2" {...form.register("hospital_id")}>
            <option value="">Selecione</option>
            {hospitais.map((item) => (
              <option key={item.id} value={item.id}>{item.nome}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-1 text-sm">
        <span>Paciente</span>
        <input className="rounded border border-slate-300 px-3 py-2" {...form.register("paciente_nome")} />
      </label>
      <label className="grid gap-1 text-sm">
        <span>Cirurgiao (lista)</span>
        <select className="rounded border border-slate-300 px-3 py-2" {...form.register("cirurgiao_id")}>
          <option value="">Selecione</option>
          {cirurgioes.map((item) => (
            <option key={item.id} value={item.id}>{item.nome}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span>Ou digite cirurgiao novo</span>
        <input className="rounded border border-slate-300 px-3 py-2" {...form.register("cirurgiao_nome_manual")} />
      </label>
      <label className="grid gap-1 text-sm">
        <span>Procedimento</span>
        <input className="rounded border border-slate-300 px-3 py-2" {...form.register("descricao_procedimento")} />
      </label>
      <label className="grid gap-1 text-sm">
        <span>Convenio</span>
        <select className="rounded border border-slate-300 px-3 py-2" {...form.register("convenio_id")}>
          <option value="">Selecione</option>
          {convenios.map((item) => (
            <option key={item.id} value={item.id}>{item.nome}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span>Ou digite convenio novo</span>
        <input className="rounded border border-slate-300 px-3 py-2" {...form.register("convenio_nome_manual")} />
      </label>
      <label className="grid gap-1 text-sm">
        <span>Anestesista</span>
        <select className="rounded border border-slate-300 px-3 py-2" {...form.register("anestesista_principal_id")}>
          <option value="">Selecione</option>
          {anestesistas.map((item) => (
            <option key={item.id} value={item.id}>{item.nome}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span>Observacoes</span>
        <textarea className="rounded border border-slate-300 px-3 py-2" rows={3} {...form.register("observacoes")} />
      </label>
      <label className="grid gap-1 text-sm">
        <span>Documento (imagem)</span>
        <input
          accept="image/*"
          className="rounded border border-slate-300 px-3 py-2"
          type="file"
          onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        disabled={loading}
        type="submit"
      >
        {loading ? "Salvando..." : "Salvar procedimento"}
      </button>
    </form>
  );
}
