"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/src/features/auth/auth-context";
import { createEquipe, listEquipeMembros, listEquipes } from "@/src/features/equipes/api";
import { getErrorMessage } from "@/src/lib/error";
import { supabase } from "@/src/lib/supabase";
import { useToast } from "@/src/components/toast";
import { SkeletonList } from "@/src/components/skeleton";
import { QueryError } from "@/src/components/query-error";
import { UserRole } from "@/src/types/app";

const inputClass = "rounded-lg border border-slate-300 px-3 py-2.5 text-sm transition w-full";
const btnPrimary =
  "rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60";

const roleOptions: { value: Exclude<UserRole, "superadmin">; label: string }[] = [
  { value: "medico", label: "Médico" },
  { value: "faturamento", label: "Faturamento" },
  { value: "admin", label: "Administrador" },
];

type CreatedCredentials = {
  nome: string;
  email: string;
  password: string;
  role: string;
  equipeNome: string;
  loginUrl: string;
};

function CredentialsCard({ creds, onDismiss }: { creds: CreatedCredentials; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  const roleLabel: Record<string, string> = {
    admin: "Administrador",
    medico: "Médico",
    faturamento: "Faturamento",
  };

  const text = [
    `Acesso MedSplit`,
    `Nome: ${creds.nome}`,
    `E-mail: ${creds.email}`,
    `Senha: ${creds.password}`,
    `Perfil: ${roleLabel[creds.role] ?? creds.role}`,
    `Equipe: ${creds.equipeNome}`,
    `Link de acesso: ${creds.loginUrl}`,
  ].join("\n");

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border-2 border-green-300 bg-green-50 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">✅</span>
        <h3 className="font-semibold text-green-800">Usuário criado com sucesso!</h3>
      </div>
      <p className="mb-3 text-sm text-green-700">
        Compartilhe as credenciais abaixo com o novo usuário:
      </p>
      <div className="grid gap-1.5 rounded-lg bg-white p-4 text-sm">
        <p><span className="font-medium text-slate-500">Nome:</span> <span className="text-slate-900">{creds.nome}</span></p>
        <p><span className="font-medium text-slate-500">E-mail:</span> <span className="text-slate-900">{creds.email}</span></p>
        <p><span className="font-medium text-slate-500">Senha:</span> <span className="font-mono text-slate-900">{creds.password}</span></p>
        <p><span className="font-medium text-slate-500">Perfil:</span> <span className="text-slate-900">{roleLabel[creds.role] ?? creds.role}</span></p>
        <p><span className="font-medium text-slate-500">Equipe:</span> <span className="text-slate-900">{creds.equipeNome}</span></p>
        <div className="mt-2 flex items-center gap-2">
          <span className="font-medium text-slate-500">Link:</span>
          <a
            className="text-blue-600 underline break-all"
            href={creds.loginUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {creds.loginUrl}
          </a>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button className={btnPrimary} onClick={handleCopy} type="button">
          {copied ? "Copiado!" : "Copiar credenciais"}
        </button>
        <button
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          onClick={onDismiss}
          type="button"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

function EquipeMembros({ equipeId }: { equipeId: string }) {
  const { data: membros = [], isLoading } = useQuery({
    queryKey: ["equipe-membros", equipeId],
    queryFn: () => listEquipeMembros(equipeId),
  });

  if (isLoading) return <p className="text-xs text-slate-400">Carregando...</p>;
  if (membros.length === 0) return <p className="text-xs text-slate-400">Nenhum membro</p>;

  const roleLabel: Record<string, string> = {
    admin: "Admin",
    medico: "Médico",
    faturamento: "Faturamento",
    superadmin: "Super Admin",
  };

  return (
    <ul className="grid gap-1">
      {membros.map((m) => (
        <li key={m.id} className="flex items-center justify-between text-sm">
          <span className={m.ativo ? "text-slate-700" : "text-slate-400 line-through"}>{m.nome}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {roleLabel[m.role] ?? m.role}
          </span>
        </li>
      ))}
    </ul>
  );
}

function TabUsuarios({ equipes }: { equipes: { id: string; nome: string }[] }) {
  const toast = useToast();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userRole, setUserRole] = useState<string>("medico");
  const [equipeId, setEquipeId] = useState(equipes[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdCreds, setCreatedCreds] = useState<CreatedCredentials | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !password.trim() || !equipeId) {
      setError("Preencha todos os campos.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome: nome.trim(),
            role: userRole,
            equipe_id: equipeId,
          },
        },
      });
      if (signUpError) throw signUpError;

      const selectedEquipe = equipes.find((eq) => eq.id === equipeId);
      setCreatedCreds({
        nome: nome.trim(),
        email,
        password,
        role: userRole,
        equipeNome: selectedEquipe?.nome ?? "—",
        loginUrl: `${window.location.origin}/login`,
      });

      toast("Usuário criado com sucesso!");
      setNome("");
      setEmail("");
      setPassword("");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4">
      {createdCreds ? (
        <CredentialsCard creds={createdCreds} onDismiss={() => setCreatedCreds(null)} />
      ) : null}

      <form
        className="max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={handleSubmit}
      >
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Novo usuário
        </h2>
        <div className="grid gap-4">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Nome</span>
            <input
              autoComplete="name"
              className={inputClass}
              placeholder="Nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">E-mail</span>
            <input
              autoComplete="off"
              className={inputClass}
              placeholder="usuario@email.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Senha provisória</span>
            <input
              autoComplete="new-password"
              className={inputClass}
              placeholder="Mínimo 6 caracteres"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Perfil</span>
            <select className={inputClass} value={userRole} onChange={(e) => setUserRole(e.target.value)}>
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Equipe</span>
            <select className={inputClass} value={equipeId} onChange={(e) => setEquipeId(e.target.value)}>
              <option value="">Selecione a equipe</option>
              {equipes.map((eq) => (
                <option key={eq.id} value={eq.id}>{eq.nome}</option>
              ))}
            </select>
          </label>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button className={btnPrimary + " mt-5"} disabled={loading} type="submit">
          {loading ? "Criando..." : "Criar usuário"}
        </button>
      </form>
    </div>
  );
}

