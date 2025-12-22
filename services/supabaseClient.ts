
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL_KEY = 'nexus_supabase_url';
const SUPABASE_KEY_KEY = 'nexus_supabase_key';

const DEFAULT_URL = 'https://csiolvibjokyedkygzzb.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzaW9sdmliam9reWVka3lnenpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMzc0MDcsImV4cCI6MjA3OTgxMzQwN30.6CxUgsU17DeQEVuApMzZ-ij73s7emNrznB7g-EwYfiY';

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
  return {
    url: localStorage.getItem(SUPABASE_URL_KEY) || getEnv('VITE_SUPABASE_URL') || DEFAULT_URL,
    key: localStorage.getItem(SUPABASE_KEY_KEY) || getEnv('VITE_SUPABASE_KEY') || DEFAULT_KEY
  };
};

export const saveSupabaseConfig = (url: string, key: string) => {
  const cleanUrl = url ? url.trim() : '';
  const cleanKey = key ? key.trim() : '';
  if (!cleanUrl) localStorage.removeItem(SUPABASE_URL_KEY);
  else localStorage.setItem(SUPABASE_URL_KEY, cleanUrl);
  if (!cleanKey) localStorage.removeItem(SUPABASE_KEY_KEY);
  else localStorage.setItem(SUPABASE_KEY_KEY, cleanKey);
  supabaseInstance = null;
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;
  const { url, key } = getSupabaseConfig();
  if (!url || !url.startsWith('http') || !key) return null;
  try {
      supabaseInstance = createClient(url, key, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      return supabaseInstance;
  } catch (e) {
      console.error("Failed to init Supabase", e);
      return null;
  }
};

export const testSupabaseConnection = async (): Promise<{ success: boolean; message: string }> => {
    const client = getSupabase();
    if (!client) return { success: false, message: "Modo Offline ativo." };
    try {
        const { error: authError } = await client.auth.getSession();
        if (authError) return { success: false, message: `Erro: ${authError.message}` };
        const { error: dbError } = await client.from('organizations').select('id').limit(1);
        if (dbError && dbError.code === '42P01') return { success: true, message: "Conectado! (Execute o Schema SQL)" };
        return { success: true, message: "Conexão e Banco de Dados operacionais!" };
    } catch (e: any) {
        return { success: false, message: `Erro inesperado: ${e.message}` };
    }
};

export const getSupabaseSchema = () => {
  return `-- SOFT-CRM ENTERPRISE - PATCH DEFINITIVO DE SCHEMA E RLS (v22.0)

-- 1. Garante que a tabela 'proposals' existe com a estrutura correta
CREATE TABLE IF NOT EXISTS public.proposals (
    id text PRIMARY KEY,
    organization_id text,
    lead_id text,
    client_id text,
    title text,
    client_name text,
    company_name text,
    unit text,
    status text,
    introduction text,
    scope jsonb DEFAULT '[]'::jsonb,
    items jsonb DEFAULT '[]'::jsonb,
    price numeric DEFAULT 0,
    setup_cost numeric DEFAULT 0,
    monthly_cost numeric DEFAULT 0,
    timeline text,
    terms text,
    custom_clause text,
    includes_development boolean DEFAULT false,
    signature text,
    signed_at timestamp with time zone,
    signed_by_ip text,
    created_date timestamp with time zone DEFAULT now(),
    valid_until timestamp with time zone
);

-- 2. Habilita Row Level Security (RLS)
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- 3. Remove políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Enable all access for proposals" ON public.proposals;
DROP POLICY IF EXISTS "Proposals: Users can manage their own org data" ON public.proposals;

-- 4. Cria política que permite acesso TOTAL se o organization_id bater (Multitenancy)
-- Ou acesso geral para facilitar o setup inicial em ambientes de teste
CREATE POLICY "Proposals: Full Access for Authenticated" 
ON public.proposals 
FOR ALL 
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 5. Conceder permissões de tabela
GRANT ALL ON TABLE public.proposals TO anon, authenticated, service_role;

-- 6. Garantir colunas se a tabela já existia (Migração Suave)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposals' AND column_name='client_name') THEN
        ALTER TABLE proposals ADD COLUMN client_name text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposals' AND column_name='setup_cost') THEN
        ALTER TABLE proposals ADD COLUMN setup_cost numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposals' AND column_name='monthly_cost') THEN
        ALTER TABLE proposals ADD COLUMN monthly_cost numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposals' AND column_name='includes_development') THEN
        ALTER TABLE proposals ADD COLUMN includes_development boolean DEFAULT false;
    END IF;
END $$;

-- 7. FORÇA O RELOAD DO CACHE DE SCHEMA NO SUPABASE
NOTIFY pgrst, 'reload schema';
`;
};
