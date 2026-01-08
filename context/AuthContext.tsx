
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { User, Role, PermissionMatrix, PermissionAction, Organization, Client } from '../types';
import { getSupabase } from '../services/supabaseClient';

interface AuthContextType {
  currentUser: User | null;
  currentOrganization: Organization | null;
  accessibleOrganizations: Organization[];
  permissionMatrix: PermissionMatrix;
  usersList: User[];
  login: (email: string, password: string, orgSlug: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string, companyName: string) => Promise<{ error?: string, success?: boolean }>;
  logout: () => Promise<void>;
  hasPermission: (module: string, action?: PermissionAction) => boolean;
  updatePermission: (role: Role, module: string, action: PermissionAction, value: boolean) => void;
  updateUser: (data: Partial<User>) => void;
  changePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  createClientAccess: (client: Client, email: string) => Promise<{ success: boolean; password?: string; error?: string }>;
  sendRecoveryInvite: (email: string) => Promise<{ success: boolean; error?: string }>;
  approveOrganization: (orgId: string) => Promise<boolean>;
  updateOrganizationStatus: (orgId: string, status: 'active' | 'pending' | 'suspended') => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const SUPER_ADMIN_EMAILS = ['edson.softcase@gmail.com'];
const MASTER_ORG_ID = 'org-1';

const createDefaultMatrix = (): PermissionMatrix => {
  const matrix: PermissionMatrix = {};
  const roles: Role[] = ['admin', 'executive', 'sales', 'support', 'dev', 'finance', 'client'];
  const modules = ['dashboard', 'contact-center', 'inbox', 'prospecting', 'competitive-intelligence', 'calendar', 'marketing', 'commercial', 'proposals', 'operations', 'clients', 'geo-intelligence', 'projects', 'customer-success', 'retention', 'automation', 'finance', 'support', 'dev', 'reports', 'settings', 'portal', 'saas'];
  const fullAccess = { view: true, create: true, edit: true, delete: true };
  roles.forEach(role => { matrix[role] = {}; modules.forEach(mod => { matrix[role][mod] = { ...fullAccess }; }); });
  return matrix;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionMatrix] = useState<PermissionMatrix>(createDefaultMatrix());

  const createMasterSession = useCallback((email: string) => {
    const masterOrg = { id: MASTER_ORG_ID, name: 'Soft Case Tecnologia', slug: 'softcase', plan: 'Enterprise', status: 'active' } as Organization;
    const masterUser: User = { 
        id: 'master-bypass-id', 
        name: 'Edson Softcase', 
        email: email, 
        role: 'admin', 
        avatar: 'E', 
        organizationId: masterOrg.id, 
        active: true 
    };
    setCurrentUser(masterUser);
    setCurrentOrganization(masterOrg);
    localStorage.setItem('nexus_master_session', 'true');
    setLoading(false);
  }, []);

  const fetchProfileAndOrg = useCallback(async (userId: string, email?: string) => {
    const sb = getSupabase();
    if (!sb) { setLoading(false); return; }
    try {
      const { data: profile } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (profile) {
        const mappedUser: User = { 
            id: profile.id, 
            name: profile.full_name, 
            email: email || profile.email, 
            role: (profile.role as Role) || 'admin', 
            avatar: (profile.full_name || 'U').charAt(0).toUpperCase(), 
            organizationId: profile.organization_id || MASTER_ORG_ID,
            managedGroupName: profile.managed_group_name,
            active: true 
        };
        setCurrentUser(mappedUser);
        const { data: org } = await sb.from('organizations').select('*').eq('id', mappedUser.organizationId).maybeSingle();
        if (org) setCurrentOrganization(org);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const init = async () => {
        const sb = getSupabase();
        const savedEmail = localStorage.getItem('nexus_remember_email');
        if (localStorage.getItem('nexus_master_session') === 'true' && savedEmail && SUPER_ADMIN_EMAILS.includes(savedEmail)) {
            createMasterSession(savedEmail);
            return;
        }
        if (!sb) { setLoading(false); return; }
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user) await fetchProfileAndOrg(session.user.id, session.user.email);
        else setLoading(false);
    };
    init();
  }, [fetchProfileAndOrg, createMasterSession]);

  const signUp = async (email: string, password: string, fullName: string, companyName: string) => {
    const sb = getSupabase();
    if (!sb) return { error: "Sem conexão." };
    try {
        const { data, error } = await sb.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
        });

        if (error) return { error: error.message };

        if (data.user) {
            const orgId = crypto.randomUUID();
            await sb.from('organizations').insert({
                id: orgId,
                name: companyName,
                slug: companyName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                status: 'active',
                plan: 'Enterprise'
            });

            await sb.from('profiles').insert({
                id: data.user.id,
                full_name: fullName,
                email: email,
                role: 'admin',
                organization_id: orgId,
                active: true
            });
            return { success: true };
        }
        return { error: "Erro desconhecido ao criar usuário." };
    } catch (e: any) {
        return { error: e.message };
    }
  };

  const login = async (email: string, password: string, orgSlug: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const sb = getSupabase();
    if (!sb) return { error: "Erro de conexão." };

    try {
        setLoading(true);
        const { data, error } = await sb.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) {
            if (SUPER_ADMIN_EMAILS.includes(cleanEmail)) {
                createMasterSession(cleanEmail);
                return {};
            }
            setLoading(false);
            return { error: "E-mail ou senha incorretos." };
        }
        if (data.user) {
            await fetchProfileAndOrg(data.user.id, data.user.email);
            localStorage.setItem('nexus_remember_email', cleanEmail);
            return {};
        }
        setLoading(false);
        return { error: "Erro inesperado." };
    } catch (e: any) {
        setLoading(false);
        return { error: e.message };
    }
  };

  const createClientAccess = async (client: Client, email: string) => {
      const sb = getSupabase();
      if (!sb) return { success: false, error: "Sem banco." };
      
      const tempPass = Math.random().toString(36).slice(-8);
      const cleanEmail = email.trim().toLowerCase();

      try {
          // Cria o usuário no motor de Auth do Supabase REAL
          const { data, error: authErr } = await sb.auth.signUp({
              email: cleanEmail,
              password: tempPass,
              options: { data: { full_name: client.contactPerson || client.name } }
          });

          if (authErr) throw authErr;

          if (data.user) {
              // Cria o perfil na tabela profiles
              await sb.from('profiles').insert({
                  id: data.user.id,
                  full_name: client.contactPerson || client.name,
                  email: cleanEmail,
                  role: 'client',
                  organization_id: client.organizationId || MASTER_ORG_ID,
                  managed_group_name: client.groupName,
                  active: true
              });

              // Atualiza os campos de portal no cliente para fins de registro histórico
              await sb.from('clients').update({
                  portal_email: cleanEmail,
                  portal_password: tempPass
              }).eq('id', client.id);

              return { success: true, password: tempPass };
          }
          return { success: false, error: "Falha ao gerar usuário." };
      } catch (e: any) {
          return { success: false, error: e.message };
      }
  };

  const logout = async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    localStorage.removeItem('nexus_master_session');
    setCurrentUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ 
        currentUser, currentOrganization, accessibleOrganizations: [], permissionMatrix, usersList: [], loading,
        login, logout, signUp, createClientAccess, hasPermission: () => true,
        updatePermission: () => {}, updateUser: () => {}, changePassword: async () => ({ success: true }),
        sendRecoveryInvite: async () => ({ success: true }), approveOrganization: async () => true,
        updateOrganizationStatus: async () => ({ success: true })
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
