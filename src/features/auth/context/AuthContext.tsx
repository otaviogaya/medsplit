import { Session } from "@supabase/supabase-js";
import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { UserRole } from "../../../types/app";

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
    supabase.auth.getSession().then(async ({ data }) => {
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
    });

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
