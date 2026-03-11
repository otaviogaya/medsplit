"use client";

import { Session } from "@supabase/supabase-js";
import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { UserRole } from "@/src/types/app";

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  role: UserRole | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  role: null,
  signOut: async () => {},
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInitialSession() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session?.user.id) {
        const { data: profile } = await supabase
          .from("users_profile")
          .select("role")
          .eq("id", data.session.user.id)
          .maybeSingle();
        setRole((profile?.role as UserRole | undefined) ?? null);
      }
      setLoading(false);
    }

    loadInitialSession();

    const { data } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      if (currentSession?.user.id) {
        const { data: profile } = await supabase
          .from("users_profile")
          .select("role")
          .eq("id", currentSession.user.id)
          .maybeSingle();
        setRole((profile?.role as UserRole | undefined) ?? null);
      } else {
        setRole(null);
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        role,
        loading,
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
