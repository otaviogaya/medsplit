"use client";

import { Session } from "@supabase/supabase-js";
import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import { supabase, supabaseConfigError } from "@/src/lib/supabase";
import { UserRole } from "@/src/types/app";

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  role: UserRole | null;
  equipeId: string | null;
  equipeNome: string | null;
  configError: string | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  role: null,
  equipeId: null,
  equipeNome: null,
  configError: null,
  signOut: async () => {},
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [equipeId, setEquipeId] = useState<string | null>(null);
  const [equipeNome, setEquipeNome] = useState<string | null>(null);
  const [loading, setLoading] = useState(!supabaseConfigError);

  useEffect(() => {
    if (supabaseConfigError) return;

    let profileLoadedForUser: string | null = null;

    async function loadProfile(userId: string) {
      if (profileLoadedForUser === userId) return;
      profileLoadedForUser = userId;

      const { data: profile } = await supabase
        .from("users_profile")
        .select("role, equipe_id")
        .eq("id", userId)
        .maybeSingle();

      const userRole = (profile?.role as UserRole | undefined) ?? null;
      const eqId = profile?.equipe_id as string | null;
      setRole(userRole);
      setEquipeId(eqId);

      if (eqId) {
        supabase
          .from("equipes")
          .select("nome")
          .eq("id", eqId)
          .maybeSingle()
          .then(({ data: equipe }) => setEquipeNome(equipe?.nome ?? null));
      } else {
        setEquipeNome(null);
      }
    }

    async function loadInitialSession() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session?.user.id) {
        await loadProfile(data.session.user.id);
      }
      setLoading(false);
    }

    loadInitialSession();

    const { data } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (currentSession?.user.id) {
        loadProfile(currentSession.user.id);
      } else {
        profileLoadedForUser = null;
        setRole(null);
        setEquipeId(null);
        setEquipeNome(null);
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        role,
        equipeId,
        equipeNome,
        loading,
        configError: supabaseConfigError,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
