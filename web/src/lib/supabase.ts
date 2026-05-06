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

const KEEP_LOGGED_KEY = "sb-keep-logged-in";

function getActiveStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  const keep = window.localStorage.getItem(KEEP_LOGGED_KEY) !== "0";
  return keep ? window.localStorage : window.sessionStorage;
}

const hybridStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === "undefined") return;
    const active = getActiveStorage();
    if (!active) return;
    active.setItem(key, value);
    const other = active === window.localStorage ? window.sessionStorage : window.localStorage;
    other.removeItem(key);
  },
  removeItem: (key: string): void => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

export function setKeepLoggedIn(keep: boolean): void {
  if (typeof window === "undefined") return;
  if (keep) {
    window.localStorage.removeItem(KEEP_LOGGED_KEY);
  } else {
    window.localStorage.setItem(KEEP_LOGGED_KEY, "0");
  }
}

export function getKeepLoggedIn(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(KEEP_LOGGED_KEY) !== "0";
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: hybridStorage,
    lock: async (_name, _acquireTimeout, fn) => await fn(),
  },
});
