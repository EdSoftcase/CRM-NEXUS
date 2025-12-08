
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, Role, PermissionMatrix, PermissionAction, Organization, Client } from '../types';
import { MOCK_USERS } from '../constants';
import { getSupabase } from '../services/supabaseClient';

interface AuthContextType {
  currentUser: User | null;
  currentOrganization: Organization | null;
  permissionMatrix: PermissionMatrix;
  usersList: User[];
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string, companyName: string) => Promise<{ error?: string, success?: boolean }>;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => void;
  hasPermission: (module: string, action?: PermissionAction) => boolean;
  updatePermission: (role: Role, module: string, action: PermissionAction, value: boolean) => void;
  updateUser: (data: Partial<User>) => void;
  adminUpdateUser: (userId: string, data: Partial<User>) => Promise<void>;
  adminDeleteUser: (userId: string) => Promise<void>;
  addTeamMember: (name: string, email: string, role: Role) => Promise<{success: boolean, error?: string}>;
  createClientAccess: (client: Client, email: string) => Promise<{ success: boolean, password?: string, error?: string }>;
  sendRecoveryInvite: (email: string) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default Matrix Builder
const createDefaultMatrix = (): PermissionMatrix => {
  const matrix: PermissionMatrix = {};
  const roles: Role[] = ['admin', 'executive', 'sales', 'support', 'dev', 'finance', 'client'];
  const modules = ['dashboard', 'commercial', 'clients', 'finance', 'support', 'dev', 'reports', 'settings', 'customer-success', 'proposals', 'retention', 'calendar', 'marketing', 'automation', 'geo-intelligence', 'portal', 'projects', 'inbox', 'prospecting', 'competitive-intelligence', 'operations'];
  const noAccess = { view: false, create: false, edit: false, delete: false };
  const fullAccess = { view: true, create: true, edit: true, delete: true };
  const viewOnly = { view: true, create: false, edit: false, delete: false };

  roles.forEach(role => {
    matrix[role] = {};
    modules.forEach(mod => {
      matrix[role][mod] = { ...noAccess };
    });
  });

  // Default permissions logic
  ['admin', 'executive'].forEach(role => { modules.forEach(mod => matrix[role][mod] = { ...fullAccess }); });
  
  matrix['sales']['dashboard'] = { ...fullAccess };
  matrix['sales']['commercial'] = { ...fullAccess };
  matrix['sales']['clients'] = { ...fullAccess };
  matrix['sales']['reports'] = { ...fullAccess };
  matrix['sales']['finance'] = { view: true, create: true, edit: false, delete: false };
  matrix['sales']['proposals'] = { ...fullAccess };
  matrix['sales']['retention'] = { ...fullAccess };
  matrix['sales']['calendar'] = { ...fullAccess };
  matrix['sales']['marketing'] = { ...fullAccess }; 
  matrix['sales']['automation'] = { ...viewOnly };
  matrix['sales']['geo-intelligence'] = { ...fullAccess };
  matrix['sales']['projects'] = { ...viewOnly };
  matrix['sales']['inbox'] = { ...fullAccess };
  matrix['sales']['prospecting'] = { ...fullAccess };
  matrix['sales']['competitive-intelligence'] = { ...fullAccess };

  matrix['support']['dashboard'] = { ...viewOnly };
  matrix['support']['support'] = { ...fullAccess };
  matrix['support']['clients'] = { ...viewOnly };
  matrix['support']['retention'] = { ...viewOnly };
  matrix['support']['calendar'] = { ...viewOnly };
  matrix['support']['geo-intelligence'] = { ...viewOnly };
  matrix['support']['projects'] = { view: true, create: false, edit: true, delete: false };
  matrix['support']['inbox'] = { ...fullAccess };

  matrix['finance']['dashboard'] = { ...viewOnly };
  matrix['finance']['finance'] = { ...fullAccess };
  matrix['finance']['reports'] = { ...fullAccess };
  matrix['finance']['commercial'] = { ...viewOnly };
  
  matrix['dev']['dashboard'] = { ...viewOnly };
  matrix['dev']['dev'] = { ...fullAccess };
  matrix['dev']['support'] = { view: true, create: false, edit: true, delete: false };
  matrix['dev']['projects'] = { view: true, create: false, edit: true, delete: false };
  
  matrix['client']['portal'] = { ...viewOnly };

  return matrix;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix>(() => {
      try {
          const saved = localStorage.getItem('nexus_permissions');
          return saved ? JSON.parse(saved) : createDefaultMatrix();
      } catch (e) {
          return createDefaultMatrix();
      }
  });
  
  const [usersList, setUsersList] = useState<User[]>(MOCK_USERS);

  useEffect(() => {
    // Restore session from localStorage if offline/mock mode
    const initSession = async () => {
      const supabase = getSupabase();
      
      // OFFLINE / DEMO MODE CHECK
      if (!supabase) {
        const storedUser = localStorage.getItem('nexus_mock_user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setCurrentUser(user);
                setCurrentOrganization({ id: 'org-1', name: 'Minha Empresa', slug: 'minha-empresa', plan: 'Standard', subscription_status: 'active' });
            } catch (e) {
                console.error("Error parsing stored user", e);
            }
        }
        setLoading(false);
        return;
      }

      // ONLINE MODE
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchProfileAndOrg(session.user.id, session.user.email);
        } else {
          setLoading(false);
        }

        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
             setLoading(true);
             await fetchProfileAndOrg(session.user.id, session.user.email);
          } else if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
            setCurrentOrganization(null);
            localStorage.removeItem('nexus_mock_user'); // Clear mock user too
            setLoading(false);
          }
        });
      } catch (err) {
          console.error("Auth Session Error:", err);
          setLoading(false);
      }
    };

    initSession();
  }, []);

  const fetchProfileAndOrg = async (userId: string, userEmail?: string) => {
    const supabase = getSupabase();
    if (!supabase) {
        setLoading(false);
        return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        await processProfileData(profile, supabase);
      } else {
        // Fallback for first login in development
        console.warn("Profile not found in DB, using fallback user data");
        const fallbackUser: User = {
            id: userId,
            name: userEmail?.split('@')[0] || 'User',
            email: userEmail || '',
            role: 'admin',
            avatar: 'U',
            organizationId: 'org-1'
        };
        setCurrentUser(fallbackUser);
        setCurrentOrganization({ id: 'org-1', name: 'Minha Empresa', slug: 'minha-empresa', plan: 'Standard', subscription_status: 'active' });
      }
    } catch (error) {
      console.error("Auth Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const processProfileData = async (profile: any, supabase: any) => {
      let orgData = null;
      if (profile.organization_id) {
        const { data: org } = await supabase.from('organizations').select('*').eq('id', profile.organization_id).single();
        if (org) orgData = org;
      }

      const mappedUser: User = {
        id: profile.id,
        name: profile.full_name || 'Usuário',
        email: profile.email,
        role: (profile.role as Role) || 'admin',
        avatar: (profile.full_name || 'U').charAt(0).toUpperCase(),
        organizationId: profile.organization_id,
        relatedClientId: profile.related_client_id,
        xp: profile.xp || 0,
        level: profile.level || 1
      };

      setCurrentUser(mappedUser);
      setCurrentOrganization(orgData);
  };

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    const supabase = getSupabase();
    
    // 1. OFFLINE / MOCK LOGIN (Fallback or Primary if no DB)
    if (!supabase) {
        // Simple mock check
        if (email === 'admin@nexus.com' || email === 'client@test.com') {
            const user = MOCK_USERS.find(u => u.email === email) || MOCK_USERS[0];
            setCurrentUser(user);
            setCurrentOrganization({ id: 'org-1', name: 'Minha Empresa', slug: 'minha-empresa', plan: 'Standard', subscription_status: 'active' });
            localStorage.setItem('nexus_mock_user', JSON.stringify(user));
            return {};
        }
        // Fallback: create a temp user
        const tempUser: User = { id: 'temp-u', name: email.split('@')[0], email, role: 'admin', avatar: 'T', organizationId: 'org-1' };
        setCurrentUser(tempUser);
        setCurrentOrganization({ id: 'org-1', name: 'Minha Empresa', slug: 'minha-empresa', plan: 'Standard', subscription_status: 'active' });
        localStorage.setItem('nexus_mock_user', JSON.stringify(tempUser));
        return {};
    }

    // 2. SUPABASE LOGIN
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return {}; 
    } catch (err: any) { 
        return { error: err.message }; 
    }
  };

  const signUp = async (email: string, password: string, fullName: string, companyName: string): Promise<{ error?: string, success?: boolean }> => {
    const supabase = getSupabase();
    if (!supabase) return { error: "Modo Offline: Registro desabilitado. Use admin@nexus.com para entrar." };
    try {
      const { data, error } = await supabase.auth.signUp({ 
          email, 
          password, 
          options: { 
              data: { full_name: fullName, company_name: companyName } 
          } 
      });
      if (error) return { error: error.message };
      if (data.user && !data.session) return { success: true, error: "Verifique seu e-mail para confirmar." };
      return { success: true };
    } catch (err: any) { return { error: err.message }; }
  };

  const logout = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (supabase) {
        try {
            await supabase.auth.signOut();
        } catch(e) { console.error(e); }
    }
    localStorage.removeItem('nexus_mock_user');
    setCurrentUser(null);
    setCurrentOrganization(null);
    setLoading(false);
    window.location.reload();
  };

  const switchOrganization = (orgId: string) => {};
  
  const hasPermission = (module: string, action: PermissionAction = 'view'): boolean => {
    if (!currentUser) return false;
    const role = currentUser.role;
    if (role === 'client' && module === 'portal') return true;
    if (!permissionMatrix[role] || !permissionMatrix[role][module]) {
        if (role === 'admin') return true;
        return false;
    }
    return permissionMatrix[role][module][action];
  };

  const updatePermission = (role: Role, module: string, action: PermissionAction, value: boolean) => {
      setPermissionMatrix(prev => {
          const newMatrix = { ...prev, [role]: { ...prev[role], [module]: { ...prev[role][module] || {view: false, create: false, edit: false, delete: false}, [action]: value } } };
          localStorage.setItem('nexus_permissions', JSON.stringify(newMatrix));
          return newMatrix;
      });
  };

  // Admin Stubs
  const updateUser = (data: Partial<User>) => setCurrentUser(prev => prev ? { ...prev, ...data } : null);
  const adminUpdateUser = async (userId: string, data: Partial<User>) => { };
  const adminDeleteUser = async (userId: string) => { };
  const addTeamMember = async (name: string, email: string, role: Role) => { return {success: true} };
  const createClientAccess = async (client: Client, email: string) => { return {success: true} };
  const sendRecoveryInvite = async (email: string) => { 
      const supabase = getSupabase();
      if(supabase) await supabase.auth.resetPasswordForEmail(email);
  };

  return (
    <AuthContext.Provider value={{ 
        currentUser, currentOrganization, permissionMatrix, usersList, loading,
        login, signUp, logout, switchOrganization, hasPermission, updatePermission, updateUser, 
        adminUpdateUser, adminDeleteUser, addTeamMember, createClientAccess, sendRecoveryInvite
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
