import React, { useEffect, useState, useMemo } from 'react';
import { DollarSign, TrendingUp, Users, AlertCircle, RefreshCw, CheckCircle, Circle, Clock, ArrowRight, X, Bell, Zap, Phone, PartyPopper, Briefcase, Eye, EyeOff, Trophy } from 'lucide-react';
import { KPICard, SectionTitle } from '../components/Widgets';
import { RevenueChart, PipelineFunnel } from '../components/Charts';
import { generateExecutiveSummary } from '../services/geminiService';
import { InvoiceStatus, Lead, Client, LeadStatus, TicketStatus } from '../types';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

interface DashboardProps {
    onNavigate: (module: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<string>("Analisando dados reais da sua empresa...");
  const [privacyMode, setPrivacyMode] = useState(() => {
      return localStorage.getItem('nexus_privacy_mode') === 'true';
  });
  
  const togglePrivacy = () => {
      const newVal = !privacyMode;
      setPrivacyMode(newVal);
      localStorage.setItem('nexus_privacy_mode', String(newVal));
  };
  
  const { activities, toggleActivity, leads, clients, tickets, invoices, notifications, markNotificationRead, addSystemNotification } = useData();
  const { currentUser, usersList } = useAuth();

  const [stagnantLeads, setStagnantLeads] = useState<Lead[]>([]);
  const [showStagnantModal, setShowStagnantModal] = useState(false);
  
  const maskValue = (value: string | number, type: 'currency' | 'number' | 'percent' = 'number') => {
      if (!privacyMode) {
          if (type === 'currency' && typeof value === 'number') return `R$ ${value.toLocaleString()}`;
          return value.toString();
      }
      
      if (type === 'currency') return 'R$ ••••••';
      if (type === 'percent') return '•••%';
      return '••••';
  };

  const currentMRR = useMemo(() => {
      return clients
          .filter(c => c.status === 'Active')
          .reduce((acc, curr) => acc + (curr.totalTablePrice || curr.tablePrice || curr.ltv || 0), 0);
  }, [clients]);

  const currentARR = currentMRR * 12;
  const activeClientsCount = clients.filter(c => c.status === 'Active').length;

  const churnRate = useMemo(() => {
      const total = clients.length;
      if (total === 0) return 0;
      const inactive = clients.filter(c => c.status === 'Inactive' || c.status === 'Churn Risk').length;
      return ((inactive / total) * 100).toFixed(1);
  }, [clients]);

  const pipelineData = useMemo(() => [
      { name: 'Novo', value: leads.filter(l => l.status === LeadStatus.NEW).length },
      { name: 'Qualificado', value: leads.filter(l => l.status === LeadStatus.QUALIFIED).length },
      { name: 'Proposta', value: leads.filter(l => l.status === LeadStatus.PROPOSAL).length },
      { name: 'Negociação', value: leads.filter(l => l.status === LeadStatus.NEGOTIATION).length },
      { name: 'Fechado', value: leads.filter(l => l.status === LeadStatus.CLOSED_WON).length },
  ], [leads]);

  const revenueChartData = useMemo(() => {
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const today = new Date();
      const data = [];
      for (let i = 5; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const monthLabel = months[d.getMonth()];
          const monthRevenue = invoices
              .filter(inv => {
                  const invDate = new Date(inv.dueDate);
                  return invDate.getMonth() === d.getMonth() && 
                         invDate.getFullYear() === d.getFullYear() &&
                         (inv.status === InvoiceStatus.PAID || inv.status === InvoiceStatus.SENT);
              })
              .reduce((acc, curr) => acc + curr.amount, 0);
          const value = monthRevenue > 0 ? monthRevenue : (i === 0 ? currentMRR : 0);
          data.push({ name: monthLabel, value: value });
      }
      return data;
  }, [invoices, currentMRR]);

  const criticalTickets = tickets.filter(t => 
      (t.priority === 'Crítica' || t.priority === 'Alta') && 
      (t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED)
  );

  const topPerformers = useMemo(() => {
      return [...usersList]
          .filter(u => u.role !== 'client')
          .sort((a, b) => (b.xp || 0) - (a.xp || 0))
          .slice(0, 3);
  }, [usersList]);

  useEffect(() => {
    const fetchSummary = async () => {
        if (currentMRR > 0 || leads.length > 0) {
            const result = await generateExecutiveSummary({
                mrr: currentMRR,
                active_clients: activeClientsCount,
                churn_rate: churnRate,
                open_leads: leads.length,
                critical_tickets: criticalTickets.length
            });
            setSummary(result);
        } else {
            setSummary("Adicione clientes e leads para que a IA possa gerar insights sobre seu negócio.");
        }
    };
    const timer = setTimeout(() => fetchSummary(), 2000);

    const isAdminOrSales = ['admin', 'executive', 'sales'].includes(currentUser.role);
    if (isAdminOrSales) {
        const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const inactiveLeads = leads.filter(l => new Date(l.lastContact) < sevenDaysAgo && l.status !== 'Ganho' && l.status !== 'Perdido');
        if(inactiveLeads.length > 0) { setStagnantLeads(inactiveLeads); if(!sessionStorage.getItem('nexus_stagnant_leads_shown')) setShowStagnantModal(true); }
    }
    return () => clearTimeout(timer);
  }, [currentMRR, activeClientsCount, churnRate, leads.length, criticalTickets.length, currentUser]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNavigateToFilteredCommercial = () => { sessionStorage.setItem('nexus_filter_stagnant', 'true'); setShowStagnantModal(false); onNavigate('commercial'); };
  
  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 bg-slate-50 dark:bg-slate-900 min-h-full transition-colors duration-300">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 mb-6">
        <div className="flex items-center gap-4">
            <div>
                <h1 className="font-bold text-slate-900 dark:text-white flex items-center gap-3 text-2xl md:text-3xl">
                    Visão Executiva
                    <button 
                        onClick={togglePrivacy} 
                        className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full"
                        title={privacyMode ? "Mostrar valores" : "Ocultar valores"}
                    >
                        {privacyMode ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm md:text-base">
                    Bem-vindo de volta, {currentUser.name}.
                </p>
            </div>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 rounded-lg max-w-xl mr-4">
                <div className="flex items-start gap-3">
                    <div className="mt-1"><RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin-slow" /></div>
                    <div>
                        <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100">Nexus AI Insights</h4>
                        <p className={`text-xs text-blue-800 dark:text-blue-200 mt-1 leading-snug ${privacyMode ? 'blur-[3px]' : ''} transition-all`}>{summary}</p>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <KPICard title="MRR (Mensal)" value={maskValue(currentMRR, 'currency')} trend="Calculado sobre ativos" trendUp={true} icon={DollarSign} color="bg-blue-500" tooltip="Receita Mensal Recorrente calculada pela soma dos valores mensais de todos os clientes ativos." />
        <KPICard title="ARR (Anual)" value={maskValue(currentARR, 'currency')} trend="Projeção 12m" trendUp={true} icon={TrendingUp} color="bg-emerald-500" tooltip="Receita Anual Recorrente (MRR x 12). Projeção financeira anualizada da base atual." />
        <KPICard title="Clientes Ativos" value={maskValue(activeClientsCount, 'number')} trend={`${clients.length} Total`} trendUp={true} icon={Users} color="bg-indigo-500" tooltip="Contagem total de clientes com status 'Active' no sistema." />
        <KPICard title="Taxa de Churn" value={maskValue(churnRate, 'percent')} trend={Number(churnRate) > 5 ? "Alto" : "Controlado"} trendUp={Number(churnRate) < 5} icon={AlertCircle} color="bg-red-500" tooltip="Percentual de clientes inativos ou perdidos em relação à base total de clientes." />
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col flex-1 min-h-[300px]">
            <SectionTitle title="Receita Realizada" subtitle="Baseado em faturas e projeção atual" />
            <div className={`flex-1 w-full min-h-0 mt-4 transition-all duration-300 ${privacyMode ? 'filter blur-sm select-none opacity-50' : ''}`}>
                <RevenueChart data={revenueChartData} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0 h-auto md:h-72">
             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col min-h-[250px]">
                <SectionTitle title="Funil de Vendas" subtitle="Leads reais por estágio" />
                <div className={`flex-1 w-full min-h-0 transition-all duration-300 ${privacyMode ? 'filter blur-sm select-none opacity-50' : ''}`}>
                    <PipelineFunnel data={pipelineData} />
                </div>
             </div>
             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden min-h-[250px]">
                <SectionTitle title="Tickets Críticos" subtitle="Atenção Imediata" />
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 mt-2">
                    {criticalTickets.length > 0 ? criticalTickets.map(ticket => (
                        <div key={ticket.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-100 dark:border-red-900/50">
                            <div className="min-w-0">
                                <p className="font-medium text-red-900 dark:text-red-200 truncate">{ticket.subject}</p>
                                <p className="text-xs text-red-700 dark:text-red-300 truncate">{privacyMode ? '••••••' : ticket.customer} • {new Date(ticket.created_at).toLocaleDateString()}</p>
                            </div>
                            <span className="text-[10px] font-bold bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded whitespace-nowrap ml-2">{ticket.priority}</span>
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                             <CheckCircle size={32} className="mb-2 text-green-500 opacity-50"/>
                             <p className="text-sm">Nenhum ticket crítico aberto.</p>
                        </div>
                    )}
                </div>
             </div>
          </div>
        </div>

        {/* Column C: Tables & Alerts */}
        <div className="flex flex-col gap-6">
            
            {/* GAMIFICATION RANKING */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-xl shadow-lg border border-indigo-800 text-white flex flex-col min-h-[250px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="flex items-center gap-2 mb-4 relative z-10">
                    <Trophy className="text-yellow-400" />
                    <h3 className="font-bold text-lg">Ranking de Vendas</h3>
                </div>
                <div className="space-y-4 relative z-10">
                    {topPerformers.map((user, idx) => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-white/10 rounded-lg border border-white/5 backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-slate-300 text-slate-800' : 'bg-orange-400 text-orange-900'}`}>
                                    {idx + 1}
                                </div>
                                <div>
                                    <p className="font-bold text-sm">{user.name}</p>
                                    <p className="text-[10px] text-slate-400">Nível {user.level || 1}</p>
                                </div>
                            </div>
                            <span className="font-mono font-bold text-yellow-400">{user.xp || 0} XP</span>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* NOTIFICATIONS */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col flex-1 min-h-[300px]">
                <div className="flex items-center justify-between mb-4 shrink-0">
                    <SectionTitle title="Alertas do Sistema" />
                    {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">{unreadCount}</span>
                    )}
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 max-h-[250px]">
                    {notifications.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 dark:text-slate-500">
                            <Bell size={24} className="mx-auto mb-2 opacity-30"/>
                            <p className="text-sm">Tudo tranquilo.</p>
                        </div>
                    ) : (
                        notifications.map(notif => (
                            <div 
                                key={notif.id} 
                                className={`p-3 rounded-lg border text-sm transition-all cursor-pointer ${
                                    notif.read ? 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-700 opacity-60' : 'bg-white dark:bg-slate-700 border-blue-100 dark:border-blue-900 shadow-sm'
                                }`}
                                onClick={() => markNotificationRead(notif.id)}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${
                                        notif.type === 'alert' ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300' :
                                        notif.type === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300' :
                                        notif.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300' :
                                        'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300'
                                    }`}>
                                        <Zap size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`font-bold truncate ${notif.read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                                            {notif.title}
                                        </p>
                                        <p className={`text-slate-500 dark:text-slate-400 text-xs mt-0.5 line-clamp-2 ${privacyMode ? 'blur-[3px]' : ''}`}>{notif.message}</p>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 text-right">
                                            {new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Activities */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col flex-1 min-h-[300px]">
                <div className="shrink-0 mb-2">
                    <SectionTitle title="Minhas Tarefas" />
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 max-h-[250px]">
                    {activities.filter(a => !a.completed).length === 0 ? (
                        <div className="text-center py-6 text-slate-400 dark:text-slate-500">
                                <CheckCircle size={24} className="mx-auto mb-2 opacity-30"/>
                                <p className="text-sm">Nenhuma tarefa pendente.</p>
                        </div>
                    ) : (
                        activities.filter(a => !a.completed).map(act => (
                        <div key={act.id} className={`flex items-center gap-3 p-3 rounded-lg border transition bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500`}>
                            <button onClick={() => toggleActivity(currentUser, act.id)}>
                                <Circle size={18} className="text-slate-300 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400"/>
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{act.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{act.type} • {privacyMode ? '••••' : act.relatedTo}</p>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 whitespace-nowrap">{new Date(act.dueDate).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit'})}</span>
                        </div>
                    )))}
                </div>
                <button 
                    onClick={() => onNavigate('commercial')}
                    className="w-full mt-3 py-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-xs font-medium shrink-0"
                >
                    + Gerenciar
                </button>
            </div>
        </div>
      </div>
      
      {/* Modals maintained ... */}
      {showStagnantModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in border-t-4 border-red-500">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start bg-red-50 dark:bg-red-900/30">
                      <div className="flex gap-4">
                          <div className="bg-red-100 dark:bg-red-900 p-3 rounded-full text-red-600 dark:text-red-200 h-fit">
                              <AlertCircle size={24} />
                          </div>
                          <div>
                              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Alerta de Inatividade no Pipeline</h2>
                              <p className="text-sm text-red-700 dark:text-red-300 font-medium mt-1">Existem {stagnantLeads.length} leads sem interação há mais de 7 dias.</p>
                          </div>
                      </div>
                      <button onClick={() => setShowStagnantModal(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition"><X size={20}/></button>
                  </div>
                  
                  <div className="p-6 max-h-[60vh] overflow-y-auto bg-white dark:bg-slate-800">
                      <div className="space-y-3">
                          {stagnantLeads.map(lead => {
                              const days = Math.floor((new Date().getTime() - new Date(lead.lastContact).getTime()) / (1000 * 3600 * 24));
                              return (
                                  <div key={lead.id} className="flex items-center justify-between p-4 rounded-lg border border-red-100 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                                      <div>
                                          <p className="font-bold text-slate-800 dark:text-slate-200">{lead.name}</p>
                                          <p className="text-xs text-slate-500 dark:text-slate-400">{lead.company} • {maskValue(lead.value, 'currency')}</p>
                                      </div>
                                      <div className="flex items-center gap-4">
                                          <span className="flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded border border-red-200 dark:border-red-800">
                                              <Clock size={12}/> {days} dias parado
                                          </span>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                      <button 
                          onClick={() => setShowStagnantModal(false)}
                          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                          Fechar
                      </button>
                      <button 
                          onClick={handleNavigateToFilteredCommercial}
                          className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 transition flex items-center gap-2 shadow-lg shadow-red-500/30"
                      >
                          Ver Todos <ArrowRight size={16}/>
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};