function TabEquipes() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [nomeEquipe, setNomeEquipe] = useState("");
  const [adminNome, setAdminNome] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createdCreds, setCreatedCreds] = useState<CreatedCredentials | null>(null);

  const { data: equipes = [], isLoading, error: queryError } = useQuery({
    queryKey: ["equipes"],
    queryFn: listEquipes,
  });

  async function handleCreateEquipe(e: React.FormEvent) {
    e.preventDefault();
    if (!nomeEquipe.trim()) {
      setError("Informe o nome da equipe.");
      return;
    }
    if (!adminNome.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      setError("Preencha os dados do administrador da equipe.");
      return;
    }
    if (adminPassword.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const { data: equipeIdData, error: equipeError } = await supabase.rpc("create_equipe", {
        p_nome: nomeEquipe.trim(),
      });
      if (equipeError) throw equipeError;

      const newEquipeId = equipeIdData as string;

      const { error: signUpError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: {
            nome: adminNome.trim(),
            role: "admin",
            equipe_id: newEquipeId,
          },
        },
      });
      if (signUpError) throw signUpError;

      setCreatedCreds({
        nome: adminNome.trim(),
        email: adminEmail,
        password: adminPassword,
        role: "admin",
        equipeNome: nomeEquipe.trim(),
        loginUrl: `${window.location.origin}/login`,
      });

      toast("Equipe e administrador criados com sucesso!");
      setNomeEquipe("");
      setAdminNome("");
      setAdminEmail("");
      setAdminPassword("");
      queryClient.invalidateQueries({ queryKey: ["equipes"] });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="grid gap-4">
      {createdCreds ? (
        <CredentialsCard creds={createdCreds} onDismiss={() => setCreatedCreds(null)} />
      ) : null}

      <form
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={handleCreateEquipe}
      >
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Nova equipe
        </h2>
        <div className="grid gap-4">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-700">Nome da equipe</span>
            <input
              className={inputClass}
              placeholder="Ex: Equipe Dr. Silva"
              value={nomeEquipe}
              onChange={(e) => setNomeEquipe(e.target.value)}
            />
          </label>

          <div className="border-t border-slate-100 pt-4">
            <p className="mb-3 text-sm font-medium text-slate-600">
              Administrador inicial da equipe
            </p>
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Nome</span>
                <input
                  autoComplete="off"
                  className={inputClass}
                  placeholder="Nome completo"
                  value={adminNome}
                  onChange={(e) => setAdminNome(e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">E-mail</span>
                <input
                  autoComplete="off"
                  className={inputClass}
                  placeholder="admin@email.com"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-700">Senha provisória</span>
                <input
                  autoComplete="new-password"
                  className={inputClass}
                  placeholder="Mínimo 6 caracteres"
                  type="text"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </label>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button className={btnPrimary + " mt-5"} disabled={creating} type="submit">
          {creating ? "Criando..." : "Criar equipe + administrador"}
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Equipes cadastradas
        </h2>

        {isLoading ? <SkeletonList count={3} /> : null}
        {queryError ? <QueryError error={queryError} /> : null}

        {equipes.length > 0 ? (
          <div className="grid gap-3">
            {equipes.map((eq) => (
              <div key={eq.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <button
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setExpandedId(expandedId === eq.id ? null : eq.id)}
                  type="button"
                >
                  <div>
                    <h3 className="font-medium text-slate-900">{eq.nome}</h3>
                    <p className="text-xs text-slate-500">
                      {eq.membros_count} {eq.membros_count === 1 ? "membro" : "membros"}
                    </p>
                  </div>
                  <span className="text-slate-400">{expandedId === eq.id ? "▲" : "▼"}</span>
                </button>
                {expandedId === eq.id ? (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <EquipeMembros equipeId={eq.id} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {!isLoading && !queryError && equipes.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
            <p className="text-sm text-slate-500">Nenhuma equipe cadastrada.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const tabs = [
  { id: "usuarios", label: "Criar Usuário" },
  { id: "equipes", label: "Equipes" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function AdminPanelPage() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("usuarios");

  const { data: equipes = [] } = useQuery({
    queryKey: ["equipes"],
    queryFn: listEquipes,
  });

  if (role !== "superadmin") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-500">Apenas o super administrador pode acessar o painel.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Admin Panel</h1>

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "usuarios" ? <TabUsuarios equipes={equipes} /> : null}
      {activeTab === "equipes" ? <TabEquipes /> : null}
    </div>
  );
}
