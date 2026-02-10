
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://csiolvibjokyedkygzzb.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzaW9sdmliam9reWVka3lnenpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMzc0MDcsImV4cCI6MjA3OTgxMzQwN30.6CxUgsU17DeQEVuApMzZ-ij73s7emNrznB7g-EwYfiY';

let supabase: SupabaseClient | null = null;

const initSupabase = () => {
    const url = process.env.VITE_SUPABASE_URL || localStorage.getItem('nexus_supabase_url') || DEFAULT_URL;
    const key = process.env.VITE_SUPABASE_KEY || localStorage.getItem('nexus_supabase_key') || DEFAULT_KEY;

    if (url && key && url !== 'undefined' && key !== 'undefined') {
        try {
            supabase = createClient(url, key, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                }
            });
        } catch (e) {
            console.error("Erro ao inicializar Supabase:", e);
        }
    }
};

initSupabase();

export const getSupabase = () => {
    if (!supabase) initSupabase();
    return supabase;
};

export const getSupabaseConfig = () => ({
    url: process.env.VITE_SUPABASE_URL || localStorage.getItem('nexus_supabase_url') || DEFAULT_URL,
    key: process.env.VITE_SUPABASE_KEY || localStorage.getItem('nexus_supabase_key') || DEFAULT_KEY
});

export const saveSupabaseConfig = (url: string, key: string) => {
    localStorage.setItem('nexus_supabase_url', url);
    localStorage.setItem('nexus_supabase_key', key);
    initSupabase();
};

export const testSupabaseConnection = async (): Promise<{ success: boolean; message: string }> => {
    const sb = getSupabase();
    if (!sb) return { success: false, message: "Configuração ausente." };
    try {
        const { error } = await sb.from('organizations').select('id').limit(1);
        if (error) throw error;
        return { success: true, message: "Conectado ao Cloud." };
    } catch (e: any) {
        return { success: false, message: e.message || "Erro de conexão." };
    }
};

export const getSupabaseSchema = () => `
-- NEXUS SCHEMA REPAIR v89.0
-- Ajuste de Idempotência e Technical Specs

-- 1. Tabela de Propostas
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS technical_specs JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS monthly_cost NUMERIC DEFAULT 0;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS setup_cost NUMERIC DEFAULT 0;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS scope JSONB DEFAULT '[]'::jsonb;

-- 2. Tabela de Vistorias Técnicas (Fix Idempotência de Política)
CREATE TABLE IF NOT EXISTS public.technical_visits (
    id TEXT PRIMARY KEY,
    target_id TEXT NOT NULL,
    target_name TEXT NOT NULL,
    target_type TEXT NOT NULL,
    scheduled_date TIMESTAMPTZ DEFAULT now(),
    technician_name TEXT,
    status TEXT DEFAULT 'Agendada',
    report TEXT,
    infrastructure_notes TEXT,
    suggested_items JSONB DEFAULT '[]'::jsonb,
    organization_id TEXT DEFAULT 'org-1',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir que RLS esteja ativo
ALTER TABLE public.technical_visits ENABLE ROW LEVEL SECURITY;

-- Excluir política se ela já existir para evitar erro 42710
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'technical_visits' 
        AND policyname = 'Enable all for same org'
    ) THEN
        DROP POLICY "Enable all for same org" ON public.technical_visits;
    END IF;
END
$$;

-- Criar política do zero
CREATE POLICY "Enable all for same org" ON public.technical_visits FOR ALL USING (true);

-- 3. Tabela de Projetos
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS technical_specs JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS products JSONB DEFAULT '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
`;
