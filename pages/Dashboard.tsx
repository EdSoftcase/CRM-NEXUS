
import React, { useEffect, useState, useMemo } from 'react';
import { DollarSign, TrendingUp, Users, AlertCircle, RefreshCw, CheckCircle, Circle, Clock, ArrowRight, X, Bell, Zap, Phone, Eye, EyeOff, Trophy, Lock } from 'lucide-react';
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
  const { activities = [], leads = [], clients = [], tickets = [], invoices = [], notifications = [] } = useData();
  const { currentUser } = useAuth();

  const isContactCenterMode = viewMode === 'contact-center';
  const isAdmin = currentUser?.role === 'admin';

  // Lógica de mascaramento: Se não for admin, oculta valores reais
  const maskValue = (value: string | number | null | undefined, type: 'currency' | 'number' | 'percent' = 'number') => {
      if (isAdmin) {
          if (value === null || value === undefined) return '0';
          if (type === 'currency' && typeof value === 'number') return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
          return value.toString();
      }
      return type === 'currency' ? 'R$ ••••••' : '••••';
  };

  const currentMRR = useMemo(() => {
      if (!isAdmin) return 0;
      return (clients || [])
          .filter(c => c && c.status === 'Active')
          .reduce((acc, curr) => acc + (curr.totalSpecialPrice || curr.ltv || 0), 0);
  }, [clients, isAdmin]);

  const activeClientsCount = (clients || []).filter(c => c && c.status === 'Active').length;

  const churnRate = useMemo(() => {
      if (!isAdmin) return "0";
      const total = (clients || []).length;
      if (total === 0) return "0";
      const inactive = (clients || []).filter(c => c && (c.status === 'Inactive' || c.status === 'Churn Risk')).length;
      return ((inactive / total) * 100).toFixed(1);
  }, [clients, isAdmin]);

  const pipelineData = useMemo(() => [
      { name: 'Novo', value: isAdmin ? (leads || []).filter(l => l && l.status === LeadStatus.NEW).length : 0 },
      { name: 'Qualificado', value: isAdmin ? (leads || []).filter(l => l && l.status === LeadStatus.QUALIFIED).length : 0 },
      { name: 'Proposta', value: isAdmin ? (leads || []).filter(l => l && l.status === LeadStatus.PROPOSAL).length : 0 },
      { name: 'Negociação', value: isAdmin ? (leads || []).filter(l => l && l.status === LeadStatus.NEGOTIATION).length : 0 },
      { name: 'Fechado', value: isAdmin ? (leads || []).filter(l => l && l.status === LeadStatus.CLOSED_WON).length : 0 },
  ], [leads, isAdmin]);

  const criticalTickets = (tickets || []).filter(t => 
      t && (t.priority === TicketPriority.CRITICAL || t.priority === TicketPriority.HIGH) && 
      (t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED)
  );

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 bg-slate-50 dark:bg-slate-900 min-h-full transition-colors duration-300">
      <div className="flex justify-between items-center">
          <SectionTitle title={isContactCenterMode ? "Central de Contatos" : "Visão Geral"} subtitle={`Olá, ${currentUser?.name}`} />
          {!isAdmin && (
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-100 dark:border-amber-800 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-widest">
                  <Lock size={12}/> Modo Visualização Restrita
              </div>
          )}
      </div>
      
      <ContactCenterWidget />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            title="Faturamento Mensal" 
            value={maskValue(currentMRR, 'currency')} 
            icon={DollarSign} 
            color="bg-blue-500" 
            tooltip={!isAdmin ? "Dados financeiros restritos ao administrador." : undefined}
          />
          <KPICard 
            title="Clientes Ativos" 
            value={maskValue(activeClientsCount)} 
            icon={Users} 
            color="bg-indigo-500" 
          />
          <KPICard 
            title="Taxa de Churn" 
            value={maskValue(churnRate) + (isAdmin ? "%" : "")} 
            icon={AlertCircle} 
            color="bg-red-500" 
          />
          <KPICard 
            title="Alertas Críticos" 
            value={maskValue(criticalTickets.length)} 
            icon={AlertCircle} 
            color="bg-orange-500" 
          />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border relative overflow-hidden">
              {!isAdmin && (
                  <div className="absolute inset-0 z-10 bg-white/40 dark:bg-slate-800/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-6">
                      <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-full mb-3 text-slate-400">
                        <Lock size={24}/>
                      </div>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Gráfico de Pipeline Restrito</p>
                  </div>
              )}
              <SectionTitle title="Funil de Vendas" />
              <div className="h-64">
                <PipelineFunnel data={pipelineData} />
              </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border overflow-y-auto max-h-96">
              <SectionTitle title="Notificações do Sistema" />
              <div className="space-y-2">
                  {notifications.length > 0 ? notifications.map(n => (
                      <div key={n.id} className="p-3 border-b dark:border-slate-700 text-xs last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg">
                          <p className="font-bold text-slate-800 dark:text-slate-100">{n.title}</p>
                          <p className="text-slate-500 dark:text-slate-400 mt-1">{n.message}</p>
                          <p className="text-[9px] text-slate-400 mt-2 uppercase">{new Date(n.timestamp).toLocaleDateString()}</p>
                      </div>
                  )) : (
                      <div className="p-8 text-center text-slate-400 italic text-sm">
                          Nenhuma notificação recente.
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};
