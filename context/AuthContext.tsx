
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { User, Role, PermissionMatrix, PermissionAction, Organization, Client } from '../types';
import { MOCK_USERS } from '../constants';
import { getSupabase } from '../services/supabaseClient';
import { sendEmail } from '../services/emailService';

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
  createClientAccess: (client: Client, email: string) => Promise<{ success: boolean; password?: string; error?: string }>;
  sendRecoveryInvite: (email: string) => Promise<{ success: boolean; error?: string }>;
  approveOrganization: (orgId: string) => Promise<boolean>;
  updateOrganizationStatus: (orgId: string, status: 'active' | 'pending' | 'suspended') => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const SUPER_ADMIN_EMAILS = [
    'edson.softcase@gmail.com'
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
        name: 'Edson Softcase', 
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
      const { data: profile, error: profileError } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();

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
                relatedClientId: profile.related_client_id,
                active: profile.active !== false 
            });
            setCurrentOrganization(org);
        }
      } else if (isMaster) {
        buildMasterProfile(userId, userEmail);
      } else {
        // Se for login de cliente novo, talvez o perfil demore 1s para aparecer no cache do Supabase
        // Tentamos uma segunda busca rápida se o e-mail não for Master
        await new Promise(r => setTimeout(r, 800));
        const { data: retryProfile } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (retryProfile) {
            const { data: org } = await sb.from('organizations').select('*').eq('id', retryProfile.organization_id).maybeSingle();
            setCurrentUser({ 
                id: retryProfile.id, 
                name: retryProfile.full_name || 'Usuário', 
                email: userEmail, 
                role: retryProfile.role as Role, 
                avatar: (retryProfile.full_name || 'U').charAt(0), 
                organizationId: retryProfile.organization_id, 
                relatedClientId: retryProfile.related_client_id,
                active: true 
            });
            setCurrentOrganization(org);
        } else {
            await sb.auth.signOut();
        }
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
    if (!sb) return { error: "Serviço de cadastro indisponível." };

    try {
      const { data: authData, error: authError } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });

      if (authError) return { error: authError.message };
      if (!authData.user) return { error: "Erro ao criar credenciais." };

      const userId = authData.user.id;
      const orgId = `org-${Date.now()}`;
      const slug = companyName.toLowerCase().trim().replace(/[^a-z0-9]/g, '-');

      await sb.from('organizations').insert({ id: orgId, name: companyName, slug, status: 'pending', plan: 'Standard' });
      await sb.from('profiles').insert({ id: userId, organization_id: orgId, full_name: fullName, email, role: 'admin', active: true });

      await fetchProfileAndOrg(userId, email);
      return { success: true };
    } catch (err: any) {
      return { error: "Erro no processamento do cadastro." };
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

  const createClientAccess = async (client: Client, email: string): Promise<{ success: boolean; password?: string; error?: string }> => {
    const sb = getSupabase();
    if (!sb) return { success: false, error: "Cloud offline." };

    const targetEmail = email.trim().toLowerCase();
    const tempPassword = Math.random().toString(36).slice(-10) + "@S1";

    try {
      const { data: authData, error: authError } = await sb.auth.signUp({
        email: targetEmail,
        password: tempPassword,
        options: {
          data: { 
              full_name: client.contactPerson || client.name,
              related_client_id: client.id 
          }
        }
      });

      if (authError) {
          if (authError.message.includes("already registered")) {
              const { data: existingProfile } = await sb.from('profiles').select('id').eq('email', targetEmail).maybeSingle();
              if (existingProfile) {
                  await sb.from('profiles').update({
                      role: 'client',
                      related_client_id: client.id,
                      active: true
                  }).eq('id', existingProfile.id);
                  return { success: true, error: "Usuário vinculado ao perfil existente." };
              }
              return { success: false, error: "E-mail em uso em outra organização." };
          }
          return { success: false, error: authError.message };
      }

      if (!authData.user) return { success: false, error: "Erro Auth." };

      const { error: profileError } = await sb.from('profiles').upsert({
        id: authData.user.id,
        organization_id: currentUser?.organizationId || MASTER_ORG_ID,
        full_name: client.contactPerson || client.name,
        email: targetEmail,
        role: 'client',
        related_client_id: client.id, // VÍNCULO CHAVE
        active: true
      });

      if (profileError) return { success: false, error: "Erro Perfil: " + profileError.message };

      sendEmail(
          client.contactPerson,
          targetEmail,
          "Acesso ao Portal - Softpark",
          `Seu acesso foi liberado.\n\nLogin: ${targetEmail}\nSenha: ${tempPassword}`,
          currentUser?.name || 'Softpark'
      ).catch(() => {});

      return { success: true, password: tempPassword };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updateOrganizationStatus = async (orgId: string, status: 'active' | 'pending' | 'suspended'): Promise<{ success: boolean; error?: string }> => {
      const sb = getSupabase();
      if (!sb) return { success: false, error: "Erro de conexão." };
      try {
        const { error } = await sb.from('organizations').update({ status }).eq('id', orgId);
        return { success: !error, error: error?.message };
      } catch (err: any) { return { success: false, error: err.message }; }
  };

  const sendRecoveryInvite = async (email: string) => {
      const sb = getSupabase();
      if (!sb) return { success: false, error: "Sem conexão." };
      const { error } = await sb.auth.resetPasswordForEmail(email);
      return { success: !error, error: error?.message };
  };

  return (
    <AuthContext.Provider value={{ 
        currentUser, currentOrganization, permissionMatrix, usersList, loading, 
        login, signUp, logout, hasPermission: () => true, updatePermission: () => {}, 
        updateUser: (data) => setCurrentUser(p => p ? {...p, ...data} : null), 
        changePassword,
        createClientAccess,
        sendRecoveryInvite, 
        approveOrganization: async (id) => (await updateOrganizationStatus(id, 'active')).success,
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
