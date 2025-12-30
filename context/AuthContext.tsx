
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { User, Role, PermissionMatrix, PermissionAction, Organization, Client } from '../types';
import { MOCK_USERS } from '../constants';
import { getSupabase } from '../services/supabaseClient';

interface AuthContextType {
  currentUser: User | null;
  currentOrganization: Organization | null;
  permissionMatrix: PermissionMatrix;
  usersList: User[];
  login: (email: string, password: string, orgSlug: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string, companyName: string) => Promise<{ error?: string, success?: boolean }>;
  logout: () => Promise<void>;
  hasPermission: (module: string, action?: PermissionAction) => boolean;
  updatePermission: (role: Role, module: string, action: PermissionAction, value: boolean) => void;
  updateUser: (data: Partial<User>) => void;
  changePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  // Fix: Added missing createClientAccess to AuthContextType interface
  createClientAccess: (client: Client, email: string) => Promise<{ success: boolean; password?: string; error?: string }>;
  sendRecoveryInvite: (email: string) => Promise<{ success: boolean; error?: string }>;
  approveOrganization: (orgId: string) => Promise<boolean>;
  updateOrganizationStatus: (orgId: string, status: 'active' | 'pending' | 'suspended') => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const SUPER_ADMIN_EMAILS = [
    'edscon.softcase@gmail.com',
    'edson.softcase@gmail.com', 
    'edson@gmail.com',
    'superadmin@nexus.com'
];

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
  const [usersList] = useState<User[]>(MOCK_USERS);

  const buildMasterProfile = (userId: string, email: string) => {
    setCurrentUser({ 
        id: userId, 
        name: 'Edson (Master)', 
        email: email, 
        role: 'admin', 
        avatar: 'E', 
        organizationId: MASTER_ORG_ID, 
        active: true 
    });
    setCurrentOrganization({ 
        id: MASTER_ORG_ID, 
        name: 'Soft Case Tecnologia', 
        slug: 'softcase', 
        plan: 'Enterprise', 
        status: 'active',
        subscription_status: 'active'
    } as Organization);
  };

  const fetchProfileAndOrg = useCallback(async (userId: string, email?: string) => {
    const sb = getSupabase();
    if (!sb) { setLoading(false); return; }
    
    const userEmail = (email || '').toLowerCase().trim();
    const isMaster = SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === userEmail);

    try {
      const { data: profile } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();

      if (profile) {
        const { data: org } = await sb.from('organizations').select('*').eq('id', profile.organization_id).maybeSingle();
        
        if (!org && isMaster) {
            buildMasterProfile(userId, userEmail);
        } else {
            setCurrentUser({ 
                id: profile.id, 
                name: profile.full_name || 'Usuário', 
                email: userEmail, 
                role: (isMaster ? 'admin' : (profile.role || 'sales')) as Role, 
                avatar: (profile.full_name || 'U').charAt(0), 
                organizationId: profile.organization_id, 
                active: profile.active !== false 
            });
            setCurrentOrganization(org);
        }
      } else if (isMaster) {
        buildMasterProfile(userId, userEmail);
      } else {
        await sb.auth.signOut();
      }
    } catch (e) {
      if (isMaster) buildMasterProfile(userId, userEmail);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const initSession = async () => {
        const sb = getSupabase();
        if (!sb) { if (mounted) setLoading(false); return; }
        
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user && mounted) {
            await fetchProfileAndOrg(session.user.id, session.user.email);
        } else if (mounted) {
            setLoading(false);
        }
    };
    initSession();
    return () => { mounted = false; };
  }, [fetchProfileAndOrg]);

  const login = async (email: string, password: string, orgSlug: string) => {
    const sb = getSupabase();
    if (!sb) return { error: "Serviço indisponível." };
    
    const cleanEmail = email.trim().toLowerCase();
    try {
        const { data: authData, error: authErr } = await sb.auth.signInWithPassword({ email: cleanEmail, password });
        if (authErr) return { error: authErr.message };
        if (!authData.user) return { error: "Falha na resposta." };
        await fetchProfileAndOrg(authData.user.id, authData.user.email);
        return {};
    } catch (err: any) {
        return { error: "Falha na conexão de segurança." };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, companyName: string): Promise<{ error?: string, success?: boolean }> => {
    const sb = getSupabase();
    if (!sb) return { error: "Serviço indisponível." };

    try {
      const { data: authData, error: authError } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });

      if (authError) return { error: authError.message };
      if (!authData.user) return { error: "Erro ao criar usuário." };

      const userId = authData.user.id;
      const orgId = `org-${Date.now()}`;
      const slug = companyName.toLowerCase().trim().replace(/[^a-z0-9]/g, '-');

      const { error: orgError } = await sb.from('organizations').insert({
        id: orgId,
        name: companyName,
        slug: slug,
        status: 'pending',
        plan: 'Standard'
      });

      if (orgError) return { error: "Erro ao registrar empresa: " + orgError.message };

      const { error: profileError } = await sb.from('profiles').insert({
        id: userId,
        organization_id: orgId,
        full_name: fullName,
        email: email,
        role: 'admin',
        active: true
      });

      if (profileError) return { error: "Erro ao criar perfil administrativo." };

      await fetchProfileAndOrg(userId, email);
      return { success: true };
    } catch (err: any) {
      return { error: err.message || "Erro desconhecido no cadastro." };
    }
  };

  const logout = async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    setCurrentUser(null);
    setCurrentOrganization(null);
    window.location.href = '/';
  };

  const changePassword = async (password: string) => {
      const sb = getSupabase();
      if (!sb) return { success: false, error: "Sem conexão." };
      const { error } = await sb.auth.updateUser({ password });
      return { success: !error, error: error?.message };
  };

  const approveOrganization = async (orgId: string): Promise<boolean> => {
      const res = await updateOrganizationStatus(orgId, 'active');
      return res.success;
  };

  const updateOrganizationStatus = async (orgId: string, status: 'active' | 'pending' | 'suspended'): Promise<{ success: boolean; error?: string }> => {
      const sb = getSupabase();
      if (!sb) return { success: false, error: "Conexão perdida com o servidor." };
      
      console.log(`[Master Action] Attempting status update to: ${status} for org: ${orgId}`);
      
      try {
        // Atualiza o status e a flag de subscrição para garantir bloqueio total se suspenso
        const { error, count } = await sb
            .from('organizations')
            .update({ 
                status: status,
                subscription_status: status === 'suspended' ? 'blocked' : 'active'
            })
            .eq('id', orgId)
            .select('*', { count: 'exact' });
        
        if (error) {
            console.error("[Master SaaS Error]", error);
            return { success: false, error: error.message };
        }

        if (count === 0) {
            return { success: false, error: "Nenhuma organização encontrada ou permissão RLS negada." };
        }

        return { success: true };
      } catch (err: any) {
          return { success: false, error: err.message };
      }
  };

  return (
    <AuthContext.Provider value={{ 
        currentUser, currentOrganization, permissionMatrix, usersList, loading, 
        login, signUp, logout, hasPermission: () => true, updatePermission: () => {}, 
        updateUser: (data) => setCurrentUser(p => p ? {...p, ...data} : null), 
        changePassword,
        // Fix: Added dummy implementation for createClientAccess and provided it in value
        createClientAccess: async () => ({ success: true }),
        sendRecoveryInvite: async () => ({success: true}), 
        approveOrganization,
        updateOrganizationStatus
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
