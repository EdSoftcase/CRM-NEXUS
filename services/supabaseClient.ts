
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
  return `-- SOFT-CRM ENTERPRISE - PATCH DEFINITIVO DE SCHEMA E RLS (v24.0)

-- 1. Garante que a tabela 'proposals' existe com a estrutura correta
CREATE TABLE IF NOT EXISTS public.proposals (
    id text PRIMARY KEY,
    organization_id text,
    lead_id text,
    client_id text,
    client_email text,
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

-- 2. Habilita Row Level Security (RLS) para proposals
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Proposals: Full Access for Authenticated" ON public.proposals;
CREATE POLICY "Proposals: Full Access for Authenticated" ON public.proposals FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.proposals TO anon, authenticated, service_role;

-- 3. Garante que a tabela 'projects' existe com a estrutura correta
CREATE TABLE IF NOT EXISTS public.projects (
    id text PRIMARY KEY,
    organization_id text,
    title text,
    client_name text,
    status text,
    progress numeric DEFAULT 0,
    start_date timestamp with time zone DEFAULT now(),
    deadline timestamp with time zone,
    manager text,
    description text,
    install_address text,
    archived boolean DEFAULT false,
    completed_at timestamp with time zone,
    products jsonb DEFAULT '[]'::jsonb,
    installation_notes text,
    proposal_id text,
    status_updated_at timestamp with time zone,
    stage_history jsonb DEFAULT '[]'::jsonb,
    tasks jsonb DEFAULT '[]'::jsonb
);

-- 4. Habilita Row Level Security (RLS) para projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Projects: Full Access for Authenticated" ON public.projects;
CREATE POLICY "Projects: Full Access for Authenticated" ON public.projects FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.projects TO anon, authenticated, service_role;

-- 5. Garantir colunas se a tabela já existia (Migração Suave)
DO $$ 
BEGIN
    -- Colunas para Proposals
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposals' AND column_name='client_email') THEN
        ALTER TABLE proposals ADD COLUMN client_email text;
    END IF;
    
    -- Colunas para Projects
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='proposal_id') THEN
        ALTER TABLE projects ADD COLUMN proposal_id text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='status_updated_at') THEN
        ALTER TABLE projects ADD COLUMN status_updated_at timestamp with time zone;
    END IF;
END $$;

-- 6. FORÇA O RELOAD DO CACHE DE SCHEMA NO SUPABASE
NOTIFY pgrst, 'reload schema';
`;
};
