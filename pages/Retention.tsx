
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Client, Activity } from '../types';
import { ShieldAlert, AlertTriangle, TrendingDown, Phone, Calendar, CheckCircle, RefreshCcw, Clock, ArrowRight, X } from 'lucide-react';
import { Badge } from '../components/Widgets';

export const Retention: React.FC = () => {
    const { clients, updateClient, addActivity } = useData();
    const { currentUser } = useAuth();
    
    // States
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    
    // Identificar clientes em risco: Status Churn Risk OU NPS Detrator (< 7)
    const atRiskClients = clients.filter(c => c.status === 'Churn Risk' || (c.nps !== undefined && c.nps <= 6));
    
    const revenueAtRisk = atRiskClients.reduce((acc, curr) => acc + (curr.ltv || 0), 0);
    const avgRiskNPS = atRiskClients.length > 0 
        ? Math.round(atRiskClients.reduce((acc, curr) => acc + (curr.nps || 0), 0) / atRiskClients.length)
        : 0;

    const handleRecoverClient = (client: Client) => {
        if (window.confirm(`Confirmar recuperação do cliente ${client.name}? O status será alterado para Ativo.`)) {
            updateClient(currentUser, { ...client, status: 'Active' });
            setSelectedClient(null); // Close modal
        }
    };

    const handleScheduleCall = () => {
        if (!selectedClient) return;

        const newActivity: Activity = {
            id: `ACT-RETENTION-${Date.now()}`,
            title: `Reunião de Resgate - ${selectedClient.name}`,
            type: 'Call',
            dueDate: new Date().toISOString(), // Hoje
            completed: false,
            relatedTo: selectedClient.name,
            assignee: currentUser.id
        };

        addActivity(currentUser, newActivity);
        setIsScheduleOpen(false);
        alert(`Reunião de emergência agendada com ${selectedClient.name}. Verifique suas atividades.`);
    };

    return (
        <div className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-900 md:p-8 transition-colors">
            {/* Header Responsivo */}
            <div className="p-4 md:p-0 flex flex-col md:flex-row justify-between items-start md:items-end mb-2 md:mb-8 gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <ShieldAlert className="text-red-600 dark:text-red-500" size={28}/> Central de Retenção
                    </h1>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1">Recuperação de clientes em zona de risco.</p>
                </div>
                
                {/* Card de KPI destacado no Mobile */}
                <div className="w-full md:w-auto bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm">
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-full shadow-sm text-red-600 dark:text-red-400">
                        <TrendingDown size={20}/>
                    </div>
                    <div>
                        <p className="text-[10px] md:text-xs font-bold text-red-400 dark:text-red-300 uppercase tracking-wider">Receita em Risco (LTV)</p>
                        <p className="text-xl font-bold text-red-700 dark:text-red-200">R$ {revenueAtRisk.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 md:gap-8 flex-1">
                
                {/* LISTA DE RISCO (Esquerda) */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 md:rounded-xl shadow-sm border-y md:border border-slate-200 dark:border-slate-700 flex flex-col transition-colors">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                        <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
                            <AlertTriangle size={18} className="text-orange-500"/> Clientes Críticos
                        </h3>
                        <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold px-2 py-1 rounded-full border border-red-200 dark:border-red-800">
                            {atRiskClients.length} Casos
                        </span>
                    </div>

                    <div className="flex-1 p-0 sm:p-3 bg-white dark:bg-slate-800 sm:bg-slate-50/50 dark:sm:bg-slate-900/50">
                        {atRiskClients.length === 0 ? (
                            <div className="h-40 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 py-12">
                                <CheckCircle size={48} className="text-green-500 mb-2 opacity-50"/>
                                <p>Nenhum cliente em risco no momento.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:gap-3">
                                {atRiskClients.map(client => (
                                    <div 
                                        key={client.id}
                                        onClick={() => setSelectedClient(client)}
                                        className={`
                                            group relative
                                            p-3 sm:p-4 
                                            sm:rounded-xl sm:border 
                                            border-b border-slate-100 dark:border-slate-700 last:border-b-0 sm:border-slate-200
                                            transition cursor-pointer 
                                            flex flex-row items-center justify-between gap-3
                                            ${selectedClient?.id === client.id 
                                                ? 'bg-red-50 dark:bg-red-900/20 sm:border-red-300 dark:sm:border-red-800 sm:ring-1 sm:ring-red-300 dark:sm:ring-red-800' 
                                                : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 sm:hover:border-red-200 dark:sm:hover:border-slate-600 sm:hover:shadow-md'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                            {/* Avatar Compacto no Mobile */}
                                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-white shrink-0 shadow-sm text-sm sm:text-base
                                                ${client.nps && client.nps <= 0 ? 'bg-red-600' : 'bg-orange-500'}
                                            `}>
                                                {client.nps !== undefined ? client.nps : '-'}
                                            </div>
                                            
                                            <div className="min-w-0 flex-1">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base truncate pr-2">{client.name}</h4>
                                                    {/* Status Badge inline on mobile */}
                                                    {client.status === 'Churn Risk' && (
                                                        <div className="sm:hidden text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded border border-red-100 dark:border-red-800 whitespace-nowrap">
                                                            Risco
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                    <span className="truncate">{client.contactPerson}</span>
                                                    <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
                                                    <span className="font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">LTV: R$ {client.ltv.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Desktop Status / Arrow on Mobile */}
                                        <div className="hidden sm:flex flex-col items-end gap-1">
                                            {client.status === 'Churn Risk' && (
                                                <span className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold px-2 py-1 rounded-lg border border-red-200 dark:border-red-800">
                                                    <AlertTriangle size={10}/> Risco Alto
                                                </span>
                                            )}
                                            {client.nps !== undefined && client.nps <= 6 && (
                                                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded">
                                                    Detrator (NPS)
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Mobile Chevron to indicate action */}
                                        <div className="sm:hidden text-slate-300 dark:text-slate-600">
                                            <ArrowRight size={16} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* PAINEL DE AÇÃO (Direita) */}
                <div className={`
                    bg-white dark:bg-slate-800 md:rounded-xl shadow-2xl md:shadow-sm border-t md:border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden
                    fixed inset-0 z-50 md:static md:z-auto
                    transition-transform duration-300 ease-in-out
                    ${selectedClient ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
                    md:transform-none
                `}>
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                        <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2">
                            <RefreshCcw size={18} className="text-blue-600 dark:text-blue-400"/> Plano de Recuperação
                        </h3>
                        {/* Botão fechar apenas no mobile */}
                        <button onClick={() => setSelectedClient(null)} className="md:hidden p-2 bg-slate-200 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 active:bg-slate-300"><X size={18}/></button>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto">
                        {selectedClient ? (
                            <div className="space-y-8 animate-fade-in">
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4 border-4 border-white dark:border-slate-600 shadow-lg">
                                        {selectedClient.name.charAt(0)}
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{selectedClient.name}</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{selectedClient.contactPerson}</p>
                                    <a href={`tel:${selectedClient.phone}`} className="text-blue-600 dark:text-blue-400 text-sm font-bold hover:underline mt-2 block bg-blue-50 dark:bg-blue-900/20 py-1 px-3 rounded-full w-fit mx-auto">{selectedClient.phone}</a>
                                </div>

                                <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-xl border border-red-100 dark:border-red-900/50 shadow-sm">
                                    <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase mb-4 flex items-center gap-2">
                                        <ShieldAlert size={14}/> Diagnóstico
                                    </h4>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between items-center text-sm mb-1">
                                                <span className="text-slate-600 dark:text-slate-400 font-medium">Health Score</span>
                                                <span className="font-bold text-slate-800 dark:text-white">{selectedClient.healthScore}/100</span>
                                            </div>
                                            <div className="w-full bg-red-200 dark:bg-red-900 rounded-full h-2">
                                                <div className="bg-red-500 h-2 rounded-full transition-all duration-1000" style={{width: `${selectedClient.healthScore}%`}}></div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-between items-center text-sm pt-2 border-t border-red-100 dark:border-red-900/50">
                                            <span className="text-slate-600 dark:text-slate-400 font-medium">NPS Atual</span>
                                            <Badge color="red">{selectedClient.nps?.toString() || 'N/A'}</Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Ações Recomendadas</h4>
                                    
                                    <button 
                                        onClick={() => setIsScheduleOpen(true)}
                                        className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition group shadow-sm active:scale-[0.98]"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-100 dark:bg-blue-900/50 p-2.5 rounded-lg text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition"><Phone size={20}/></div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-slate-800 dark:text-white">Agendar Call</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Contato com decisor</p>
                                            </div>
                                        </div>
                                        <ArrowRight size={18} className="text-slate-300 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400"/>
                                    </button>

                                    <button 
                                        onClick={() => handleRecoverClient(selectedClient)}
                                        className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition group shadow-sm active:scale-[0.98]"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-green-100 dark:bg-green-900/50 p-2.5 rounded-lg text-green-600 dark:text-green-400 group-hover:bg-green-200 dark:group-hover:bg-green-800 transition"><CheckCircle size={20}/></div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-slate-800 dark:text-white">Recuperado</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Marcar como Ativo</p>
                                            </div>
                                        </div>
                                        <ArrowRight size={18} className="text-slate-300 dark:text-slate-500 group-hover:text-green-500 dark:group-hover:text-green-400"/>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 opacity-60">
                                <ShieldAlert size={64} className="mb-4"/>
                                <p className="text-center text-sm px-8">Selecione um cliente da lista ao lado para iniciar o protocolo de resgate.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

             {/* Schedule Confirmation Modal */}
             {isScheduleOpen && selectedClient && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm p-6 animate-scale-in text-center border-t-4 border-blue-500 dark:border-blue-400">
                        <div className="bg-blue-100 dark:bg-blue-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400 shadow-sm">
                            <Calendar size={32}/>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Agendar Resgate</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 mb-6 leading-relaxed">
                            Você está prestes a criar uma tarefa prioritária de "Call de Resgate" para <strong>{selectedClient.name}</strong>.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setIsScheduleOpen(false)} className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                                Cancelar
                            </button>
                            <button onClick={handleScheduleCall} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/30">
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
