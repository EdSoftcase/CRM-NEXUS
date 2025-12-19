
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL_KEY = 'nexus_supabase_url';
const SUPABASE_KEY_KEY = 'nexus_supabase_key';

// CREDENCIAIS FIXAS PARA PULAR SETUP (FORNECIDAS PELO USUÁRIO)
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
  return `-- SOFT-CRM ENTERPRISE - SQL SETUP (v8.0 - CNPJ, PHONE, EMAIL)
-- Execute este script no seu SQL Editor do Supabase.

-- 1. ORGANIZAÇÕES
CREATE TABLE IF NOT EXISTS organizations (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  plan text DEFAULT 'Standard',
  status text DEFAULT 'active',
  license_expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2. CLIENTES (ESTRUTURA COMPLETA)
CREATE TABLE IF NOT EXISTS clients (
  id text PRIMARY KEY,
  name text NOT NULL,
  contact_person text,
  document text, -- CNPJ/CPF
  email text,    -- E-mail
  phone text,    -- Telefone
  segment text,
  since timestamptz DEFAULT now(),
  status text DEFAULT 'Active',
  ltv numeric DEFAULT 0,
  organization_id text REFERENCES organizations(id),
  unit text,
  contract_id text,
  contract_start_date text,
  contract_end_date text,
  parking_spots integer DEFAULT 0,
  exempt_spots integer DEFAULT 0,
  vehicle_count integer DEFAULT 0,
  credential_count integer DEFAULT 0,
  pricing_table text,
  table_price numeric DEFAULT 0,
  total_table_price numeric DEFAULT 0,
  special_day text,
  special_price numeric DEFAULT 0,
  total_special_price numeric DEFAULT 0,
  metadata jsonb DEFAULT '{}'
);

-- 3. PATCH DE COLUNAS (PARA BANCOS JÁ EXISTENTES)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS document text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_id text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_start_date text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_end_date text;

-- 4. LEADS
CREATE TABLE IF NOT EXISTS leads (
  id text PRIMARY KEY,
  name text NOT NULL,
  company text,
  email text,
  phone text,
  value numeric DEFAULT 0,
  status text DEFAULT 'Novo',
  source text,
  probability integer DEFAULT 0,
  last_contact timestamptz,
  created_at timestamptz DEFAULT now(),
  organization_id text REFERENCES organizations(id)
);

-- 5. FATURAS
CREATE TABLE IF NOT EXISTS invoices (
  id text PRIMARY KEY,
  type text NOT NULL,
  customer text NOT NULL,
  amount numeric NOT NULL,
  due_date timestamptz NOT NULL,
  status text NOT NULL,
  description text,
  organization_id text REFERENCES organizations(id),
  metadata jsonb DEFAULT '{}'
);

-- ATIVAR RLS E POLÍTICAS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Acesso Total" ON organizations FOR ALL USING (true);
    CREATE POLICY "Acesso Total" ON clients FOR ALL USING (true);
    CREATE POLICY "Acesso Total" ON leads FOR ALL USING (true);
    CREATE POLICY "Acesso Total" ON invoices FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`;
};
