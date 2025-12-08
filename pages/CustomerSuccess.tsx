import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Badge, KPICard, SectionTitle } from '../components/Widgets';
import { HeartPulse, TrendingUp, AlertTriangle, CheckCircle, Clock, X, List, ArrowRight } from 'lucide-react';
import { Client } from '../types';
import { Client360 } from '../components/Client360';

export const CustomerSuccess: React.FC = () => {
    const { clients, leads, tickets, invoices } = useData();
    const [selectedMetric, setSelectedMetric] = useState<'HEALTH' | 'NPS' | 'RISK' | 'ONBOARDING' | null>(null);
    
    // State for 360 Profile Modal
    const [selectedClientFor360, setSelectedClientFor360] = useState<Client | null>(null);

    // Metrics Calculation
    const activeClients = clients.filter(c => c.status === 'Active');
    const churnRiskClients = clients.filter(c => c.status === 'Churn Risk');
    
    const avgHealthScore = clients.length > 0 
        ? Math.round(clients.reduce((acc, curr) => acc + (curr.healthScore || 0), 0) / clients.length) 
        : 0;

    const avgNPS = clients.length > 0 
        ? Math.round(clients.reduce((acc, curr) => acc + (curr.nps || 0), 0) / clients.length) 
        : 0;

    const onboardingClients = clients.filter(c => c.onboardingStatus === 'In Progress');

    // LOGIC: Top 5 Lowest Health Score (Active or Risk clients only)
    const lowestHealthClients = [...clients]
        .filter(c => c.status === 'Active' || c.status === 'Churn Risk')
        .sort((a, b) => (a.healthScore || 0) - (b.healthScore || 0))
        .slice(0, 5);

    const getHealthColor = (score: number) => {
        if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-100';
        return 'text-red-600 bg-red-50 border-red-100';
    };

    // Helper to get data for modal based on selection
    const getModalData = () => {
        switch (selectedMetric) {
            case 'HEALTH':
                return {
                    title: 'Detalhamento de Health Score',
                    data: [...clients].sort((a, b) => (b.healthScore || 0) - (a.healthScore || 0)),
                    description: 'Lista de clientes ordenada por saúde da conta.'
                };
            case 'NPS':
                return {
                    title: 'Detalhamento de NPS',
                    data: [...clients].sort((a, b) => (b.nps || 0) - (a.nps || 0)),
                    description: 'Lista de clientes ordenada por pontuação NPS.'
                };
            case 'RISK':
                return {
                    title: 'Clientes em Risco (Churn)',
                    data: churnRiskClients,
                    description: 'Clientes marcados com risco de cancelamento ou saúde crítica.'
                };
            case 'ONBOARDING':
                return {
                    title: 'Em Onboarding',
                    data: onboardingClients,
                    description: 'Clientes em fase de implementação.'
                };
            default:
                return { title: '', data: [], description: '' };
        }
    };

    const modalContent = getModalData();

    return (
        <div className="p-8 h-full flex flex-col relative">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Sucesso do Cliente (CS)</h1>
            <p className="text-slate-500 mb-8">Monitoramento de saúde da carteira, NPS e retenção.</p>

            {/* KPI Grid - Clickable */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div onClick={() => setSelectedMetric('HEALTH')} className="cursor-pointer hover:scale-105 transition-transform duration-200">
                    <KPICard 
                        title="Health Score Médio" 
                        value={`${avgHealthScore}/100`} 
                        icon={HeartPulse} 
                        color="bg-emerald-500"
                        trend={avgHealthScore > 70 ? "Saudável" : "Atenção"}
                        trendUp={avgHealthScore > 70}
                        tooltip="Média de saúde de todos os clientes. Calculada com base em interações, pagamentos e tickets."
                    />
                </div>
                <div onClick={() => setSelectedMetric('NPS')} className="cursor-pointer hover:scale-105 transition-transform duration-200">
                    <KPICard 
                        title="NPS Global" 
                        value={avgNPS.toString()} 
                        icon={TrendingUp} 
                        color="bg-blue-500"
                        trend="Zona de Qualidade"
                        trendUp={true}
                        tooltip="Net Promoter Score médio calculado com base nas avaliações recentes dos clientes."
                    />
                </div>
                <div onClick={() => setSelectedMetric('RISK')} className="cursor-pointer hover:scale-105 transition-transform duration-200">
                    <KPICard 
                        title="Em Risco (Churn)" 
                        value={churnRiskClients.length.toString()} 
                        icon={AlertTriangle} 
                        color="bg-red-500"
                        trend={`${activeClients.length > 0 ? ((churnRiskClients.length / activeClients.length) * 100).toFixed(1) : 0}%`}
                        trendUp={false}
                        tooltip="Total de clientes marcados manualmente como 'Risco' ou detectados pelo sistema por inatividade."
                    />
                </div>
                <div onClick={() => setSelectedMetric('ONBOARDING')} className="cursor-pointer hover:scale-105 transition-transform duration-200">
                     <KPICard 
                        title="Em Onboarding" 
                        value={onboardingClients.length.toString()} 
                        icon={Clock} 
                        color="bg-purple-500"
                        trend="Implementação"
                        trendUp={true}
                        tooltip="Clientes que estão atualmente na fase de setup ou implementação inicial do serviço."
                    />
                </div>
            </div>

            {/* Main Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-hidden min-h-0">
                {/* Left: Health Alerts */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <SectionTitle title="Alerta de Saúde" subtitle="Clientes com menor Health Score" />
                    <div className="overflow-y-auto custom-scrollbar flex-1 space-y-3">
                        {lowestHealthClients.map(client => (
                            <div key={client.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition group cursor-pointer" onClick={() => setSelectedClientFor360(client)}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white bg-slate-400`}>
                                        {client.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 group-hover:text-blue-600 transition">{client.name}</p>
                                        <p className="text-xs text-slate-500">NPS: {client.nps}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`text-sm font-bold ${getHealthColor(client.healthScore || 0).split(' ')[0]}`}>
                                        {client.healthScore}/100
                                    </span>
                                    <Badge color={client.status === 'Churn Risk' ? 'red' : 'green'}>{client.status}</Badge>
                                </div>
                            </div>
                        ))}
                         {lowestHealthClients.length === 0 && (
                            <div className="text-center text-slate-400 py-10">
                                <CheckCircle size={48} className="mx-auto mb-2 opacity-20" />
                                <p>Todos os clientes estão saudáveis!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Onboarding */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <SectionTitle title="Onboarding Recente" subtitle="Status de implementações" />
                    <div className="overflow-y-auto custom-scrollbar flex-1 space-y-3">
                        {onboardingClients.length === 0 ? (
                            <div className="text-center text-slate-400 py-10">
                                <CheckCircle size={48} className="mx-auto mb-2 opacity-20" />
                                <p>Nenhum onboarding em andamento.</p>
                            </div>
                        ) : (
                            onboardingClients.map(client => (
                                <div key={client.id} className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-100 cursor-pointer hover:bg-purple-100 transition" onClick={() => setSelectedClientFor360(client)}>
                                    <div className="flex items-center gap-3">
                                        <div className="bg-purple-100 p-2 rounded text-purple-600">
                                            <List size={20}/>
                                        </div>
                                        <div>
                                            <p className="font-bold text-purple-900">{client.name}</p>
                                            <p className="text-xs text-purple-700">Início: {new Date(client.since).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <ArrowRight size={16} className="text-purple-400"/>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Metric Modal */}
            {selectedMetric && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">{modalContent.title}</h2>
                                <p className="text-sm text-slate-500">{modalContent.description}</p>
                            </div>
                            <button onClick={() => setSelectedMetric(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-0">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
                                    <tr>
                                        <th className="p-4">Cliente</th>
                                        <th className="p-4 text-center">Health Score</th>
                                        <th className="p-4 text-center">NPS</th>
                                        <th className="p-4 text-center">Status</th>
                                        <th className="p-4 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {modalContent.data.map(client => (
                                        <tr key={client.id} className="hover:bg-slate-50">
                                            <td className="p-4 font-bold text-slate-800">{client.name}</td>
                                            <td className="p-4 text-center font-bold">{client.healthScore}</td>
                                            <td className="p-4 text-center">{client.nps || '-'}</td>
                                            <td className="p-4 text-center"><Badge color={client.status === 'Active' ? 'green' : 'red'}>{client.status}</Badge></td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => { setSelectedMetric(null); setSelectedClientFor360(client); }} className="text-blue-600 hover:underline font-bold text-xs">
                                                    Ver 360°
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Client 360 Modal */}
            {selectedClientFor360 && (
                <Client360 
                    client={selectedClientFor360}
                    leads={leads}
                    tickets={tickets}
                    invoices={invoices}
                    onClose={() => setSelectedClientFor360(null)}
                />
            )}
        </div>
    );
};