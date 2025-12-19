
import React, { useEffect, useState, useMemo } from 'react';
import { DollarSign, TrendingUp, Users, AlertCircle, RefreshCw, CheckCircle, Circle, Clock, ArrowRight, X, Bell, Zap, Phone, Eye, EyeOff, Trophy } from 'lucide-react';
import { KPICard, SectionTitle } from '../components/Widgets';
import { RevenueChart, PipelineFunnel } from '../components/Charts';
import { generateExecutiveSummary } from '../services/geminiService';
import { InvoiceStatus, Lead, Client, LeadStatus, TicketStatus, TicketPriority } from '../types';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ContactCenterWidget } from '../components/ContactCenterWidget';

interface DashboardProps {
    onNavigate: (module: string) => void;
    viewMode?: 'general' | 'contact-center';
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, viewMode = 'general' }) => {
  const [summary, setSummary] = useState<string>("Analisando dados reais da sua empresa...");
  const [privacyMode, setPrivacyMode] = useState(() => {
      return localStorage.getItem('nexus_privacy_mode') === 'true';
  });
  
  const togglePrivacy = () => {
      const newVal = !privacyMode;
      setPrivacyMode(newVal);
      localStorage.setItem('nexus_privacy_mode', String(newVal));
  };
  
  const { activities, leads, clients, tickets, invoices, notifications, markNotificationRead } = useData();
  const { currentUser, usersList, hasPermission } = useAuth();

  const isContactCenterMode = viewMode === 'contact-center';
  const canSeeFinancials = hasPermission('finance', 'view');

  const maskValue = (value: string | number | null | undefined, type: 'currency' | 'number' | 'percent' = 'number') => {
      if (!privacyMode) {
          if (value === null || value === undefined) return '0';
          if (type === 'currency' && typeof value === 'number') return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
          return value.toString();
      }
      if (type === 'currency') return 'R$ ••••••';
      if (type === 'percent') return '•••%';
      return '••••';
  };

  // CÁLCULO MRR: Apenas R$ Especial Total
  const currentMRR = useMemo(() => {
      return clients
          .filter(c => c.status === 'Active')
          .reduce((acc, curr) => acc + (curr.totalSpecialPrice || 0), 0);
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
                         (inv.status === InvoiceStatus.PAID);
              })
              .reduce((acc, curr) => acc + curr.amount, 0);
          const value = monthRevenue > 0 ? monthRevenue : (i === 0 ? currentMRR : 0);
          data.push({ name: monthLabel, value: value });
      }
      return data;
  }, [invoices, currentMRR]);

  const criticalTickets = tickets.filter(t => 
      (t.priority === TicketPriority.CRITICAL || t.priority === TicketPriority.HIGH) && 
      (t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED)
  );

  const topPerformers = useMemo(() => {
      return [...usersList]
          .filter(u => u.role !== 'client')
          .sort((a, b) => (b.xp || 0) - (a.xp || 0))
          .slice(0, 3);
  }, [usersList]);

  useEffect(() => {
    if (isContactCenterMode) return;
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
        }
    };
    const timer = setTimeout(() => fetchSummary(), 2000);
    return () => clearTimeout(timer);
  }, [currentMRR, activeClientsCount, churnRate, leads.length, criticalTickets.length, isContactCenterMode]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 bg-slate-50 dark:bg-slate-900 min-h-full transition-colors duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 mb-2">
        <div className="flex items-center gap-4">
            <div>
                <h1 className="font-bold text-slate-900 dark:text-white flex items-center gap-3 text-2xl md:text-3xl">
                    {isContactCenterMode ? <><Phone className="text-indigo-500" /> Central de Contatos Ativa</> : "Visão Executiva"}
                    {!isContactCenterMode && canSeeFinancials && (
                        <button onClick={togglePrivacy} className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
                            {privacyMode ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    )}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm md:text-base">
                    {isContactCenterMode ? "Foque nas metas diárias de relacionamento e retenção." : `Bem-vindo de volta, ${currentUser.name}.`}
                </p>
            </div>
        </div>
      </div>

      <ContactCenterWidget />

      {!isContactCenterMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
            {canSeeFinancials ? (
                <>
                    <KPICard title="Faturamento Mensal (Especial)" value={maskValue(currentMRR, 'currency')} trend="Baseado no quadro Especial" trendUp={true} icon={DollarSign} color="bg-blue-500" />
                    <KPICard title="Receita Anual" value={maskValue(currentARR, 'currency')} trend="Projeção 12m" trendUp={true} icon={TrendingUp} color="bg-emerald-500" />
                </>
            ) : (
                <>
                    <KPICard title="Fila de Chamados" value={tickets.filter(t => t.status === TicketStatus.OPEN).length.toString()} trend="Abertos" trendUp={false} icon={AlertCircle} color="bg-orange-500" />
                    <KPICard title="Em Atendimento" value={tickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length.toString()} trend="Trabalhando agora" trendUp={true} icon={Clock} color="bg-blue-500" />
                </>
            )}
            <KPICard title="Clientes Ativos" value={maskValue(activeClientsCount, 'number')} trend={`${clients.length} Total`} trendUp={true} icon={Users} color="bg-indigo-500" />
            <KPICard title="Taxa de Churn" value={maskValue(churnRate, 'percent')} trend={Number(churnRate) > 5 ? "Atenção" : "Saudável"} trendUp={Number(churnRate) < 5} icon={AlertCircle} color="bg-red-500" />
          </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {!isContactCenterMode ? (
            <div className="lg:col-span-2 flex flex-col gap-6">
              {canSeeFinancials && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col flex-1 min-h-[300px]">
                    <SectionTitle title="Evolução de Receita" subtitle="Faturamento mensal histórico" />
                    <div className={`flex-1 w-full min-h-0 mt-4 transition-all duration-300 ${privacyMode ? 'filter blur-sm select-none opacity-50' : ''}`}>
                        <RevenueChart data={revenueChartData} />
                    </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0 h-auto">
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col min-h-[250px]">
                    <SectionTitle title="Funil de Vendas" subtitle="Leads por estágio" />
                    <div className={`flex-1 w-full min-h-0 transition-all duration-300 ${privacyMode ? 'filter blur-sm select-none opacity-50' : ''}`}>
                        <PipelineFunnel data={pipelineData} />
                    </div>
                 </div>
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden min-h-[250px]">
                    <SectionTitle title="Alertas Críticos" subtitle="Atenção Imediata" />
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 mt-2">
                        {criticalTickets.length > 0 ? criticalTickets.map(ticket => (
                            <div key={ticket.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-100 dark:border-red-900/50">
                                <div className="min-w-0">
                                    <p className="font-medium text-red-900 dark:text-red-200 truncate">{ticket.subject}</p>
                                    <p className="text-xs text-red-700 dark:text-red-300 truncate">{privacyMode ? '••••' : ticket.customer}</p>
                                </div>
                                <span className="text-[10px] font-bold bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded">{ticket.priority}</span>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                 <CheckCircle size={32} className="mb-2 text-green-500 opacity-50"/>
                                 <p className="text-sm">Tudo em ordem.</p>
                            </div>
                        )}
                    </div>
                 </div>
              </div>
            </div>
        ) : (
            <div className="lg:col-span-2 flex flex-col gap-6">
                 <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-center flex flex-col items-center justify-center h-full min-h-[300px]">
                    <Phone size={48} className="text-indigo-200 dark:text-indigo-900 mb-4 animate-pulse-slow" />
                    <h3 className="text-xl font-bold text-slate-700 dark:text-white">Foco Operacional</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mt-2">Valores financeiros ocultos para foco total em metas de relacionamento.</p>
                 </div>
            </div>
        )}

        <div className="flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col flex-1 min-h-[300px]">
                <div className="flex items-center justify-between mb-4 shrink-0">
                    <SectionTitle title="Notificações" />
                    {unreadCount > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">{unreadCount}</span>}
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 max-h-[400px]">
                    {notifications.length === 0 ? <p className="text-center text-slate-400 py-10">Vazio.</p> : notifications.map(notif => (
                        <div key={notif.id} className={`p-3 rounded-lg border text-sm transition-all cursor-pointer ${notif.read ? 'bg-slate-50 dark:bg-slate-700/50 opacity-60' : 'bg-white dark:bg-slate-700 shadow-sm'}`} onClick={() => markNotificationRead(notif.id)}>
                            <p className={`font-bold ${notif.read ? 'text-slate-600' : 'text-slate-800 dark:text-white'}`}>{notif.title}</p>
                            <p className="text-slate-500 text-xs mt-0.5">{notif.message}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
