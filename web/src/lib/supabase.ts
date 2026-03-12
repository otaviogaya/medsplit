import { createClient } from "@supabase/supabase-js";

const missingUrl = !process.env.NEXT_PUBLIC_SUPABASE_URL;
const missingAnonKey = !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "public-anon-key";

export const supabaseConfigError =
  missingUrl || missingAnonKey
    ? "Configuracao ausente: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em web/.env.local e reinicie o servidor."
    : null;

if (
  typeof window !== "undefined" &&
  supabaseConfigError
) {
  console.warn(supabaseConfigError);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: async (_name, _acquireTimeout, fn) => await fn(),
  },
});
