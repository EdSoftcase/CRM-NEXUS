
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
      // Se tivermos as credenciais padrão no client, config.url não será vazio.
      // O setup só aparece se o usuário forçar explicitamente via flag ou se tudo estiver vazio.
      if (!config.url || !config.key) {
          setNeedsSetup(true);
      } else if (localStorage.getItem('nexus_force_setup') === 'true') {
          setNeedsSetup(true);
      }
      
      // Check for remembered email
      const savedEmail = localStorage.getItem('nexus_remember_email');
      if (savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
      }
  }, []);

  if (currentUser && !currentOrganization) {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-slate-400 text-sm">Carregando dados da organização...</p>
          </div>
      );
  }

  if (currentUser && currentOrganization?.status === 'pending') {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center animate-scale-in">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Clock size={32} className="text-yellow-600"/>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Empresa em Análise</h2>
                  <p className="text-slate-500 mb-6">
                      Sua organização <strong>{currentOrganization.name}</strong> foi criada e aguarda aprovação de um administrador do sistema.
                  </p>
                  <div className="flex gap-3 justify-center">
                      <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Verificar</button>
                      <button onClick={logout} className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition">Sair</button>
                  </div>
              </div>
          </div>
      );
  }

  if (currentUser && currentUser.active === false) {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center animate-scale-in">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User size={32} className="text-blue-600"/>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Cadastro Pendente</h2>
                  <p className="text-slate-500 mb-6">
                      Sua solicitação para entrar na organização foi enviada com sucesso. Aguarde a aprovação do administrador.
                  </p>
                  <div className="flex gap-3 justify-center">
                      <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Verificar</button>
                      <button onClick={logout} className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition">Sair</button>
                  </div>
              </div>
          </div>
      );
  }

  const handleSetupSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsTestingConnection(true);
      saveSupabaseConfig(setupForm.url, setupForm.key);
      const result = await testSupabaseConnection();
      if (result.success) {
          setSuccessMsg("Conexão bem sucedida! Recarregando...");
          localStorage.removeItem('nexus_force_setup');
          setTimeout(() => { window.location.reload(); }, 1000);
      } else {
          setError(result.message);
          setIsTestingConnection(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setSuccessMsg('');
      setLoading(true);

      if (mode === 'login' && rememberMe) {
          localStorage.setItem('nexus_remember_email', email);
      }

      try {
          if (mode === 'recovery') {
              if (!email) { setError("Digite seu e-mail."); setLoading(false); return; }
              await sendRecoveryInvite(email);
              setSuccessMsg("Instruções enviadas para seu e-mail.");
              setLoading(false);
              return;
          }

          if (mode === 'signup') {
              const result = await signUp(email, password, fullName, companyName);
              if (result.error) { setError(result.error); setLoading(false); }
              else { await login(email, password); }
              return;
          }

          if (mode === 'join') {
              const result = await joinOrganization(email, password, fullName, orgSlug);
              if (result.error) { setError(result.error); setLoading(false); }
              else { await login(email, password); }
              return;
          }

          const result = await login(email, password);
          if (result.error) {
              setError(result.error.includes("Invalid login credentials") ? "Email ou senha incorretos." : result.error);
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

      <div className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col md:flex-row max-w-4xl min-h-[550px] z-10 animate-fade-in">
          
          <div className="hidden md:flex w-1/2 bg-blue-600 p-12 flex-col justify-between text-white relative overflow-hidden">
              <div className="relative z-10">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-6 shadow-lg">
                      <span className="text-blue-600 font-bold text-2xl">S</span>
                  </div>
                  <h1 className="text-3xl font-bold mb-2">SOFT-CRM</h1>
                  <p className="text-blue-100">Gestão corporativa inteligente e integrada.</p>
              </div>
              <div className="relative z-10 space-y-4 text-sm">
                  <div className="flex items-center gap-3"><ShieldCheck size={16}/><span>Segurança Enterprise</span></div>
                  <div className="flex items-center gap-3"><Lock size={16}/><span>Isolamento de Dados</span></div>
                  <div className="flex items-center gap-3"><Building2 size={16}/><span>SaaS Multi-tenant</span></div>
              </div>
          </div>

          <div className="w-full md:w-1/2 p-8 md:p-12 relative flex flex-col justify-center">
              {needsSetup ? (
                  <div className="animate-fade-in">
                      <div className="mb-6">
                          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Database className="text-emerald-600"/> Setup Manual</h2>
                          <p className="text-slate-500 text-sm mt-1">Configure um banco de dados customizado.</p>
                      </div>
                      <form onSubmit={handleSetupSubmit} className="space-y-4">
                          <input required type="url" className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Supabase URL" value={setupForm.url} onChange={e => setSetupForm({...setupForm, url: e.target.value})} />
                          <input required type="password" className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Anon Key" value={setupForm.key} onChange={e => setSetupForm({...setupForm, key: e.target.value})} />
                          {error && <p className="text-red-600 text-xs">{error}</p>}
                          <button type="submit" disabled={isTestingConnection} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2">
                              {isTestingConnection ? <Loader2 className="animate-spin" size={20}/> : <><Save size={18}/> Conectar</>}
                          </button>
                          <button type="button" onClick={() => setNeedsSetup(false)} className="w-full text-slate-400 text-xs font-bold hover:underline py-2">Voltar ao Login Padrão</button>
                      </form>
                  </div>
              ) : (
                  <div className="flex flex-col h-full justify-center">
                      <div className="mb-6">
                          <h2 className="text-2xl font-bold text-slate-900">{mode === 'signup' ? 'Nova Conta' : mode === 'recovery' ? 'Recuperar Senha' : 'Acesse sua conta'}</h2>
                          <p className="text-slate-500 text-sm mt-1">{mode === 'signup' ? 'Crie uma nova organização.' : 'Entre com suas credenciais corporativas.'}</p>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                          {(mode === 'signup' || mode === 'join') && (
                              <div className="space-y-4">
                                  <div className="relative"><User className="absolute left-3 top-3 text-slate-400" size={18}/><input required className="pl-10 w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Seu Nome" value={fullName} onChange={(e) => setFullName(e.target.value)}/></div>
                                  {mode === 'signup' ? (
                                      <div className="relative"><Building2 className="absolute left-3 top-3 text-slate-400" size={18}/><input required className="pl-10 w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome da Empresa" value={companyName} onChange={(e) => setCompanyName(e.target.value)}/></div>
                                  ) : (
                                      <div className="relative"><Building2 className="absolute left-3 top-3 text-slate-400" size={18}/><input required className="pl-10 w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Identificador da Empresa (Slug)" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)}/></div>
                                  )}
                              </div>
                          )}

                          <div className="relative"><Mail className="absolute left-3 top-3 text-slate-400" size={18}/><input required type="email" className="pl-10 w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)}/></div>

                          {mode !== 'recovery' && (
                              <div className="relative">
                                  <Lock className="absolute left-3 top-3 text-slate-400" size={18}/><input required type={showPassword ? "text" : "password"} className="pl-10 w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Sua Senha" value={password} onChange={(e) => setPassword(e.target.value)}/>
                                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                              </div>
                          )}

                          {error && <div className="text-red-600 text-xs bg-red-50 p-2 rounded border border-red-100">{error}</div>}
                          {successMsg && <div className="text-green-700 text-xs bg-green-50 p-2 rounded border border-green-100">{successMsg}</div>}

                          <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition flex items-center justify-center gap-2">
                              {loading ? <Loader2 className="animate-spin" size={20}/> : <>{mode === 'recovery' ? 'Enviar' : mode === 'signup' ? 'Criar Empresa' : 'Entrar'} <ArrowRight size={18}/></>}
                          </button>

                          <div className="text-center pt-2">
                              <button type="button" onClick={() => setShowPrivacyPolicy(true)} className="text-slate-400 text-xs hover:underline flex items-center justify-center gap-1 mx-auto"><ShieldCheck size={12}/> Política de Privacidade</button>
                          </div>
                      </form>
                      
                      <div className="text-center mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
                          {mode === 'login' ? (
                              <div className="text-sm space-y-2">
                                  <button onClick={() => setMode('join')} className="text-blue-600 font-bold hover:underline">Entrar em uma empresa</button>
                                  <span className="mx-2 text-slate-300">|</span>
                                  <button onClick={() => setMode('signup')} className="text-blue-600 font-bold hover:underline">Nova organização</button>
                              </div>
                          ) : (
                              <button onClick={() => setMode('login')} className="text-slate-600 font-bold text-sm flex items-center justify-center gap-2"><ArrowLeft size={16}/> Voltar</button>
                          )}
                      </div>
                  </div>
              )}
          </div>
      </div>
      <p className="mt-6 text-slate-600 text-xs opacity-30 font-mono">SOFT-CRM Enterprise • v3.2.0</p>
      {showPrivacyPolicy && <PrivacyPolicy onClose={() => setShowPrivacyPolicy(false)} />}
    </div>
  );
};
