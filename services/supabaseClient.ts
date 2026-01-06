
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
  return `-- SOFT-CRM ENTERPRISE - SQL MASTER RESET v56.0
-- CORREÇÃO DEFINITIVA: INVOICES, PROJECTS E RLS SECURITY

-- 1. RESET DE SCHEMA
ALTER SCHEMA public OWNER TO postgres;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. TABELA INVOICES (RECONSTRUÇÃO SEGURA)
CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    type TEXT DEFAULT 'Income',
    customer TEXT,
    amount NUMERIC,
    due_date TIMESTAMPTZ,
    status TEXT,
    description TEXT,
    organization_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Forçar adição da coluna type se não existir
DO $$ BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='type') THEN
        ALTER TABLE public.invoices ADD COLUMN type TEXT DEFAULT 'Income';
    END IF;
END $$;

ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.invoices TO anon, authenticated, service_role, postgres;

-- 3. TABELA PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    title TEXT,
    client_name TEXT,
    status TEXT,
    progress NUMERIC,
    start_date TIMESTAMPTZ,
    deadline TIMESTAMPTZ,
    manager TEXT,
    tasks JSONB DEFAULT '[]'::jsonb,
    products JSONB DEFAULT '[]'::jsonb,
    description TEXT,
    organization_id TEXT,
    proposal_id TEXT,
    archived BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    status_updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.projects TO anon, authenticated, service_role, postgres;

-- 4. TABELA ACTIVITIES
CREATE TABLE IF NOT EXISTS public.activities (
    id TEXT PRIMARY KEY,
    title TEXT,
    type TEXT,
    due_date TIMESTAMPTZ,
    completed BOOLEAN DEFAULT false,
    related_to TEXT,
    assignee TEXT,
    organization_id TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.activities DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.activities TO anon, authenticated, service_role, postgres;

-- 5. RECARREGAR CACHE
NOTIFY pgrst, 'reload schema';
`;
};
