
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
  adminUpdateUser: (userId: string, data: Partial<User>) => Promise<void>;
  adminDeleteUser: (userId: string) => Promise<void>;
  addTeamMember: (name: string, email: string, role: Role) => Promise<{success: boolean, password?: string, error?: string}>;
  changePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  createClientAccess: (client: Client, email: string) => Promise<{ success: boolean, password?: string, error?: string }>;
  sendRecoveryInvite: (email: string) => Promise<{ success: boolean; error?: string }>;
  approveOrganization: (orgId: string) => Promise<boolean>;
  updateOrganizationStatus: (orgId: string, status: 'active' | 'pending' | 'suspended') => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const SUPER_ADMIN_EMAILS = ['edson.softcase@gmail.com'];
const MASTER_ORG_ID = 'org-1';

const ALL_MODULES = [
    'dashboard', 'contact-center', 'inbox', 'prospecting', 'competitive-intelligence', 
    'calendar', 'marketing', 'commercial', 'proposals', 'operations', 'clients', 
    'geo-intelligence', 'projects', 'customer-success', 'retention', 'automation', 
    'finance', 'support', 'dev', 'reports', 'settings', 'portal', 'saas'
];

const createDefaultMatrix = (): PermissionMatrix => {
  const matrix: PermissionMatrix = {};
  const roles: Role[] = ['admin', 'executive', 'sales', 'support', 'dev', 'finance', 'client', 'production'];
  const fullAccess = { view: true, create: true, edit: true, delete: true };
  const noAccess = { view: false, create: false, edit: false, delete: false };

  roles.forEach(role => {
    matrix[role] = {};
    ALL_MODULES.forEach(mod => {
      if (role === 'admin') {
          matrix[role][mod] = { ...fullAccess };
      } else if (role === 'production') {
          if (['operations', 'projects', 'support', 'dashboard', 'calendar'].includes(mod)) {
              matrix[role][mod] = { ...fullAccess };
          } else {
              matrix[role][mod] = { ...noAccess };
          }
      } else if (role === 'client') {
          matrix[role][mod] = mod.startsWith('portal') ? { ...fullAccess } : { ...noAccess };
      } else {
          matrix[role][mod] = { ...fullAccess };
      }
    });
  });
  return matrix;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix>(() => {
    const saved = localStorage.getItem('nexus_perm_matrix_v4');
    return saved ? JSON.parse(saved) : createDefaultMatrix();
  });

  const refreshUsers = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !currentUser?.organizationId) return;

    try {
        const { data, error } = await sb
            .from('profiles')
            .select('*')
            .eq('organization_id', currentUser.organizationId);

        if (!error && data) {
            const mapped: User[] = data.map(p => ({
                id: p.id,
                name: p.full_name,
                email: p.email,
                role: (p.role as Role) || 'sales',
                avatar: (p.full_name || 'U').charAt(0).toUpperCase(),
                organizationId: p.organization_id,
                active: p.active !== false
            }));
            setUsersList(mapped);
        }
    } catch (e) {
        console.error("Error refreshing users:", e);
    }
  }, [currentUser?.organizationId]);

  const createMasterSession = useCallback((email: string) => {
    const safeEmail = (email || '').trim().toLowerCase();
    const masterOrg = { id: MASTER_ORG_ID, name: 'Soft Case Tecnologia', slug: 'softcase', plan: 'Enterprise', status: 'active' } as Organization;
    const masterUser: User = { 
        id: 'master-bypass-id', 
        name: 'Edson Softcase', 
        email: safeEmail, 
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
            relatedClientId: profile.related_client_id,
            active: profile.active !== false 
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
        if (localStorage.getItem('nexus_master_session') === 'true' && savedEmail && SUPER_ADMIN_EMAILS.includes(savedEmail.toLowerCase())) {
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

  useEffect(() => {
    if (currentUser?.organizationId) {
        refreshUsers();
    }
  }, [currentUser?.organizationId, refreshUsers]);

  const signUp = async (email: string, password: string, fullName: string, companyName: string) => {
    const sb = getSupabase();
    if (!sb) return { error: "Sem conexão." };
    try {
        const { data, error } = await sb.auth.signUp({
            email: (email || '').trim(),
            password,
            options: { data: { full_name: fullName } }
        });
        if (error) return { error: error.message };
        if (data.user) {
            const orgId = crypto.randomUUID();
            await sb.from('organizations').insert({
                id: orgId,
                name: companyName,
                slug: (companyName || '').toLowerCase().replace(/[^a-z0-9]/g, '-'),
                status: 'active',
                plan: 'Enterprise'
            });
            await sb.from('profiles').insert({
                id: data.user.id,
                full_name: fullName,
                email: (email || '').trim().toLowerCase(),
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
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return { error: "E-mail obrigatório." };

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

  const addTeamMember = async (name: string, email: string, role: Role) => {
    const sb = getSupabase();
    if (!sb || !currentUser?.organizationId) return { success: false, error: "Sem conexão Cloud." };
    
    const tempPassword = "SC" + Math.random().toString(36).slice(-6).toUpperCase() + "!";
    
    try {
        const { data, error: authError } = await sb.auth.signUp({
            email: email.trim().toLowerCase(),
            password: tempPassword,
            options: { data: { full_name: name } }
        });

        if (authError) throw authError;

        if (data.user) {
            await sb.from('profiles').insert({
                id: data.user.id,
                full_name: name,
                email: email.trim().toLowerCase(),
                role: role,
                organization_id: currentUser.organizationId,
                active: true
            });
            await refreshUsers();
            return { success: true, password: tempPassword };
        }
        return { success: false, error: "Erro ao criar credenciais." };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const createClientAccess = async (client: Client, email: string) => {
    const sb = getSupabase();
    const tempPassword = "SC" + Math.random().toString(36).slice(-6).toUpperCase() + "!";
    const cleanEmail = email.trim().toLowerCase();

    if (!sb || !currentUser?.organizationId) {
        // Fallback para modo offline/demonstração
        return { success: true, password: tempPassword };
    }

    try {
        // 1. Criar o usuário no Auth do Supabase
        const { data: authData, error: authError } = await sb.auth.signUp({
            email: cleanEmail,
            password: tempPassword,
            options: { data: { full_name: client.name } }
        });

        if (authError && authError.message.includes('already registered')) {
            // Se já existir, apenas tentamos atualizar o perfil para garantir o vínculo
            const { data: existingUser } = await sb.from('profiles').select('id').eq('email', cleanEmail).maybeSingle();
            if (existingUser) {
                await sb.from('profiles').update({
                    role: 'client',
                    related_client_id: client.id,
                    managed_group_name: client.groupName || null,
                    active: true
                }).eq('id', existingUser.id);
                return { success: true, password: "(Usuário já existente - Senha mantida)" };
            }
            throw authError;
        }

        if (authData.user) {
            // 2. Criar o perfil vinculado
            await sb.from('profiles').insert({
                id: authData.user.id,
                full_name: client.name,
                email: cleanEmail,
                role: 'client',
                organization_id: currentUser.organizationId,
                related_client_id: client.id,
                managed_group_name: client.groupName || null,
                active: true
            });
            return { success: true, password: tempPassword };
        }
        return { success: false, error: "Falha ao provisionar Auth." };
    } catch (e: any) {
        console.error("Provisioning error:", e);
        return { success: false, error: e.message };
    }
  };

  const adminDeleteUser = async (userId: string) => {
    const sb = getSupabase();
    if (!sb) return;
    try {
        const { error } = await sb.from('profiles').delete().eq('id', userId);
        if (!error) await refreshUsers();
    } catch (e) { console.error(e); }
  };

  const logout = async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    localStorage.removeItem('nexus_master_session');
    setCurrentUser(null);
    window.location.href = '/';
  };

  const hasPermission = (module: string, action: PermissionAction = 'view'): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true; 
    const rolePerms = permissionMatrix[currentUser.role];
    if (!rolePerms) return false;
    const moduleKey = (module || '').toLowerCase();
    if (!rolePerms[moduleKey]) return false;
    return rolePerms[moduleKey][action] === true;
  };

  const updatePermission = (role: Role, module: string, action: PermissionAction, value: boolean) => {
    setPermissionMatrix(prev => {
        const currentRoleMatrix = prev[role] || {};
        const currentModulePerms = currentRoleMatrix[module] || { view: false, create: false, edit: false, delete: false };
        const next = { ...prev, [role]: { ...currentRoleMatrix, [module]: { ...currentModulePerms, [action]: value } } };
        localStorage.setItem('nexus_perm_matrix_v4', JSON.stringify(next));
        return next;
    });
  };

  return (
    <AuthContext.Provider value={{ 
        currentUser, currentOrganization, accessibleOrganizations: [], permissionMatrix, usersList, loading,
        login, logout, signUp, hasPermission, updatePermission, 
        adminUpdateUser: async () => {}, adminDeleteUser, addTeamMember,
        createClientAccess,
        refreshUsers,
        updateUser: (data) => setCurrentUser(prev => prev ? {...prev, ...data} : null), 
        changePassword: async () => ({ success: true }),
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
