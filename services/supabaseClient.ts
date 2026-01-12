
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
-- FIX SCHEMA v72.0 (RESTAURAÇÃO SOFT SPY)

-- 1. Garante tabela de concorrentes
CREATE TABLE IF NOT EXISTS competitors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    website TEXT,
    sector TEXT,
    swot JSONB DEFAULT '{}'::jsonb,
    battlecard JSONB DEFAULT '{}'::jsonb,
    last_analysis TIMESTAMPTZ,
    organization_id TEXT NOT NULL DEFAULT 'org-1'
);

-- 2. Garante tabela de tendências de mercado
CREATE TABLE IF NOT EXISTS market_trends (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    sentiment TEXT,
    impact TEXT,
    organization_id TEXT DEFAULT 'org-1'
);

-- 3. Reset de RLS para Competitors
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access to auth users on competitors" ON competitors;
CREATE POLICY "Full access to auth users on competitors" ON competitors 
FOR ALL USING (true) WITH CHECK (true);

-- 4. Reset de RLS para Market Trends
ALTER TABLE market_trends ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access to auth users on market_trends" ON market_trends;
CREATE POLICY "Full access to auth users on market_trends" ON market_trends 
FOR ALL USING (true) WITH CHECK (true);

-- 5. Recarrega Cache da API
NOTIFY pgrst, 'reload schema';
`;
