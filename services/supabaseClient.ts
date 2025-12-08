
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL_KEY = 'nexus_supabase_url';
const SUPABASE_KEY_KEY = 'nexus_supabase_key';

// Helper seguro para ler env vars em produção (Vite)
const getEnv = (key: string): string => {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
        // @ts-ignore
        return import.meta.env[key];
    }
    try {
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key] as string;
        }
    } catch (e) {}
    return '';
}

export const getSupabaseConfig = () => {
  // Prioridade: LocalStorage > Env Vars > Hardcoded Defaults (Request)
  return {
    url: localStorage.getItem(SUPABASE_URL_KEY) || getEnv('VITE_SUPABASE_URL') || 'https://csiolvibjokyedkygzzb.supabase.co',
    key: localStorage.getItem(SUPABASE_KEY_KEY) || getEnv('VITE_SUPABASE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzaW9sdmliam9reWVka3lnenpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMzc0MDcsImV4cCI6MjA3OTgxMzQwN30.6CxUgsU17DeQEVuApMzZ-ij73s7emNrznB7g-EwYfiY'
  };
};

export const saveSupabaseConfig = (url: string, key: string) => {
  const cleanUrl = url ? url.trim() : '';
  const cleanKey = key ? key.trim() : '';

  if (!cleanUrl) localStorage.removeItem(SUPABASE_URL_KEY);
  else localStorage.setItem(SUPABASE_URL_KEY, cleanUrl);
  
  if (!cleanKey) localStorage.removeItem(SUPABASE_KEY_KEY);
  else localStorage.setItem(SUPABASE_KEY_KEY, cleanKey);
  
  // Force reload of instance on next get
  supabaseInstance = null;
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  const { url, key } = getSupabaseConfig();
  
  // Validates if URL and Key exist before trying to create client
  if (!url || !url.startsWith('http') || !key) {
      return null;
  }

  try {
      supabaseInstance = createClient(url, key, {
          auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true
          }
      });
      return supabaseInstance;
  } catch (e) {
      console.error("Failed to init Supabase", e);
      return null;
  }
};

export const testSupabaseConnection = async (): Promise<{ success: boolean; message: string }> => {
    const client = getSupabase();
    
    if (!client) return { success: false, message: "Modo Offline ativo (Sem credenciais configuradas)." };
    
    try {
        // 1. Test Auth Service (Lightweight, always available)
        const { error: authError } = await client.auth.getSession();
        
        if (authError) {
             // Check for network errors vs auth errors
             if (authError.message.includes('fetch') || authError.message.includes('Failed to fetch') || (authError as any).status === 0) {
                 return { success: false, message: "Erro de Rede: Verifique a URL do projeto." };
             }
             return { success: false, message: `Erro de Autenticação: ${authError.message}` };
        }

        // 2. Test Database Service (Check if schema exists)
        const { error: dbError } = await client.from('organizations').select('id').limit(1);

        if (dbError) {
            // Table doesn't exist code
            if (dbError.code === '42P01' || dbError.message.includes('does not exist')) {
                 return { success: true, message: "Conectado! (Aviso: Tabelas não encontradas. Execute o SQL na aba Configurações)" };
            }
            // Permission error (RLS) - means connected but restricted
            if (dbError.code === '42501') {
                return { success: true, message: "Conectado! (Acesso restrito por RLS)" };
            }
            
            return { success: true, message: `Conectado, mas com alerta de banco: ${dbError.message}` };
        }

        return { success: true, message: "Conexão e Banco de Dados operacionais!" };
    } catch (e: any) {
        return { success: false, message: `Erro inesperado: ${e.message}` };
    }
};
