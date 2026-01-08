import React, { useState, useEffect } from 'react';
import { useAuth, SUPER_ADMIN_EMAILS } from '../context/AuthContext';
import { Eye, EyeOff, Lock, ArrowRight, ShieldCheck, Mail, Database, Loader2, Hash, AlertCircle, Terminal, Building2, User } from 'lucide-react';
import { testSupabaseConnection, getSupabaseSchema, getSupabase } from '../services/supabaseClient';

export const Login: React.FC = () => {
  const { login, signUp } = useAuth();
  
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [dbInfo, setDbInfo] = useState<{status: string, ok: boolean} | null>(null);

  useEffect(() => {
      const checkDB = async () => {
          const res = await testSupabaseConnection();
          setDbInfo({ status: res.message, ok: res.success });
      };
      checkDB();
      
      const savedEmail = localStorage.getItem('nexus_remember_email');
      const lastSlug = localStorage.getItem('nexus_last_slug');
      if (savedEmail) setEmail(savedEmail);
      if (lastSlug) setOrgSlug(lastSlug);
  }, []);

  const isMasterEmail = SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === email.trim().toLowerCase());

  const handleCopySQL = () => {
      navigator.clipboard.writeText(getSupabaseSchema());
      alert("Script SQL v58.0 copiado! Execute no SQL Editor do Supabase.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsSubmitLoading(true);

      const sb = getSupabase();
      
      // Bypass Master: Se for o Edson, tenta logar mesmo que o sb esteja null inicialmente
      if (!sb && !isMasterEmail) {
          setError("Serviço indisponível. Verifique as chaves do Supabase.");
          setIsSubmitLoading(false);
          return;
      }

      try {
          if (mode === 'login') {
            const finalSlug = isMasterEmail ? (orgSlug || 'softcase') : orgSlug;
            const result = await login(email, password, finalSlug);
            if (result && result.error) {
                setError(result.error);
                setIsSubmitLoading(false);
            } else {
                localStorage.setItem('nexus_remember_email', email);
                localStorage.setItem('nexus_last_slug', finalSlug);
            }
          } else {
            const result = await signUp(email, password, fullName, companyName);
            if (result && result.error) {
                setError(result.error);
                setIsSubmitLoading(false);
            }
          }
      } catch (err: any) {
          setError("Erro na conexão: " + (err.message || "Tente novamente"));
          setIsSubmitLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full overflow-hidden flex flex-col md:flex-row max-w-4xl min-h-[600px] z-10 animate-fade-in border border-slate-200 dark:border-slate-800">
          
          <div className="hidden md:flex w-1/2 bg-blue-600 p-12 flex-col justify-between text-white relative">
              <div className="relative z-10">
                  <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-2xl rotate-3">
                      <span className="text-blue-600 font-black text-4xl">S</span>
                  </div>
                  <h1 className="text-5xl font-black mb-4 tracking-tighter uppercase">Soft Case</h1>
                  <p className="text-blue-100 text-lg font-medium">Enterprise CRM v46.0</p>
                  <p className="text-blue-200/60 text-sm mt-2">Segurança Bancária Ativa</p>
              </div>
              <div className="relative z-10 space-y-3">
                  {dbInfo && (
                      <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3 text-xs font-bold ${dbInfo.ok ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-100' : 'bg-amber-500/20 border-amber-400/30 text-amber-100'}`}>
                          <Database size={16}/>
                          <span>Cloud Status: {dbInfo.status}</span>
                      </div>
                  )}
                  <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/10 text-xs font-bold">
                    <ShieldCheck size={20}/> 
                    <span>Criptografia de Ponta a Ponta</span>
                  </div>
              </div>
          </div>

          <div className="w-full md:w-1/2 p-8 md:p-14 bg-white dark:bg-slate-900 flex flex-col justify-center">
              <div className="mb-8">
                  <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                      {mode === 'login' ? 'Acessar Ambiente' : 'Criar Conta'}
                  </h2>
                  <p className="text-slate-500 text-sm mt-2">
                      {mode === 'login' ? 'Entre na sua instância corporativa.' : 'Cadastre sua empresa no SOFT-CRM.'}
                  </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === 'signup' && (
                      <>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Razão Social / Empresa</label>
                            <div className="relative">
                                <Building2 className="absolute left-4 top-4 text-slate-400" size={20}/>
                                <input required className="pl-12 w-full border-2 border-slate-100 rounded-2xl py-4 outline-none focus:border-blue-600 bg-slate-50 dark:bg-slate-800 dark:text-white font-medium" placeholder="Ex: Softpark Tecnologia" value={companyName} onChange={(e) => setCompanyName(e.target.value)}/>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Seu Nome Completo</label>
                            <div className="relative">
                                <User className="absolute left-4 top-4 text-slate-400" size={20}/>
                                <input required className="pl-12 w-full border-2 border-slate-100 rounded-2xl py-4 outline-none focus:border-blue-600 bg-slate-50 dark:bg-slate-800 dark:text-white font-medium" placeholder="Ex: João Silva" value={fullName} onChange={(e) => setFullName(e.target.value)}/>
                            </div>
                        </div>
                      </>
                  )}

                  {mode === 'login' && (
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Identificador da Empresa (Slug)</label>
                        <div className="relative group">
                            <Hash className={`absolute left-4 top-4 transition-colors ${isMasterEmail ? 'text-blue-600' : 'text-slate-400'}`} size={20}/>
                            <input 
                                required 
                                className={`pl-12 w-full border-2 rounded-2xl py-4 outline-none transition-all font-bold text-slate-800 dark:text-white dark:bg-slate-800 ${isMasterEmail ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 focus:border-blue-600 bg-slate-50'}`} 
                                placeholder="ex: softcase" 
                                value={orgSlug} 
                                onChange={(e) => setOrgSlug(e.target.value.toLowerCase().trim())}
                            />
                        </div>
                    </div>
                  )}

                  <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">E-mail Corporativo</label>
                      <div className="relative">
                          <Mail className="absolute left-4 top-4 text-slate-400" size={20}/>
                          <input required type="email" className="pl-12 w-full border-2 border-slate-100 rounded-2xl py-4 outline-none focus:border-blue-600 bg-slate-50 dark:bg-slate-800 dark:text-white font-medium" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)}/>
                      </div>
                  </div>

                  <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Senha</label>
                      <div className="relative">
                          <Lock className="absolute left-4 top-4 text-slate-400" size={20}/>
                          <input required type={showPassword ? "text" : "password"} className="pl-12 w-full border-2 border-slate-100 rounded-2xl py-4 outline-none focus:border-blue-600 bg-slate-50 dark:bg-slate-800 dark:text-white font-medium" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}/>
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-slate-400 hover:text-blue-600 transition">{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}</button>
                      </div>
                  </div>

                  {error && (
                      <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex flex-col gap-3">
                          <div className="flex items-center gap-2"><AlertCircle size={16}/> {error}</div>
                          {isMasterEmail && (
                              <button type="button" onClick={handleCopySQL} className="bg-red-600 text-white py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-red-700">
                                  <Terminal size={14}/> COPIAR SQL FIX v58.0
                              </button>
                          )}
                      </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={isSubmitLoading} 
                    className="w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all bg-slate-900 text-white hover:bg-slate-800 shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                      {isSubmitLoading ? <Loader2 className="animate-spin" size={24}/> : (mode === 'login' ? <>ACESSAR AMBIENTE <ArrowRight size={20}/></> : <>CRIAR ORGANIZAÇÃO <ArrowRight size={20}/></>)}
                  </button>

                  <div className="pt-4 text-center">
                      <button 
                        type="button"
                        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                          {mode === 'login' ? 'Ainda não tem conta? Criar nova organização' : 'Já possui conta? Voltar para o Login'}
                      </button>
                  </div>
              </form>
          </div>
      </div>
    </div>
  );
};