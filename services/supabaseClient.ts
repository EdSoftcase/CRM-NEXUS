
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
-- NEXUS SCHEMA REPAIR v92.0
-- Garantia de Tabelas de Sistema (Audit, Webhooks, Fields)

-- 1. Auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT now(),
    user_id TEXT,
    user_name TEXT,
    action TEXT,
    details TEXT,
    module TEXT,
    organization_id TEXT DEFAULT 'org-1'
);

-- 2. Webhooks
CREATE TABLE IF NOT EXISTS public.webhooks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    trigger_event TEXT,
    method TEXT DEFAULT 'POST',
    headers JSONB DEFAULT '{}'::jsonb,
    organization_id TEXT DEFAULT 'org-1'
);

-- 3. Campos Customizados
CREATE TABLE IF NOT EXISTS public.custom_fields (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    key TEXT NOT NULL,
    type TEXT NOT NULL,
    module TEXT NOT NULL,
    options JSONB DEFAULT '[]'::jsonb,
    required BOOLEAN DEFAULT false,
    organization_id TEXT DEFAULT 'org-1'
);

-- 4. Propostas e Vistorias
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS technical_specs JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.technical_visits ADD COLUMN IF NOT EXISTS suggested_items JSONB DEFAULT '[]'::jsonb;

-- Segurança
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Drop and Recreate policies to avoid conflicts
    DROP POLICY IF EXISTS "Enable all" ON public.audit_logs;
    CREATE POLICY "Enable all" ON public.audit_logs FOR ALL USING (true);
    
    DROP POLICY IF EXISTS "Enable all" ON public.webhooks;
    CREATE POLICY "Enable all" ON public.webhooks FOR ALL USING (true);
    
    DROP POLICY IF EXISTS "Enable all" ON public.custom_fields;
    CREATE POLICY "Enable all" ON public.custom_fields FOR ALL USING (true);
END
$$;

NOTIFY pgrst, 'reload schema';
`;
