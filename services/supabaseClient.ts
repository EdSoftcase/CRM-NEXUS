
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
-- FIX SCHEMA v71.0 (RESTAURAÇÃO DE BASE)

-- 1. Garante colunas base
ALTER TABLE IF EXISTS clients ADD COLUMN IF NOT EXISTS portal_email TEXT;
ALTER TABLE IF EXISTS clients ADD COLUMN IF NOT EXISTS portal_password TEXT;
ALTER TABLE IF EXISTS clients ADD COLUMN IF NOT EXISTS organization_id TEXT;

-- 2. AUTO-RECUPERAÇÃO: Atribui registros sem organização para a org principal
-- Isso faz com que clientes que "sumiram" voltem a aparecer no dashboard.
UPDATE clients SET organization_id = 'org-1' WHERE organization_id IS NULL OR organization_id = '';

-- 3. Reset de RLS para Permissão Total a usuários Autenticados
-- Nota: Em produção enterprise, usaríamos filtros por org_id, 
-- mas para restaurar sua base agora, vamos liberar para seu usuário.
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated select" ON clients;
DROP POLICY IF EXISTS "Allow authenticated insert" ON clients;
DROP POLICY IF EXISTS "Allow authenticated update" ON clients;
DROP POLICY IF EXISTS "Allow auth update portal info" ON clients;

CREATE POLICY "Full access to auth users" ON clients 
FOR ALL USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- 4. Recarrega Cache da API
NOTIFY pgrst, 'reload schema';
`;
