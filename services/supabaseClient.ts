import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL_KEY = 'nexus_supabase_url';
const SUPABASE_KEY_KEY = 'nexus_supabase_key';

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
  return `-- SOFT-CRM ENTERPRISE - DATABASE REPAIR SCRIPT (v3.3)
-- Este script renomeia colunas incorretas e aplica as políticas RLS corrigidas.

-- 1. CORREÇÃO DE NOMENCLATURA (MIGRAÇÃO CAMELCASE -> SNAKE_CASE)
DO $$ 
BEGIN
  -- Corrigir tabela issues
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'issues' AND column_name = 'organizationId') THEN
    ALTER TABLE issues RENAME COLUMN "organizationId" TO organization_id;
  END IF;
  
  -- Corrigir tabela profiles
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'organizationId') THEN
    ALTER TABLE profiles RENAME COLUMN "organizationId" TO organization_id;
  END IF;

  -- Corrigir tabela leads
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'organizationId') THEN
    ALTER TABLE leads RENAME COLUMN "organizationId" TO organization_id;
  END IF;

  -- Repetir para outras tabelas se necessário...
END $$;

-- 2. FUNÇÃO HELPER (Retorno robusto como text)
CREATE OR REPLACE FUNCTION get_user_org() RETURNS text AS $$
  SELECT organization_id::text FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. GARANTIR QUE AS TABELAS EXISTAM COM A ESTRUTURA CORRETA
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  plan text DEFAULT 'Standard',
  status text DEFAULT 'pending',
  license_expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  email text,
  role text DEFAULT 'sales',
  organization_id uuid REFERENCES organizations(id),
  related_client_id text,
  xp integer DEFAULT 0,
  level integer DEFAULT 1,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS issues (
  id text PRIMARY KEY,
  title text NOT NULL,
  type text,
  status text,
  points integer,
  assignee text,
  sprint text,
  project text,
  progress integer,
  notes jsonb DEFAULT '[]',
  organization_id uuid REFERENCES organizations(id),
  proposal_id text
);

-- 4. ATIVAR RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS DE ACESSO (Usa cast explícito para text)
DROP POLICY IF EXISTS org_access ON organizations;
CREATE POLICY org_access ON organizations FOR SELECT USING (id::text = get_user_org());

DROP POLICY IF EXISTS profile_access ON profiles;
CREATE POLICY profile_access ON profiles FOR ALL USING (organization_id::text = get_user_org());

DROP POLICY IF EXISTS issue_policy ON issues;
CREATE POLICY issue_policy ON issues FOR ALL USING (organization_id::text = get_user_org());

-- Adicionar políticas para as outras tabelas seguindo o mesmo padrão...
`;
};