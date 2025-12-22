
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, Role, PermissionMatrix, PermissionAction, Organization, Client } from '../types';
import { MOCK_USERS, MOCK_ORGANIZATIONS } from '../constants';
import { getSupabase } from '../services/supabaseClient';

interface AuthContextType {
  currentUser: User | null;
  currentOrganization: Organization | null;
  permissionMatrix: PermissionMatrix;
  usersList: User[];
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string, companyName: string) => Promise<{ error?: string, success?: boolean }>;
  joinOrganization: (email: string, password: string, fullName: string, orgSlug: string) => Promise<{ error?: string, success?: boolean }>;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => void;
  hasPermission: (module: string, action?: PermissionAction) => boolean;
  updatePermission: (role: Role, module: string, action: PermissionAction, value: boolean) => void;
  updateUser: (data: Partial<User>) => void;
  changePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  adminUpdateUser: (userId: string, data: Partial<User>) => Promise<void>;
  adminDeleteUser: (userId: string) => Promise<void>;
  addTeamMember: (name: string, email: string, role: Role) => Promise<{success: boolean, error?: string, tempPassword?: string}>;
  createClientAccess: (client: Client, email: string) => Promise<{ success: boolean, password?: string, error?: string }>;
  sendRecoveryInvite: (email: string) => Promise<void>;
  approveOrganization: (orgId: string) => Promise<boolean>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUPER_ADMIN_EMAILS = ['edson.softcase@gmail.com', 'superadmin@nexus.com', 'admin@softcase.com.br'];

