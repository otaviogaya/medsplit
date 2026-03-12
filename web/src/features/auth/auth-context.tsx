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
    if (supabaseConfigError) {
      return;
    }

    async function loadProfile(userId: string) {
      const { data: profile } = await supabase
        .from("users_profile")
        .select("role, equipe_id")
        .eq("id", userId)
        .maybeSingle();

      setRole((profile?.role as UserRole | undefined) ?? null);
      const eqId = profile?.equipe_id as string | null;
      setEquipeId(eqId);

      if (eqId) {
        const { data: equipe } = await supabase
          .from("equipes")
          .select("nome")
          .eq("id", eqId)
          .maybeSingle();
        setEquipeNome(equipe?.nome ?? null);
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

    const { data } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      if (currentSession?.user.id) {
        await loadProfile(currentSession.user.id);
      } else {
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
