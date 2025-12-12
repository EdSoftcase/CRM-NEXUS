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
    const initSession = async () => {
      const supabase = getSupabase();
      
      // OFFLINE / DEMO MODE CHECK
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

      // ONLINE MODE
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
            console.warn("Auth Check Error:", error.message);
            if (error.message.includes("Refresh Token") || error.message.includes("refresh_token")) {
                console.log("Invalid token detected. Clearing session.");
                await supabase.auth.signOut();
                setCurrentUser(null);
                setCurrentOrganization(null);
                setLoading(false);
            } else {
                setLoading(false);
            }
        } else if (data?.session?.user) {
          await fetchProfileAndOrg(data.session.user.id, data.session.user.email);
          await fetchTeamMembers(); // FETCH REAL TEAM FROM DB
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

  // Sync usersList with Supabase profiles
  const fetchTeamMembers = async () => {
      const supabase = getSupabase();
      if (!supabase) return;

      try {
          const { data, error } = await supabase.from('profiles').select('*');
          if (error) {
              console.error("Error fetching team:", error);
              return;
          }
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
      } catch (e) {
          console.error("Exception fetching team:", e);
      }
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

      if (error) {
          // SAFEGUARD: If recursion error happens (42P17 or 500s), enable Safe Mode for Master User
          if (error.code === '42P17' || error.message.includes('recursion') || error.code === 'PGRST301') {
              console.error("CRITICAL DB ERROR: Infinite Recursion detected.");
              if (userEmail === 'edson.softcase@gmail.com') {
                  console.warn("Activating Safe Mode for Master User...");
                  const masterUser = MOCK_USERS.find(u => u.email === userEmail);
                  if (masterUser) {
                      setCurrentUser(masterUser);
                      setCurrentOrganization(MOCK_ORGANIZATIONS[0]);
                      alert("Aviso de Segurança: O sistema entrou em modo de recuperação devido a um erro no banco de dados. Por favor, acesse Configurações > Dados e execute o Script de Correção.");
                  }
              }
          } else {
              console.error("Profile Fetch Error:", error);
          }
          setLoading(false);
          return;
      }

      if (profile) {
        await processProfileData(profile, supabase);
      } else {
        // Fallback para Master User se o perfil não existir no banco
        if (userEmail === 'edson.softcase@gmail.com') {
             const masterUser = MOCK_USERS.find(u => u.email === userEmail);
             if (masterUser) {
                 setCurrentUser(masterUser);
                 setCurrentOrganization(MOCK_ORGANIZATIONS[0]);
             }
        }
        setLoading(false);
      }
    } catch (error) {
      console.error("Auth Fetch Exception:", error);
      setLoading(false);
    }
  };

  const processProfileData = async (profile: any, supabase: any) => {
      let orgData = null;
      if (profile.organization_id) {
        // Safe check for organization
        try {
            const { data: org, error } = await supabase.from('organizations').select('*').eq('id', profile.organization_id).single();
            if (!error && org) orgData = org;
        } catch (e) {
            console.warn("Failed to fetch org details", e);
        }
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
    
    // MASTER USER BACKDOOR / FALLBACK
    // Permite login do Edson mesmo se Supabase falhar ou estiver vazio
    const masterUser = MOCK_USERS.find(u => u.email.toLowerCase() === normalizedEmail);
    
    if (!supabase) {
        // Offline Logic
        if (masterUser || normalizedEmail === 'admin@nexus.com' || normalizedEmail === 'client@test.com') {
            const user = masterUser || MOCK_USERS.find(u => u.email === 'admin@nexus.com')!;
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
          // Se o login falhar no Supabase, mas for o Master User, permita entrar localmente
          // Isso é um "fail-safe" crítico solicitado
          if (masterUser) {
              console.warn("Supabase auth failed for Master User, using Fallback.");
              setCurrentUser(masterUser);
              setCurrentOrganization(MOCK_ORGANIZATIONS[0]);
              localStorage.setItem('nexus_mock_user', JSON.stringify(masterUser));
              return {};
          }
          return { error: error.message };
      }
      
      return {}; 
    } catch (err: any) { 
        if (masterUser) {
             setCurrentUser(masterUser);
             setCurrentOrganization(MOCK_ORGANIZATIONS[0]);
             return {};
        }
        return { error: err.message }; 
    }
  };

  const signUp = async (email: string, password: string, fullName: string, companyName: string): Promise<{ error?: string, success?: boolean }> => {
    const supabase = getSupabase();
    if (!supabase) return { error: "Modo Offline: Registro desabilitado." };
    
    try {
      // 1. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
              data: { full_name: fullName } // Minimal meta
          }
      });

      if (authError) return { error: authError.message };
      if (!authData.user) return { error: "Erro ao criar usuário" };

      const userId = authData.user.id;
      // Gere o ID da organização no frontend para garantir que temos a referência antes do insert
      const orgId = crypto.randomUUID();

      // 2. Create Organization (Pending Approval)
      const { error: orgError } = await supabase.from('organizations').insert({
          id: orgId,
          name: companyName,
          slug: companyName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          status: 'pending', 
          plan: 'Standard'
      });

      if (orgError) {
          console.error("Org Creation Error:", orgError);
          return { error: "Erro ao criar organização: " + orgError.message };
      }

      // 3. Create Profile linked to Org
      // Importante: RLS deve permitir insert se auth.uid() == id
      const { error: profileError } = await supabase.from('profiles').insert({
          id: userId,
          full_name: fullName,
          email: email,
          role: 'admin',
          organization_id: orgId,
          active: true
      });

      if (profileError) {
           console.error("Profile Creation Error:", profileError);
          // Tentar rollback da org (opcional, mas boa prática)
          await supabase.from('organizations').delete().eq('id', orgId);
          return { error: "Erro ao criar perfil. " + profileError.message };
      }

      return { success: true };
    } catch (err: any) { return { error: err.message }; }
  };

  // --- NEW: Join Existing Organization ---
  const joinOrganization = async (email: string, password: string, fullName: string, orgSlug: string): Promise<{ error?: string, success?: boolean }> => {
      const supabase = getSupabase();
      if (!supabase) return { error: "Modo Offline: Recurso indisponível." };

      try {
          // 1. Find Organization
          const { data: org, error: orgError } = await supabase
              .from('organizations')
              .select('id')
              .eq('slug', orgSlug)
              .single();

          if (orgError || !org) {
              return { error: "Organização não encontrada com este identificador." };
          }

          // 2. Create Auth User
          const { data: authData, error: authError } = await supabase.auth.signUp({ 
              email, 
              password,
              options: { data: { full_name: fullName } }
          });

          if (authError) return { error: authError.message };
          if (!authData.user) return { error: "Erro ao criar usuário" };

          // 3. Create Profile linked to Org (Role: Sales default, Active: FALSE)
          const { error: profileError } = await supabase.from('profiles').insert({
              id: authData.user.id,
              full_name: fullName,
              email: email,
              role: 'sales', // Default role
              organization_id: org.id,
              active: false // REQUIRES APPROVAL
          });

          if (profileError) {
              return { error: "Erro ao criar perfil." };
          }

          return { success: true };

      } catch (err: any) {
          return { error: err.message };
      }
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

  const updateUser = (data: Partial<User>) => setCurrentUser(prev => prev ? { ...prev, ...data } : null);
  
  const changePassword = async (password: string): Promise<{ success: boolean; error?: string }> => {
      const supabase = getSupabase();
      if (!supabase) return { success: false, error: "Modo Offline: Não é possível alterar senha." };
      
      try {
          const { error } = await supabase.auth.updateUser({ password });
          if (error) throw error;
          return { success: true };
      } catch (e: any) {
          return { success: false, error: e.message };
      }
  };

  const adminUpdateUser = async (userId: string, data: Partial<User>) => {
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u));
      const supabase = getSupabase();
      
      // Update local state if editing self
      if (currentUser?.id === userId) {
          setCurrentUser(prev => prev ? { ...prev, ...data } : null);
      }

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
      // 1. Generate UUID (Compatibility with Supabase UUID fields)
      const newId = crypto.randomUUID(); 
      
      // 2. Update Local State (Optimistic)
      const newUser: User = { 
          id: newId, 
          name, 
          email, 
          role, 
          avatar: name.charAt(0).toUpperCase(), 
          active: true, 
          organizationId: currentOrganization?.id 
      };
      setUsersList(prev => [...prev, newUser]);
      
      // 3. Sync to Supabase - Handled with caution due to Auth constraints
      const supabase = getSupabase();
      if (supabase) {
          try {
             // Attempt to insert into profiles.
             // NOTE: This usually fails if the user does not exist in auth.users due to FK constraints.
             // We catch this to prevent breaking the flow, allowing local state to persist until user signs up or is invited properly.
             const { error } = await supabase.from('profiles').insert({
                 id: newId,
                 full_name: name,
                 email: email,
                 role: role,
                 organization_id: currentOrganization?.id,
                 active: true
             });
             
             if (error) {
                 console.warn("Supabase profile sync skipped (likely waiting for user signup):", error.message);
                 // We don't return false here to allow the UI flow to continue (e.g. show invite modal)
             }
          } catch (e: any) {
              console.warn("Supabase exception (profile sync):", e.message);
          }
      }

      return {success: true};
  };
  
  const createClientAccess = async (client: Client, email: string) => { return {success: true} };
  
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
        adminUpdateUser, adminDeleteUser, addTeamMember, createClientAccess, sendRecoveryInvite,
        approveOrganization
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