// Default Matrix Builder - GRANULAR PERMISSIONS
const createDefaultMatrix = (): PermissionMatrix => {
  const matrix: PermissionMatrix = {};
  const roles: Role[] = ['admin', 'executive', 'sales', 'support', 'dev', 'finance', 'client'];
  
  // ALL SIDEBAR MODULES + SYSTEM MODULES
  const modules = [
      'dashboard', 'contact-center', 'inbox', 'prospecting', 'competitive-intelligence', 
      'calendar', 'marketing', 'commercial', 'proposals', 'operations', 
      'clients', 'geo-intelligence', 'projects', 'customer-success', 'retention', 
      'automation', 'finance', 'support', 'dev', 'reports', 'settings', 'portal', 'saas'
  ];
  
  const noAccess = { view: false, create: false, edit: false, delete: false };
  const fullAccess = { view: true, create: true, edit: true, delete: true };
  const viewOnly = { view: true, create: false, edit: false, delete: false };

  roles.forEach(role => {
    matrix[role] = {};
    modules.forEach(mod => {
      matrix[role][mod] = { ...noAccess };
    });
  });

  // --- 1. ADMIN & EXECUTIVE (FULL ACCESS) ---
  ['admin', 'executive'].forEach(role => { 
      modules.forEach(mod => matrix[role][mod] = { ...fullAccess }); 
  });

  // --- 2. SALES (COMERCIAL) ---
  const salesModules = [
      'dashboard', 'contact-center', 'inbox', 'prospecting', 'competitive-intelligence', 
      'calendar', 'marketing', 'commercial', 'proposals', 'clients', 'geo-intelligence', 
      'customer-success', 'retention', 'reports'
  ];
  salesModules.forEach(mod => matrix['sales'][mod] = { ...fullAccess });
  
  // Partial Access for Sales
  matrix['sales']['finance'] = { view: true, create: true, edit: false, delete: false };
  matrix['sales']['projects'] = { ...viewOnly };
  matrix['sales']['operations'] = { ...viewOnly };
  matrix['sales']['settings'] = { view: true, create: false, edit: false, delete: false };

  // --- 3. SUPPORT (SUPORTE) ---
  const supportModules = ['dashboard', 'inbox', 'support', 'clients', 'calendar'];
  supportModules.forEach(mod => matrix['support'][mod] = { ...fullAccess });
  
  matrix['support']['projects'] = { view: true, create: false, edit: true, delete: false };
  matrix['support']['settings'] = { view: true, create: false, edit: false, delete: false };

  // --- 4. FINANCE (FINANCEIRO) ---
  const financeModules = ['dashboard', 'finance', 'reports', 'clients', 'proposals'];
  financeModules.forEach(mod => matrix['finance'][mod] = { ...fullAccess });
  matrix['finance']['settings'] = { view: true, create: false, edit: false, delete: false };

  // --- 5. DEV (DESENVOLVEDOR) ---
  const devModules = ['dashboard', 'dev', 'projects'];
  devModules.forEach(mod => matrix['dev'][mod] = { ...fullAccess });
  matrix['dev']['support'] = { view: true, create: false, edit: true, delete: false };
  matrix['dev']['settings'] = { view: true, create: false, edit: false, delete: false };
  
  // --- 6. CLIENT (PORTAL) ---
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
          const defaultM = createDefaultMatrix();
          if (saved) {
              const parsed = JSON.parse(saved);
              Object.keys(defaultM).forEach(role => {
                  if (parsed[role]) {
                      Object.keys(defaultM[role]).forEach(mod => {
                          if (!parsed[role][mod]) {
                              parsed[role][mod] = defaultM[role][mod];
                          }
                      });
                  } else {
                      parsed[role] = defaultM[role];
                  }
              });
              return parsed;
          }
          return defaultM;
      } catch (e) {
          return createDefaultMatrix();
      }
  });
  
  const [usersList, setUsersList] = useState<User[]>(MOCK_USERS);

  useEffect(() => {
    const initSession = async () => {
      const supabase = getSupabase();
      
      if (!supabase) {
        const storedUser = localStorage.getItem('nexus_mock_user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setCurrentUser(user);
                setCurrentOrganization(MOCK_ORGANIZATIONS[0]);
            } catch (e) {
                console.error("Error parsing stored user", e);
            }
        }
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
            console.warn("Auth Check Error:", error.message);
            if (error.message.includes("Refresh Token") || error.message.includes("refresh_token")) {
                await supabase.auth.signOut();
                setCurrentUser(null);
                setCurrentOrganization(null);
                setLoading(false);
            } else {
                setLoading(false);
            }
        } else if (data?.session?.user) {
          await fetchProfileAndOrg(data.session.user.id, data.session.user.email);
          await fetchTeamMembers();
        } else {
          setLoading(false);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
             setLoading(true);
             await fetchProfileAndOrg(session.user.id, session.user.email);
             await fetchTeamMembers();
          } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESH_REVOKED') {
            setCurrentUser(null);
            setCurrentOrganization(null);
            localStorage.removeItem('nexus_mock_user'); 
            setLoading(false);
          }
        });
        
        return () => {
            subscription.unsubscribe();
        };

      } catch (err) {
          console.error("Auth Session Exception:", err);
          setLoading(false);
      }
    };

    initSession();
  }, []);

  const fetchTeamMembers = async () => {
      const supabase = getSupabase();
      if (!supabase) return;
      try {
          const { data, error } = await supabase.from('profiles').select('*');
          if (error) return;
          if (data) {
              const mappedUsers: User[] = data.map((p: any) => ({
                  id: p.id,
                  name: p.full_name || 'Usuário',
                  email: p.email,
                  role: p.role as Role,
                  avatar: (p.full_name || 'U').charAt(0).toUpperCase(),
                  organizationId: p.organization_id,
                  relatedClientId: p.related_client_id,
                  xp: p.xp || 0,
                  level: p.level || 1,
                  active: p.active !== false
              }));
              setUsersList(mappedUsers);
          }
      } catch (e) {}
  };

  const fetchProfileAndOrg = async (userId: string, userEmail?: string) => {
    const supabase = getSupabase();
    if (!supabase) {
        setLoading(false);
        return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        await processProfileData(profile, supabase);
      } else {
        if (userEmail && SUPER_ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
             const masterUser = MOCK_USERS.find(u => u.email === userEmail) || MOCK_USERS[0];
             setCurrentUser({ ...masterUser, email: userEmail });
             setCurrentOrganization(MOCK_ORGANIZATIONS[0]);
        }
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
    }
  };

  const processProfileData = async (profile: any, supabase: any) => {
      let orgData = null;
      if (profile.organization_id) {
        try {
            const { data: org, error } = await supabase.from('organizations').select('*').eq('id', profile.organization_id).single();
            if (!error && org) orgData = org;
        } catch (e) {}
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
        level: profile.level || 1,
        active: profile.active !== false
      };

      setCurrentUser(mappedUser);
      setCurrentOrganization(orgData);
      setLoading(false);
  };

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    const supabase = getSupabase();
    const normalizedEmail = email.trim().toLowerCase();
    const masterUser = MOCK_USERS.find(u => u.email.toLowerCase() === normalizedEmail);
    
    if (!supabase) {
        if (masterUser || normalizedEmail === 'admin@nexus.com') {
            const user = masterUser || MOCK_USERS[0];
            setCurrentUser(user);
            setCurrentOrganization(MOCK_ORGANIZATIONS[0]);
            localStorage.setItem('nexus_mock_user', JSON.stringify(user));
            return {};
        }
        return { error: "Usuário offline inválido" };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
          if (masterUser) {
              setCurrentUser(masterUser);
              setCurrentOrganization(MOCK_ORGANIZATIONS[0]);
              localStorage.setItem('nexus_mock_user', JSON.stringify(masterUser));
              return {};
          }
          return { error: "Email ou senha incorretos." };
      }
      return {}; 
    } catch (err: any) { 
        return { error: err.message }; 
    }
  };

  const signUp = async (email: string, password: string, fullName: string, companyName: string): Promise<{ error?: string, success?: boolean }> => {
      const supabase = getSupabase();
      if (!supabase) return { error: "Modo Offline: Registro desabilitado." };
      try {
          const { data: authData, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
          if (authError) return { error: authError.message };
          if (!authData.user) return { error: "Erro ao criar usuário" };
          const userId = authData.user.id;
          const orgId = crypto.randomUUID();
          await supabase.from('organizations').insert({ id: orgId, name: companyName, slug: companyName.toLowerCase().replace(/[^a-z0-9]/g, '-'), status: 'pending', plan: 'Standard' });
          await supabase.from('profiles').insert({ id: userId, full_name: fullName, email: email, role: 'admin', organization_id: orgId, active: true });
          return { success: true };
      } catch (err: any) { return { error: err.message }; }
  };

  const joinOrganization = async (email: string, password: string, fullName: string, orgSlug: string): Promise<{ error?: string, success?: boolean }> => {
      const supabase = getSupabase();
      if (!supabase) return { error: "Modo Offline: Recurso indisponível." };
      try {
          const { data: org } = await supabase.from('organizations').select('id').eq('slug', orgSlug).single();
          if (!org) return { error: "Organização não encontrada." };
          const { data: authData, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
          if (authError) return { error: authError.message };
          await supabase.from('profiles').insert({ id: authData.user!.id, full_name: fullName, email: email, role: 'sales', organization_id: org.id, active: false });
          return { success: true };
      } catch (err: any) { return { error: err.message }; }
  };

  const logout = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
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
    const email = currentUser.email?.toLowerCase() || '';
    
    // Super Admins have all permissions automatically
    if (SUPER_ADMIN_EMAILS.includes(email)) return true;
    if (role === 'admin') return true;
    if (role === 'client' && module === 'portal') return true;
    
    if (!permissionMatrix[role] || !permissionMatrix[role][module]) return false;
    return permissionMatrix[role][module][action];
  };

  const updatePermission = (role: Role, module: string, action: PermissionAction, value: boolean) => {
      setPermissionMatrix(prev => {
          const modulePerms = prev[role][module] || {view: false, create: false, edit: false, delete: false};
          let newModulePerms = { ...modulePerms, [action]: value };
          if (action === 'edit' && value === true) newModulePerms.view = true;
          if (action === 'view' && value === false) {
              newModulePerms.create = false;
              newModulePerms.edit = false;
              newModulePerms.delete = false;
          }
          const newMatrix = { ...prev, [role]: { ...prev[role], [module]: newModulePerms } };
          localStorage.setItem('nexus_permissions', JSON.stringify(newMatrix));
          return newMatrix;
      });
  };

  const updateUser = (data: Partial<User>) => setCurrentUser(prev => prev ? { ...prev, ...data } : null);
  
  const changePassword = async (password: string): Promise<{ success: boolean; error?: string }> => {
      const supabase = getSupabase();
      if (!supabase) return { success: false, error: "Modo Offline." };
      try {
          const { error } = await supabase.auth.updateUser({ password });
          if (error) throw error;
          return { success: true };
      } catch (e: any) { return { success: false, error: e.message }; }
  };

  const adminUpdateUser = async (userId: string, data: Partial<User>) => {
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u));
      const supabase = getSupabase();
      if (supabase) {
          const dbData: any = {};
          if (data.name) dbData.full_name = data.name;
          if (data.role) dbData.role = data.role;
          if (data.active !== undefined) dbData.active = data.active;
          await supabase.from('profiles').update(dbData).eq('id', userId);
      }
  };
  
  const adminDeleteUser = async (userId: string) => {
      setUsersList(prev => prev.filter(u => u.id !== userId));
      const supabase = getSupabase();
      if (supabase) await supabase.from('profiles').delete().eq('id', userId);
  };
  
  const addTeamMember = async (name: string, email: string, role: Role) => {
      const newId = crypto.randomUUID(); 
      setUsersList(prev => [...prev, { id: newId, name, email, role, avatar: name.charAt(0).toUpperCase(), active: true, organizationId: currentOrganization?.id }]);
      const supabase = getSupabase();
      if (supabase) {
          await supabase.from('profiles').insert({ id: newId, full_name: name, email: email, role: role, organization_id: currentOrganization?.id, active: true });
      }
      return {success: true};
  };
  
  const createClientAccess = async (client: Client, email: string) => { 
      const tempPassword = Math.random().toString(36).slice(-8) + "Aa1!";
      const newId = crypto.randomUUID();
      const supabase = getSupabase();
      if (supabase) {
          try {
             await supabase.from('profiles').insert({ id: newId, full_name: client.contactPerson || client.name, email, role: 'client', organization_id: currentOrganization?.id, related_client_id: client.id, active: true, metadata: { portal_password: tempPassword } });
             await fetchTeamMembers();
             return {success: true, password: tempPassword};
          } catch (e: any) { return { success: false, error: e.message }; }
      }
      return {success: false, error: "Offline"};
  };
  
  const sendRecoveryInvite = async (email: string) => { 
      const supabase = getSupabase();
      if(supabase) await supabase.auth.resetPasswordForEmail(email);
  };

  const approveOrganization = async (orgId: string): Promise<boolean> => {
      const supabase = getSupabase();
      if (!supabase) return false;
      const { error } = await supabase.from('organizations').update({ status: 'active' }).eq('id', orgId);
      return !error;
  };

  return (
    <AuthContext.Provider value={{ 
        currentUser, currentOrganization, permissionMatrix, usersList, loading,
        login, signUp, joinOrganization, logout, switchOrganization, hasPermission, updatePermission, updateUser, 
        changePassword, adminUpdateUser, adminDeleteUser, addTeamMember, createClientAccess, sendRecoveryInvite,
        approveOrganization
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
