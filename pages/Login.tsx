
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSupabaseConfig, saveSupabaseConfig, testSupabaseConnection } from '../services/supabaseClient';
import { Eye, EyeOff, Lock, ArrowRight, ShieldCheck, Mail, AlertTriangle, User, Building2, Database, Save, Loader2, Info, ArrowLeft, KeyRound, CloudOff, Clock, UserPlus } from 'lucide-react';
import { PrivacyPolicy } from '../components/PrivacyPolicy';

export const Login: React.FC = () => {
  const { login, signUp, joinOrganization, sendRecoveryInvite, currentUser, currentOrganization, logout } = useAuth();
  
  // Setup State
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupForm, setSetupForm] = useState({ url: '', key: '' });
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  
  // Login State
  const [mode, setMode] = useState<'login' | 'signup' | 'join' | 'recovery'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Privacy Policy Modal State
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  useEffect(() => {
      const config = getSupabaseConfig();
      const isOffline = localStorage.getItem('nexus_offline_mode') === 'true';

      // If no config and not explicitly offline, force setup
      if ((!config.url || !config.key) && !isOffline) {
          setNeedsSetup(true);
      } else if ((!config.url || !config.key) && localStorage.getItem('nexus_force_setup') === 'true') {
          // Keep supporting explicit force setup flag
          setNeedsSetup(true);
      }

      // Check for remembered email
      const savedEmail = localStorage.getItem('nexus_remember_email');
      if (savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
      }
  }, []);

  // Check for Pending Status (Organization Pending)
  if (currentUser && currentOrganization?.status === 'pending') {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center animate-scale-in">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Clock size={32} className="text-yellow-600"/>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Empresa em Análise</h2>
                  <p className="text-slate-500 mb-6">
                      Sua organização <strong>{currentOrganization.name}</strong> foi criada e aguarda aprovação de um administrador do sistema Nexus.
                  </p>
                  <p className="text-sm text-slate-400 mb-6 bg-slate-50 p-3 rounded">
                      ID: <span className="font-mono text-slate-600">{currentOrganization.id}</span>
                  </p>
                  <div className="flex gap-3 justify-center">
                      <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Verificar</button>
                      <button onClick={logout} className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition">Sair</button>
                  </div>
              </div>
          </div>
      );
  }

  // Check for Inactive User Status (Join Request Pending)
  if (currentUser && currentUser.active === false) {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center animate-scale-in">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User size={32} className="text-blue-600"/>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Cadastro Pendente</h2>
                  <p className="text-slate-500 mb-6">
                      Sua solicitação para entrar na organização foi enviada com sucesso.
                  </p>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 text-left">
                      <p className="text-sm text-slate-600 mb-1"><strong>Status:</strong> <span className="text-orange-500 font-bold">Aguardando Aprovação</span></p>
                      <p className="text-xs text-slate-400">Um administrador da sua empresa precisa ativar sua conta no painel de equipe.</p>
                  </div>
                  <div className="flex gap-3 justify-center">
                      <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Verificar</button>
                      <button onClick={logout} className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition">Sair</button>
                  </div>
              </div>
          </div>
      );
  }

  // Timeout de Segurança
  useEffect(() => {
      if (loading) {
          const timer = setTimeout(() => {
              if (loading) {
                  setLoading(false);
                  if (mode === 'login' && !successMsg) {
                      setError("Tempo limite excedido. O servidor demorou a responder. Verifique sua conexão.");
                  }
              }
          }, 15000); 
          return () => clearTimeout(timer);
      }
  }, [loading, mode, successMsg]);

  const handleSetupSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsTestingConnection(true);

      saveSupabaseConfig(setupForm.url, setupForm.key);

      const result = await testSupabaseConnection();
      
      if (result.success) {
          setSuccessMsg("Conexão bem sucedida! Recarregando...");
          localStorage.removeItem('nexus_force_setup');
          localStorage.removeItem('nexus_offline_mode'); // Clear offline flag on success
          setTimeout(() => {
              window.location.reload();
          }, 1000);
      } else {
          setError(result.message);
          setIsTestingConnection(false);
      }
  };

  const handleSkipSetup = () => {
      localStorage.setItem('nexus_offline_mode', 'true');
      localStorage.removeItem('nexus_force_setup');
      saveSupabaseConfig('', ''); // Ensure clear
      window.location.reload();
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setSuccessMsg('');
      setLoading(true);

      if (mode === 'login') {
          if (rememberMe) {
              localStorage.setItem('nexus_remember_email', email);
          } else {
              localStorage.removeItem('nexus_remember_email');
          }
      }

      try {
          if (mode === 'recovery') {
              if (!email) {
                  setError("Digite seu e-mail.");
                  setLoading(false);
                  return;
              }
              await sendRecoveryInvite(email);
              setSuccessMsg("Se o e-mail estiver cadastrado, você receberá um link de acesso em instantes.");
              setLoading(false);
              return;
          }

          if (mode === 'signup') {
              if (password.length < 6) {
                  setError("A senha deve ter no mínimo 6 caracteres.");
                  setLoading(false);
                  return;
              }
              
              const result = await signUp(email, password, fullName, companyName);
              
              if (result.error && !result.success) {
                  setError(result.error);
                  setLoading(false);
              } else {
                  const loginResult = await login(email, password);
                  if (loginResult.error) {
                      setMode('login');
                      setSuccessMsg("Conta criada! Faça login para continuar.");
                      setLoading(false);
                  }
              }
              return;
          }

          if (mode === 'join') {
              if (password.length < 6) {
                  setError("A senha deve ter no mínimo 6 caracteres.");
                  setLoading(false);
                  return;
              }
              if (!orgSlug) {
                  setError("Identificador da empresa é obrigatório.");
                  setLoading(false);
                  return;
              }
              
              const result = await joinOrganization(email, password, fullName, orgSlug);
              
              if (result.error) {
                  setError(result.error);
                  setLoading(false);
              } else {
                  // Auto-login to show pending screen immediately
                  await login(email, password);
              }
              return;
          }

          // LOGIN MODE
          const result = await login(email, password);
          
          if (result.error) {
              if (result.error.includes("Invalid login credentials")) {
                  setError("Email ou senha incorretos.");
              } else {
                  setError(result.error);
              }
              setLoading(false);
          }
      } catch (err: any) {
          setError(err.message || "Ocorreu um erro inesperado.");
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col md:flex-row max-w-4xl transition-all duration-500 min-h-[550px] z-10 relative animate-fade-in">
          
          <div className="hidden md:flex w-1/2 bg-blue-600 p-12 flex-col justify-between text-white relative overflow-hidden">
              <div className="relative z-10">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-6 shadow-lg">
                      <span className="text-blue-600 font-bold text-2xl">N</span>
                  </div>
                  <h1 className="text-3xl font-bold mb-2">Nexus CRM</h1>
                  <p className="text-blue-100">Gestão corporativa inteligente e integrada.</p>
              </div>
              <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                      <div className="bg-blue-500/50 p-2 rounded-full"><ShieldCheck size={16}/></div>
                      <span>Segurança Enterprise (RLS)</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                      <div className="bg-blue-500/50 p-2 rounded-full"><Lock size={16}/></div>
                      <span>Dados isolados por organização</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                      <div className="bg-blue-500/50 p-2 rounded-full"><Building2 size={16}/></div>
                      <span>Multi-tenant SaaS</span>
                  </div>
              </div>
              
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500 rounded-full opacity-50 blur-3xl"></div>
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-500 rounded-full opacity-50 blur-3xl"></div>
          </div>

          <div className="w-full md:w-1/2 p-8 md:p-12 relative flex flex-col justify-center">
              
              {needsSetup ? (
                  <div className="animate-fade-in">
                      <div className="text-center md:text-left mb-6">
                          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                              <Database className="text-emerald-600"/> Setup Inicial
                          </h2>
                          <p className="text-slate-500 text-sm mt-1">Conecte o frontend ao seu projeto Supabase.</p>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6 text-sm text-blue-800">
                          <p className="flex items-start gap-2">
                              <Info size={16} className="mt-0.5 shrink-0"/>
                              <span>
                                  Você precisa das chaves <strong>Project URL</strong> e <strong>API Key (anon/public)</strong>. 
                              </span>
                          </p>
                      </div>

                      <form onSubmit={handleSetupSubmit} className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Project URL</label>
                              <input 
                                  required type="url" 
                                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                                  placeholder="https://xyz.supabase.co"
                                  value={setupForm.url}
                                  onChange={e => setSetupForm({...setupForm, url: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">API Key (Anon/Public)</label>
                              <input 
                                  required type="password" 
                                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                                  placeholder="eyJ..."
                                  value={setupForm.key}
                                  onChange={e => setSetupForm({...setupForm, key: e.target.value})}
                              />
                          </div>

                          {error && <div className="text-red-600 text-xs bg-red-50 p-3 rounded border border-red-100">{error}</div>}
                          {successMsg && <div className="text-emerald-600 text-xs bg-emerald-50 p-3 rounded border border-emerald-100 flex items-center gap-2"><div className="bg-green-100 rounded-full p-1"><ShieldCheck size={12}/></div> {successMsg}</div>}

                          <button 
                              type="submit" 
                              disabled={isTestingConnection}
                              className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-70"
                          >
                              {isTestingConnection ? <Loader2 className="animate-spin" size={20}/> : <><Save size={18}/> Salvar e Conectar</>}
                          </button>

                          <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-slate-200"></div>
                                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">OU</span>
                                <div className="flex-grow border-t border-slate-200"></div>
                          </div>

                          <button 
                              type="button"
                              onClick={handleSkipSetup}
                              className="w-full bg-slate-100 text-slate-600 font-bold py-3 rounded-lg hover:bg-slate-200 transition flex items-center justify-center gap-2"
                          >
                              <CloudOff size={18}/> Pular (Modo Offline / Demo)
                          </button>
                      </form>
                  </div>
              ) : (
                  <div className="flex flex-col h-full justify-center">
                      <div className="text-center md:text-left mb-6">
                          {mode === 'recovery' ? (
                              <>
                                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 md:justify-start justify-center"><KeyRound className="text-amber-500"/> Recuperar Senha</h2>
                                <p className="text-slate-500 text-sm mt-1">Informe seu e-mail para receber um link de acesso.</p>
                              </>
                          ) : mode === 'join' ? (
                              <>
                                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 md:justify-start justify-center"><UserPlus className="text-blue-600"/> Entrar na Equipe</h2>
                                <p className="text-slate-500 text-sm mt-1">Solicite acesso a uma organização existente.</p>
                              </>
                          ) : (
                              <>
                                <h2 className="text-2xl font-bold text-slate-900">{mode === 'signup' ? 'Nova Organização' : 'Acesse sua conta'}</h2>
                                <p className="text-slate-500 text-sm mt-1">{mode === 'signup' ? 'Crie uma nova empresa no Nexus CRM.' : 'Entre com suas credenciais corporativas.'}</p>
                              </>
                          )}
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                          {(mode === 'signup' || mode === 'join') && (
                              <div className="animate-fade-in space-y-4">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Seu Nome</label>
                                      <div className="relative">
                                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User size={18} className="text-slate-400" /></div>
                                          <input required type="text" className="pl-10 w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="João Silva" value={fullName} onChange={(e) => setFullName(e.target.value)}/>
                                      </div>
                                  </div>
                                  {mode === 'signup' && (
                                      <div>
                                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome da Nova Empresa</label>
                                          <div className="relative">
                                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Building2 size={18} className="text-slate-400" /></div>
                                              <input required type="text" className="pl-10 w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Minha Empresa Ltda" value={companyName} onChange={(e) => setCompanyName(e.target.value)}/>
                                          </div>
                                      </div>
                                  )}
                                  {mode === 'join' && (
                                      <div>
                                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Identificador da Empresa (Slug)</label>
                                          <div className="relative">
                                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Building2 size={18} className="text-slate-400" /></div>
                                              <input required type="text" className="pl-10 w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ex: softcase-tecnologia" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)}/>
                                          </div>
                                          <p className="text-[10px] text-slate-400 mt-1">Solicite o identificador ao administrador da sua empresa.</p>
                                      </div>
                                  )}
                              </div>
                          )}

                          <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">E-mail</label>
                              <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail size={18} className="text-slate-400" /></div>
                                  <input required type="email" className="pl-10 w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)}/>
                              </div>
                          </div>

                          {mode !== 'recovery' && (
                              <div>
                                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Senha</label>
                                  <div className="relative">
                                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock size={18} className="text-slate-400" /></div>
                                      <input required type={showPassword ? "text" : "password"} className="pl-10 w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}/>
                                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                                          {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                                      </button>
                                  </div>
                                  
                                  {mode === 'login' && (
                                      <div className="flex justify-between items-center mt-2">
                                          <label className="flex items-center gap-2 cursor-pointer select-none">
                                              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"/>
                                              <span className="text-xs text-slate-600">Lembrar de mim</span>
                                          </label>
                                          <button type="button" onClick={() => {setMode('recovery'); setError(''); setSuccessMsg('');}} className="text-xs text-blue-600 hover:underline">Esqueci minha senha</button>
                                      </div>
                                  )}
                              </div>
                          )}

                          {error && <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-100 flex items-start gap-2 animate-fade-in"><AlertTriangle size={14} className="shrink-0 mt-0.5"/> <span>{error}</span></div>}
                          {successMsg && <div className="bg-green-50 text-green-700 text-xs p-3 rounded-lg border border-green-200 flex items-start gap-2 animate-fade-in"><ShieldCheck size={14} className="shrink-0 mt-0.5"/> <span>{successMsg}</span></div>}

                          <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 disabled:opacity-70 disabled:cursor-not-allowed">
                              {loading ? <Loader2 className="animate-spin" size={20}/> : mode === 'recovery' ? 'Enviar Instruções' : mode === 'join' ? 'Solicitar Acesso' : <>{mode === 'signup' ? 'Criar Conta' : 'Entrar'} <ArrowRight size={18}/></>}
                          </button>

                          {mode === 'login' && (
                              <div className="text-center pt-2 space-y-2">
                                  <button type="button" onClick={() => setShowPrivacyPolicy(true)} className="text-slate-400 hover:text-blue-600 text-xs font-medium flex items-center justify-center gap-1.5 transition py-1 rounded hover:bg-slate-50 w-full"><ShieldCheck size={14} /> Política de Privacidade & LGPD</button>
                              </div>
                          )}
                      </form>
                      
                      <div className="text-center mt-6 pt-4 border-t border-slate-100 flex flex-col gap-3">
                          {mode === 'login' ? (
                              <div className="space-y-2">
                                  <p className="text-sm text-slate-500">Não tem conta?</p>
                                  <div className="flex gap-2 justify-center">
                                      <button type="button" onClick={() => { setMode('join'); setError(''); setSuccessMsg(''); }} className="text-blue-600 font-bold hover:underline text-sm">Entrar em equipe existente</button>
                                      <span className="text-slate-300">|</span>
                                      <button type="button" onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); }} className="text-blue-600 font-bold hover:underline text-sm">Criar nova empresa</button>
                                  </div>
                              </div>
                          ) : (
                              <button type="button" onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }} className="text-slate-600 font-bold hover:text-slate-900 text-sm flex items-center justify-center gap-2">
                                  <ArrowLeft size={16}/> Voltar para o Login
                              </button>
                          )}
                      </div>
                  </div>
              )}
          </div>
      </div>
      
      <div className="mt-6 text-center">
        <p className="text-slate-600 text-xs opacity-30 font-mono">Nexus CRM Enterprise • v3.1.0</p>
      </div>

      {showPrivacyPolicy && <PrivacyPolicy onClose={() => setShowPrivacyPolicy(false)} />}
    </div>
  );
};
