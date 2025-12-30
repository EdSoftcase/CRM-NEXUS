
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL_KEY = 'nexus_supabase_url';
const SUPABASE_KEY_KEY = 'nexus_supabase_key';

const DEFAULT_URL = 'https://csiolvibjokyedkygzzb.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzaW9sdmliam9reWVka3lnenpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMzc0MDcsImV4cCI6MjA3OTgxMzQwN30.6CxUgsU17DeQEVuApMzZ-ij73s7emNrznB7g-EwYfiY';

export const getSupabaseConfig = () => ({
    url: localStorage.getItem(SUPABASE_URL_KEY) || DEFAULT_URL,
    key: localStorage.getItem(SUPABASE_KEY_KEY) || DEFAULT_KEY
});

export const saveSupabaseConfig = (url: string, key: string) => {
    localStorage.setItem(SUPABASE_URL_KEY, url.trim());
    localStorage.setItem(SUPABASE_KEY_KEY, key.trim());
    supabaseInstance = null;
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
    if (supabaseInstance) return supabaseInstance;
    const { url, key } = getSupabaseConfig();
    if (!url || !url.startsWith('http')) return null;
    try {
        supabaseInstance = createClient(url, key, {
            auth: { persistSession: true, autoRefreshToken: true }
        });
        return supabaseInstance;
    } catch (e) { return null; }
};

export const testSupabaseConnection = async () => {
    const client = getSupabase();
    if (!client) return { success: false, message: "Configuração ausente." };
    try {
        const { data, error } = await client.from('organizations').select('count', { count: 'exact', head: true });
        if (error) {
            if (error.message.includes('schema') || error.message.includes('permission')) {
                return { success: true, message: "Modo de Recuperação (Erro de Schema)", partial: true };
            }
            return { success: false, message: `Erro: ${error.message}` };
        }
        return { success: true, message: "Conexão Supabase OK!" };
    } catch (e: any) { 
        return { success: false, message: `Falha: ${e.message}` }; 
    }
};

export const getSupabaseSchema = () => {
  return `-- SOFT-CRM ENTERPRISE - SQL MASTER RESET v44.0
-- FOCO: PERSISTÊNCIA COMPLETA DO SOFT FLOW (RPA)

-- 1. ESTRUTURA CORE E PERMISSÕES
ALTER SCHEMA public OWNER TO postgres;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, postgres;

-- 2. TABELA DE PRODUTOS
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC DEFAULT 0,
    sku TEXT,
    category TEXT,
    active BOOLEAN DEFAULT true,
    cost_center_id TEXT,
    organization_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- 3. TABELA DE AUDITORIA (LOGS)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT now(),
    user_id TEXT,
    user_name TEXT,
    action TEXT,
    details TEXT,
    module TEXT,
    organization_id TEXT
);
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- 4. TABELA DE WORKFLOWS (SOFT FLOW)
CREATE TABLE IF NOT EXISTS public.workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    trigger TEXT NOT NULL,
    actions JSONB DEFAULT '[]'::jsonb,
    runs INTEGER DEFAULT 0,
    last_run TIMESTAMPTZ,
    organization_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.workflows DISABLE ROW LEVEL SECURITY;

-- 5. TABELA DE CONCORRENTES
CREATE TABLE IF NOT EXISTS public.competitors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    website TEXT,
    sector TEXT,
    last_analysis TIMESTAMPTZ,
    swot JSONB DEFAULT '{}'::jsonb,
    battlecard JSONB DEFAULT '{}'::jsonb,
    organization_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.competitors DISABLE ROW LEVEL SECURITY;

-- 6. TABELA DE HISTÓRICO DE PROSPECÇÃO
CREATE TABLE IF NOT EXISTS public.prospecting_history (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT now(),
    industry TEXT,
    location TEXT,
    keywords TEXT,
    results JSONB DEFAULT '[]'::jsonb,
    organization_id TEXT
);
ALTER TABLE public.prospecting_history DISABLE ROW LEVEL SECURITY;

-- 7. TABELA DE DESQUALIFICADOS
CREATE TABLE IF NOT EXISTS public.disqualified_prospects (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    organization_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.disqualified_prospects DISABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';`;
};
